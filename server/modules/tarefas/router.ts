
import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { proximoProtocoloComData } from "../../_core/protocolo";
import { tarefasSimples, compartilhamentosEquipe, membrosEquipe } from "../../../drizzle/schema";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";

// Auto-criar colunas extras se não existirem
async function ensureExtraColumns() {
  const db = await getDb();
  if (!db) return;
  const cols = [
    "ALTER TABLE tarefas_simples ADD COLUMN prazoConclusao TIMESTAMP NULL",
    "ALTER TABLE tarefas_simples ADD COLUMN custoEstimado VARCHAR(50) NULL",
    "ALTER TABLE tarefas_simples ADD COLUMN nivelUrgencia ENUM('baixo','medio','alto','critico') NULL",
    "ALTER TABLE tarefas_simples ADD COLUMN anexos JSON NULL",
    "ALTER TABLE tarefas_simples ADD COLUMN qrcode VARCHAR(500) NULL",
    "ALTER TABLE tarefas_simples ADD COLUMN assinaturaTecnico TEXT NULL",
    "ALTER TABLE tarefas_simples ADD COLUMN assinaturaSolicitante TEXT NULL",
  ];
  for (const ddl of cols) {
    try { await db.execute(sql.raw(ddl)); } catch { /* column may already exist */ }
  }
}
ensureExtraColumns();

// Schema para imagem com legenda (compatível com formato antigo string[])
const imagemSchema = z.union([
  z.string(), // Formato antigo: apenas URL
  z.object({  // Formato novo: objeto com URL e legenda
    url: z.string(),
    legenda: z.string().optional(),
  }),
]);

// Função para normalizar imagens para o novo formato
function normalizarImagens(imagens: any[]): { url: string; legenda?: string }[] {
  if (!imagens || !Array.isArray(imagens)) return [];
  return imagens.map((img) => {
    if (typeof img === 'string') {
      return { url: img, legenda: '' };
    }
    return { url: img.url, legenda: img.legenda || '' };
  });
}

