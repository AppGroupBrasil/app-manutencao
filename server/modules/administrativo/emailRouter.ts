import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { configuracoesEmail, condominios, moradores, historicoNotificacoes } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { isEmailConfigured, sendEmail, sendBulkEmail, emailTemplates } from "../../_core/email";

export const configEmailRouter = router({
  // Obter configuraÃ§Ãµes
  get: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const result = await db.select().from(configuracoesEmail)
        .where(eq(configuracoesEmail.condominioId, input.condominioId))
        .limit(1);
      
      return result[0] || null;
    }),
  
  // Salvar configuraÃ§Ãµes
  save: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      provedor: z.enum(['resend', 'sendgrid', 'mailgun', 'smtp']).optional(),
      apiKey: z.string().optional(),
      emailRemetente: z.string().optional(),
      nomeRemetente: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar se jÃ¡ existe
      const existing = await db.select().from(configuracoesEmail)
        .where(eq(configuracoesEmail.condominioId, input.condominioId))
        .limit(1);
      
      if (existing.length > 0) {
        // Atualizar
        await db.update(configuracoesEmail)
          .set({
            provedor: input.provedor || existing[0].provedor,
            apiKey: input.apiKey || existing[0].apiKey,
            emailRemetente: input.emailRemetente || existing[0].emailRemetente,
            nomeRemetente: input.nomeRemetente || existing[0].nomeRemetente,
            ativo: input.ativo !== undefined ? input.ativo : existing[0].ativo,
          })
          .where(eq(configuracoesEmail.id, existing[0].id));
        
        return { success: true, id: existing[0].id };
      }
      
      // Criar novo
      const [result] = await db.insert(configuracoesEmail).values({
        condominioId: input.condominioId,
        provedor: input.provedor || 'resend',
        apiKey: input.apiKey || null,
        emailRemetente: input.emailRemetente || null,
        nomeRemetente: input.nomeRemetente || null,
        ativo: input.ativo || false,
      }).returning();
      
      return { success: true, id: Number(result.id) };
    }),
  
  // Verificar se o serviÃ§o de email estÃ¡ configurado
  isConfigured: protectedProcedure
    .query(async () => {
      return { configured: isEmailConfigured() };
    }),
  
  // Enviar email de teste
  sendTest: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      destinatario: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      if (!isEmailConfigured()) {
        return { success: false, message: "ServiÃ§o de email nÃ£o configurado. Configure as variÃ¡veis SES_SMTP_* no ambiente." };
      }
      
      // Buscar nome do condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, input.condominioId))
        .limit(1);
      
      const template = emailTemplates.notificacao({
        condominioNome: condominio?.nome || "App SÃ­ndico",
        titulo: "Teste de Email",
        mensagem: "Este Ã© um email de teste enviado pelo sistema App SÃ­ndico.\n\nSe vocÃª recebeu este email, a configuraÃ§Ã£o estÃ¡ funcionando corretamente!",
      });
      
      const result = await sendEmail({
        to: input.destinatario,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      
      return result;
    }),
  
  // Enviar notificaÃ§Ã£o por email
  sendNotification: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1),
      mensagem: z.string().min(1),
      destinatarios: z.array(z.string().email()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      if (!isEmailConfigured()) {
        return { success: false, message: "ServiÃ§o de email nÃ£o configurado.", stats: { sent: 0, failed: input.destinatarios.length, errors: [] } };
      }
      
      // Buscar nome do condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, input.condominioId))
        .limit(1);
      
      const template = emailTemplates.notificacao({
        condominioNome: condominio?.nome || "App SÃ­ndico",
        titulo: input.titulo,
        mensagem: input.mensagem,
      });
      
      const result = await sendBulkEmail(
        input.destinatarios,
        template.subject,
        { html: template.html, text: template.text }
      );
      
      // Registar no histÃ³rico
      await db.insert(historicoNotificacoes).values({
        condominioId: input.condominioId,
        tipo: 'email',
        titulo: input.titulo,
        mensagem: input.mensagem,
        destinatarios: input.destinatarios.length,
        sucessos: result.sent,
        falhas: result.failed,
        enviadoPor: ctx.user.id,
      }).returning();
      
      return { 
        success: result.sent > 0, 
        message: `Email enviado para ${result.sent} de ${input.destinatarios.length} destinatÃ¡rios.`,
        stats: result 
      };
    }),
  
  // Enviar email para todos os moradores do condomÃ­nio
  sendBroadcast: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1),
      mensagem: z.string().min(1),
      // Filtros opcionais
      blocos: z.array(z.string()).optional(),
      apartamentos: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      if (!isEmailConfigured()) {
        return { success: false, message: "ServiÃ§o de email nÃ£o configurado.", stats: { sent: 0, failed: 0, errors: [] } };
      }
      
      // Buscar moradores com email
      let moradoresQuery = await db.select().from(moradores)
        .where(and(
          eq(moradores.condominioId, input.condominioId),
          eq(moradores.ativo, true)
        ));
      
      // Aplicar filtros
      if (input.blocos && input.blocos.length > 0) {
        moradoresQuery = moradoresQuery.filter(m => m.bloco && input.blocos!.includes(m.bloco));
      }
      if (input.apartamentos && input.apartamentos.length > 0) {
        moradoresQuery = moradoresQuery.filter(m => input.apartamentos!.includes(m.apartamento));
      }
      
      // Filtrar apenas moradores com email vÃ¡lido
      const destinatarios = moradoresQuery
        .filter(m => m.email && m.email.includes('@'))
        .map(m => m.email!);
      
      if (destinatarios.length === 0) {
        return { success: false, message: "Nenhum morador com email vÃ¡lido encontrado.", stats: { sent: 0, failed: 0, errors: [] } };
      }
      
      // Buscar nome do condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, input.condominioId))
        .limit(1);
      
      const template = emailTemplates.notificacao({
        condominioNome: condominio?.nome || "App SÃ­ndico",
        titulo: input.titulo,
        mensagem: input.mensagem,
      });
      
      const result = await sendBulkEmail(
        destinatarios,
        template.subject,
        { html: template.html, text: template.text }
      );
      
      // Registar no histÃ³rico
      await db.insert(historicoNotificacoes).values({
        condominioId: input.condominioId,
        tipo: 'email',
        titulo: input.titulo,
        mensagem: input.mensagem,
        destinatarios: destinatarios.length,
        sucessos: result.sent,
        falhas: result.failed,
        enviadoPor: ctx.user.id,
      }).returning();
      
      return { 
        success: result.sent > 0, 
        message: `Email enviado para ${result.sent} de ${destinatarios.length} moradores.`,
        stats: result 
      };
    }),
});

