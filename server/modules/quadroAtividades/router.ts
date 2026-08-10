import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { moduloProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getDb } from "../../db";
import {
  quadroAtividades,
  ordensServico,
  vencimentos,
  checklists,
  vistorias,
  manutencoes,
  qrcodeRespostas,
} from "../../../drizzle/schema";

const quadroProcedure = moduloProcedure(
  "quadro-atividades",
  escopoPorRegistro({ id: direto(quadroAtividades) }),
  // Permissão individual do funcionário vale aqui, não só na tela.
  "quadro",
);


/** Protocolo sequencial e legível: ATV-000123. */
async function gerarProtocolo(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const [linha] = await db
    .select({ maximo: sql<number>`coalesce(max(${quadroAtividades.id}), 0)` })
    .from(quadroAtividades);

  return `ATV-${String(Number(linha?.maximo ?? 0) + 1).padStart(6, "0")}`;
}

const STATUS = ["a_fazer", "em_andamento", "em_revisao", "concluido"] as const;
const ROTINAS = ["diaria", "semanal", "mensal", "anual", "data_especifica"] as const;
const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
const ORIGENS = ["os", "vencimento", "checklist", "vistoria", "manutencao", "qrcode"] as const;

export const quadroAtividadesRouter = router({
  listar: quadroProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(quadroAtividades)
        .where(eq(quadroAtividades.condominioId, input.condominioId))
        .orderBy(asc(quadroAtividades.ordem), asc(quadroAtividades.id));
    }),

  /**
   * Registros das outras funções que ainda não estão no quadro.
   *
   * É o que alimenta o campo "vincular a": o gestor puxa a O.S., o vencimento,
   * o checklist, a vistoria ou a manutenção que já existe em vez de redigitar.
   */
  origensDisponiveis: quadroProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const [os, vencs, checks, vists, manuts, jaNoQuadro] = await Promise.all([
        db
          .select({ id: ordensServico.id, titulo: ordensServico.titulo, protocolo: ordensServico.protocolo })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId)),
        db
          .select({ id: vencimentos.id, titulo: vencimentos.titulo })
          .from(vencimentos)
          .where(eq(vencimentos.condominioId, input.condominioId)),
        db
          .select({ id: checklists.id, titulo: checklists.titulo, protocolo: checklists.protocolo })
          .from(checklists)
          .where(eq(checklists.condominioId, input.condominioId)),
        db
          .select({ id: vistorias.id, titulo: vistorias.titulo, protocolo: vistorias.protocolo })
          .from(vistorias)
          .where(eq(vistorias.condominioId, input.condominioId)),
        db
          .select({ id: manutencoes.id, titulo: manutencoes.titulo, protocolo: manutencoes.protocolo })
          .from(manutencoes)
          .where(eq(manutencoes.condominioId, input.condominioId)),
        db
          .select({ tipo: quadroAtividades.origemTipo, id: quadroAtividades.origemId })
          .from(quadroAtividades)
          .where(eq(quadroAtividades.condominioId, input.condominioId)),
      ]);

      const usados = new Set(jaNoQuadro.filter((r) => r.tipo && r.id).map((r) => `${r.tipo}:${r.id}`));

      const montar = (
        tipo: (typeof ORIGENS)[number],
        rotulo: string,
        linhas: { id: number; titulo: string; protocolo?: string }[],
      ) =>
        linhas
          .filter((l) => !usados.has(`${tipo}:${l.id}`))
          .map((l) => ({
            tipo,
            rotuloTipo: rotulo,
            id: l.id,
            titulo: l.titulo,
            protocolo: l.protocolo ?? null,
          }));

      return [
        ...montar("os", "Ordem de Serviço", os),
        ...montar("vencimento", "Vencimento", vencs),
        ...montar("checklist", "Checklist", checks),
        ...montar("vistoria", "Vistoria", vists),
        ...montar("manutencao", "Manutenção", manuts),
      ];
    }),

  /**
   * Acha um registro pelo número de protocolo, em qualquer função.
   *
   * Devolve lista porque checklist, manutenção e vistoria usam protocolos de
   * seis dígitos sorteados, que podem coincidir entre si. Quando vier mais de
   * um, quem está usando escolhe qual é.
   */
  buscarPorProtocolo: quadroProcedure
    .input(z.object({ condominioId: z.number(), protocolo: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const alvo = input.protocolo.trim().toUpperCase();

      const [os, vencs, checks, vists, manuts] = await Promise.all([
        db
          .select({ id: ordensServico.id, titulo: ordensServico.titulo, protocolo: ordensServico.protocolo })
          .from(ordensServico)
          .where(and(eq(ordensServico.condominioId, input.condominioId), eq(ordensServico.protocolo, alvo))),
        db
          .select({ id: vencimentos.id, titulo: vencimentos.titulo, protocolo: vencimentos.protocolo })
          .from(vencimentos)
          .where(and(eq(vencimentos.condominioId, input.condominioId), eq(vencimentos.protocolo, alvo))),
        db
          .select({ id: checklists.id, titulo: checklists.titulo, protocolo: checklists.protocolo })
          .from(checklists)
          .where(and(eq(checklists.condominioId, input.condominioId), eq(checklists.protocolo, alvo))),
        db
          .select({ id: vistorias.id, titulo: vistorias.titulo, protocolo: vistorias.protocolo })
          .from(vistorias)
          .where(and(eq(vistorias.condominioId, input.condominioId), eq(vistorias.protocolo, alvo))),
        db
          .select({ id: manutencoes.id, titulo: manutencoes.titulo, protocolo: manutencoes.protocolo })
          .from(manutencoes)
          .where(and(eq(manutencoes.condominioId, input.condominioId), eq(manutencoes.protocolo, alvo))),
      ]);

      const achados: {
        tipo: (typeof ORIGENS)[number];
        rotuloTipo: string;
        id: number;
        titulo: string;
        protocolo: string | null;
      }[] = [];

      const juntar = (
        tipo: (typeof ORIGENS)[number],
        rotulo: string,
        linhas: { id: number; titulo: string; protocolo: string | null }[],
      ) => {
        for (const l of linhas) {
          achados.push({ tipo, rotuloTipo: rotulo, id: l.id, titulo: l.titulo, protocolo: l.protocolo });
        }
      };

      // A resposta do QR Code também entra pelo protocolo (QRR-…). O título é
      // montado a partir de quem informou, porque a resposta não tem título.
      const respostasQr = await db
        .select({
          id: qrcodeRespostas.id,
          protocolo: qrcodeRespostas.protocolo,
          informanteNome: qrcodeRespostas.informanteNome,
          descricao: qrcodeRespostas.descricao,
        })
        .from(qrcodeRespostas)
        .where(
          and(
            eq(qrcodeRespostas.condominioId, input.condominioId),
            eq(qrcodeRespostas.protocolo, alvo),
          ),
        );

      juntar("os", "Ordem de Serviço", os);
      juntar("vencimento", "Vencimento", vencs);
      juntar("checklist", "Checklist", checks);
      juntar("vistoria", "Vistoria", vists);
      juntar("manutencao", "Manutenção", manuts);
      juntar(
        "qrcode",
        "QR Code",
        respostasQr.map((r) => ({
          id: r.id,
          titulo: r.descricao?.slice(0, 120) || `Registro de ${r.informanteNome}`,
          protocolo: r.protocolo,
        })),
      );

      // Já no quadro? A tela avisa em vez de duplicar.
      const noQuadro = await db
        .select({ tipo: quadroAtividades.origemTipo, id: quadroAtividades.origemId })
        .from(quadroAtividades)
        .where(eq(quadroAtividades.condominioId, input.condominioId));

      const usados = new Set(noQuadro.filter((r) => r.tipo && r.id).map((r) => `${r.tipo}:${r.id}`));

      return achados.map((a) => ({ ...a, jaNoQuadro: usados.has(`${a.tipo}:${a.id}`) }));
    }),

  criar: quadroProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1).max(255),
      descricao: z.string().optional(),
      status: z.enum(STATUS).optional(),
      prioridade: z.enum(PRIORIDADES).optional(),
      rotina: z.enum(ROTINAS).optional(),
      dataEspecifica: z.string().optional(),
      responsavelId: z.number().optional(),
      responsavelNome: z.string().max(255).optional(),
      origemTipo: z.enum(ORIGENS).optional(),
      origemId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const autor = autorDaRequisicao(ctx);
      const protocolo = await gerarProtocolo(db);
      const [criada] = await db
        .insert(quadroAtividades)
        .values({
          ...input,
          protocolo,
          status: input.status ?? "a_fazer",
          prioridade: input.prioridade ?? "media",
          rotina: input.rotina ?? "diaria",
          criadoPorId: autor.userId,
          criadoPorNome: autor.nome,
        })
        .returning();

      return { id: criada.id, protocolo };
    }),

  atualizar: quadroProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().optional(),
      status: z.enum(STATUS).optional(),
      prioridade: z.enum(PRIORIDADES).optional(),
      rotina: z.enum(ROTINAS).optional(),
      dataEspecifica: z.string().nullable().optional(),
      responsavelId: z.number().nullable().optional(),
      responsavelNome: z.string().max(255).optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...campos } = input;
      if (Object.keys(campos).length > 0) {
        await db
          .update(quadroAtividades)
          .set({ ...campos, updatedAt: new Date() })
          .where(eq(quadroAtividades.id, id));
      }

      return { success: true };
    }),

  deletar: quadroProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(quadroAtividades).where(eq(quadroAtividades.id, input.id));
      return { success: true };
    }),
});
