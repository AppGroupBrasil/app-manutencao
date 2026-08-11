import { protectedOrFuncionarioProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { storagePut } from "../../storage";

/**
 * Pasta de quem enviou. Funcionário não tem linha em `users`, então entra com
 * prefixo próprio para não cair na pasta de um usuário qualquer.
 */
/**
 * Pasta pedida pelo client, reduzida ao que é seguro virar caminho.
 *
 * O valor entra na chave do arquivo; sem filtrar, `../..` sairia da pasta de
 * uploads e gravaria por cima de arquivos da aplicação.
 */
function pastaSegura(bruto: string): string {
  const limpo = bruto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .split("/")
    .map((parte) => parte.replace(/^[-_]+|[-_]+$/g, ""))
    .filter((parte) => parte && parte !== "." && parte !== "..")
    .slice(0, 2)
    .join("/");

  return limpo || "uploads";
}

/** Extensão só com letra e número; o nome do arquivo vem do client. */
function extensaoSegura(bruto: string): string {
  const limpa = bruto.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return limpa || "bin";
}

function pastaDoAutor(ctx: {
  user: { id: number } | null;
  funcionario: { id: number } | null;
}): string {
  if (ctx.user) return String(ctx.user.id);
  if (ctx.funcionario) return `func-${ctx.funcionario.id}`;
  return "anonimo";
}

export const uploadRouter = router({
  image: protectedOrFuncionarioProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileData: z.string(), // base64
      folder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { fileName, fileType, fileData, folder = "uploads" } = input;
      
      console.log(`[Upload] Iniciando upload: ${fileName} (${fileType}), tamanho base64: ${(fileData.length / 1024).toFixed(0)}KB`);
      
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(fileType)) {
        throw new Error("Tipo de ficheiro não suportado. Use JPEG, PNG, GIF ou WebP.");
      }
      
      // Decode base64 - suportar qualquer formato de data URI
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      let buffer: Buffer = Buffer.from(base64Data, "base64");
      let finalContentType = fileType;
      
      console.log(`[Upload] Buffer decodificado: ${(buffer.length / 1024).toFixed(0)}KB`);
      
      // Comprimir imagem (exceto GIFs que perdem animação)
      if (fileType !== "image/gif") {
        try {
          const { compressImage } = await import("../../image-compression");
          const compressedBuffer = await compressImage(buffer, fileType);
          const savedPercent = ((1 - compressedBuffer.length / buffer.length) * 100).toFixed(0);
          console.log(`[Upload] Comprimido: ${(buffer.length / 1024).toFixed(0)}KB → ${(compressedBuffer.length / 1024).toFixed(0)}KB (-${savedPercent}%)`);
          buffer = Buffer.from(compressedBuffer);
          finalContentType = "image/jpeg"; // compressImage converte para JPEG
        } catch (error) {
          console.error("[Upload] Erro ao comprimir imagem (usando original):", error);
          // Continuar com imagem original se compressão falhar
        }
      }
      
      // Validate file size (max 10MB após compressão)
      const maxSize = 10 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new Error(`Imagem muito grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 10MB após compressão.`);
      }
      
      // Generate unique file key - usar extensão correta após compressão
      const originalExt = fileName.split(".").pop() || "jpg";
      const finalExt = extensaoSegura(finalContentType === "image/jpeg" ? "jpg" : originalExt);
      const uniqueId = nanoid(10);
      const fileKey = `${pastaSegura(folder)}/${pastaDoAutor(ctx)}/${uniqueId}.${finalExt}`;
      
      // Upload to storage
      try {
        const { url } = await storagePut(fileKey, buffer, finalContentType);
        console.log(`[Upload] Sucesso: ${fileName} → ${url}`);
        return { url, key: fileKey };
      } catch (storageError: any) {
        console.error(`[Upload] Erro no storage para ${fileName}:`, storageError);
        throw new Error(`Erro ao salvar imagem: ${storageError.message || "Erro desconhecido"}`);
      }
    }),

  // Upload de arquivos genéricos (PDF, DOC, etc.)
  file: protectedOrFuncionarioProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileData: z.string(), // base64
      folder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { fileName, fileType, fileData, folder = "files" } = input;
      
      // Validar tipo de arquivo permitido
      const allowedFileTypes = [
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv", "text/plain",
        "image/jpeg", "image/png", "image/gif", "image/webp",
      ];
      if (!allowedFileTypes.includes(fileType)) {
        throw new Error(`Tipo de arquivo não permitido: ${fileType}`);
      }
      
      // Decode base64
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      let buffer = Buffer.from(base64Data, "base64");
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new Error("Ficheiro muito grande. Máximo 10MB.");
      }
      
      // Generate unique file key
      const ext = extensaoSegura(fileName.split(".").pop() || "bin");
      const uniqueId = nanoid(10);
      const fileKey = `${pastaSegura(folder)}/${pastaDoAutor(ctx)}/${uniqueId}.${ext}`;
      
      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, fileType);
      
      return { url, key: fileKey };
    }),
});
