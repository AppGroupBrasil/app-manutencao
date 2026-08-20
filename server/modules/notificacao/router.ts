import { funcionarioProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { notificacoes, preferenciasNotificacao, moradores, pushSubscriptions, historicoNotificacoes } from "../../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import webpush from "web-push";

export const notificacaoRouter = router({
  // Listar notificações do utilizador
  list: protectedProcedure
    .input(z.object({ 
      limit: z.number().optional().default(20),
      onlyUnread: z.boolean().optional().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(notificacoes)
        .where(eq(notificacoes.userId, ctx.user.id))
        .orderBy(desc(notificacoes.createdAt))
        .limit(input.limit);
      
      if (input.onlyUnread) {
        query = db.select().from(notificacoes)
          .where(and(
            eq(notificacoes.userId, ctx.user.id),
            eq(notificacoes.lida, false)
          ))
          .orderBy(desc(notificacoes.createdAt))
          .limit(input.limit);
      }
      
      return query;
    }),

  // Contar notificações não lidas
  countUnread: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;
    
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(notificacoes)
      .where(and(
        eq(notificacoes.userId, ctx.user.id),
        eq(notificacoes.lida, false)
      ));
    
    return Number(result.count);
  }),

  // Criar notificação (uso interno)
  create: protectedProcedure
    .input(z.object({
      userId: z.number(),
      condominioId: z.number().optional(),
      tipo: z.enum(["aviso", "evento", "votacao", "classificado", "carona", "geral"]),
      titulo: z.string().min(1),
      mensagem: z.string().optional(),
      link: z.string().optional(),
      referenciaId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(notificacoes).values(input).returning();
      return { id: Number(result.id) };
    }),

  // Criar notificação para todos os moradores de um condomínio
  notifyAll: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["aviso", "evento", "votacao", "classificado", "carona", "geral"]),
      titulo: z.string().min(1),
      mensagem: z.string().optional(),
      link: z.string().optional(),
      referenciaId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar todos os moradores do condomínio
      const moradoresList = await db.select().from(moradores)
        .where(eq(moradores.condominioId, input.condominioId));
      
      // Criar notificação para cada morador (apenas para moradores com usuário vinculado)
      const notifications = moradoresList
        .filter(morador => morador.usuarioId !== null)
        .map(morador => ({
        userId: morador.usuarioId!,
        condominioId: input.condominioId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        link: input.link,
        referenciaId: input.referenciaId,
      }));
      
      if (notifications.length > 0) {
        await db.insert(notificacoes).values(notifications);
      }
      
      return { count: notifications.length };
    }),

  // Marcar notificação como lida
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(notificacoes)
        .set({ lida: true })
        .where(and(
          eq(notificacoes.id, input.id),
          eq(notificacoes.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Marcar todas as notificações como lidas
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(notificacoes)
      .set({ lida: true })
      .where(eq(notificacoes.userId, ctx.user.id));
    return { success: true };
  }),

  // Excluir notificação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(notificacoes)
        .where(and(
          eq(notificacoes.id, input.id),
          eq(notificacoes.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Excluir todas as notificações lidas
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(notificacoes)
      .where(and(
        eq(notificacoes.userId, ctx.user.id),
        eq(notificacoes.lida, true)
      ));
    return { success: true };
  }),
});

/**
 * Caixa de avisos do portal do funcionário.
 *
 * Mesma tabela do sino do gestor, com outro destinatário: `funcionarioId` no
 * lugar de `userId`. Router separado porque a autenticação é outra — o
 * funcionário não tem conta em `users`, e as rotas acima leem `ctx.user.id`.
 *
 * Um filtro por sessão em cada rota: sem ele, trocar o id na chamada leria e
 * apagaria o aviso de qualquer colega.
 */
export const notificacaoFuncionarioRouter = router({
  list: funcionarioProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(20),
          onlyUnread: z.boolean().optional().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const filtros = [eq(notificacoes.funcionarioId, ctx.funcionario.id)];
      if (input?.onlyUnread) filtros.push(eq(notificacoes.lida, false));

      return db
        .select()
        .from(notificacoes)
        .where(and(...filtros))
        .orderBy(desc(notificacoes.createdAt))
        .limit(input?.limit ?? 20);
    }),

  countUnread: funcionarioProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const [linha] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificacoes)
      .where(
        and(eq(notificacoes.funcionarioId, ctx.funcionario.id), eq(notificacoes.lida, false)),
      );

    return Number(linha?.count ?? 0);
  }),

  markAsRead: funcionarioProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notificacoes)
        .set({ lida: true })
        .where(
          and(eq(notificacoes.id, input.id), eq(notificacoes.funcionarioId, ctx.funcionario.id)),
        );

      return { success: true };
    }),

  markAllAsRead: funcionarioProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notificacoes)
      .set({ lida: true })
      .where(eq(notificacoes.funcionarioId, ctx.funcionario.id));

    return { success: true };
  }),

  delete: funcionarioProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notificacoes)
        .where(
          and(eq(notificacoes.id, input.id), eq(notificacoes.funcionarioId, ctx.funcionario.id)),
        );

      return { success: true };
    }),
});

