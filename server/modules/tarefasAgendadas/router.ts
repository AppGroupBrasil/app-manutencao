import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { moduloProcedure, router } from "../../_core/trpc";
import { unidadesDaConsulta, unidadesSelecionadas } from "../../_core/unidadesConsulta";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getDb } from "../../db";
import { nanoid } from "nanoid";
import { proximoProtocolo } from "../../_core/protocolo";
import { condominios, tarefasAgendadas, tarefasExecucoes } from "../../../drizzle/schema";

/**
 * Lista de Tarefas — espelha `tarefas_agendadas` do Manutenção X.
 *
 * Exige o módulo habilitado e confere que cada id recebido é da organização
 * da requisição.
 */
const tarefaProcedure = moduloProcedure(
  "tarefas-agendadas",
  escopoPorRegistro(
    {
      id: direto(tarefasAgendadas),
      tarefaId: direto(tarefasAgendadas),
    },
    {
      // Aqui `id` é a execução, que pende da tarefa.
      removerExecucao: { id: via(tarefasExecucoes, "tarefaId", tarefasAgendadas) },
    },
  ),
  // Permissão individual do funcionário vale aqui, não só na tela.
  "tarefas",
);


/**
 * Protocolo sequencial e legível: TRF-000123.
 *
 * Sai do maior id da tabela, não de um contador à parte — assim não existe
 * estado extra para sair de sincronia, e o índice único barra colisão.
 */

const RECORRENCIAS = ["unica", "diaria", "semanal", "mensal"] as const;
const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
const STATUS_EXECUCAO = ["pendente", "realizada", "nao_executada"] as const;

