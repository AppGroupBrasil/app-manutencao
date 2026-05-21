import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { configuracoesPush } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export const configPushRouter = router({
  // Obter configuraÃ§Ãµes VAPID
  get: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const result = await db.select().from(configuracoesPush)
        .where(eq(configuracoesPush.condominioId, input.condominioId))
        .limit(1);
      
      if (result.length === 0) return null;
      
      // Mascarar a chave privada para segurança (nunca enviar ao client)
      const config = result[0];
      return {
        ...config,
        vapidPrivateKey: config.vapidPrivateKey ? '****' + config.vapidPrivateKey.slice(-8) : null,
      };
    }),
  
  // Salvar configuraÃ§Ãµes VAPID
  save: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      vapidPublicKey: z.string().optional(),
      vapidPrivateKey: z.string().optional(),
      vapidSubject: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar se jÃ¡ existe
      const existing = await db.select().from(configuracoesPush)
        .where(eq(configuracoesPush.condominioId, input.condominioId))
        .limit(1);
      
      if (existing.length > 0) {
        // Atualizar existente
        const updateData: any = {};
        if (input.vapidPublicKey !== undefined) updateData.vapidPublicKey = input.vapidPublicKey;
        // SÃ³ atualizar chave privada se nÃ£o for mascarada
        if (input.vapidPrivateKey !== undefined && !input.vapidPrivateKey.startsWith('****')) {
          updateData.vapidPrivateKey = input.vapidPrivateKey;
        }
        if (input.vapidSubject !== undefined) updateData.vapidSubject = input.vapidSubject;
        if (input.ativo !== undefined) updateData.ativo = input.ativo;
        
        await db.update(configuracoesPush)
          .set(updateData)
          .where(eq(configuracoesPush.id, existing[0].id));
        
        return { success: true, id: existing[0].id };
      }
      
      // Criar novo
      const [result] = await db.insert(configuracoesPush).values({
        condominioId: input.condominioId,
        vapidPublicKey: input.vapidPublicKey || null,
        vapidPrivateKey: input.vapidPrivateKey || null,
        vapidSubject: input.vapidSubject || null,
        ativo: input.ativo || false,
      }).returning();
      
      return { success: true, id: Number(result.id) };
    }),
  
  // Testar configuraÃ§Ãµes VAPID
  test: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const config = await db.select().from(configuracoesPush)
        .where(eq(configuracoesPush.condominioId, input.condominioId))
        .limit(1);
      
      if (config.length === 0) {
        return { success: false, message: "ConfiguraÃ§Ãµes VAPID nÃ£o encontradas" };
      }
      
      const { vapidPublicKey, vapidPrivateKey, vapidSubject } = config[0];
      
      if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
        return { success: false, message: "ConfiguraÃ§Ãµes VAPID incompletas" };
      }
      
      // Validar formato das chaves
      if (vapidPublicKey.length < 80) {
        return { success: false, message: "Chave pÃºblica VAPID invÃ¡lida" };
      }
      
      if (vapidPrivateKey.length < 40) {
        return { success: false, message: "Chave privada VAPID invÃ¡lida" };
      }
      
      if (!vapidSubject.startsWith('mailto:') && !vapidSubject.startsWith('https://')) {
        return { success: false, message: "Subject deve comeÃ§ar com 'mailto:' ou 'https://'" };
      }
      
      return { success: true, message: "ConfiguraÃ§Ãµes VAPID vÃ¡lidas!" };
    }),
});

