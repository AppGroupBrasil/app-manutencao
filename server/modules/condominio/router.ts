import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { condominios } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const condominioRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(condominios).where(eq(condominios.sindicoId, ctx.user.id));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
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
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(condominios).values({
          ...input,
          sindicoId: ctx.user.id,
        }).returning();
        return { id: Number(result.id) };
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
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(condominios).set(data).where(eq(condominios.id, id));
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
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
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
      .query(async ({ input }) => {
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
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(condominios).set(data).where(eq(condominios.id, id));
        return { success: true };
      }),
  });