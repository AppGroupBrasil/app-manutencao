import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { condominios, funcionarios, users, usuarioAcessos, usuarioCondominios } from "../../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSessionCookieOptions } from "../../_core/cookies";
import { COOKIE_NAME, SENHA_ERR_MSG, SENHA_REGEX } from "@shared/const";
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIp } from "../../_core/rateLimit";
import { ENV } from "../../_core/env";
import { sendEmail, isEmailConfigured, sendRecuperacaoSenhaEmail } from "../../_core/email";
import {
  findFuncionarioByLoginEmail,
  findFuncionarioByResetToken,
} from "../../_core/funcionarioCompat";
import { prepararUnidade } from "../../_core/seedUnidade";
import { fimDoTeste, DIAS_DE_TESTE } from "../../_core/teste";
import { SEGMENTOS_VALIDOS } from "../../../shared/modules/registry";
import { labelsDoSegmento } from "../../../shared/vocabulario";

/**
 * Registra a entrada do gestor.
 *
 * Fire-and-forget: falhar aqui não pode impedir ninguém de entrar — é
 * estatística para a plataforma cobrar, não parte da autenticação.
 */
async function registrarAcesso(userId: number, ip: string) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(usuarioAcessos).values({ userId, ip });
  } catch (erro) {
    console.error("[acessos] falha ao registrar entrada:", erro);
  }
}

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
    
    /**
     * Cadastro de quem chega sozinho, com 7 dias de teste.
     *
     * Cria três coisas de uma vez: a conta, a primeira organização e o vínculo
     * de chefe entre elas. Antes esta rota criava só a conta — a pessoa
     * entrava e não tinha onde trabalhar, porque criar organização é ato de
     * gestor-chefe e ela não era chefe de nada.
     */
    registar: publicProcedure
      .input(z.object({
        nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("Email inválido"),
        senha: z.string().regex(SENHA_REGEX, SENHA_ERR_MSG),
        telefone: z.string().max(30).optional(),
        /** Nome da empresa, condomínio ou unidade que ele vai administrar. */
        organizacao: z.string().min(2).max(255),
        segmento: z.enum(SEGMENTOS_VALIDOS).default("generico"),
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
        
        // Conta, organização e vínculo numa transação: conta sem organização
        // é conta que entra e não tem onde trabalhar.
        const trialAte = fimDoTeste();

        const { result, organizacaoId } = await db.transaction(async (tx) => {
          const [conta] = await tx.insert(users).values({
            openId,
            email: input.email,
            name: input.nome,
            phone: input.telefone?.trim() || null,
            senha: senhaHash,
            loginMethod: 'local',
            role: 'sindico',
            tipoConta: input.tipoConta,
            // Cadastro próprio: o poder vem de ser dono da organização, nunca
            // da hierarquia — `admin_master` enxergaria a base inteira.
            hierarquia: 'funcionario',
            trialAte,
            lastSignedIn: new Date(),
          }).returning();

          const [organizacao] = await tx.insert(condominios).values({
            nome: input.organizacao.trim(),
            sindicoId: conta.id,
            segmento: input.segmento,
            labels: labelsDoSegmento(input.segmento),
          }).returning({ id: condominios.id });

          await tx.insert(usuarioCondominios).values({
            userId: conta.id,
            condominioId: organizacao.id,
            papel: 'chefe',
            ativo: true,
          });

          return { result: conta, organizacaoId: organizacao.id };
        });

        // Fora da transação: falhar aqui não justifica desfazer o cadastro, e
        // rodar de novo completa o que faltou.
        await prepararUnidade(organizacaoId);
        
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
                         <li><strong>Organização:</strong> ${input.organizacao}</li>
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
          message: `Conta criada. Você tem ${DIAS_DE_TESTE} dias de teste.`,
          // Token retornado no body para WebViews que não persistem cookies
          token: sessionToken,
          trialAte,
          user: {
            id: result.id,
            nome: input.nome,
            email: input.email,
          },
        };
      }),
    
    // Login unificado: tenta como síndico/admin (users) e, se falhar, como funcionário (funcionarios).
    // Retorna o tipo encontrado para o frontend rotear apropriadamente.
    loginUnificado: publicProcedure
      .input(z.object({
        email: z.string().min(1),
        senha: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        rateLimiter.check(`login-unif:${ip}:${input.email}`, RATE_LIMIT_CONFIGS.login);

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const bcrypt = await import('bcryptjs');
        const emailLower = input.email.trim().toLowerCase();

        // 1) Tenta tabela users (síndico/admin/master)
        const [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
        if (user && user.senha) {
          const ok = await bcrypt.compare(input.senha, user.senha);
          if (ok) {
            if (user.bloqueado) {
              throw new TRPCError({ code: "FORBIDDEN", message: user.motivoBloqueio || "Conta bloqueada." });
            }
            await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
            await registrarAcesso(user.id, ip);
            const { sdk } = await import('../../_core/sdk');
            const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || '' });
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
            rateLimiter.reset(`login-unif:${ip}:${input.email}`);
            return {
              success: true as const,
              tipo: "sindico" as const,
              redirect: user.senhaProvisoria ? "/definir-senha" : "/admin",
              token: sessionToken,
              senhaProvisoria: user.senhaProvisoria,
              user: { id: user.id, nome: user.name, email: user.email, role: user.role, tipoConta: user.tipoConta },
            };
          }
        }

        // 2) Tenta tabela funcionarios
        const idNorm = emailLower.includes("@")
          ? emailLower
          : emailLower.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "");
        const { findFuncionarioForLogin } = await import('../../_core/funcionarioCompat');
        const funcionario = await findFuncionarioForLogin(idNorm);
        if (funcionario && funcionario.senha && funcionario.loginAtivo) {
          const ok = await bcrypt.compare(input.senha, funcionario.senha);
          if (ok) {
            const jwtModule = await import("jsonwebtoken");
            const jwt = jwtModule.default || jwtModule;
            const token = jwt.sign(
              {
                funcionarioId: funcionario.id,
                condominioId: funcionario.condominioId,
                nome: funcionario.nome,
                cargo: funcionario.cargo,
                hierarquia: funcionario.hierarquia || "funcionario",
                tipo: "funcionario",
              },
              ENV.cookieSecret,
              { expiresIn: "7d" }
            );
            ctx.res.cookie("funcionario_token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            rateLimiter.reset(`login-unif:${ip}:${input.email}`);
            return {
              success: true as const,
              tipo: "funcionario" as const,
              redirect: "/dashboard",
              token,
              user: { id: funcionario.id, nome: funcionario.nome, email: funcionario.email, cargo: funcionario.cargo },
            };
          }
        }

        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos" });
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
        await registrarAcesso(user.id, getClientIp(ctx.req));
        
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
          // Conta ainda com a senha de implantação: o client tem de mandar
          // trocar antes de qualquer outra tela.
          senhaProvisoria: user.senhaProvisoria,
          user: {
            id: user.id,
            nome: user.name,
            email: user.email,
          },
        };
      }),

    /**
     * Esqueci minha senha: manda o link de cadastro de nova senha por e-mail.
     *
     * Atende as duas identidades que o login aceita — gestor (`users`) e
     * funcionário (`funcionarios`) —, porque a tela de login é a mesma e quem
     * digita o e-mail não sabe (nem precisa saber) em qual tabela está.
     *
     * A resposta é sempre a mesma, exista ou não a conta: dizer "este e-mail
     * não está cadastrado" entrega a lista de quem usa o sistema a qualquer um.
     */
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

        const resposta = {
          success: true,
          message: "Se o e-mail estiver cadastrado, você receberá um link para cadastrar uma nova senha.",
        };

        const email = input.email.trim().toLowerCase();

        // Comparação sem diferenciar maiúsculas: o cadastro guarda em minúsculas,
        // mas quem digita no celular costuma mandar a primeira letra maiúscula.
        const [user] = await db.select().from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1);

        const funcionario = user ? null : await findFuncionarioByLoginEmail(email);
        const alvo = user
          ? { nome: user.name || "", email: user.email }
          : funcionario
            ? { nome: funcionario.nome || "", email: funcionario.loginEmail || funcionario.email || email }
            : null;

        if (!alvo?.email) return resposta;

        const crypto = await import('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        if (user) {
          await db.update(users).set({
            resetToken,
            resetTokenExpira: expira,
          }).where(eq(users.id, user.id));
        } else if (funcionario) {
          await db.update(funcionarios).set({
            resetToken,
            resetTokenExpira: expira,
          }).where(eq(funcionarios.id, funcionario.id));
        }

        // O e-mail é o produto desta rota: sem ele a pessoa fica esperando uma
        // mensagem que nunca chega, então a falha vai para o log com nome.
        if (!isEmailConfigured()) {
          console.error(
            "[recuperacao] RESEND_API_KEY ausente: link não enviado para",
            alvo.email,
          );
          return resposta;
        }

        const envio = await sendRecuperacaoSenhaEmail({
          destinatario: alvo.email,
          nome: alvo.nome || alvo.email,
          linkRecuperacao: `${ENV.appUrl}/redefinir-senha/${resetToken}`,
        });

        if (!envio.success) {
          console.error("[recuperacao] falha ao enviar para", alvo.email, envio.error);
        }

        return {
          ...resposta,
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

        // O mesmo link serve para gestor e funcionário: a tela é uma só, e é o
        // token que diz de quem é a conta.
        const funcionario = user ? null : await findFuncionarioByResetToken(input.token);
        const alvo = user
          ? { nome: user.name, email: user.email, expira: user.resetTokenExpira }
          : funcionario
            ? {
                nome: funcionario.nome,
                email: funcionario.loginEmail || funcionario.email,
                expira: funcionario.resetTokenExpira,
              }
            : null;

        if (!alvo) {
          return { valido: false, mensagem: "Token inválido" };
        }

        if (alvo.expira && new Date(alvo.expira) < new Date()) {
          return { valido: false, expirado: true, mensagem: "Token expirado. Solicite um novo link." };
        }

        return {
          valido: true,
          email: alvo.email,
          nome: alvo.nome,
        };
      }),
    
    // Redefinir senha com token
    redefinirSenha: publicProcedure
      .input(z.object({
        token: z.string(),
        novaSenha: z.string().regex(SENHA_REGEX, SENHA_ERR_MSG),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [user] = await db.select().from(users)
          .where(eq(users.resetToken, input.token))
          .limit(1);

        const funcionario = user ? null : await findFuncionarioByResetToken(input.token);

        if (!user && !funcionario) {
          throw new Error("Token inválido");
        }

        const expira = user ? user.resetTokenExpira : funcionario!.resetTokenExpira;
        if (expira && new Date(expira) < new Date()) {
          throw new Error("Token expirado. Solicite um novo link de recuperação.");
        }

        // Hash da nova senha com bcrypt
        const bcrypt = await import('bcryptjs');
        const senhaHash = await bcrypt.hash(input.novaSenha, 10);

        /**
         * Funcionário: troca a senha e manda entrar pelo portal dele.
         *
         * Não abrimos sessão aqui como fazemos com o gestor — a sessão do
         * funcionário é outra, criada pelo login do portal.
         */
        if (funcionario) {
          await db.update(funcionarios)
            .set({
              senha: senhaHash,
              resetToken: null,
              resetTokenExpira: null,
              loginAtivo: true,
            })
            .where(eq(funcionarios.id, funcionario.id));

          return {
            success: true,
            message: "Senha cadastrada com sucesso! Entre com a nova senha.",
            token: null,
            user: {
              id: funcionario.id,
              nome: funcionario.nome,
              email: funcionario.loginEmail || funcionario.email,
            },
          };
        }

        // Atualizar senha e limpar token
        await db.update(users).set({
          senha: senhaHash,
          resetToken: null,
          resetTokenExpira: null,
          lastSignedIn: new Date(),
          // Definir senha pelo link de recuperação também encerra a provisória.
          senhaProvisoria: false,
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
        senhaProvisoria: users.senhaProvisoria,
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
        novaSenha: z.string().regex(SENHA_REGEX, SENHA_ERR_MSG),
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
          senhaProvisoria: false,
        }).where(eq(users.id, ctx.user.id));

        return {
          success: true,
          message: "Senha alterada com sucesso!",
        };
      }),

    /**
     * Primeira troca de senha de uma conta criada em lote.
     *
     * Diferente de `alterarSenha` por não pedir a senha atual: quem chega aqui
     * acabou de entrar com a senha padrão de implantação, que é conhecida por
     * quem fez a carga. Só funciona enquanto a conta está marcada como
     * provisória — depois disso, a troca volta a exigir a senha atual.
     */
    definirSenhaProvisoria: protectedProcedure
      .input(z.object({
        novaSenha: z.string().regex(SENHA_REGEX, SENHA_ERR_MSG),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user.senhaProvisoria) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta conta já tem senha definida. Use a alteração de senha comum.",
          });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const bcrypt = await import('bcryptjs');

        // Impede "trocar" a senha padrão por ela mesma.
        const [atual] = await db.select({ senha: users.senha }).from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        if (atual?.senha && await bcrypt.compare(input.novaSenha, atual.senha)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A nova senha precisa ser diferente da senha provisória.",
          });
        }

        await db.update(users).set({
          senha: await bcrypt.hash(input.novaSenha, 10),
          senhaProvisoria: false,
        }).where(eq(users.id, ctx.user.id));

        return { success: true, message: "Senha definida com sucesso!" };
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
