import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { condominios, condominioFuncoes, usuarioCondominios } from "../../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invalidarCacheBloqueio } from "../../_core/bloqueio";
import { prepararUnidade } from "../../_core/seedUnidade";
import { ehGestorMaster } from "../../_core/gestorMaster";
import type { Segmento } from "../../../shared/modules/registry";

const SEGMENTOS = [
  "generico",
  "condominio",
  "metalurgia",
  "oficina",
  "academia",
  "facilities",
  "educacional",
] as const;

export const condominioRouter = router({
    // Lista todas as organizações que o usuário alcança — as próprias e as que
    // chegam por vínculo (`usuario_condominios`), não só as de que ele é dono.
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // Master enxerga a base inteira: montar um IN com todos os ids seria só
      // uma forma cara de escrever "sem filtro".
      if (ctx.tenant.isMaster()) return db.select().from(condominios);
      const ids = await ctx.tenant.ids();
      if (ids.length === 0) return [];
      return db.select().from(condominios).where(inArray(condominios.id, ids));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(condominios).where(eq(condominios.id, input.id)).limit(1);
        return result[0] || null;
      }),

    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        endereco: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        cep: z.string().optional(),
        logoUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
        capaUrl: z.string().optional(),
        corPrimaria: z.string().optional(),
        corSecundaria: z.string().optional(),
        // Define o pacote de módulos e o vocabulário iniciais
        segmento: z.enum(SEGMENTOS).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        /**
         * Criar organização é ato de dono da plataforma ou de gestor-chefe
         * abrindo mais uma unidade da própria rede.
         *
         * Antes qualquer conta autenticada podia criar — inofensivo com um
         * cliente só, mas com dois clientes na mesma base é a porta para um
         * deles fabricar organização e virar dono dela.
         */
        if (!ctx.tenant.isMaster() && !(await ehGestorMaster(ctx.user.id))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas o gestor-chefe pode criar uma nova unidade.",
          });
        }

        const segmento = (input.segmento ?? "condominio") as Segmento;
        const [result] = await db.insert(condominios).values({
          ...input,
          segmento,
          sindicoId: ctx.user.id,
        }).returning();

        const id = Number(result.id);

        // Vínculo explícito de chefe: o acesso do criador deixa de depender só
        // de `sindicoId`, que é uma coluna só e não comporta dois responsáveis.
        try {
          await db
            .insert(usuarioCondominios)
            .values({ userId: ctx.user.id, condominioId: id, papel: "chefe", ativo: true });
        } catch (erro) {
          console.error(`[condominio.create] vínculo de chefe falhou para #${id}:`, erro);
        }

        // Módulos, status, categorias e prioridades: a unidade nasce pronta,
        // igual a todas as outras. Sem isto ela dependeria do fallback e cada
        // cadastro apareceria na primeira vez que alguém abrisse a tela.
        await prepararUnidade(id);

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        endereco: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        cep: z.string().optional(),
        logoUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
        capaUrl: z.string().optional(),
        corPrimaria: z.string().optional(),
        corSecundaria: z.string().optional(),
        // Campos de cabeçalho/rodapé personalizados
        cabecalhoLogoUrl: z.string().nullable().optional(),
        cabecalhoNomeCondominio: z.string().nullable().optional(),
        cabecalhoNomeSindico: z.string().nullable().optional(),
        rodapeTexto: z.string().nullable().optional(),
        rodapeContato: z.string().nullable().optional(),
        // Segmento e sobrescrita de vocabulário
        segmento: z.enum(SEGMENTOS).optional(),
        labels: z.record(z.string(), z.string()).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(condominios).set(data).where(eq(condominios.id, id));
        return { success: true };
      }),

    /**
     * Suspende ou libera uma unidade.
     *
     * Vale para todos que trabalham nela — gestor e equipe. É o corte que a
     * plataforma usa para cliente inadimplente e que o gestor-chefe usa para
     * unidade que saiu de operação.
     */
    bloquear: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          bloqueada: z.boolean(),
          motivo: z.string().max(255).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        if (!ctx.tenant.isMaster() && !(await ehGestorMaster(ctx.user.id))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas o gestor-chefe suspende uma unidade.",
          });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(condominios)
          .set({
            bloqueadaEm: input.bloqueada ? new Date() : null,
            motivoBloqueio: input.bloqueada
              ? input.motivo?.trim() || "Unidade suspensa. Fale com o suporte."
              : null,
            updatedAt: new Date(),
          })
          .where(eq(condominios.id, input.id));

        invalidarCacheBloqueio(input.id);
        return { success: true, bloqueada: input.bloqueada };
      }),

    /**
     * Exclui a organização. Módulos e vínculos de gestor são configuração e
     * saem junto; qualquer registro operacional (OS, manutenção, funcionário…)
     * barra a exclusão pela FK — apagar em cascata seria perder histórico sem
     * o usuário perceber.
     */
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          // Tudo numa transação: sem ela, a organização que a FK recusa apagar
          // ficaria de pé só que sem módulos e sem gestor vinculado.
          await db.transaction(async (tx) => {
            await tx.delete(condominioFuncoes).where(eq(condominioFuncoes.condominioId, input.id));
            await tx.delete(usuarioCondominios).where(eq(usuarioCondominios.condominioId, input.id));
            await tx.delete(condominios).where(eq(condominios.id, input.id));
          });
        } catch (erro) {
          // Drizzle embrulha o erro do driver: o código do Postgres fica no `cause`.
          const codigo =
            (erro as { code?: string }).code ??
            (erro as { cause?: { code?: string } }).cause?.code;
          if (codigo === "23503") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Esta organização tem registros vinculados (funcionários, manutenções, ordens de serviço…). Remova-os antes de excluí-la.",
            });
          }
          throw erro;
        }

        return { success: true };
      }),

    // Buscar condomínio pelo token de cadastro (público)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(condominios).where(eq(condominios.cadastroToken, input.token)).limit(1);
        return result[0] || null;
      }),

    // Gerar token de cadastro para o condomínio
    generateCadastroToken: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const token = nanoid(16);
        await db.update(condominios).set({ cadastroToken: token }).where(eq(condominios.id, input.id));
        return { token };
      }),

    // Salvar link da assembleia online
    saveAssembleiaLink: protectedProcedure
      .input(z.object({
        id: z.number(),
        assembleiaLink: z.string(),
        assembleiaData: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: Record<string, unknown> = {
          assembleiaLink: input.assembleiaLink,
        };
        if (input.assembleiaData) {
          updateData.assembleiaData = new Date(input.assembleiaData);
        }
        await db.update(condominios).set(updateData).where(eq(condominios.id, input.id));
        return { success: true };
      }),

    // Obter link da assembleia (público)
    getAssembleiaLink: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select({
          id: condominios.id,
          nome: condominios.nome,
          assembleiaLink: condominios.assembleiaLink,
          assembleiaData: condominios.assembleiaData,
          logoUrl: condominios.logoUrl,
        }).from(condominios).where(eq(condominios.id, input.id)).limit(1);
        return result[0] || null;
      }),

    // Obter tema padrão da organização
    getTemaPadrao: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) return null;
        const result = await db.select({
          temaPadrao: condominios.temaPadrao,
          layoutPadrao: condominios.layoutPadrao,
          tamanhoFontePadrao: condominios.tamanhoFontePadrao,
          modoEscuroPadrao: condominios.modoEscuroPadrao,
        }).from(condominios).where(eq(condominios.id, input.id)).limit(1);
        return result[0] || null;
      }),

    // Salvar tema padrão da organização
    saveTemaPadrao: protectedProcedure
      .input(z.object({
        id: z.number(),
        temaPadrao: z.string().optional(),
        layoutPadrao: z.string().optional(),
        tamanhoFontePadrao: z.string().optional(),
        modoEscuroPadrao: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await ctx.tenant.assert(input.id);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(condominios).set(data).where(eq(condominios.id, id));
        return { success: true };
      }),
  });