export const tarefasSimplesRouter = router({
  // Gerar protocolo Ãºnico
  gerarProtocolo: protectedProcedure
    .input(z.object({
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const prefixos = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A&D",
        checklist: "CHK",
      };
      const prefixo = prefixos[input.tipo];

      // O número vem da sequence do banco: sem sorteio, sem retry, sem colisão.
      const protocolo = await proximoProtocoloComData(db, "tarefaSimples", `${prefixo}-`);
      return { protocolo };
    }),

  // Criar nova tarefa simples (rascunho)
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]),
      protocolo: z.string(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      local: z.string().optional(),
      imagens: z.array(imagemSchema).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      endereco: z.string().optional(),
      statusPersonalizado: z.string().optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      responsavelId: z.number().optional(),
      funcionarioId: z.number().optional(),
      itensChecklist: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
        concluido: z.boolean(),
        temProblema: z.boolean(),
        problema: z.object({
          titulo: z.string(),
          descricao: z.string(),
          imagens: z.array(z.string()),
        }).optional(),
      })).optional(),
      prazoConclusao: z.string().optional(),
      custoEstimado: z.string().optional(),
      nivelUrgencia: z.enum(["baixo", "medio", "alto", "critico"]).optional(),
      anexos: z.array(z.object({ nome: z.string(), url: z.string() })).optional(),
      qrcode: z.string().optional(),
      assinaturaTecnico: z.string().optional(),
      assinaturaSolicitante: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(tarefasSimples).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        funcionarioId: input.funcionarioId,
        tipo: input.tipo,
        protocolo: input.protocolo,
        titulo: input.titulo || null,
        descricao: input.descricao || null,
        local: input.local || null,
        imagens: normalizarImagens(input.imagens || []),
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        endereco: input.endereco || null,
        statusPersonalizado: input.statusPersonalizado || null,
        prioridade: input.prioridade || "media",
        responsavelId: input.responsavelId || null,
        itensChecklist: input.itensChecklist || null,
        prazoConclusao: input.prazoConclusao ? new Date(input.prazoConclusao) : null,
        custoEstimado: input.custoEstimado || null,
        nivelUrgencia: input.nivelUrgencia || null,
        anexos: input.anexos || null,
        qrcode: input.qrcode || null,
        assinaturaTecnico: input.assinaturaTecnico || null,
        assinaturaSolicitante: input.assinaturaSolicitante || null,
        status: "rascunho",
      }).returning();
      return { id: Number(result.id), protocolo: input.protocolo };
    }),

  // Atualizar tarefa simples
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      local: z.string().optional(),
      imagens: z.array(imagemSchema).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      endereco: z.string().optional(),
      statusPersonalizado: z.string().optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      responsavelId: z.number().optional(),
      itensChecklist: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
        concluido: z.boolean(),
        temProblema: z.boolean(),
        problema: z.object({
          titulo: z.string(),
          descricao: z.string(),
          imagens: z.array(z.string()),
        }).optional(),
      })).optional(),
      prazoConclusao: z.string().optional(),
      custoEstimado: z.string().optional(),
      nivelUrgencia: z.enum(["baixo", "medio", "alto", "critico"]).optional(),
      anexos: z.array(z.object({ nome: z.string(), url: z.string() })).optional(),
      qrcode: z.string().optional(),
      assinaturaTecnico: z.string().optional(),
      assinaturaSolicitante: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, imagens, prazoConclusao, ...restData } = input;
      const updateData: any = { ...restData };
      if (imagens !== undefined) {
        updateData.imagens = normalizarImagens(imagens);
      }
      if (prazoConclusao !== undefined) {
        updateData.prazoConclusao = prazoConclusao ? new Date(prazoConclusao) : null;
      }
      await db.update(tarefasSimples)
        .set(updateData)
        .where(eq(tarefasSimples.id, id));
      return { success: true };
    }),

  // Enviar todas as tarefas rascunho de um tipo
  enviarTodas: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]).optional(),
      ids: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(tarefasSimples.condominioId, input.condominioId),
        eq(tarefasSimples.status, "rascunho"),
      ];
      
      if (input.tipo) {
        conditions.push(eq(tarefasSimples.tipo, input.tipo));
      }
      
      if (input.ids && input.ids.length > 0) {
        conditions.push(inArray(tarefasSimples.id, input.ids));
      }
      
      await db.update(tarefasSimples)
        .set({ status: "enviado", enviadoEm: new Date() })
        .where(and(...conditions));
      
      return { success: true };
    }),

  // Enviar uma tarefa especÃ­fica
  enviar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(tarefasSimples)
        .set({ status: "enviado", enviadoEm: new Date() })
        .where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),

  // Concluir tarefa
  concluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(tarefasSimples)
        .set({ status: "concluido", concluidoEm: new Date() })
        .where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),

  // Reabrir tarefa
  reabrir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(tarefasSimples)
        .set({ status: "enviado", concluidoEm: null })
        .where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),

  // Listar tarefas simples
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]).optional(),
      status: z.enum(["rascunho", "enviado", "concluido"]).optional(),
      limite: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [eq(tarefasSimples.condominioId, input.condominioId)];
      
      if (input.tipo) {
        conditions.push(eq(tarefasSimples.tipo, input.tipo));
      }
      if (input.status) {
        conditions.push(eq(tarefasSimples.status, input.status));
      }
      
      return db.select()
        .from(tarefasSimples)
        .where(and(...conditions))
        .orderBy(desc(tarefasSimples.createdAt))
        .limit(input.limite);
    }),

  // Contar rascunhos pendentes
  contarRascunhos: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(tarefasSimples.condominioId, input.condominioId),
        eq(tarefasSimples.status, "rascunho"),
      ];
      
      if (input.tipo) {
        conditions.push(eq(tarefasSimples.tipo, input.tipo));
      }
      
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(tarefasSimples)
        .where(and(...conditions));
      
      return { count: Number(result[0]?.count || 0) };
    }),

  // Obter uma tarefa especÃ­fica
  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [tarefa] = await db.select()
        .from(tarefasSimples)
        .where(eq(tarefasSimples.id, input.id));
      return tarefa || null;
    }),

  // Deletar tarefa
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),

  // Compartilhar tarefa
  compartilhar: protectedProcedure
    .input(z.object({
      tarefaId: z.number(),
      membrosIds: z.array(z.number()),
      condominioId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tarefa = await db.query.tarefasSimples.findFirst({
        where: eq(tarefasSimples.id, input.tarefaId),
      });

      if (!tarefa) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });

      // Inserir compartilhamentos
      for (const membroId of input.membrosIds) {
        // Obter dados do membro para cache
        const membro = await db.query.membrosEquipe.findFirst({
          where: eq(membrosEquipe.id, membroId),
        });

        if (membro) {
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await db.insert(compartilhamentosEquipe).values({
                condominioId: input.condominioId,
                remetenteId: ctx.user?.id,
                remetenteNome: ctx.user?.name,
                destinatarioId: membroId,
                destinatarioNome: membro.nome,
                destinatarioEmail: membro.email,
                destinatarioTelefone: membro.whatsapp,
                tipoItem: "tarefa_simples",
                itemId: input.tarefaId,
                itemProtocolo: tarefa.protocolo,
                itemTitulo: tarefa.titulo,
                token: token,
            }).returning();
        }
      }

      return { success: true };
    }),
});

