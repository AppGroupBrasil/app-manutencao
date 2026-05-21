import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSessionCookieOptions } from "../../_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIp } from "../../_core/rateLimit";
import { ENV } from "../../_core/env";
import { sendEmail, isEmailConfigured } from "../../_core/email";

export const authRouter = router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { senha, resetToken, resetTokenExpira, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // ==================== LOGIN LOCAL PARA SÍNDICOS ====================
    
    // Registar novo síndico com email/senha
    registar: publicProcedure
      .input(z.object({
        nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("Email inválido"),
        senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        tipoConta: z.enum(["sindico", "administradora"]).default("sindico"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: registros
        const ip = getClientIp(ctx.req);
        rateLimiter.check(`register:${ip}`, RATE_LIMIT_CONFIGS.register);

        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se email já existe
        const existingUser = await db.select().from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        if (existingUser.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email já está cadastrado" });
        }
        
        // Hash da senha com bcrypt
        const bcrypt = await import('bcryptjs');
        const senhaHash = await bcrypt.hash(input.senha, 10);
        
        // Gerar openId único para utilizadores locais
        const crypto = await import('crypto');
        const openId = `local_${crypto.randomBytes(16).toString('hex')}`;
        
        // Criar utilizador
        const [result] = await db.insert(users).values({
          openId,
          email: input.email,
          name: input.nome,
          senha: senhaHash,
          loginMethod: 'local',
          role: 'sindico',
          tipoConta: input.tipoConta,
          lastSignedIn: new Date(),
        }).returning();
        
        // Criar sessão (cookie + token)
        const { sdk } = await import('../../_core/sdk');
        const sessionToken = await sdk.createSessionToken(openId, { name: input.nome });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        // Notificar masters sobre novo cadastro (fire-and-forget)
        if (isEmailConfigured()) {
          const masters = await db.select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.role, 'master'));
          
          for (const master of masters) {
            if (master.email) {
              sendEmail({
                to: master.email,
                subject: `[App Manutenção] Novo cadastro: ${input.nome}`,
                html: `<p>Olá ${master.name || 'Master'},</p>
                       <p>Um novo usuário se cadastrou no sistema:</p>
                       <ul>
                         <li><strong>Nome:</strong> ${input.nome}</li>
                         <li><strong>Email:</strong> ${input.email}</li>
                         <li><strong>Tipo:</strong> ${input.tipoConta}</li>
                         <li><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                       </ul>
                       <p>Acesse o painel Master para gerenciar.</p>`,
              }).catch(() => {/* ignore email errors */});
            }
          }
        }

        return {
          success: true,
          message: "Conta criada com sucesso!",
          // Token retornado no body para WebViews que não persistem cookies
          token: sessionToken,
          user: {
            id: result.id,
            nome: input.nome,
            email: input.email,
          },
        };
      }),
    
    // Login com email/senha
    loginLocal: publicProcedure
      .input(z.object({
        email: z.string().email("Email inválido"),
        senha: z.string().min(1, "Senha é obrigatória"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: login
        const ip = getClientIp(ctx.req);
        const rlKey = `login:${ip}:${input.email}`;
        rateLimiter.check(rlKey, RATE_LIMIT_CONFIGS.login);

        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar utilizador por email
        const [user] = await db.select().from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }
        
        // Verificar se tem senha (login local)
        if (!user.senha) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Esta conta usa login social. Por favor, use o botão de login com Google/Apple." });
        }
        
        // Verificar senha
        const bcrypt = await import('bcryptjs');
        const senhaValida = await bcrypt.compare(input.senha, user.senha);
        
        if (!senhaValida) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }
        
        // Verificar se usuário está bloqueado
        if (user.bloqueado) {
          throw new TRPCError({ code: "FORBIDDEN", message: user.motivoBloqueio || "Para continuar a utilizar escolha um dos planos pagos." });
        }
        
        // Atualizar último login
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        
        // Criar sessão (cookie + token)
        const { sdk } = await import('../../_core/sdk');
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || '' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        // Login bem-sucedido: resetar rate limiter
        rateLimiter.reset(rlKey);
        
        return {
          success: true,
          message: "Login realizado com sucesso!",
          // Token retornado no body para WebViews que não persistem cookies
          token: sessionToken,
          user: {
            id: user.id,
            nome: user.name,
            email: user.email,
          },
        };
      }),
    
    // Solicitar recuperação de senha
    solicitarRecuperacao: publicProcedure
      .input(z.object({
        email: z.string().email("Email inválido"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: recuperação de senha
        const ip = getClientIp(ctx.req);
        rateLimiter.check(`pwreset:${ip}`, RATE_LIMIT_CONFIGS.passwordReset);

        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar utilizador por email
        const [user] = await db.select().from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        // Não revelar se o email existe ou não (segurança)
        if (!user) {
          return { 
            success: true, 
            message: "Se o email estiver cadastrado, você receberá um link para redefinir sua senha." 
          };
        }
        
        // Gerar token de reset
        const crypto = await import('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        
        await db.update(users).set({
          resetToken: resetToken,
          resetTokenExpira: expira,
        }).where(eq(users.id, user.id));
        
        // Enviar notificação (em produção, enviar email)
        try {
          const { notifyOwner } = await import('../../_core/notification');
          await notifyOwner({
            title: `Recuperação de Senha - ${user.name || user.email}`,
            content: `O utilizador ${user.name || 'N/A'} (${user.email}) solicitou recuperação de senha.\n\nToken: ${resetToken}\n\nLink: /redefinir-senha/${resetToken}`,
          });
        } catch (e) {
          console.error('Erro ao enviar notificação:', e);
        }
        
        return { 
          success: true, 
          message: "Se o email estiver cadastrado, você receberá um link para redefinir sua senha.",
          // Token apenas em desenvolvimento (NUNCA em produção)
          ...(ENV.isProduction ? {} : { _debug_token: resetToken }),
        };
      }),
    
    // Validar token de recuperação
    validarTokenRecuperacao: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [user] = await db.select().from(users)
          .where(eq(users.resetToken, input.token))
          .limit(1);
        
        if (!user) {
          return { valido: false, mensagem: "Token inválido" };
        }
        
        if (user.resetTokenExpira && new Date(user.resetTokenExpira) < new Date()) {
          return { valido: false, mensagem: "Token expirado. Solicite um novo link." };
        }
        
        return { 
          valido: true, 
          email: user.email,
          nome: user.name,
        };
      }),
    
    // Redefinir senha com token
    redefinirSenha: publicProcedure
      .input(z.object({
        token: z.string(),
        novaSenha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [user] = await db.select().from(users)
          .where(eq(users.resetToken, input.token))
          .limit(1);
        
        if (!user) {
          throw new Error("Token inválido");
        }
        
        if (user.resetTokenExpira && new Date(user.resetTokenExpira) < new Date()) {
          throw new Error("Token expirado. Solicite um novo link de recuperação.");
        }
        
        // Hash da nova senha com bcrypt
        const bcrypt = await import('bcryptjs');
        const senhaHash = await bcrypt.hash(input.novaSenha, 10);
        
        // Atualizar senha e limpar token
        await db.update(users).set({
          senha: senhaHash,
          resetToken: null,
          resetTokenExpira: null,
          lastSignedIn: new Date(),
        }).where(eq(users.id, user.id));
        
        // Criar sessão (cookie + token) para login automático
        const { sdk } = await import('../../_core/sdk');
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || '' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        return {
          success: true,
          message: "Senha redefinida com sucesso!",
          // Token retornado no body para WebViews que não persistem cookies
          token: sessionToken,
          user: {
            id: user.id,
            nome: user.name,
            email: user.email,
          },
        };
      }),
    
    // ==================== PERFIL DO USUÁRIO ====================
    
    // Obter dados do perfil
    getPerfil: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [user] = await db.select({
        id: users.id,
        nome: users.name,
        email: users.email,
        telefone: users.phone,
        avatarUrl: users.avatarUrl,
        tipoConta: users.tipoConta,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      
      if (!user) {
        throw new Error("Usuário não encontrado");
      }
      
      return user;
    }),
    
    // Atualizar dados do perfil
    atualizarPerfil: protectedProcedure
      .input(z.object({
        nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
        telefone: z.string().optional().nullable(),
        avatarUrl: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = {};
        
        if (input.nome !== undefined) updateData.name = input.nome;
        if (input.telefone !== undefined) updateData.phone = input.telefone;
        if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
        
        if (Object.keys(updateData).length === 0) {
          throw new Error("Nenhum dado para atualizar");
        }
        
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
        
        return {
          success: true,
          message: "Perfil atualizado com sucesso!",
        };
      }),
    
    // Alterar senha
    alterarSenha: protectedProcedure
      .input(z.object({
        senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
        novaSenha: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar usuário com senha
        const [user] = await db.select().from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        
        if (!user) {
          throw new Error("Usuário não encontrado");
        }
        
        // Verificar se tem senha (login local)
        if (!user.senha) {
          throw new Error("Esta conta usa login social e não possui senha local.");
        }
        
        // Verificar senha atual
        const bcrypt = await import('bcryptjs');
        const senhaValida = await bcrypt.compare(input.senhaAtual, user.senha);
        
        if (!senhaValida) {
          throw new Error("Senha atual incorreta");
        }
        
        // Hash da nova senha
        const novaSenhaHash = await bcrypt.hash(input.novaSenha, 10);
        
        // Atualizar senha
        await db.update(users).set({
          senha: novaSenhaHash,
        }).where(eq(users.id, ctx.user.id));
        
        return {
          success: true,
          message: "Senha alterada com sucesso!",
        };
      }),
    
    // Atualizar email (com verificação de duplicidade)
    atualizarEmail: protectedProcedure
      .input(z.object({
        novoEmail: z.string().email("Email inválido"),
        senha: z.string().min(1, "Senha é obrigatória para alterar o email"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar usuário atual
        const [user] = await db.select().from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        
        if (!user) {
          throw new Error("Usuário não encontrado");
        }
        
        // Verificar senha
        if (!user.senha) {
          throw new Error("Esta conta usa login social e não pode alterar o email.");
        }
        
        const bcrypt = await import('bcryptjs');
        const senhaValida = await bcrypt.compare(input.senha, user.senha);
        
        if (!senhaValida) {
          throw new Error("Senha incorreta");
        }
        
        // Verificar se o novo email já existe
        const [existingUser] = await db.select().from(users)
          .where(and(
            eq(users.email, input.novoEmail),
            sql`${users.id} != ${ctx.user.id}`
          ))
          .limit(1);
        
        if (existingUser) {
          throw new Error("Este email já está em uso por outra conta");
        }
        
        // Atualizar email
        await db.update(users).set({
          email: input.novoEmail,
        }).where(eq(users.id, ctx.user.id));
        
        return {
          success: true,
          message: "Email atualizado com sucesso!",
        };
      }),
  });
