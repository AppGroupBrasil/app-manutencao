import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { votacoes, opcoesVotacao, revistas, moradores, notificacoes, votos, users } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const votacaoRouter = router({
  list: protectedProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(votacoes)
        .where(eq(votacoes.revistaId, input.revistaId))
        .orderBy(desc(votacoes.createdAt));
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const votacao = await db.select().from(votacoes).where(eq(votacoes.id, input.id)).limit(1);
      if (!votacao[0]) return null;
      const opcoes = await db.select().from(opcoesVotacao).where(eq(opcoesVotacao.votacaoId, input.id));
      return { ...votacao[0], opcoes };
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      tipo: z.enum(["funcionario_mes", "enquete", "decisao"]),
      imagemUrl: z.string().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
      opcoes: z.array(z.object({
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        imagemUrl: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { opcoes, ...votacaoData } = input;
      const [result] = await db.insert(votacoes).values(votacaoData).returning();
      const votacaoId = Number(result.id);
      
      if (opcoes.length > 0) {
        await db.insert(opcoesVotacao).values(
          opcoes.map(o => ({ ...o, votacaoId }))
        ).returning();
      }
      
      // Enviar notificação para todos os moradores
      const revista = await db.select().from(revistas).where(eq(revistas.id, input.revistaId)).limit(1);
      if (revista[0]?.condominioId) {
        const moradoresList = await db.select().from(moradores)
          .where(eq(moradores.condominioId, revista[0].condominioId));
        
        const tipoLabel = input.tipo === 'funcionario_mes' ? 'Funcionário do Mês' : 
                         input.tipo === 'enquete' ? 'Enquete' : 'Decisão';
        
        for (const morador of moradoresList) {
          if (morador.usuarioId) {
            await db.insert(notificacoes).values({
              userId: morador.usuarioId,
              tipo: "votacao",
              titulo: `Nova ${tipoLabel}: ${input.titulo}`,
              mensagem: `Participe da votação "${input.titulo}". Aceda ao link para votar.`,
              link: `/votar/${votacaoId}`,
            }).returning();
          }
        }
      }
      
      return { id: votacaoId };
    }),

  votar: protectedProcedure
    .input(z.object({
      votacaoId: z.number(),
      opcaoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if user already voted
      const existingVote = await db.select().from(votos)
        .where(and(
          eq(votos.votacaoId, input.votacaoId),
          eq(votos.usuarioId, ctx.user.id)
        ))
        .limit(1);
      
      if (existingVote.length > 0) {
        throw new Error("Você já votou nesta votação");
      }
      
      // Register vote
      await db.insert(votos).values({
        votacaoId: input.votacaoId,
        opcaoId: input.opcaoId,
        usuarioId: ctx.user.id,
      });
      
      // Update vote count
      const [opcao] = await db.select().from(opcoesVotacao).where(eq(opcoesVotacao.id, input.opcaoId));
      await db.update(opcoesVotacao)
        .set({ votos: (opcao?.votos || 0) + 1 })
        .where(eq(opcoesVotacao.id, input.opcaoId));
      
      return { success: true };
    }),

  verificarVoto: protectedProcedure
    .input(z.object({ votacaoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { jaVotou: false };
      
      const existingVote = await db.select().from(votos)
        .where(and(
          eq(votos.votacaoId, input.votacaoId),
          eq(votos.usuarioId, ctx.user.id)
        ))
        .limit(1);
      
      return { jaVotou: existingVote.length > 0 };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Delete votes first
      await db.delete(votos).where(eq(votos.votacaoId, input.id));
      // Delete options
      await db.delete(opcoesVotacao).where(eq(opcoesVotacao.votacaoId, input.id));
      // Delete votacao
      await db.delete(votacoes).where(eq(votacoes.id, input.id));
      return { success: true };
    }),

  encerrar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(votacoes)
        .set({ status: "encerrada" })
        .where(eq(votacoes.id, input.id));
      return { success: true };
    }),

  // Listar votantes de uma votação (para admin)
  listarVotantes: protectedProcedure
    .input(z.object({ votacaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const votosComUsuarios = await db
        .select({
          id: votos.id,
          opcaoId: votos.opcaoId,
          usuarioId: votos.usuarioId,
          createdAt: votos.createdAt,
          userName: users.name,
          userEmail: users.email,
          opcaoTitulo: opcoesVotacao.titulo,
        })
        .from(votos)
        .leftJoin(users, eq(votos.usuarioId, users.id))
        .leftJoin(opcoesVotacao, eq(votos.opcaoId, opcoesVotacao.id))
        .where(eq(votos.votacaoId, input.votacaoId))
        .orderBy(desc(votos.createdAt));
      
      return votosComUsuarios;
    }),

  // Obter estatísticas detalhadas da votação
  estatisticas: protectedProcedure
    .input(z.object({ votacaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const votacao = await db.select().from(votacoes).where(eq(votacoes.id, input.votacaoId)).limit(1);
      if (!votacao[0]) return null;
      
      const opcoes = await db.select().from(opcoesVotacao).where(eq(opcoesVotacao.votacaoId, input.votacaoId));
      const totalVotos = opcoes.reduce((acc, opt) => acc + (opt.votos || 0), 0);
      
      const votosDetalhados = await db
        .select({
          id: votos.id,
          opcaoId: votos.opcaoId,
          usuarioId: votos.usuarioId,
          createdAt: votos.createdAt,
        })
        .from(votos)
        .where(eq(votos.votacaoId, input.votacaoId));

      return {
          totalVotos,
          opcoes,
          votosDetalhados
      };
    }),
});
