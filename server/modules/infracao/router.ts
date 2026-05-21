import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { 
  tiposInfracao, 
  notificacoesInfracao, 
  respostasInfracao, 
  moradores, 
  condominios 
} from "../../../drizzle/schema";
import { nanoid } from "nanoid";
import { generateInfracoesPDF } from "./pdf";
import { storagePut } from "../../storage";

export const tiposInfracaoRouter = router({
    // Listar tipos de infraÃ§Ã£o
    list: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return db.select().from(tiposInfracao)
          .where(and(
            eq(tiposInfracao.condominioId, input.condominioId),
            eq(tiposInfracao.ativo, true)
          ))
          .orderBy(tiposInfracao.titulo);
      }),
    
    // Criar tipo de infraÃ§Ã£o
    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        titulo: z.string().min(1, "TÃ­tulo Ã© obrigatÃ³rio"),
        descricaoPadrao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(tiposInfracao).values({
          condominioId: input.condominioId,
          titulo: input.titulo,
          descricaoPadrao: input.descricaoPadrao || null,
        }).returning();
        
        return { success: true, id: Number(result.id) };
      }),
    
    // Atualizar tipo de infraÃ§Ã£o
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricaoPadrao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = {};
        if (input.titulo !== undefined) updateData.titulo = input.titulo;
        if (input.descricaoPadrao !== undefined) updateData.descricaoPadrao = input.descricaoPadrao;
        
        await db.update(tiposInfracao)
          .set(updateData)
          .where(eq(tiposInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Excluir tipo de infraÃ§Ã£o (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(tiposInfracao)
          .set({ ativo: false })
          .where(eq(tiposInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Criar tipos padrÃ£o
    createDefaults: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const defaultTypes = [
          { titulo: "Barulho Excessivo", descricaoPadrao: "Foi constatado barulho excessivo proveniente da unidade, em horÃ¡rio nÃ£o permitido pelo regulamento interno do condomÃ­nio." },
          { titulo: "Estacionamento Irregular", descricaoPadrao: "Foi verificado que o veÃ­culo da unidade estÃ¡ estacionado em local nÃ£o permitido ou de forma irregular." },
          { titulo: "Lixo Fora do HorÃ¡rio", descricaoPadrao: "Foi constatado descarte de lixo fora do horÃ¡rio estabelecido pelo regulamento interno." },
          { titulo: "Animais em Ãrea Comum", descricaoPadrao: "Foi verificada a presenÃ§a de animal de estimaÃ§Ã£o em Ã¡rea comum sem a devida guia ou em desacordo com as regras." },
          { titulo: "AlteraÃ§Ã£o de Fachada", descricaoPadrao: "Foi constatada alteraÃ§Ã£o na fachada do imÃ³vel sem autorizaÃ§Ã£o prÃ©via da administraÃ§Ã£o." },
          { titulo: "Uso Indevido de Ãrea Comum", descricaoPadrao: "Foi verificado uso indevido de Ã¡rea comum do condomÃ­nio." },
          { titulo: "Vazamento de Ãgua", descricaoPadrao: "Foi constatado vazamento de Ã¡gua proveniente da unidade, causando prejuÃ­zos Ã s Ã¡reas comuns ou unidades vizinhas." },
          { titulo: "Obras Sem AutorizaÃ§Ã£o", descricaoPadrao: "Foi verificada realizaÃ§Ã£o de obras na unidade sem a devida autorizaÃ§Ã£o da administraÃ§Ã£o." },
        ];
        
        for (const tipo of defaultTypes) {
          await db.insert(tiposInfracao).values({
            condominioId: input.condominioId,
            ...tipo,
          });
        }
        
        return { success: true, count: defaultTypes.length };
      }),
  });

export const notificacoesInfracaoRouter = router({
    // Listar notificaÃ§Ãµes
    list: protectedProcedure
      .input(z.object({ 
        condominioId: z.number(),
        status: z.enum(['pendente', 'respondida', 'resolvida', 'arquivada']).optional(),
        moradorId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [eq(notificacoesInfracao.condominioId, input.condominioId)];
        if (input.status) conditions.push(eq(notificacoesInfracao.status, input.status));
        if (input.moradorId) conditions.push(eq(notificacoesInfracao.moradorId, input.moradorId));
        
        let query = db.select({
          notificacao: notificacoesInfracao,
          morador: moradores,
          tipoInfracao: tiposInfracao,
        })
          .from(notificacoesInfracao)
          .leftJoin(moradores, eq(notificacoesInfracao.moradorId, moradores.id))
          .leftJoin(tiposInfracao, eq(notificacoesInfracao.tipoInfracaoId, tiposInfracao.id))
          .where(and(...conditions))
          .orderBy(desc(notificacoesInfracao.createdAt));
        
        if (input.limit) {
          query = query.limit(input.limit) as typeof query;
        }
        
        return query;
      }),
    
    // Buscar notificaÃ§Ã£o por ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const result = await db.select({
          notificacao: notificacoesInfracao,
          morador: moradores,
          tipoInfracao: tiposInfracao,
        })
          .from(notificacoesInfracao)
          .leftJoin(moradores, eq(notificacoesInfracao.moradorId, moradores.id))
          .leftJoin(tiposInfracao, eq(notificacoesInfracao.tipoInfracaoId, tiposInfracao.id))
          .where(eq(notificacoesInfracao.id, input.id))
          .limit(1);
        
        return result[0] || null;
      }),
    
    // Buscar notificaÃ§Ã£o por token (pÃºblico - para morador responder)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const result = await db.select({
          notificacao: notificacoesInfracao,
          morador: {
            id: moradores.id,
            nome: moradores.nome,
            apartamento: moradores.apartamento,
            bloco: moradores.bloco,
          },
          tipoInfracao: tiposInfracao,
          condominio: {
            id: condominios.id,
            nome: condominios.nome,
            logoUrl: condominios.logoUrl,
          },
        })
          .from(notificacoesInfracao)
          .leftJoin(moradores, eq(notificacoesInfracao.moradorId, moradores.id))
          .leftJoin(tiposInfracao, eq(notificacoesInfracao.tipoInfracaoId, tiposInfracao.id))
          .leftJoin(condominios, eq(notificacoesInfracao.condominioId, condominios.id))
          .where(eq(notificacoesInfracao.linkPublico, input.token))
          .limit(1);
        
        return result[0] || null;
      }),
    
    // Criar notificaÃ§Ã£o
    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        moradorId: z.number(),
        tipoInfracaoId: z.number().optional(),
        titulo: z.string().min(1, "TÃ­tulo Ã© obrigatÃ³rio"),
        descricao: z.string().min(1, "DescriÃ§Ã£o Ã© obrigatÃ³ria"),
        imagens: z.array(z.string()).optional(),
        dataOcorrencia: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Gerar token Ãºnico para link pÃºblico
        const linkPublico = nanoid(32);
        
        // Upload base64 images to S3 (safety net)
        const uploadedUrls: string[] = [];
        if (input.imagens) {
          for (const img of input.imagens) {
            if (img.startsWith('data:')) {
              try {
                const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const uniqueId = nanoid(10);
                const fileKey = `notificacoes/${ctx.user.id}/${uniqueId}.jpg`;
                const { url } = await storagePut(fileKey, buffer, "image/jpeg");
                uploadedUrls.push(url);
              } catch (e) {
                console.error("Erro ao fazer upload de imagem:", e);
              }
            } else {
              uploadedUrls.push(img);
            }
          }
        }
        
        const [result] = await db.insert(notificacoesInfracao).values({
          condominioId: input.condominioId,
          moradorId: input.moradorId,
          tipoInfracaoId: input.tipoInfracaoId || null,
          titulo: input.titulo,
          descricao: input.descricao,
          imagens: uploadedUrls,
          dataOcorrencia: input.dataOcorrencia ? new Date(input.dataOcorrencia) : null,
          linkPublico,
          criadoPor: ctx.user.id,
        }).returning();
        
        const notificacaoId = Number(result.id);
        
        return { 
          success: true, 
          id: notificacaoId,
          linkPublico,
        };
      }),
    
    // Atualizar status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pendente', 'respondida', 'resolvida', 'arquivada']),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(notificacoesInfracao)
          .set({ status: input.status })
          .where(eq(notificacoesInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Marcar como enviado por WhatsApp
    markWhatsappSent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(notificacoesInfracao)
          .set({ enviadoWhatsapp: true })
          .where(eq(notificacoesInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Marcar como enviado por Email
    markEmailSent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(notificacoesInfracao)
          .set({ enviadoEmail: true })
          .where(eq(notificacoesInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Salvar URL do PDF
    savePdfUrl: protectedProcedure
      .input(z.object({
        id: z.number(),
        pdfUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(notificacoesInfracao)
          .set({ pdfUrl: input.pdfUrl })
          .where(eq(notificacoesInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Contar notificações por status
    countByStatus: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { pendente: 0, respondida: 0, resolvida: 0, arquivada: 0, total: 0 };
        
        const result = await db.select({
          status: notificacoesInfracao.status,
          count: sql<number>`count(*)`,
        }).from(notificacoesInfracao)
          .where(eq(notificacoesInfracao.condominioId, input.condominioId))
          .groupBy(notificacoesInfracao.status);
        
        const counts = { pendente: 0, respondida: 0, resolvida: 0, arquivada: 0, total: 0 };
        for (const row of result) {
          const status = row.status as keyof typeof counts;
          if (status in counts) counts[status] = Number(row.count);
          counts.total += Number(row.count);
        }
        
        return counts;
      }),
  });

export const respostasInfracaoRouter = router({
    // Listar respostas de uma notificaÃ§Ã£o
    list: publicProcedure
      .input(z.object({ notificacaoId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return db.select().from(respostasInfracao)
          .where(eq(respostasInfracao.notificacaoId, input.notificacaoId))
          .orderBy(respostasInfracao.createdAt);
      }),
    
    // Adicionar resposta (sÃ­ndico)
    createSindico: protectedProcedure
      .input(z.object({
        notificacaoId: z.number(),
        mensagem: z.string().min(1, "Mensagem Ã© obrigatÃ³ria"),
        imagens: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Upload base64 images to S3
        const uploadedUrls: string[] = [];
        if (input.imagens) {
          for (const img of input.imagens) {
            if (img.startsWith('data:')) {
              try {
                const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const uniqueId = nanoid(10);
                const fileKey = `notificacoes/${ctx.user.id}/${uniqueId}.jpg`;
                const { url } = await storagePut(fileKey, buffer, "image/jpeg");
                uploadedUrls.push(url);
              } catch (e) {
                console.error("Erro ao fazer upload de imagem:", e);
              }
            } else {
              uploadedUrls.push(img);
            }
          }
        }
        
        const [result] = await db.insert(respostasInfracao).values({
          notificacaoId: input.notificacaoId,
          autorTipo: 'sindico',
          autorId: ctx.user.id,
          autorNome: ctx.user.name || 'SÃ­ndico',
          mensagem: input.mensagem,
          imagens: uploadedUrls,
        }).returning();
        
        return { success: true, id: Number(result.id) };
      }),
    
    // Adicionar resposta (morador - pÃºblico via token)
    createMorador: publicProcedure
      .input(z.object({
        token: z.string(),
        mensagem: z.string().min(1, "Mensagem Ã© obrigatÃ³ria"),
        imagens: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar notificaÃ§Ã£o pelo token
        const notificacao = await db.select().from(notificacoesInfracao)
          .where(eq(notificacoesInfracao.linkPublico, input.token))
          .limit(1);
        
        if (!notificacao[0]) {
          throw new Error("NotificaÃ§Ã£o nÃ£o encontrada");
        }
        
        // Buscar dados do morador
        const morador = await db.select().from(moradores)
          .where(eq(moradores.id, notificacao[0].moradorId))
          .limit(1);
        
        // Upload base64 images to S3
        const uploadedUrls: string[] = [];
        if (input.imagens) {
          for (const img of input.imagens) {
            if (img.startsWith('data:')) {
              try {
                const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const uniqueId = nanoid(10);
                const fileKey = `notificacoes/morador/${notificacao[0].moradorId}/${uniqueId}.jpg`;
                const { url } = await storagePut(fileKey, buffer, "image/jpeg");
                uploadedUrls.push(url);
              } catch (e) {
                console.error("Erro ao fazer upload de imagem:", e);
              }
            } else {
              uploadedUrls.push(img);
            }
          }
        }
        
        const [result] = await db.insert(respostasInfracao).values({
          notificacaoId: notificacao[0].id,
          autorTipo: 'morador',
          autorId: notificacao[0].moradorId,
          autorNome: morador[0]?.nome || 'Morador',
          mensagem: input.mensagem,
          imagens: uploadedUrls,
        }).returning();
        
        // Atualizar status da notificaÃ§Ã£o para "respondida"
        await db.update(notificacoesInfracao)
          .set({ status: 'respondida' })
          .where(eq(notificacoesInfracao.id, notificacao[0].id));
        
        return { success: true, id: Number(result.id) };
      }),
    
    // Contar respostas nÃ£o lidas (para badge)
    countUnread: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return 0;
        
        // Buscar respostas de moradores nÃ£o lidas pelo sÃ­ndico
        const notificacoes = await db.select({ id: notificacoesInfracao.id })
          .from(notificacoesInfracao)
          .where(eq(notificacoesInfracao.condominioId, input.condominioId));
        
        if (notificacoes.length === 0) return 0;
        
        const notificacaoIds = notificacoes.map(n => n.id);
        const respostasNaoLidas = await db.select().from(respostasInfracao)
          .where(and(
            inArray(respostasInfracao.notificacaoId, notificacaoIds),
            eq(respostasInfracao.autorTipo, 'morador'),
            eq(respostasInfracao.lidaPeloSindico, false)
          ));
        
        return respostasNaoLidas.length;
      }),
    
    // Buscar novas respostas nÃ£o lidas (para alerta)
    getUnread: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        // Buscar notificaÃ§Ãµes do condomÃ­nio
        const notificacoes = await db.select()
          .from(notificacoesInfracao)
          .where(eq(notificacoesInfracao.condominioId, input.condominioId));
        
        if (notificacoes.length === 0) return [];
        
        const notificacaoIds = notificacoes.map(n => n.id);
        
        // Buscar respostas de moradores nÃ£o lidas
        const respostasNaoLidas = await db.select().from(respostasInfracao)
          .where(and(
            inArray(respostasInfracao.notificacaoId, notificacaoIds),
            eq(respostasInfracao.autorTipo, 'morador'),
            eq(respostasInfracao.lidaPeloSindico, false)
          ))
          .orderBy(desc(respostasInfracao.createdAt))
          .limit(10);
        
        // Enriquecer com dados da notificaÃ§Ã£o
        const respostasComDados = await Promise.all(
          respostasNaoLidas.map(async (resposta) => {
            const notificacao = notificacoes.find(n => n.id === resposta.notificacaoId);
            return {
              ...resposta,
              notificacaoTitulo: notificacao?.titulo || 'NotificaÃ§Ã£o',
              notificacaoId: notificacao?.id,
            };
          })
        );
        
        return respostasComDados;
      }),
    
    // Marcar resposta como lida
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(respostasInfracao)
          .set({ lidaPeloSindico: true })
          .where(eq(respostasInfracao.id, input.id));
        
        return { success: true };
      }),
    
    // Marcar todas as respostas de uma notificaÃ§Ã£o como lidas
    markAllAsRead: protectedProcedure
      .input(z.object({ notificacaoId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(respostasInfracao)
          .set({ lidaPeloSindico: true })
          .where(and(
            eq(respostasInfracao.notificacaoId, input.notificacaoId),
            eq(respostasInfracao.autorTipo, 'morador')
          ));
        
        return { success: true };
      }),
  });

export const relatorioInfracoesRouter = router({
    // Gerar relatÃ³rio PDF de infraÃ§Ãµes
    gerar: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        moradorId: z.number().optional(),
        status: z.enum(['pendente', 'respondida', 'resolvida', 'arquivada']).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar condomÃ­nio
        const condominio = await db.select().from(condominios)
          .where(eq(condominios.id, input.condominioId))
          .limit(1);
        
        if (!condominio[0]) throw new Error("CondomÃ­nio nÃ£o encontrado");
        
        // Construir query com filtros
        let conditions = [eq(notificacoesInfracao.condominioId, input.condominioId)];
        
        if (input.moradorId) {
          conditions.push(eq(notificacoesInfracao.moradorId, input.moradorId));
        }
        
        if (input.status) {
          conditions.push(eq(notificacoesInfracao.status, input.status));
        }
        
        // Buscar notificaÃ§Ãµes
        let notificacoes = await db.select().from(notificacoesInfracao)
          .where(and(...conditions))
          .orderBy(desc(notificacoesInfracao.createdAt));
        
        // Filtrar por data se especificado
        if (input.dataInicio) {
          const dataInicio = new Date(input.dataInicio);
          notificacoes = notificacoes.filter(n => new Date(n.createdAt) >= dataInicio);
        }
        
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          notificacoes = notificacoes.filter(n => new Date(n.createdAt) <= dataFim);
        }
        
        // Buscar dados dos moradores
        const moradoresIdsSet = new Set(notificacoes.map(n => n.moradorId));
        const moradoresIds: number[] = [];
        moradoresIdsSet.forEach(id => moradoresIds.push(id));
        const moradoresData = moradoresIds.length > 0 
          ? await db.select().from(moradores).where(inArray(moradores.id, moradoresIds))
          : [];
        
        // Buscar tipos de infraÃ§Ã£o
        const tiposIdsSet = new Set(notificacoes.map(n => n.tipoInfracaoId).filter(Boolean));
        const tiposIds: number[] = [];
        tiposIdsSet.forEach(id => tiposIds.push(id as number));
        const tiposData = tiposIds.length > 0
          ? await db.select().from(tiposInfracao).where(inArray(tiposInfracao.id, tiposIds))
          : [];
        
        // Buscar respostas para cada notificaÃ§Ã£o
        const notificacoesComDados = await Promise.all(
          notificacoes.map(async (notif) => {
            const respostas = await db.select().from(respostasInfracao)
              .where(eq(respostasInfracao.notificacaoId, notif.id))
              .orderBy(respostasInfracao.createdAt);
            
            const morador = moradoresData.find(m => m.id === notif.moradorId);
            const tipo = tiposData.find(t => t.id === notif.tipoInfracaoId);
            
            return {
              ...notif,
              moradorNome: morador?.nome || 'N/A',
              moradorBloco: morador?.bloco || '',
              moradorApartamento: morador?.apartamento || '',
              tipoTitulo: tipo?.titulo || 'N/A',
              respostas,
              totalRespostas: respostas.length,
            };
          })
        );
        
        // Calcular estatÃ­sticas
        const estatisticas = {
          total: notificacoesComDados.length,
          pendentes: notificacoesComDados.filter(n => n.status === 'pendente').length,
          respondidas: notificacoesComDados.filter(n => n.status === 'respondida').length,
          resolvidas: notificacoesComDados.filter(n => n.status === 'resolvida').length,
          arquivadas: notificacoesComDados.filter(n => n.status === 'arquivada').length,
        };
        
        // Gerar HTML do relatÃ³rio
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const periodoTexto = input.dataInicio && input.dataFim 
          ? `PerÃ­odo: ${new Date(input.dataInicio).toLocaleDateString('pt-BR')} a ${new Date(input.dataFim).toLocaleDateString('pt-BR')}`
          : input.dataInicio 
            ? `A partir de: ${new Date(input.dataInicio).toLocaleDateString('pt-BR')}`
            : input.dataFim
              ? `AtÃ©: ${new Date(input.dataFim).toLocaleDateString('pt-BR')}`
              : 'Todos os perÃ­odos';
        
        const moradorFiltro = input.moradorId 
          ? moradoresData.find(m => m.id === input.moradorId)?.nome || ''
          : '';
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>RelatÃ³rio de InfraÃ§Ãµes - ${condominio[0].nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #333; line-height: 1.4; }
    .container { max-width: 100%; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
    .header h1 { font-size: 24px; color: #1e40af; margin-bottom: 5px; }
    .header h2 { font-size: 16px; color: #64748b; font-weight: normal; }
    .header .data { font-size: 11px; color: #94a3b8; margin-top: 10px; }
    .filtros { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .filtros h3 { font-size: 12px; color: #475569; margin-bottom: 8px; }
    .filtros p { font-size: 11px; color: #64748b; }
    .estatisticas { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
    .stat-card { flex: 1; min-width: 100px; background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; }
    .stat-card .numero { font-size: 24px; font-weight: bold; color: #1e40af; }
    .stat-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .stat-card.pendente .numero { color: #f59e0b; }
    .stat-card.respondida .numero { color: #3b82f6; }
    .stat-card.resolvida .numero { color: #22c55e; }
    .stat-card.arquivada .numero { color: #6b7280; }
    .infracoes-lista { margin-top: 20px; }
    .infracoes-lista h3 { font-size: 14px; color: #1e40af; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .infracao-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
    .infracao-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .infracao-titulo { font-size: 13px; font-weight: 600; color: #1e293b; }
    .infracao-status { font-size: 10px; padding: 3px 8px; border-radius: 12px; font-weight: 500; }
    .status-pendente { background: #fef3c7; color: #92400e; }
    .status-respondida { background: #dbeafe; color: #1e40af; }
    .status-resolvida { background: #dcfce7; color: #166534; }
    .status-arquivada { background: #f3f4f6; color: #4b5563; }
    .infracao-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
    .info-item { font-size: 11px; }
    .info-item .label { color: #64748b; }
    .info-item .valor { color: #1e293b; font-weight: 500; }
    .infracao-descricao { font-size: 11px; color: #475569; background: #f8fafc; padding: 10px; border-radius: 4px; margin-top: 10px; }
    .infracao-respostas { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
    .infracao-respostas .titulo { font-size: 11px; color: #64748b; margin-bottom: 8px; }
    .resposta-item { font-size: 10px; padding: 8px; background: #f1f5f9; border-radius: 4px; margin-bottom: 5px; }
    .resposta-item.morador { background: #fef3c7; }
    .resposta-item.sindico { background: #dbeafe; }
    .resposta-autor { font-weight: 600; color: #1e293b; }
    .resposta-data { color: #94a3b8; font-size: 9px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
    @media print { .container { padding: 10px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RelatÃ³rio de InfraÃ§Ãµes</h1>
      <h2>${condominio[0].nome}</h2>
      <p class="data">Gerado em ${dataAtual}</p>
    </div>
    
    <div class="filtros">
      <h3>Filtros Aplicados</h3>
      <p><strong>PerÃ­odo:</strong> ${periodoTexto}</p>
      ${moradorFiltro ? `<p><strong>Morador:</strong> ${moradorFiltro}</p>` : ''}
      ${input.status ? `<p><strong>Status:</strong> ${input.status.charAt(0).toUpperCase() + input.status.slice(1)}</p>` : ''}
    </div>
    
    <div class="estatisticas">
      <div class="stat-card">
        <div class="numero">${estatisticas.total}</div>
        <div class="label">Total</div>
      </div>
      <div class="stat-card pendente">
        <div class="numero">${estatisticas.pendentes}</div>
        <div class="label">Pendentes</div>
      </div>
      <div class="stat-card respondida">
        <div class="numero">${estatisticas.respondidas}</div>
        <div class="label">Respondidas</div>
      </div>
      <div class="stat-card resolvida">
        <div class="numero">${estatisticas.resolvidas}</div>
        <div class="label">Resolvidas</div>
      </div>
      <div class="stat-card arquivada">
        <div class="numero">${estatisticas.arquivadas}</div>
        <div class="label">Arquivadas</div>
      </div>
    </div>
    
    <div class="infracoes-lista">
      <h3>Lista de InfraÃ§Ãµes (${notificacoesComDados.length})</h3>
      ${notificacoesComDados.map(notif => `
        <div class="infracao-item">
          <div class="infracao-header">
            <div class="infracao-titulo">${notif.titulo}</div>
            <span class="infracao-status status-${notif.status || 'pendente'}">${(notif.status || 'pendente').charAt(0).toUpperCase() + (notif.status || 'pendente').slice(1)}</span>
          </div>
          <div class="infracao-info">
            <div class="info-item">
              <div class="label">Morador</div>
              <div class="valor">${notif.moradorNome}</div>
            </div>
            <div class="info-item">
              <div class="label">Unidade</div>
              <div class="valor">${notif.moradorBloco ? `Bloco ${notif.moradorBloco}, ` : ''}Apto ${notif.moradorApartamento}</div>
            </div>
            <div class="info-item">
              <div class="label">Data</div>
              <div class="valor">${new Date(notif.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="info-item">
              <div class="label">Tipo</div>
              <div class="valor">${notif.tipoTitulo}</div>
            </div>
            <div class="info-item">
              <div class="label">Respostas</div>
              <div class="valor">${notif.totalRespostas}</div>
            </div>
          </div>
          ${notif.descricao ? `<div class="infracao-descricao">${notif.descricao}</div>` : ''}
          ${notif.respostas.length > 0 ? `
            <div class="infracao-respostas">
              <div class="titulo">HistÃ³rico de Respostas:</div>
              ${notif.respostas.slice(0, 5).map(resp => `
                <div class="resposta-item ${resp.autorTipo}">
                  <span class="resposta-autor">${resp.autorNome} (${resp.autorTipo === 'morador' ? 'Morador' : 'SÃ­ndico'}):</span>
                  <span class="resposta-data">${new Date(resp.createdAt).toLocaleDateString('pt-BR')} ${new Date(resp.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <p style="margin-top: 4px;">${resp.mensagem.substring(0, 200)}${resp.mensagem.length > 200 ? '...' : ''}</p>
                </div>
              `).join('')}
              ${notif.respostas.length > 5 ? `<p style="font-size: 10px; color: #94a3b8; margin-top: 5px;">+ ${notif.respostas.length - 5} respostas adicionais</p>` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}
      ${notificacoesComDados.length === 0 ? '<p style="text-align: center; color: #94a3b8; padding: 40px;">Nenhuma infraÃ§Ã£o encontrada com os filtros selecionados.</p>' : ''}
    </div>
    
    <div class="footer">
      <p>RelatÃ³rio gerado automaticamente pelo sistema RevistaDigital</p>
      <p>${condominio[0].nome} - ${dataAtual}</p>
    </div>
  </div>
</body>
</html>
        `;
        
        // Gerar PDF
        const pdfBuffer = await generateInfracoesPDF(htmlContent);
        const base64 = pdfBuffer.toString('base64');
        
        return {
          success: true,
          pdf: base64,
          filename: `relatorio-infracoes-${condominio[0].nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
          estatisticas,
        };
      }),
    
    // Listar moradores para filtro
    listarMoradores: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        // Buscar moradores que tÃªm notificaÃ§Ãµes
        const notificacoes = await db.select({ moradorId: notificacoesInfracao.moradorId })
          .from(notificacoesInfracao)
          .where(eq(notificacoesInfracao.condominioId, input.condominioId));
        
        const moradoresIdsSet = new Set(notificacoes.map(n => n.moradorId));
        const moradoresIds: number[] = [];
        moradoresIdsSet.forEach(id => moradoresIds.push(id));
        
        if (moradoresIds.length === 0) return [];
        
        const moradoresData = await db.select({
          id: moradores.id,
          nome: moradores.nome,
          bloco: moradores.bloco,
          apartamento: moradores.apartamento,
        }).from(moradores).where(inArray(moradores.id, moradoresIds));
        
        return moradoresData;
      }),
  });

