
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { apps, appModulos, condominios } from "../../../drizzle/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";

export const appsRouter = router({
  // Listar apps do condomÃ­nio
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select().from(apps)
        .where(eq(apps.condominioId, input.condominioId))
        .orderBy(desc(apps.createdAt));
      return result;
    }),

  // Obter app por ID com mÃ³dulos
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [app] = await db.select().from(apps).where(eq(apps.id, input.id));
      if (!app) return null;
      const modulos = await db.select().from(appModulos)
        .where(eq(appModulos.appId, input.id))
        .orderBy(asc(appModulos.ordem));
      return { ...app, modulos };
    }),

  // Criar novo app
  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string(),
      descricao: z.string().optional(),
      logoUrl: z.string().optional(),
      corPrimaria: z.string().optional(),
      corSecundaria: z.string().optional(),
      modulos: z.array(z.object({
        moduloKey: z.string(),
        titulo: z.string(),
        icone: z.string().optional(),
        cor: z.string().optional(),
        bgCor: z.string().optional(),
        ordem: z.number(),
        habilitado: z.boolean(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Gerar shareLink Ãºnico
      const shareLink = `app-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
      
      const [app] = await db.insert(apps).values({
        condominioId: input.condominioId,
        nome: input.nome,
        descricao: input.descricao,
        logoUrl: input.logoUrl,
        corPrimaria: input.corPrimaria,
        corSecundaria: input.corSecundaria,
        shareLink,
      }).returning();
      
      // Inserir mÃ³dulos
      if (input.modulos.length > 0) {
        await db.insert(appModulos).values(
          input.modulos.map(m => ({
            appId: app.id,
            moduloKey: m.moduloKey,
            titulo: m.titulo,
            icone: m.icone,
            cor: m.cor,
            bgCor: m.bgCor,
            ordem: m.ordem,
            habilitado: m.habilitado,
          }))
        );
      }
      
      return { id: app.id, shareLink };
    }),

  // Atualizar app
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      descricao: z.string().optional(),
      logoUrl: z.string().optional(),
      corPrimaria: z.string().optional(),
      corSecundaria: z.string().optional(),
      ativo: z.boolean().optional(),
      modulos: z.array(z.object({
        moduloKey: z.string(),
        titulo: z.string(),
        icone: z.string().optional(),
        cor: z.string().optional(),
        bgCor: z.string().optional(),
        ordem: z.number(),
        habilitado: z.boolean(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, modulos, ...updateData } = input;
      
      if (Object.keys(updateData).length > 0) {
        await db.update(apps).set(updateData).where(eq(apps.id, id));
      }
      
      // Atualizar mÃ³dulos se fornecidos
      if (modulos) {
        // Remover mÃ³dulos antigos
        await db.delete(appModulos).where(eq(appModulos.appId, id));
        // Inserir novos mÃ³dulos
        if (modulos.length > 0) {
          await db.insert(appModulos).values(
            modulos.map(m => ({
              appId: id,
              moduloKey: m.moduloKey,
              titulo: m.titulo,
              icone: m.icone,
              cor: m.cor,
              bgCor: m.bgCor,
              ordem: m.ordem,
              habilitado: m.habilitado,
            }))
          );
        }
      }
      
      return { success: true };
    }),

  // Excluir app
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Excluir mÃ³dulos primeiro
      await db.delete(appModulos).where(eq(appModulos.appId, input.id));
      // Excluir app
      await db.delete(apps).where(eq(apps.id, input.id));
      return { success: true };
    }),

  // Contar apps por condomÃ­nio
  count: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;
      const result = await db.select({ count: sql<number>`count(*)` }).from(apps)
        .where(eq(apps.condominioId, input.condominioId));
      return result[0]?.count || 0;
    }),

  // Obter app por shareLink (pÃºblico)
  getByShareLink: publicProcedure
    .input(z.object({ shareLink: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [app] = await db.select().from(apps)
        .where(and(eq(apps.shareLink, input.shareLink), eq(apps.ativo, true)));
      if (!app) return null;
      
      // Buscar mÃ³dulos
      const modulos = await db.select().from(appModulos)
        .where(and(eq(appModulos.appId, app.id), eq(appModulos.habilitado, true)))
        .orderBy(asc(appModulos.ordem));
      
      // Buscar informaÃ§Ãµes do condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, app.condominioId));
      
      return { ...app, modulos, condominio };
    }),
});

