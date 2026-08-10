/**
 * Leitura pública de um registro pelo token do QR Code.
 *
 * Quem lê o código está no local — morador, cliente, fiscal — e não tem conta.
 * A ordem de serviço já tinha esse caminho; aqui ele vale para checklist,
 * manutenção, ocorrência e vistoria, com uma rota só em vez de quatro cópias.
 *
 * Devolve o mínimo para a consulta fazer sentido: nada de token, nada de id de
 * usuário, nada que não esteja impresso na folha.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  checklists,
  checklistImagens,
  manutencoes,
  manutencaoImagens,
  ocorrencias,
  ocorrenciaImagens,
  vistorias,
  vistoriaImagens,
} from "../../../drizzle/schema";

const TIPOS = ["checklist", "manutencao", "ocorrencia", "vistoria"] as const;
type Tipo = (typeof TIPOS)[number];

const MAPA = {
  checklist: { tabela: checklists, imagens: checklistImagens, fk: "checklistId", rotulo: "Checklist" },
  manutencao: { tabela: manutencoes, imagens: manutencaoImagens, fk: "manutencaoId", rotulo: "Manutenção" },
  ocorrencia: { tabela: ocorrencias, imagens: ocorrenciaImagens, fk: "ocorrenciaId", rotulo: "Ocorrência" },
  vistoria: { tabela: vistorias, imagens: vistoriaImagens, fk: "vistoriaId", rotulo: "Vistoria" },
} as const;

export const registroPublicoRouter = router({
  obter: publicProcedure
    .input(z.object({ tipo: z.enum(TIPOS), token: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const alvo = MAPA[input.tipo as Tipo];

      const [registro] = await db
        .select()
        .from(alvo.tabela)
        .where(eq(alvo.tabela.shareToken, input.token))
        .limit(1);

      if (!registro) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
      }

      const linhas = registro as Record<string, unknown>;

      const imagens = await db
        .select({ id: alvo.imagens.id, url: alvo.imagens.url })
        .from(alvo.imagens)
        // A coluna de ligação muda de nome em cada tabela; o mapa acima diz qual é.
        .where(eq((alvo.imagens as unknown as Record<string, never>)[alvo.fk], linhas.id as number));

      return {
        tipo: input.tipo,
        rotuloTipo: alvo.rotulo,
        protocolo: String(linhas.protocolo ?? ""),
        titulo: String(linhas.titulo ?? ""),
        descricao: (linhas.descricao as string | null) ?? null,
        status: (linhas.status as string | null) ?? null,
        prioridade: (linhas.prioridade as string | null) ?? null,
        localizacao: (linhas.localizacao as string | null) ?? null,
        criadoEm: (linhas.createdAt as Date | null) ?? null,
        imagens,
      };
    }),
});