export const tarefasAgendadasRouter = router({
  listar: tarefaProcedure
    .input(z.object({ condominioId: z.number(), unidades: unidadesSelecionadas }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(tarefasAgendadas)
        .where(
          inArray(
            tarefasAgendadas.condominioId,
            await unidadesDaConsulta(ctx, input, "tarefas-agendadas"),
          ),
        )
        .orderBy(desc(tarefasAgendadas.createdAt));
    }),

  criar: tarefaProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1).max(255),
      descricao: z.string().optional(),
      funcionarioId: z.number().optional(),
      funcionarioNome: z.string().max(255).optional(),
      bloco: z.string().max(50).optional(),
      local: z.string().max(255).optional(),
      recorrencia: z.enum(RECORRENCIAS).optional(),
      diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
      dataEspecifica: z.string().optional(),
      diaMes: z.number().int().min(1).max(31).optional(),
      prioridade: z.enum(PRIORIDADES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const autor = autorDaRequisicao(ctx);
      const protocolo = await proximoProtocolo(db, "tarefa", { prefixo: "TRF-" });
      const [criada] = await db
        .insert(tarefasAgendadas)
        .values({
          ...input,
          protocolo,
          // Link público de leitura, usado pelo QR do cartão.
          shareToken: nanoid(32),
          recorrencia: input.recorrencia ?? "unica",
          diasSemana: input.diasSemana ?? [],
          prioridade: input.prioridade ?? "media",
          criadoPorId: autor.userId,
          criadoPorNome: autor.nome,
        })
        .returning();

      return { id: criada.id, protocolo };
    }),

  atualizar: tarefaProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().optional(),
      funcionarioId: z.number().nullable().optional(),
      funcionarioNome: z.string().max(255).optional(),
      bloco: z.string().max(50).optional(),
      local: z.string().max(255).optional(),
      recorrencia: z.enum(RECORRENCIAS).optional(),
      diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
      dataEspecifica: z.string().nullable().optional(),
      diaMes: z.number().int().min(1).max(31).nullable().optional(),
      prioridade: z.enum(PRIORIDADES).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...campos } = input;
      await db
        .update(tarefasAgendadas)
        .set({ ...campos, updatedAt: new Date() })
        .where(eq(tarefasAgendadas.id, id));

      return { success: true };
    }),

  deletar: tarefaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(tarefasAgendadas).where(eq(tarefasAgendadas.id, input.id));
      return { success: true };
    }),

  /**
   * Relatório da tarefa, no mesmo formato das outras funções.
   *
   * Traz as execuções junto: numa tarefa recorrente, o que interessa a quem
   * cobra o serviço é o histórico de quem fez e quando.
   */
  generatePdf: tarefaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [tarefa] = await db
        .select()
        .from(tarefasAgendadas)
        .where(eq(tarefasAgendadas.id, input.id));
      if (!tarefa) throw new Error("Tarefa não encontrada");

      const [organizacao] = await db
        .select()
        .from(condominios)
        .where(eq(condominios.id, tarefa.condominioId));

      const execucoes = await db
        .select()
        .from(tarefasExecucoes)
        .where(eq(tarefasExecucoes.tarefaId, input.id))
        .orderBy(desc(tarefasExecucoes.createdAt));

      const historico = execucoes
        .map(
          (e) =>
            `${new Date(e.createdAt).toLocaleDateString("pt-BR")} — ${e.status ?? "registrada"}` +
            (e.observacao ? `: ${e.observacao}` : ""),
        )
        .join("\n");

      const { generateFuncaoRapidaPDF } = await import("../../pdfFuncoesRapidas");

      const pdfBuffer = await generateFuncaoRapidaPDF({
        // O gerador não conhece "tarefa"; checklist é o formato mais próximo,
        // com título, local, responsável e observações.
        tipo: "checklist",
        protocolo: tarefa.protocolo ?? "",
        titulo: tarefa.titulo,
        subtitulo: tarefa.funcionarioNome,
        descricao: tarefa.descricao,
        observacoes: historico || null,
        status: tarefa.recorrencia ?? "unica",
        prioridade: tarefa.prioridade,
        responsavelNome: tarefa.funcionarioNome,
        localizacao: [tarefa.bloco, tarefa.local].filter(Boolean).join(" · ") || null,
        createdAt: tarefa.createdAt,
        dataAgendada: tarefa.dataEspecifica ? new Date(tarefa.dataEspecifica) : null,
        condominioNome: organizacao?.nome || "Organização",
        condominioLogo: organizacao?.logoUrl,
        cabecalhoLogoUrl: organizacao?.cabecalhoLogoUrl,
        cabecalhoNomeCondominio: organizacao?.cabecalhoNomeCondominio,
        cabecalhoNomeSindico: organizacao?.cabecalhoNomeSindico,
        rodapeTexto: organizacao?.rodapeTexto,
        rodapeContato: organizacao?.rodapeContato,
      });

      return { pdf: pdfBuffer.toString("base64") };
    }),

  // ── Execuções ──

  listarExecucoes: tarefaProcedure
    .input(z.object({ tarefaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(tarefasExecucoes)
        .where(eq(tarefasExecucoes.tarefaId, input.tarefaId))
        .orderBy(desc(tarefasExecucoes.dataExecucao));
    }),

  /** Todas as execuções da organização — alimenta a aba de acompanhamento. */
  listarExecucoesDaOrganizacao: tarefaProcedure
    .input(z.object({ condominioId: z.number(), unidades: unidadesSelecionadas }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const tarefas = await db
        .select({ id: tarefasAgendadas.id, titulo: tarefasAgendadas.titulo })
        .from(tarefasAgendadas)
        .where(
          inArray(
            tarefasAgendadas.condominioId,
            await unidadesDaConsulta(ctx, input, "tarefas-agendadas"),
          ),
        );

      if (tarefas.length === 0) return [];

      const execucoes = await db
        .select()
        .from(tarefasExecucoes)
        .where(inArray(tarefasExecucoes.tarefaId, tarefas.map((t) => t.id)))
        .orderBy(desc(tarefasExecucoes.dataExecucao));

      const titulos = new Map(tarefas.map((t) => [t.id, t.titulo]));
      return execucoes.map((e) => ({ ...e, tarefaTitulo: titulos.get(e.tarefaId) ?? "" }));
    }),

  registrarExecucao: tarefaProcedure
    .input(z.object({
      tarefaId: z.number(),
      status: z.enum(STATUS_EXECUCAO).optional(),
      fotos: z.array(z.string()).optional(),
      observacao: z.string().max(2000).optional(),
      dataExecucao: z.string().optional(),
      horaExecucao: z.string().max(10).optional(),
      latitude: z.string().max(20).optional(),
      longitude: z.string().max(20).optional(),
      audioUrl: z.string().optional(),
      funcionarioNome: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const autor = autorDaRequisicao(ctx);
      const [registrada] = await db
        .insert(tarefasExecucoes)
        .values({
          tarefaId: input.tarefaId,
          funcionarioId: autor.userId,
          funcionarioNome: input.funcionarioNome ?? autor.nome,
          status: input.status ?? "realizada",
          fotos: input.fotos ?? [],
          observacao: input.observacao,
          // A coluna é `date`: o driver espera AAAA-MM-DD, não Date.
          ...(input.dataExecucao ? { dataExecucao: input.dataExecucao } : {}),
          horaExecucao: input.horaExecucao,
          latitude: input.latitude,
          longitude: input.longitude,
          audioUrl: input.audioUrl,
        })
        .returning();

      await db
        .update(tarefasAgendadas)
        .set({ updatedAt: new Date() })
        .where(eq(tarefasAgendadas.id, input.tarefaId));

      return { id: registrada.id };
    }),

  removerExecucao: tarefaProcedure
    .input(z.object({ id: z.number(), tarefaId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(tarefasExecucoes)
        .where(
          and(eq(tarefasExecucoes.id, input.id), eq(tarefasExecucoes.tarefaId, input.tarefaId)),
        );

      return { success: true };
    }),
});