export const preferenciaNotificacaoRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, ctx.user.id))
      .limit(1);
    return result[0] || null;
  }),

  upsert: protectedProcedure
    .input(z.object({
      avisos: z.boolean().optional(),
      eventos: z.boolean().optional(),
      votacoes: z.boolean().optional(),
      classificados: z.boolean().optional(),
      caronas: z.boolean().optional(),
      emailNotificacoes: z.boolean().optional(),
      efeitoTransicao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db.select().from(preferenciasNotificacao)
        .where(eq(preferenciasNotificacao.userId, ctx.user.id))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(preferenciasNotificacao)
          .set(input)
          .where(eq(preferenciasNotificacao.userId, ctx.user.id));
      } else {
        await db.insert(preferenciasNotificacao).values({
          userId: ctx.user.id,
          ...input,
        });
      }
      
      return { success: true };
    }),
});

// ==================== NOTIFICAÇÕES PUSH ====================
export const pushNotificationsRouter = router({
    // Listar blocos disponíveis para segmentação
    getBlocos: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const result = await db.selectDistinct({ bloco: moradores.bloco })
          .from(moradores)
          .where(and(
            eq(moradores.condominioId, input.condominioId),
            eq(moradores.ativo, true)
          ));
        
        return result
          .filter(r => r.bloco !== null && r.bloco !== '')
          .map(r => r.bloco as string)
          .sort();
      }),
    
    // Listar apartamentos disponíveis para segmentação (opcionalmente filtrados por bloco)
    getApartamentos: protectedProcedure
      .input(z.object({ 
        condominioId: z.number(),
        blocos: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const allMoradores = await db.select({ 
          apartamento: moradores.apartamento,
          bloco: moradores.bloco 
        })
          .from(moradores)
          .where(and(
            eq(moradores.condominioId, input.condominioId),
            eq(moradores.ativo, true)
          ));
        
        // Filtrar por blocos se especificado
        let filtered = allMoradores;
        if (input.blocos && input.blocos.length > 0) {
          filtered = allMoradores.filter(m => m.bloco && input.blocos!.includes(m.bloco));
        }
        
        // Retornar apartamentos únicos
        const aptosSet = new Set(filtered.map(m => m.apartamento));
        const aptos = Array.from(aptosSet).sort();
        return aptos;
      }),
    
    // Contar destinatários com filtros
    countDestinatarios: protectedProcedure
      .input(z.object({ 
        condominioId: z.number(),
        blocos: z.array(z.string()).optional(),
        apartamentos: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { total: 0, comPush: 0 };
        
        const hasFiltros = (input.blocos && input.blocos.length > 0) || (input.apartamentos && input.apartamentos.length > 0);
        
        // Buscar moradores
        const allMoradores = await db.select().from(moradores)
          .where(and(
            eq(moradores.condominioId, input.condominioId),
            eq(moradores.ativo, true)
          ));
        
        // Filtrar moradores
        let moradoresFiltrados = allMoradores;
        if (hasFiltros) {
          moradoresFiltrados = allMoradores.filter(m => {
            const matchBloco = !input.blocos || input.blocos.length === 0 || (m.bloco && input.blocos.includes(m.bloco));
            const matchApto = !input.apartamentos || input.apartamentos.length === 0 || input.apartamentos.includes(m.apartamento);
            return matchBloco && matchApto;
          });
        }
        
        const moradorIds = moradoresFiltrados.map(m => m.id);
        
        // Contar subscriptions ativas
        const allSubs = await db.select().from(pushSubscriptions)
          .where(and(
            eq(pushSubscriptions.condominioId, input.condominioId),
            eq(pushSubscriptions.ativo, true)
          ));
        
        let subsCount = allSubs.length;
        if (hasFiltros) {
          subsCount = allSubs.filter(s => s.moradorId && moradorIds.includes(s.moradorId)).length;
        }
        
        return { 
          total: moradoresFiltrados.length, 
          comPush: subsCount 
        };
      }),
    
    // Registrar subscription
    subscribe: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se já existe uma subscription com este endpoint
        const existing = await db.select().from(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, input.endpoint))
          .limit(1);
        
        if (existing.length > 0) {
          // Atualizar subscription existente
          await db.update(pushSubscriptions)
            .set({
              p256dh: input.p256dh,
              auth: input.auth,
              userAgent: input.userAgent || null,
              ativo: true,
            })
            .where(eq(pushSubscriptions.id, existing[0].id));
          return { success: true, id: existing[0].id };
        }
        
        // Criar nova subscription
        const [result] = await db.insert(pushSubscriptions).values({
          condominioId: input.condominioId,
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent || null,
          ativo: true,
        }).returning();
        
        return { success: true, id: Number(result.id) };
      }),
    
    // Cancelar subscription
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(pushSubscriptions)
          .set({ ativo: false })
          .where(eq(pushSubscriptions.endpoint, input.endpoint));
        
        return { success: true };
      }),
    
    // Verificar status da subscription
    getStatus: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { subscribed: false };
        
        const result = await db.select().from(pushSubscriptions)
          .where(and(
            eq(pushSubscriptions.endpoint, input.endpoint),
            eq(pushSubscriptions.ativo, true)
          ))
          .limit(1);
        
        return { subscribed: result.length > 0 };
      }),
    
    // Listar subscriptions do condomínio (admin)
    listByCondominio: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return db.select().from(pushSubscriptions)
          .where(and(
            eq(pushSubscriptions.condominioId, input.condominioId),
            eq(pushSubscriptions.ativo, true)
          ));
      }),
    
    // Enviar push de teste para o dispositivo do utilizador
    sendTest: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        vapidPublicKey: z.string(),
        vapidPrivateKey: z.string(),
        vapidSubject: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar subscription do utilizador atual
        const subscriptions = await db.select().from(pushSubscriptions)
          .where(and(
            eq(pushSubscriptions.userId, ctx.user.id),
            eq(pushSubscriptions.condominioId, input.condominioId),
            eq(pushSubscriptions.ativo, true)
          ))
          .limit(1);
        
        if (subscriptions.length === 0) {
          return { 
            success: false, 
            message: "Nenhuma subscrição encontrada. Por favor, ative as notificações push primeiro." 
          };
        }
        
        const subscription = subscriptions[0];
        
        try {
          // Configurar VAPID
          webpush.setVapidDetails(
            input.vapidSubject,
            input.vapidPublicKey,
            input.vapidPrivateKey
          );
          
          // Criar payload da notificação
          const payload = JSON.stringify({
            title: "🔔 Teste de Notificação",
            body: "Esta é uma notificação de teste do seu condomínio!",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            data: {
              url: "/dashboard/gestao-notificacoes",
              timestamp: Date.now(),
            },
          });
          
          // Enviar notificação
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );
          
          return { 
            success: true, 
            message: "Notificação de teste enviada com sucesso!" 
          };
        } catch (error: any) {
          console.error("Erro ao enviar push de teste:", error);
          
          // Se a subscrição expirou, desativar
          if (error.statusCode === 410) {
            await db.update(pushSubscriptions)
              .set({ ativo: false })
              .where(eq(pushSubscriptions.id, subscription.id));
            return { 
              success: false, 
              message: "A subscrição expirou. Por favor, reative as notificações." 
            };
          }
          
          return { 
            success: false, 
            message: `Erro ao enviar: ${error.message || "Erro desconhecido"}` 
          };
        }
      }),
    
    // Enviar push em massa para moradores do condomínio (com filtros opcionais)
    sendBroadcast: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        titulo: z.string().min(1, "Título é obrigatório"),
        mensagem: z.string().min(1, "Mensagem é obrigatória"),
        url: z.string().optional(),
        vapidPublicKey: z.string(),
        vapidPrivateKey: z.string(),
        vapidSubject: z.string(),
        // Filtros de segmentação
        blocos: z.array(z.string()).optional(),
        apartamentos: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Se há filtros, buscar moradores filtrados primeiro
        let moradorIds: number[] = [];
        const hasFiltros = (input.blocos && input.blocos.length > 0) || (input.apartamentos && input.apartamentos.length > 0);
        
        if (hasFiltros) {
          // Buscar moradores que correspondem aos filtros
          let moradoresQuery = db.select({ id: moradores.id }).from(moradores)
            .where(and(
              eq(moradores.condominioId, input.condominioId),
              eq(moradores.ativo, true)
            ));
          
          const moradoresFiltrados = await moradoresQuery;
          
          // Filtrar por bloco e/ou apartamento em memória
          const moradoresCompletos = await db.select().from(moradores)
            .where(and(
              eq(moradores.condominioId, input.condominioId),
              eq(moradores.ativo, true)
            ));
          
          moradorIds = moradoresCompletos
            .filter(m => {
              const matchBloco = !input.blocos || input.blocos.length === 0 || (m.bloco && input.blocos.includes(m.bloco));
              const matchApto = !input.apartamentos || input.apartamentos.length === 0 || input.apartamentos.includes(m.apartamento);
              return matchBloco && matchApto;
            })
            .map(m => m.id);
        }
        
        // Buscar subscriptions ativas (filtradas ou todas)
        let subscriptions;
        if (hasFiltros && moradorIds.length > 0) {
          // Buscar subscriptions dos moradores filtrados
          const allSubs = await db.select().from(pushSubscriptions)
            .where(and(
              eq(pushSubscriptions.condominioId, input.condominioId),
              eq(pushSubscriptions.ativo, true)
            ));
          subscriptions = allSubs.filter(s => s.moradorId && moradorIds.includes(s.moradorId));
        } else if (hasFiltros && moradorIds.length === 0) {
          // Filtros aplicados mas nenhum morador encontrado
          return { 
            success: false, 
            message: "Nenhum morador encontrado com os filtros selecionados.",
            stats: { total: 0, enviados: 0, falhas: 0 }
          };
        } else {
          // Sem filtros - enviar para todos
          subscriptions = await db.select().from(pushSubscriptions)
            .where(and(
              eq(pushSubscriptions.condominioId, input.condominioId),
              eq(pushSubscriptions.ativo, true)
            ));
        }
        
        if (subscriptions.length === 0) {
          return { 
            success: false, 
            message: "Nenhum morador com notificações push ativas.",
            stats: { total: 0, enviados: 0, falhas: 0 }
          };
        }
        
        // Configurar VAPID
        webpush.setVapidDetails(
          input.vapidSubject,
          input.vapidPublicKey,
          input.vapidPrivateKey
        );
        
        // Criar payload da notificação
        const payload = JSON.stringify({
          title: input.titulo,
          body: input.mensagem,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: {
            url: input.url || "/dashboard",
            timestamp: Date.now(),
          },
        });
        
        // Enviar para todas as subscriptions em paralelo
        const results = await Promise.allSettled(
          subscriptions.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                payload
              );
              return { success: true, subscriptionId: sub.id };
            } catch (error: any) {
              // Se a subscrição expirou (410), desativar
              if (error.statusCode === 410) {
                await db.update(pushSubscriptions)
                  .set({ ativo: false })
                  .where(eq(pushSubscriptions.id, sub.id));
              }
              return { success: false, subscriptionId: sub.id, error: error.message };
            }
          })
        );
        
        // Calcular estatísticas
        const enviados = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const falhas = results.length - enviados;
        
        // Registar no histórico
        await db.insert(historicoNotificacoes).values({
          condominioId: input.condominioId,
          tipo: 'push',
          titulo: input.titulo,
          mensagem: input.mensagem,
          destinatarios: subscriptions.length,
          sucessos: enviados,
          falhas: falhas,
          enviadoPor: ctx.user.id,
        }).returning();
        
        return { 
          success: true, 
          message: `Notificação enviada para ${enviados} de ${subscriptions.length} dispositivos.`,
          stats: {
            total: subscriptions.length,
            enviados,
            falhas,
          },
        };
      }),
});

