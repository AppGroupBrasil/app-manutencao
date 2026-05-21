
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { moradores, condominios, votacoes, revistas } from "../../../drizzle/schema";
import { eq, like, or, and, inArray, desc, sql } from "drizzle-orm";
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIp } from "../../_core/rateLimit";
import { ENV } from "../../_core/env";
import { verifyCondominioOwnership } from "../../_core/ownership";

export const moradorRouter = router({
  list: protectedProcedure
    .input(z.object({ 
      condominioId: z.number(),
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(200).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      await verifyCondominioOwnership(db, ctx.user.id, input.condominioId);
      
      const query = db.select().from(moradores)
        .where(eq(moradores.condominioId, input.condominioId));
      
      // Se paginação fornecida, aplicar limit+offset
      if (input.page && input.limit) {
        const offset = (input.page - 1) * input.limit;
        return query.limit(input.limit).offset(offset);
      }
      
      // Sem paginação: retornar todos (retrocompatibilidade)
      return query;
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1),
      email: z.string().optional(),
      telefone: z.string().optional(),
      celular: z.string().optional(),
      apartamento: z.string().min(1),
      bloco: z.string().optional(),
      andar: z.string().optional(),
      tipo: z.enum(["proprietario", "inquilino", "familiar", "funcionario"]).optional(),
      cpf: z.string().optional(),
      dataNascimento: z.date().optional(),
      fotoUrl: z.string().optional(),
      observacoes: z.string().optional(),
      dataEntrada: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await verifyCondominioOwnership(db, ctx.user.id, input.condominioId);
      const [result] = await db.insert(moradores).values(input).returning();
      return { id: Number(result.id) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      email: z.string().optional(),
      telefone: z.string().optional(),
      celular: z.string().optional(),
      apartamento: z.string().optional(),
      bloco: z.string().optional(),
      andar: z.string().optional(),
      tipo: z.enum(["proprietario", "inquilino", "familiar", "funcionario"]).optional(),
      cpf: z.string().optional(),
      dataNascimento: z.date().optional(),
      fotoUrl: z.string().optional(),
      observacoes: z.string().optional(),
      dataEntrada: z.date().optional(),
      dataSaida: z.date().optional(),
      ativo: z.boolean().optional(),
      usuarioId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(moradores).set(data).where(eq(moradores.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(moradores).where(eq(moradores.id, input.id));
      return { success: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(moradores).where(eq(moradores.id, input.id)).limit(1);
      return result[0] || null;
    }),

  listByBloco: protectedProcedure
    .input(z.object({ condominioId: z.number(), bloco: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(moradores)
        .where(and(eq(moradores.condominioId, input.condominioId), eq(moradores.bloco, input.bloco)));
    }),

  search: protectedProcedure
    .input(z.object({ condominioId: z.number(), query: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(moradores)
        .where(and(
          eq(moradores.condominioId, input.condominioId),
          or(
            like(moradores.nome, `%${input.query}%`),
            like(moradores.apartamento, `%${input.query}%`),
            like(moradores.bloco, `%${input.query}%`)
          )
        ));
    }),

  vincularUsuario: protectedProcedure
    .input(z.object({ moradorId: z.number(), usuarioId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(moradores).set({ usuarioId: input.usuarioId }).where(eq(moradores.id, input.moradorId));
      return { success: true };
    }),

  // ==================== BLOQUEIO DE VOTAÃ‡ÃƒO ====================
  bloquearVotacao: protectedProcedure
    .input(z.object({ moradorId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(moradores).set({ bloqueadoVotacao: true }).where(eq(moradores.id, input.moradorId));
      return { success: true };
    }),

  desbloquearVotacao: protectedProcedure
    .input(z.object({ moradorId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(moradores).set({ bloqueadoVotacao: false }).where(eq(moradores.id, input.moradorId));
      return { success: true };
    }),

  bloquearVotacaoEmMassa: protectedProcedure
    .input(z.object({ moradorIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(moradores)
        .set({ bloqueadoVotacao: true })
        .where(inArray(moradores.id, input.moradorIds));
      return { success: true, count: input.moradorIds.length };
    }),

  desbloquearVotacaoEmMassa: protectedProcedure
    .input(z.object({ moradorIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(moradores)
        .set({ bloqueadoVotacao: false })
        .where(inArray(moradores.id, input.moradorIds));
      return { success: true, count: input.moradorIds.length };
    }),

  bloquearTodosVotacao: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.update(moradores)
        .set({ bloqueadoVotacao: true })
        .where(eq(moradores.condominioId, input.condominioId));
      return { success: true };
    }),

  desbloquearTodosVotacao: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.update(moradores)
        .set({ bloqueadoVotacao: false })
        .where(eq(moradores.condominioId, input.condominioId));
      return { success: true };
    }),

  // RelatÃ³rio de moradores bloqueados para votaÃ§Ã£o
  relatorioBloqueados: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const bloqueados = await db.select()
        .from(moradores)
        .where(and(
          eq(moradores.condominioId, input.condominioId),
          eq(moradores.bloqueadoVotacao, true)
        ))
        .orderBy(moradores.nome);
      
      // Buscar dados do condomÃ­nio
      const condominio = await db.select().from(condominios)
        .where(eq(condominios.id, input.condominioId))
        .limit(1);
      
      return {
        condominio: condominio[0],
        moradores: bloqueados,
        totalBloqueados: bloqueados.length,
        dataGeracao: new Date()
      };
    }),

  // RelatÃ³rio geral de moradores com marcaÃ§Ã£o de bloqueados
  relatorioGeral: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const todosMoradores = await db.select()
        .from(moradores)
        .where(eq(moradores.condominioId, input.condominioId))
        .orderBy(moradores.bloco, moradores.apartamento, moradores.nome);
      
      // Buscar dados do condomÃ­nio
      const condominio = await db.select().from(condominios)
        .where(eq(condominios.id, input.condominioId))
        .limit(1);
      
      const bloqueados = todosMoradores.filter(m => m.bloqueadoVotacao);
      const liberados = todosMoradores.filter(m => !m.bloqueadoVotacao);
      
      return {
        condominio: condominio[0],
        moradores: todosMoradores,
        totalMoradores: todosMoradores.length,
        totalBloqueados: bloqueados.length,
        totalLiberados: liberados.length,
        dataGeracao: new Date()
      };
    }),

  desvincularUsuario: protectedProcedure
    .input(z.object({ moradorId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(moradores).set({ usuarioId: null }).where(eq(moradores.id, input.moradorId));
      return { success: true };
    }),

  // Verificar se o morador logado estÃ¡ bloqueado para votaÃ§Ã£o
  verificarBloqueioVotacao: protectedProcedure
    .input(z.object({ votacaoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar a votaÃ§Ã£o para obter a revista
      const votacao = await db.select().from(votacoes).where(eq(votacoes.id, input.votacaoId)).limit(1);
      if (!votacao[0]) {
        return { bloqueado: false, telefoneContato: null };
      }
      
      // Buscar a revista para obter o condomÃ­nio
      const revista = await db.select().from(revistas).where(eq(revistas.id, votacao[0].revistaId)).limit(1);
      if (!revista[0]) {
        return { bloqueado: false, telefoneContato: null };
      }
      
      const condominioId = revista[0].condominioId;
      
      // Buscar o morador vinculado ao usuÃ¡rio logado neste condomÃ­nio
      const morador = await db.select().from(moradores)
        .where(and(
          eq(moradores.usuarioId, ctx.user.id),
          eq(moradores.condominioId, condominioId)
        ))
        .limit(1);
      
      if (!morador[0]) {
        // UsuÃ¡rio nÃ£o Ã© morador deste condomÃ­nio - nÃ£o bloquear
        return { bloqueado: false, telefoneContato: null };
      }
      
      // Verificar se estÃ¡ bloqueado
      if (morador[0].bloqueadoVotacao) {
        // Buscar telefone de contato do condomÃ­nio
        const condominio = await db.select().from(condominios)
          .where(eq(condominios.id, condominioId))
          .limit(1);
        
        return {
          bloqueado: true,
          telefoneContato: condominio[0]?.telefoneContato || null
        };
      }
      
      return { bloqueado: false, telefoneContato: null };
    }),

  // Cadastro pÃºblico de morador via token
  createPublic: publicProcedure
    .input(z.object({
      token: z.string(),
      nome: z.string().min(1),
      email: z.string().min(1),
      telefone: z.string().optional(),
      celular: z.string().optional(),
      apartamento: z.string().min(1),
      bloco: z.string().optional(),
      andar: z.string().optional(),
      tipo: z.enum(["proprietario", "inquilino", "familiar", "funcionario"]).optional(),
      cpf: z.string().optional(),
      observacoes: z.string().optional(),
      senha: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar condomÃ­nio pelo token
      const condominio = await db.select().from(condominios).where(eq(condominios.cadastroToken, input.token)).limit(1);
      if (!condominio[0]) {
        throw new Error("Token invÃ¡lido ou expirado");
      }
      
      // Verificar se jÃ¡ existe morador com este email no condomÃ­nio
      const existingMorador = await db.select().from(moradores)
        .where(and(
          eq(moradores.email, input.email),
          eq(moradores.condominioId, condominio[0].id)
        ))
        .limit(1);
      if (existingMorador[0]) {
        throw new Error("JÃ¡ existe um morador cadastrado com este e-mail neste condomÃ­nio");
      }
      
      // Hash da senha
      const bcrypt = await import("bcryptjs");
      const senhaHash = await bcrypt.hash(input.senha, 10);
      
      const { token, senha, ...moradorData } = input;
      const [result] = await db.insert(moradores).values({
        ...moradorData,
        condominioId: condominio[0].id,
        senha: senhaHash,
      }).returning();
      return { id: Number(result.id) };
    }),

  // Cadastro em lote via Excel
  createBatch: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      moradores: z.array(z.object({
        nome: z.string().min(1),
        email: z.string().optional(),
        telefone: z.string().optional(),
        celular: z.string().optional(),
        apartamento: z.string().min(1),
        bloco: z.string().optional(),
        andar: z.string().optional(),
        tipo: z.enum(["proprietario", "inquilino", "familiar", "funcionario"]).optional(),
        cpf: z.string().optional(),
        observacoes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const moradoresData = input.moradores.map(m => ({
        ...m,
        condominioId: input.condominioId,
      }));
      
      if (moradoresData.length === 0) {
        return { count: 0 };
      }
      
      await db.insert(moradores).values(moradoresData).returning();
      return { count: moradoresData.length };
    }),

  // ==================== PORTAL DO MORADOR - AUTENTICAÃ‡ÃƒO ====================
  
  // Login do morador com email e senha
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      senha: z.string().min(4),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: login morador
      const ip = getClientIp(ctx.req);
      const rlKey = `morador-login:${ip}:${input.email}`;
      rateLimiter.check(rlKey, RATE_LIMIT_CONFIGS.login);

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.email, input.email),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        throw new Error("Email nÃ£o encontrado ou morador inativo");
      }
      
      if (!morador.senha) {
        throw new Error("Senha não configurada. Use o link mágico para primeiro acesso.");
      }
      
      // Verificar senha com bcrypt (padrão unificado)
      const bcrypt = await import("bcryptjs");
      const senhaValida = await bcrypt.compare(input.senha, morador.senha);
      
      const crypto = await import('crypto');
      
      if (!senhaValida) {
        // Fallback para SHA-256 (senhas antigas antes da migração)
        const senhaHash = crypto.createHash('sha256').update(input.senha).digest('hex');
        
        if (morador.senha !== senhaHash) {
          throw new Error("Senha incorreta");
        }
        
        // Migrar senha antiga para bcrypt automaticamente
        const novaSenhaHash = await bcrypt.hash(input.senha, 10);
        await db.update(moradores).set({ senha: novaSenhaHash }).where(eq(moradores.id, morador.id));
      }
      
      // Gerar token de sessÃ£o
      const token = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      
      await db.update(moradores).set({
        loginToken: token,
        loginTokenExpira: expira,
        ultimoLogin: new Date(),
      }).where(eq(moradores.id, morador.id));
      
      // Buscar condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, morador.condominioId));
      
      return {
        token,
        morador: {
          id: morador.id,
          nome: morador.nome,
          email: morador.email,
          apartamento: morador.apartamento,
          bloco: morador.bloco,
          fotoUrl: morador.fotoUrl,
        },
        condominio: condominio ? {
          id: condominio.id,
          nome: condominio.nome,
          logoUrl: condominio.logoUrl,
        } : null,
      };
    }),

  // Solicitar link mÃ¡gico de login
  solicitarLinkMagico: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: magic link
      const ip = getClientIp(ctx.req);
      rateLimiter.check(`magiclink:${ip}`, RATE_LIMIT_CONFIGS.magicLink);

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.email, input.email),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        // NÃ£o revelar se o email existe ou nÃ£o
        return { success: true, message: "Se o email estiver cadastrado, vocÃª receberÃ¡ um link de acesso." };
      }
      
      // Gerar token de login
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
      
      await db.update(moradores).set({
        loginToken: token,
        loginTokenExpira: expira,
      }).where(eq(moradores.id, morador.id));
      
      // TODO: Enviar email com o link
      // Por enquanto, retornar o token para testes
      return { 
        success: true, 
        message: "Link de acesso enviado para o email.",
        // Token apenas em desenvolvimento (NUNCA em produção)
        ...(ENV.isProduction ? {} : { _debug_token: token }),
      };
    }),

  // Login via link mÃ¡gico
  loginComToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.loginToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        throw new Error("Token invÃ¡lido ou expirado");
      }
      
      if (morador.loginTokenExpira && new Date(morador.loginTokenExpira) < new Date()) {
        throw new Error("Token expirado. Solicite um novo link.");
      }
      
      // Gerar novo token de sessÃ£o
      const crypto = await import('crypto');
      const novoToken = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      
      await db.update(moradores).set({
        loginToken: novoToken,
        loginTokenExpira: expira,
        ultimoLogin: new Date(),
      }).where(eq(moradores.id, morador.id));
      
      // Buscar condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, morador.condominioId));
      
      return {
        token: novoToken,
        morador: {
          id: morador.id,
          nome: morador.nome,
          email: morador.email,
          apartamento: morador.apartamento,
          bloco: morador.bloco,
          fotoUrl: morador.fotoUrl,
        },
        condominio: condominio ? {
          id: condominio.id,
          nome: condominio.nome,
          logoUrl: condominio.logoUrl,
        } : null,
      };
    }),

  // Definir senha do morador
  definirSenha: publicProcedure
    .input(z.object({
      token: z.string(),
      senha: z.string().min(4),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.loginToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        throw new Error("Token inválido");
      }
      
      // Hash da senha com bcrypt (consistente com createPublic e redefinirSenha)
      const bcrypt = await import('bcryptjs');
      const senhaHash = await bcrypt.hash(input.senha, 10);
      
      // Gerar novo token de sessão
      const crypto = await import('crypto');
      const novoToken = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      
      await db.update(moradores).set({
        senha: senhaHash,
        loginToken: novoToken,
        loginTokenExpira: expira,
        ultimoLogin: new Date(),
      }).where(eq(moradores.id, morador.id));
      
      return { success: true, token: novoToken };
    }),

  // Verificar sessÃ£o do morador
  verificarSessao: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.loginToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        return { valido: false };
      }
      
      if (morador.loginTokenExpira && new Date(morador.loginTokenExpira) < new Date()) {
        return { valido: false };
      }
      
      // Buscar condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, morador.condominioId));
      
      return {
        valido: true,
        morador: {
          id: morador.id,
          nome: morador.nome,
          email: morador.email,
          apartamento: morador.apartamento,
          bloco: morador.bloco,
          fotoUrl: morador.fotoUrl,
          condominioId: morador.condominioId,
        },
        condominio: condominio ? {
          id: condominio.id,
          nome: condominio.nome,
          logoUrl: condominio.logoUrl,
        } : null,
      };
    }),

  // Solicitar recuperaÃ§Ã£o de senha
  solicitarRecuperacaoSenha: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: recuperação de senha
      const ip = getClientIp(ctx.req);
      rateLimiter.check(`morador-pwreset:${ip}`, RATE_LIMIT_CONFIGS.passwordReset);

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.email, input.email),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      // NÃ£o revelar se o email existe ou nÃ£o (seguranÃ§a)
      if (!morador) {
        return { success: true, message: "Se o email estiver cadastrado, vocÃª receberÃ¡ um link para redefinir sua senha." };
      }
      
      // Gerar token de reset
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      
      await db.update(moradores).set({
        resetToken: resetToken,
        resetTokenExpira: expira,
      }).where(eq(moradores.id, morador.id));
      
      // Buscar condomÃ­nio para o email
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, morador.condominioId));
      
      // Enviar email com o link de recuperaÃ§Ã£o
      try {
        const { notifyOwner } = await import('../../_core/notification');
        // Enviar notificaÃ§Ã£o ao owner com os dados (em produÃ§Ã£o, enviar email ao morador)
        await notifyOwner({
          title: `RecuperaÃ§Ã£o de Senha - ${morador.nome}`,
          content: `O morador ${morador.nome} (${morador.email}) do condomÃ­nio ${condominio?.nome || 'N/A'} solicitou recuperaÃ§Ã£o de senha.\n\nToken: ${resetToken}\n\nLink: /morador/redefinir-senha/${resetToken}`,
        });
      } catch (e) {
        console.error('Erro ao enviar notificaÃ§Ã£o:', e);
      }
      
      return { 
        success: true, 
        message: "Se o email estiver cadastrado, vocÃª receberÃ¡ um link para redefinir sua senha.",
        // Token apenas em desenvolvimento (NUNCA em produção)
        ...(ENV.isProduction ? {} : { _debug_token: resetToken }),
      };
    }),

  // Validar token de recuperaÃ§Ã£o
  validarTokenRecuperacao: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.resetToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        return { valido: false, mensagem: "Token invÃ¡lido" };
      }
      
      if (morador.resetTokenExpira && new Date(morador.resetTokenExpira) < new Date()) {
        return { valido: false, mensagem: "Token expirado. Solicite um novo link." };
      }
      
      return { 
        valido: true, 
        email: morador.email,
        nome: morador.nome,
      };
    }),

  // Redefinir senha com token
  redefinirSenha: publicProcedure
    .input(z.object({
      token: z.string(),
      novaSenha: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.resetToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        throw new Error("Token invÃ¡lido");
      }
      
      if (morador.resetTokenExpira && new Date(morador.resetTokenExpira) < new Date()) {
        throw new Error("Token expirado. Solicite um novo link de recuperaÃ§Ã£o.");
      }
      
      // Hash da nova senha com bcrypt
      const bcrypt = await import('bcryptjs');
      const senhaHash = await bcrypt.hash(input.novaSenha, 10);
      
      // Gerar token de sessÃ£o para login automÃ¡tico
      const crypto = await import('crypto');
      const loginToken = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      
      await db.update(moradores).set({
        senha: senhaHash,
        resetToken: null,
        resetTokenExpira: null,
        loginToken: loginToken,
        loginTokenExpira: expira,
        ultimoLogin: new Date(),
      }).where(eq(moradores.id, morador.id));
      
      // Buscar condomÃ­nio
      const [condominio] = await db.select().from(condominios)
        .where(eq(condominios.id, morador.condominioId));
      
      return {
        success: true,
        message: "Senha redefinida com sucesso!",
        token: loginToken,
        morador: {
          id: morador.id,
          nome: morador.nome,
          email: morador.email,
          apartamento: morador.apartamento,
          bloco: morador.bloco,
          fotoUrl: morador.fotoUrl,
        },
        condominio: condominio ? {
          id: condominio.id,
          nome: condominio.nome,
          logoUrl: condominio.logoUrl,
        } : null,
      };
    }),

  // Logout do morador
  logout: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(moradores).set({
        loginToken: null,
        loginTokenExpira: null,
      }).where(eq(moradores.loginToken, input.token));
      
      return { success: true };
    }),
});

