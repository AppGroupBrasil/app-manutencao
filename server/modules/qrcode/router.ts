import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { moduloProcedure, publicProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getClientIp, rateLimiter } from "../../_core/rateLimit";
import { getDb } from "../../db";
import { proximoProtocolo } from "../../_core/protocolo";
import { storagePut } from "../../storage";
import { qrcodes, qrcodeRespostas } from "../../../drizzle/schema";

const qrcodeProcedure = moduloProcedure(
  "qrcode",
  escopoPorRegistro(
    {
      id: direto(qrcodes),
      qrcodeId: direto(qrcodes),
    },
    {
      // Aqui `id` é a resposta, que tem condominioId próprio.
      atualizarResposta: { id: direto(qrcodeRespostas) },
    },
  ),
  // Permissão individual do funcionário vale aqui, não só na tela.
  "qrcode",
);


const MAX_IMAGENS = 5;
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const qrcodeRouter = router({
  listar: qrcodeProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(qrcodes)
        .where(eq(qrcodes.condominioId, input.condominioId))
        .orderBy(desc(qrcodes.createdAt));
    }),

  criar: qrcodeProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1).max(255),
      descricao: z.string().optional(),
      tipo: z.enum(["local", "item"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const autor = autorDaRequisicao(ctx);
      const [criado] = await db
        .insert(qrcodes)
        .values({
          condominioId: input.condominioId,
          titulo: input.titulo,
          descricao: input.descricao,
          tipo: input.tipo ?? "local",
          token: nanoid(32),
          protocolo: await proximoProtocolo(db, "qrcode", { prefixo: "QRC-" }),
          criadoPorId: autor.userId,
          criadoPorNome: autor.nome,
        })
        .returning();

      return { id: criado.id, token: criado.token, protocolo: criado.protocolo };
    }),

  atualizar: qrcodeProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...campos } = input;
      if (Object.keys(campos).length > 0) {
        await db.update(qrcodes).set(campos).where(eq(qrcodes.id, id));
      }

      return { success: true };
    }),

  deletar: qrcodeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(qrcodes).where(eq(qrcodes.id, input.id));
      return { success: true };
    }),

  listarRespostas: qrcodeProcedure
    .input(z.object({ condominioId: z.number(), qrcodeId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const condicoes = [eq(qrcodeRespostas.condominioId, input.condominioId)];
      if (input.qrcodeId) condicoes.push(eq(qrcodeRespostas.qrcodeId, input.qrcodeId));

      return db
        .select()
        .from(qrcodeRespostas)
        .where(and(...condicoes))
        .orderBy(desc(qrcodeRespostas.createdAt));
    }),

  // ========== ROTAS PÚBLICAS: quem escaneia não tem conta ==========

  /** Dados mínimos para montar o formulário. Não expõe nada além do ponto. */
  obterPorToken: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [ponto] = await db
        .select({
          id: qrcodes.id,
          titulo: qrcodes.titulo,
          descricao: qrcodes.descricao,
          tipo: qrcodes.tipo,
          ativo: qrcodes.ativo,
        })
        .from(qrcodes)
        .where(eq(qrcodes.token, input.token))
        .limit(1);

      if (!ponto || !ponto.ativo) return null;
      return ponto;
    }),

  /**
   * Envio do formulário público.
   *
   * As imagens chegam em base64 e são gravadas aqui, porque quem escaneia não
   * tem sessão para usar a rota de upload autenticada. Limite de imagens e
   * rate limit por IP evitam que o endereço público vire porta de despejo.
   */
  responder: publicProcedure
    .input(z.object({
      token: z.string().min(1).max(64),
      informanteNome: z.string().min(2).max(255),
      informanteContato: z.string().max(120).optional(),
      descricao: z.string().max(4000).optional(),
      latitude: z.string().max(20).optional(),
      longitude: z.string().max(20).optional(),
      enderecoGeo: z.string().max(500).optional(),
      imagens: z
        .array(z.object({
          fileName: z.string().max(255),
          fileType: z.string().max(100),
          fileData: z.string(),
        }))
        .max(MAX_IMAGENS)
        .optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      rateLimiter.check(`qrcode:${getClientIp(ctx.req)}`, {
        maxAttempts: 20,
        windowMs: 15 * 60 * 1000,
        blockDurationMs: 15 * 60 * 1000,
      });

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [ponto] = await db
        .select({ id: qrcodes.id, condominioId: qrcodes.condominioId, ativo: qrcodes.ativo })
        .from(qrcodes)
        .where(eq(qrcodes.token, input.token))
        .limit(1);

      // Código errado ou ponto desligado é situação normal de quem escaneia:
      // responde 404 em vez de 500, que na tela pública vira "erro do sistema".
      if (!ponto || !ponto.ativo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "QR Code inválido ou desativado",
        });
      }

      const urls: string[] = [];
      for (const imagem of input.imagens ?? []) {
        if (!TIPOS_IMAGEM.includes(imagem.fileType)) {
          throw new Error("Tipo de imagem não suportado. Use JPEG, PNG, GIF ou WebP.");
        }

        const base64 = imagem.fileData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error("Imagem muito grande. Máximo de 10MB.");
        }

        const extensao = imagem.fileName.split(".").pop() || "jpg";
        const chave = `qrcode/${ponto.id}/${nanoid(10)}.${extensao}`;
        const { url } = await storagePut(chave, buffer, imagem.fileType);
        urls.push(url);
      }

      const protocolo = await proximoProtocolo(db, "qrcodeResposta", { prefixo: "QRR-" });

      const [resposta] = await db
        .insert(qrcodeRespostas)
        .values({
          qrcodeId: ponto.id,
          condominioId: ponto.condominioId,
          protocolo,
          informanteNome: input.informanteNome.trim(),
          informanteContato: input.informanteContato?.trim(),
          descricao: input.descricao?.trim(),
          imagens: urls,
          latitude: input.latitude,
          longitude: input.longitude,
          enderecoGeo: input.enderecoGeo,
        })
        .returning();

      // O protocolo volta para quem enviou: é o comprovante da leitura.
      return { id: resposta.id, protocolo: resposta.protocolo };
    }),

  atualizarResposta: qrcodeProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["nova", "em_andamento", "resolvida"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(qrcodeRespostas)
        .set({ status: input.status })
        .where(eq(qrcodeRespostas.id, input.id));

      return { success: true };
    }),

  /** Remove um registro recebido — trote e duplicata não devem ficar na fila. */
  deletarResposta: qrcodeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(qrcodeRespostas).where(eq(qrcodeRespostas.id, input.id));
      return { success: true };
    }),

  /**
   * Responde por e-mail quem registrou pelo QR Code.
   *
   * Só faz sentido quando a pessoa deixou um e-mail no contato — o campo é
   * livre e aceita telefone também, então a rota confere antes de tentar.
   * As fotos vão como link: o corpo do e-mail carrega miniatura, e o endereço
   * abre a imagem inteira.
   */
  responderPorEmail: qrcodeProcedure
    .input(
      z.object({
        id: z.number(),
        mensagem: z.string().min(1).max(4000),
        imagens: z.array(z.string().max(500)).max(10).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [resposta] = await db
        .select()
        .from(qrcodeRespostas)
        .where(eq(qrcodeRespostas.id, input.id))
        .limit(1);

      if (!resposta) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });

      const destino = (resposta.informanteContato ?? "").trim();
      if (!destino.includes("@")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Quem registrou não deixou e-mail, apenas contato.",
        });
      }

      const autor = autorDaRequisicao(ctx);
      const base = process.env.VITE_APP_URL || "https://appmanutencao.com.br";
      const fotos = input.imagens ?? [];

      const html = [
        `<p>Olá, ${resposta.informanteNome}.</p>`,
        `<p>Sobre o registro <strong>${resposta.protocolo}</strong>:</p>`,
        `<p style="white-space:pre-wrap">${input.mensagem}</p>`,
        fotos.length > 0
          ? `<p>${fotos
              .map(
                (url) =>
                  `<a href="${url.startsWith("http") ? url : base + url}"><img src="${
                    url.startsWith("http") ? url : base + url
                  }" style="max-width:180px;margin:4px;border-radius:6px" /></a>`,
              )
              .join("")}</p>`
          : "",
        `<p style="color:#64748b;font-size:12px">Enviado por ${autor.nome} · App Manutenção</p>`,
      ].join("");

      const { sendEmail } = await import("../../_core/email");
      const envio = await sendEmail({
        to: destino,
        subject: `Resposta ao seu registro ${resposta.protocolo}`,
        text: input.mensagem,
        html,
      });

      if (!envio.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: envio.error || "Não foi possível enviar o e-mail",
        });
      }

      // Registro respondido sai de "nova": é o sinal de que alguém tratou.
      if (resposta.status === "nova") {
        await db
          .update(qrcodeRespostas)
          .set({ status: "em_andamento" })
          .where(eq(qrcodeRespostas.id, input.id));
      }

      return { success: true, destino };
    }),
});