export const historicoNotificacoesRouter = router({
    // Listar histórico
    list: protectedProcedure
      .input(z.object({ 
        condominioId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(historicoNotificacoes)
          .where(eq(historicoNotificacoes.condominioId, input.condominioId))
          .orderBy(desc(historicoNotificacoes.createdAt));
        
        if (input.limit) {
          // @ts-ignore
          query = query.limit(input.limit);
        }
        
        return query;
      }),
    
    // Registrar envio de notificação
    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        tipo: z.enum(['push', 'email', 'whatsapp', 'sistema']),
        titulo: z.string(),
        mensagem: z.string().optional(),
        destinatarios: z.number().optional(),
        sucessos: z.number().optional(),
        falhas: z.number().optional(),
        lembreteId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(historicoNotificacoes).values({
          condominioId: input.condominioId,
          tipo: input.tipo,
          titulo: input.titulo,
          mensagem: input.mensagem || null,
          destinatarios: input.destinatarios || 0,
          sucessos: input.sucessos || 0,
          falhas: input.falhas || 0,
          lembreteId: input.lembreteId || null,
          enviadoPor: ctx.user.id,
        }).returning();
        
        return { success: true, id: Number(result.id) };
      }),
    
    // Estatísticas de notificações
    getStats: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { total: 0, push: 0, email: 0, whatsapp: 0 };
        
        const all = await db.select().from(historicoNotificacoes)
          .where(eq(historicoNotificacoes.condominioId, input.condominioId));
        
        return {
          total: all.length,
          push: all.filter(n => n.tipo === 'push').length,
          email: all.filter(n => n.tipo === 'email').length,
          whatsapp: all.filter(n => n.tipo === 'whatsapp').length,
        };
      }),
  });
