import { publicProcedure, protectedProcedure, protectedOrFuncionarioProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { ehGestorMaster } from "../../_core/gestorMaster";
import { CHAVES_FUNCOES_FUNCIONARIO } from "../../../shared/funcoesFuncionario";
import { 
  funcionarios, 
  funcionarioCondominios, 
  funcionarioApps, 
  funcionarioFuncoes, 
  funcionarioAcessos,
  condominios, 
  apps,
  revistas
} from "../../../drizzle/schema";
import { eq, and, desc, gte, inArray, lte, sql } from "drizzle-orm";
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIp } from "../../_core/rateLimit";
import { verifyCondominioOwnership } from "../../_core/ownership";
import { ENV } from "../../_core/env";
import {
  findFuncionarioById,
  findFuncionarioByLoginEmail,
  findFuncionarioByResetToken,
  findFuncionarioForLogin,
} from "../../_core/funcionarioCompat";

type CtxTenant = { tenant: { assert: (id: number) => Promise<void> } };

/**
 * `funcionarios.condominioId` chega cru no input. Sem conferir contra o tenant
 * da sessão, qualquer conta autenticada lê, cria e apaga funcionário de
 * organização alheia — as rotas de módulo (`manutencao.*`, `vistoria.*`) já
 * fazem isso pelo `moduloProcedure`; estas aqui ficaram de fora.
 */
async function assertOrganizacao(ctx: CtxTenant, condominioId: number) {
  await ctx.tenant.assert(condominioId);
}

/** Resolve a organização pelo próprio registro quando o input só traz o id. */
async function assertFuncionario(ctx: CtxTenant, funcionarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [registro] = await db
    .select({ condominioId: funcionarios.condominioId })
    .from(funcionarios)
    .where(eq(funcionarios.id, funcionarioId))
    .limit(1);

  if (!registro) throw new Error("Funcionário não encontrado");
  await ctx.tenant.assert(registro.condominioId);
}

/**
 * Permissões do funcionário com o padrão aplicado.
 *
 * Sem linha gravada a função é liberada — é o mesmo padrão que o servidor usa
 * em `assegurarPermissaoFuncionario`. Sem este merge, função nova só apareceria
 * para quem o gestor abrisse a tela de permissões e salvasse.
 */
function funcoesComPadrao(
  linhas: { funcaoKey: string; habilitada: boolean | null; podeCriar: boolean | null }[],
) {
  const gravadas = new Map(linhas.map((f) => [f.funcaoKey, f]));

  return CHAVES_FUNCOES_FUNCIONARIO.map((chave) => {
    const linha = gravadas.get(chave);
    return {
      funcaoKey: chave,
      habilitada: linha ? linha.habilitada === true : true,
      podeCriar: linha ? linha.podeCriar === true : true,
    };
  });
}

export const funcionarioRouter = router({
    /**
     * Master vê a equipe inteira da organização; gestor de unidade vê só quem
     * ele mesmo cadastrou. Registros antigos, sem `criadoPorId`, continuam
     * visíveis para o master — some-los seria perder gente já cadastrada.
     */
    list: protectedOrFuncionarioProcedure
      .input(z.object({ condominioId: z.number().optional(), revistaId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        // O funcionário precisa da equipe da unidade para escolher responsável
        // nas telas novas; o recorte por criador existe para separar gestores
        // entre si, e não faz sentido aplicá-lo a quem executa.
        const master = ctx.user ? await ehGestorMaster(ctx.user.id) : true;
        const filtro = (condominioId: number) =>
          master || !ctx.user
            ? eq(funcionarios.condominioId, condominioId)
            : and(
                eq(funcionarios.condominioId, condominioId),
                eq(funcionarios.criadoPorId, ctx.user.id),
              );

        if (input.condominioId) {
          await assertOrganizacao(ctx, input.condominioId);
          return db.select().from(funcionarios).where(filtro(input.condominioId));
        }
        if (input.revistaId) {
          // Buscar o condomínio da revista e depois os funcionários
          const revista = await db.select().from(revistas).where(eq(revistas.id, input.revistaId));
          if (revista.length === 0) return [];
          await assertOrganizacao(ctx, revista[0].condominioId);
          return db.select().from(funcionarios).where(filtro(revista[0].condominioId));
        }
        return [];
      }),

    create: protectedProcedure
      .input(z.object({
        condominioId: z.number().optional(),
        revistaId: z.number().optional(),
        nome: z.string().min(1),
        cargo: z.string().optional(),
        departamento: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        fotoUrl: z.string().optional(),
        descricao: z.string().optional(),
        tipoFuncionario: z.enum(["zelador", "porteiro", "supervisor", "gerente", "auxiliar", "sindico_externo"]).optional(),
        condominiosIds: z.array(z.number()).optional(),
        appsIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        let condominioId = input.condominioId;
        if (!condominioId && input.revistaId) {
          const revista = await db.select().from(revistas).where(eq(revistas.id, input.revistaId));
          if (revista.length > 0) condominioId = revista[0].condominioId;
        }
        if (!condominioId) throw new Error("Condomínio não encontrado");
        await assertOrganizacao(ctx, condominioId);
        for (const extra of input.condominiosIds ?? []) await assertOrganizacao(ctx, extra);
        const { revistaId: _, condominiosIds, appsIds, ...data } = input;
        
        // Usar transação para garantir atomicidade
        const funcionarioId = await db.transaction(async (tx) => {
          const [result] = await tx
            .insert(funcionarios)
            // `criadoPorId` é o que sustenta o recorte por gestor na listagem.
            .values({ ...data, condominioId, criadoPorId: ctx.user.id })
            .returning();
          const fId = Number(result.id);
          
          // Se for supervisor, vincular aos condomínios adicionais
          if (condominiosIds && condominiosIds.length > 0) {
            await tx.insert(funcionarioCondominios).values(
              condominiosIds.map(cId => ({
                funcionarioId: fId,
                condominioId: cId,
                ativo: true,
              }))
            ).returning();
          }
          
          // Vincular aos apps selecionados
          if (appsIds && appsIds.length > 0) {
            await tx.insert(funcionarioApps).values(
              appsIds.map(appId => ({
                funcionarioId: fId,
                appId,
                ativo: true,
              }))
            ).returning();
          }
          
          return fId;
        });
        
        return { id: funcionarioId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        cargo: z.string().optional(),
        departamento: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        fotoUrl: z.string().optional(),
        descricao: z.string().optional(),
        ativo: z.boolean().optional(),
        loginEmail: z.string().optional(),
        senha: z.string().optional(),
        loginAtivo: z.boolean().optional(),
        tipoFuncionario: z.enum(["zelador", "porteiro", "supervisor", "gerente", "auxiliar", "sindico_externo"]).optional(),
        condominiosIds: z.array(z.number()).optional(),
        appsIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await assertFuncionario(ctx, input.id);
        for (const extra of input.condominiosIds ?? []) await assertOrganizacao(ctx, extra);
        const { id, senha, condominiosIds, appsIds, ...data } = input;
        // Se senha foi fornecida, fazer hash
        const updateData: Record<string, unknown> = { ...data };
        if (senha) {
          const bcrypt = await import("bcryptjs");
          updateData.senha = await bcrypt.hash(senha, 10);
        }
        await db.update(funcionarios).set(updateData).where(eq(funcionarios.id, id));
        
        // Atualizar vínculos de condomínios se fornecidos
        if (condominiosIds !== undefined) {
          await db.delete(funcionarioCondominios).where(eq(funcionarioCondominios.funcionarioId, id));
          if (condominiosIds.length > 0) {
            await db.insert(funcionarioCondominios).values(
              condominiosIds.map(cId => ({
                funcionarioId: id,
                condominioId: cId,
                ativo: true,
              }))
            ).returning();
          }
        }
        
        // Atualizar vínculos de apps se fornecidos
        if (appsIds !== undefined) {
          await db.delete(funcionarioApps).where(eq(funcionarioApps.funcionarioId, id));
          if (appsIds.length > 0) {
            await db.insert(funcionarioApps).values(
              appsIds.map(appId => ({
                funcionarioId: id,
                appId,
                ativo: true,
              }))
            ).returning();
          }
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await assertFuncionario(ctx, input.id);
        // Deletar vínculos e histórico em transação atômica
        await db.transaction(async (tx) => {
          await tx.delete(funcionarioFuncoes).where(eq(funcionarioFuncoes.funcionarioId, input.id));
          await tx.delete(funcionarioCondominios).where(eq(funcionarioCondominios.funcionarioId, input.id));
          await tx.delete(funcionarioApps).where(eq(funcionarioApps.funcionarioId, input.id));
          await tx.delete(funcionarioAcessos).where(eq(funcionarioAcessos.funcionarioId, input.id));
          await tx.delete(funcionarios).where(eq(funcionarios.id, input.id));
        });
        return { success: true };
      }),

    // Configurar login do funcionário
    configurarLogin: protectedProcedure
      .input(z.object({
        funcionarioId: z.number(),
        loginEmail: z.string().email().optional(),
        senha: z.string().regex(/^\d{6}$/, "Senha deve ter exatamente 6 dígitos numéricos"),
        loginAtivo: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await assertFuncionario(ctx, input.funcionarioId);

        // Buscar funcionário para gerar loginUsuario a partir do nome
        const [func] = await db.select().from(funcionarios)
          .where(eq(funcionarios.id, input.funcionarioId)).limit(1);
        if (!func) throw new Error("Funcionário não encontrado");

        // Gerar loginUsuario: nome e sobrenome sem espaços, sem caracteres especiais, tudo minúsculo
        const loginUsuario = func.nome
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // remove acentos
          .replace(/[^a-zA-Z0-9]/g, "")                       // remove especiais
          .toLowerCase();

        const bcrypt = await import("bcryptjs");
        const senhaHash = await bcrypt.hash(input.senha, 10);
        await db.update(funcionarios).set({
          loginEmail: input.loginEmail || func.email || null,
          loginUsuario,
          senha: senhaHash,
          loginAtivo: input.loginAtivo,
        }).where(eq(funcionarios.id, input.funcionarioId));
        return { success: true, loginUsuario };
      }),

    // Listar funções do funcionário
    listFuncoes: protectedProcedure
      .input(z.object({ funcionarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFuncionario(ctx, input.funcionarioId);
        const db = await getDb();
        if (!db) return [];
        const funcoes = await db.select().from(funcionarioFuncoes)
          .where(eq(funcionarioFuncoes.funcionarioId, input.funcionarioId));
        return funcoes.map(f => ({ ...f, habilitada: f.habilitada === true, podeCriar: f.podeCriar === true }));
      }),

    // Atualizar funções do funcionário
    updateFuncoes: protectedProcedure
      .input(z.object({
        funcionarioId: z.number(),
        funcoes: z.array(z.object({
          funcaoKey: z.string(),
          habilitada: z.boolean(),
          podeCriar: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFuncionario(ctx, input.funcionarioId);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Usar transação para garantir atomicidade
        await db.transaction(async (tx) => {
          // Deletar funções existentes
          await tx.delete(funcionarioFuncoes).where(eq(funcionarioFuncoes.funcionarioId, input.funcionarioId));
          
          // Inserir novas funções
          if (input.funcoes.length > 0) {
            await tx.insert(funcionarioFuncoes).values(
              input.funcoes.map(f => ({
                funcionarioId: input.funcionarioId,
                funcaoKey: f.funcaoKey,
                habilitada: f.habilitada,
                podeCriar: f.podeCriar ?? true,
              }))
            ).returning();
          }
        });
        return { success: true };
      }),

    // Login de funcionário (aceita email OU loginUsuario)
    login: publicProcedure
      .input(z.object({
        identificador: z.string().min(1),
        senha: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: login funcionário
        const ip = getClientIp(ctx.req);
        const rlKey = `func-login:${ip}:${input.identificador}`;
        rateLimiter.check(rlKey, RATE_LIMIT_CONFIGS.login);

        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const identificadorNormalizado = input.identificador.includes("@")
          ? input.identificador.trim().toLowerCase()
          : input.identificador
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-zA-Z0-9]/g, "")
              .toLowerCase();
        const funcionario = await findFuncionarioForLogin(identificadorNormalizado);
        
        if (!funcionario) {
          throw new Error("Usuário ou senha inválidos");
        }
        
        if (!funcionario.loginAtivo) {
          throw new Error("Acesso desativado. Contacte o administrador.");
        }
        
        if (!funcionario.senha) {
          throw new Error("Senha não configurada. Contacte o administrador.");
        }
        
        const bcrypt = await import("bcryptjs");
        const senhaValida = await bcrypt.compare(input.senha, funcionario.senha);
        
        if (!senhaValida) {
          throw new Error("Email ou senha inválidos");
        }
        
        // Buscar funções habilitadas do funcionário
        const funcoes = await db.select().from(funcionarioFuncoes)
          .where(eq(funcionarioFuncoes.funcionarioId, funcionario.id));
        
        // Criar token JWT para o funcionário
        const jwtModule = await import("jsonwebtoken");
        const jwt = jwtModule.default || jwtModule;
        const token = jwt.sign(
          { 
            funcionarioId: funcionario.id, 
            condominioId: funcionario.condominioId,
            nome: funcionario.nome,
            cargo: funcionario.cargo,
            hierarquia: funcionario.hierarquia || "funcionario",
            tipo: "funcionario"
          },
          ENV.cookieSecret,
          { expiresIn: "7d" }
        );
        
        // Definir cookie de sessão
        ctx.res.cookie("funcionario_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });
        
        // Registrar acesso no histórico
        const userAgent = ctx.req.headers["user-agent"] || "";
        const loginIp = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] || ctx.req.socket.remoteAddress || "";
        
        // Detectar dispositivo, navegador e SO
        let dispositivo = "Desktop";
        let navegador = "Desconhecido";
        let sistemaOperacional = "Desconhecido";
        
        if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
          dispositivo = "Mobile";
        } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
          dispositivo = "Tablet";
        }
        
        if (userAgent.includes("Chrome")) navegador = "Chrome";
        else if (userAgent.includes("Firefox")) navegador = "Firefox";
        else if (userAgent.includes("Safari")) navegador = "Safari";
        else if (userAgent.includes("Edge")) navegador = "Edge";
        
        if (userAgent.includes("Windows")) sistemaOperacional = "Windows";
        else if (userAgent.includes("Mac")) sistemaOperacional = "macOS";
        else if (userAgent.includes("Linux")) sistemaOperacional = "Linux";
        else if (userAgent.includes("Android")) sistemaOperacional = "Android";
        else if (userAgent.includes("iOS") || userAgent.includes("iPhone")) sistemaOperacional = "iOS";
        
        // Buscar geolocalização por IP (usando ip-api.com - gratuito)
        let geoData: { lat?: string; lon?: string; city?: string; regionName?: string; country?: string } = {};
        
        // =========================================================
        // OTIMIZAÇÃO PROFISSIONAL: Prevenir travamento no login
        // =========================================================
        try {
          if (loginIp && loginIp !== "127.0.0.1" && loginIp !== "::1" && !loginIp.startsWith("192.168.") && !loginIp.startsWith("10.")) {
            // Adicionando timeout de 2 segundos para não travar o login se API estiver lenta
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            try {
              const geoResponse = await fetch(`http://ip-api.com/json/${loginIp}?fields=status,country,regionName,city,lat,lon`, {
                signal: controller.signal
              });
              const geoJson = await geoResponse.json();
              if (geoJson.status === "success") {
                geoData = {
                  lat: geoJson.lat?.toString(),
                  lon: geoJson.lon?.toString(),
                  city: geoJson.city,
                  regionName: geoJson.regionName,
                  country: geoJson.country,
                };
              }
            } finally {
              clearTimeout(timeoutId);
            }
          }
        } catch (e) {
          // Falha silenciosa na geolocalização para não impedir o login
          console.error("Erro/Timeout ao buscar geolocalização:", e);
        }
        
        await db.insert(funcionarioAcessos).values({
          funcionarioId: funcionario.id,
          condominioId: funcionario.condominioId,
          ip: loginIp,
          userAgent: userAgent,
          dispositivo: dispositivo,
          navegador: navegador,
          sistemaOperacional: sistemaOperacional,
          latitude: geoData.lat || null,
          longitude: geoData.lon || null,
          cidade: geoData.city || null,
          regiao: geoData.regionName || null,
          pais: geoData.country || null,
          tipoAcesso: "login",
          sucesso: true,
        });
        
        // Atualizar último login
        await db.update(funcionarios).set({
          ultimoLogin: new Date(),
        }).where(eq(funcionarios.id, funcionario.id));
        
        // Buscar condomínios vinculados (para supervisores)
        let condominiosVinculados: { id: number; nome: string | null; logoUrl: string | null }[] = [];
        try {
          condominiosVinculados = await db.select({
            id: condominios.id,
            nome: condominios.nome,
            logoUrl: condominios.logoUrl,
          }).from(funcionarioCondominios)
            .innerJoin(condominios, eq(funcionarioCondominios.condominioId, condominios.id))
            .where(and(
              eq(funcionarioCondominios.funcionarioId, funcionario.id),
              eq(funcionarioCondominios.ativo, true)
            ));
        } catch (e) {
          // Silenciar erro de tipo (UUID vs integer) em ambientes com DB compartilhado
        }
        
        // Buscar apps vinculados
        let appsVinculados: { id: number; nome: string | null; condominioId: number | null; logoUrl: string | null; shareLink: string | null }[] = [];
        try {
          appsVinculados = await db.select({
            id: apps.id,
            nome: apps.nome,
            condominioId: apps.condominioId,
            logoUrl: apps.logoUrl,
            shareLink: apps.shareLink,
          }).from(funcionarioApps)
            .innerJoin(apps, eq(funcionarioApps.appId, apps.id))
            .where(and(
              eq(funcionarioApps.funcionarioId, funcionario.id),
              eq(funcionarioApps.ativo, true)
            ));
        } catch (e) {
          // Silenciar erro de tipo em ambientes com DB compartilhado
        }
        
        return { 
          success: true,
          funcionario: {
            id: funcionario.id,
            nome: funcionario.nome,
            cargo: funcionario.cargo,
            tipoFuncionario: funcionario.tipoFuncionario,
            hierarquia: funcionario.hierarquia || "funcionario",
            condominioId: funcionario.condominioId,
            fotoUrl: funcionario.fotoUrl,
          },
          funcoes: funcoesComPadrao(funcoes),
          condominiosVinculados,
          appsVinculados,
        };
      }),

    // Verificar sessão do funcionário
    me: publicProcedure
      .query(async ({ ctx }) => {
        const token = ctx.req.cookies?.funcionario_token;
        if (!token) return null;
        
        try {
          const jwtModule = await import("jsonwebtoken");
          const jwt = jwtModule.default || jwtModule;
          const decoded = jwt.verify(token, ENV.cookieSecret) as {
            funcionarioId: number;
            condominioId: number;
            nome: string;
            cargo: string;
            tipo: string;
          };
          
          if (decoded.tipo !== "funcionario") return null;
          
          const db = await getDb();
          if (!db) return null;
          
          const funcionario = await findFuncionarioById(decoded.funcionarioId);
          
          if (!funcionario || !funcionario.loginAtivo) return null;
          
          // Buscar dados relacionados em paralelo (otimização N+1)
          const funcoes = await db.select().from(funcionarioFuncoes)
              .where(eq(funcionarioFuncoes.funcionarioId, funcionario.id));
          
          let condominiosVinculados: { id: number; nome: string | null; logoUrl: string | null }[] = [];
          let appsVinculados: { id: number; nome: string | null; condominioId: number | null; logoUrl: string | null; shareLink: string | null }[] = [];
          let condominioPrincipal: { id: number; nome: string | null; logoUrl: string | null } | undefined;
          
          try {
            condominiosVinculados = await db.select({
              id: condominios.id,
              nome: condominios.nome,
              logoUrl: condominios.logoUrl,
            }).from(funcionarioCondominios)
              .innerJoin(condominios, eq(funcionarioCondominios.condominioId, condominios.id))
              .where(and(
                eq(funcionarioCondominios.funcionarioId, funcionario.id),
                eq(funcionarioCondominios.ativo, true)
              ));
          } catch (e) { /* tipo mismatch UUID/int */ }
          
          try {
            appsVinculados = await db.select({
              id: apps.id,
              nome: apps.nome,
              condominioId: apps.condominioId,
              logoUrl: apps.logoUrl,
              shareLink: apps.shareLink,
            }).from(funcionarioApps)
              .innerJoin(apps, eq(funcionarioApps.appId, apps.id))
              .where(and(
                eq(funcionarioApps.funcionarioId, funcionario.id),
                eq(funcionarioApps.ativo, true)
              ));
          } catch (e) { /* tipo mismatch */ }
          
          try {
            const [cp] = await db.select({
              id: condominios.id,
              nome: condominios.nome,
              logoUrl: condominios.logoUrl,
            }).from(condominios)
              .where(eq(condominios.id, funcionario.condominioId));
            condominioPrincipal = cp;
          } catch (e) { /* tipo mismatch */ }
          
        return {
          id: funcionario.id,
          nome: funcionario.nome,
          cargo: funcionario.cargo,
          tipoFuncionario: funcionario.tipoFuncionario,
          hierarquia: funcionario.hierarquia || "funcionario",
          condominioId: funcionario.condominioId,
          condominioPrincipal,
          fotoUrl: funcionario.fotoUrl,
          funcoes: funcoesComPadrao(funcoes),
          condominiosVinculados,
          appsVinculados,
        };
        } catch (e) {
        }
      }),

    // Logout de funcionário
    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        ctx.res.clearCookie("funcionario_token");
        return { success: true };
      }),

    // Solicitar recuperação de senha
    solicitarRecuperacao: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: recuperação de senha
        const ip = getClientIp(ctx.req);
        rateLimiter.check(`func-pwreset:${ip}`, RATE_LIMIT_CONFIGS.passwordReset);

        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const funcionario = await findFuncionarioByLoginEmail(input.email.trim().toLowerCase());
        
        if (!funcionario) {
          // Não revelar se o email existe ou não por segurança
          return { success: true, message: "Se o email estiver cadastrado, você receberá um link de recuperação." };
        }
        
        // Gerar token de recuperação
        const crypto = await import("crypto");
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        
        // Salvar token no banco
        await db.update(funcionarios)
          .set({ resetToken, resetTokenExpira })
          .where(eq(funcionarios.id, funcionario.id));
        
        // Buscar condomínio para incluir nome no email
        const [condominio] = await db.select().from(condominios)
          .where(eq(condominios.id, funcionario.condominioId));
        
        // Enviar email de recuperação
        try {
          const { notifyOwner } = await import("../../_core/notification");
          const baseUrl = process.env.VITE_APP_URL || "https://appmanutencao.com.br";
          const resetLink = `${baseUrl}/funcionario/redefinir-senha?token=${resetToken}`;
          
          await notifyOwner({
            title: `Recuperação de Senha - ${funcionario.nome}`,
            content: `O funcionário ${funcionario.nome} do condomínio ${condominio?.nome || "N/A"} solicitou recuperação de senha.\n\nLink de recuperação: ${resetLink}\n\nEste link expira em 1 hora.\n\nEnvie este link para o funcionário pelo WhatsApp ou outro meio de comunicação.`
          });
        } catch (e) {
          console.error("Erro ao enviar notificação:", e);
        }
        
        return { 
          success: true, 
          message: "Se o email estiver cadastrado, o administrador receberá uma notificação com o link de recuperação."
        };
      }),

    // Validar token de recuperação
    validarToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { valid: false };
        
        const funcionario = await findFuncionarioByResetToken(input.token);
        
        if (!funcionario || !funcionario.resetTokenExpira) {
          return { valid: false };
        }
        
        if (new Date() > funcionario.resetTokenExpira) {
          return { valid: false, expired: true };
        }
        
        return { valid: true, nome: funcionario.nome };
      }),

    // Redefinir senha com token
    redefinirSenha: publicProcedure
      .input(z.object({ 
        token: z.string(),
        novaSenha: z.string().min(6)
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const funcionario = await findFuncionarioByResetToken(input.token);
        
        if (!funcionario || !funcionario.resetTokenExpira) {
          throw new Error("Token inválido ou expirado");
        }
        
        if (new Date() > funcionario.resetTokenExpira) {
          throw new Error("Token expirado. Solicite uma nova recuperação de senha.");
        }
        
        // Hash da nova senha
        const bcrypt = await import("bcryptjs");
        const senhaHash = await bcrypt.hash(input.novaSenha, 10);
        
        // Atualizar senha e limpar token
        await db.update(funcionarios)
          .set({ 
            senha: senhaHash,
            resetToken: null,
            resetTokenExpira: null,
            loginAtivo: true
          })
          .where(eq(funcionarios.id, funcionario.id));
        
        return { success: true, message: "Senha redefinida com sucesso!" };
      }),

    // ==================== HISTÓRICO DE ACESSOS ====================
    // Registrar acesso
    registrarAcesso: protectedProcedure
      .input(z.object({
        funcionarioId: z.number(),
        condominioId: z.number(),
        ip: z.string().optional(),
        userAgent: z.string().optional(),
        dispositivo: z.string().optional(),
        navegador: z.string().optional(),
        sistemaOperacional: z.string().optional(),
        localizacao: z.string().optional(),
        tipoAcesso: z.enum(["login", "logout", "recuperacao_senha", "alteracao_senha"]).default("login"),
        sucesso: z.boolean().default(true),
        motivoFalha: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOrganizacao(ctx, input.condominioId);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.insert(funcionarioAcessos).values({
          funcionarioId: input.funcionarioId,
          condominioId: input.condominioId,
          ip: input.ip || null,
          userAgent: input.userAgent || null,
          dispositivo: input.dispositivo || null,
          navegador: input.navegador || null,
          sistemaOperacional: input.sistemaOperacional || null,
          localizacao: input.localizacao || null,
          tipoAcesso: input.tipoAcesso,
          sucesso: input.sucesso,
          motivoFalha: input.motivoFalha || null,
        }).returning();
        
        return { success: true };
      }),

    // Listar histórico de acessos de um funcionário
    listarAcessos: protectedProcedure
      .input(z.object({
        funcionarioId: z.number().optional(),
        condominioId: z.number().optional(),
        limite: z.number().default(50),
        pagina: z.number().default(1),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { acessos: [], total: 0 };

        const conditions = [];
        if (input.funcionarioId) {
          await assertFuncionario(ctx, input.funcionarioId);
          conditions.push(eq(funcionarioAcessos.funcionarioId, input.funcionarioId));
        }
        if (input.condominioId) {
          await assertOrganizacao(ctx, input.condominioId);
          conditions.push(eq(funcionarioAcessos.condominioId, input.condominioId));
        }
        // Sem filtro, a consulta varreria o histórico da base inteira.
        if (!input.funcionarioId && !input.condominioId && !ctx.tenant.isMaster()) {
          const permitidos = await ctx.tenant.ids();
          if (permitidos.length === 0) return { acessos: [], total: 0 };
          conditions.push(inArray(funcionarioAcessos.condominioId, permitidos));
        }
        if (input.dataInicio) {
          conditions.push(gte(funcionarioAcessos.dataHora, input.dataInicio));
        }
        if (input.dataFim) {
          conditions.push(lte(funcionarioAcessos.dataHora, input.dataFim));
        }
        
        const offset = (input.pagina - 1) * input.limite;
        
        // Buscar acessos com dados do funcionário
        const acessos = await db.select({
          id: funcionarioAcessos.id,
          funcionarioId: funcionarioAcessos.funcionarioId,
          condominioId: funcionarioAcessos.condominioId,
          dataHora: funcionarioAcessos.dataHora,
          ip: funcionarioAcessos.ip,
          userAgent: funcionarioAcessos.userAgent,
          dispositivo: funcionarioAcessos.dispositivo,
          navegador: funcionarioAcessos.navegador,
          sistemaOperacional: funcionarioAcessos.sistemaOperacional,
          localizacao: funcionarioAcessos.localizacao,
          latitude: funcionarioAcessos.latitude,
          longitude: funcionarioAcessos.longitude,
          cidade: funcionarioAcessos.cidade,
          regiao: funcionarioAcessos.regiao,
          pais: funcionarioAcessos.pais,
          tipoAcesso: funcionarioAcessos.tipoAcesso,
          sucesso: funcionarioAcessos.sucesso,
          motivoFalha: funcionarioAcessos.motivoFalha,
          funcionarioNome: funcionarios.nome,
          funcionarioCargo: funcionarios.cargo,
        })
        .from(funcionarioAcessos)
        .leftJoin(funcionarios, eq(funcionarioAcessos.funcionarioId, funcionarios.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(funcionarioAcessos.dataHora))
        .limit(input.limite)
        .offset(offset);
        
        // Contar total
        const [{ count }] = await db.select({ count: sql<number>`count(*)` })
          .from(funcionarioAcessos)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
        
        return { acessos, total: Number(count) };
      }),

    // Obter estatísticas de acessos
    estatisticasAcessos: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        dias: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        await assertOrganizacao(ctx, input.condominioId);
        const db = await getDb();
        if (!db) return null;
        
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - input.dias);
        
        // Total de acessos no período
        const [{ totalAcessos }] = await db.select({ totalAcessos: sql<number>`count(*)` })
          .from(funcionarioAcessos)
          .where(and(
            eq(funcionarioAcessos.condominioId, input.condominioId),
            gte(funcionarioAcessos.dataHora, dataInicio)
          ));
        
        // Acessos com sucesso
        const [{ acessosSucesso }] = await db.select({ acessosSucesso: sql<number>`count(*)` })
          .from(funcionarioAcessos)
          .where(and(
            eq(funcionarioAcessos.condominioId, input.condominioId),
            eq(funcionarioAcessos.sucesso, true),
            gte(funcionarioAcessos.dataHora, dataInicio)
          ));
        
        // Acessos falhados
        const [{ acessosFalhados }] = await db.select({ acessosFalhados: sql<number>`count(*)` })
          .from(funcionarioAcessos)
          .where(and(
            eq(funcionarioAcessos.condominioId, input.condominioId),
            eq(funcionarioAcessos.sucesso, false),
            gte(funcionarioAcessos.dataHora, dataInicio)
          ));
        
        // Funcionários únicos que acessaram
        const [{ funcionariosUnicos }] = await db.select({ funcionariosUnicos: sql<number>`count(distinct funcionarioId)` })
          .from(funcionarioAcessos)
          .where(and(
            eq(funcionarioAcessos.condominioId, input.condominioId),
            gte(funcionarioAcessos.dataHora, dataInicio)
          ));
        
        // Último acesso
        const [ultimoAcesso] = await db.select()
          .from(funcionarioAcessos)
          .where(eq(funcionarioAcessos.condominioId, input.condominioId))
          .orderBy(desc(funcionarioAcessos.dataHora))
          .limit(1);
        
        return {
          totalAcessos: Number(totalAcessos),
          acessosSucesso: Number(acessosSucesso),
          acessosFalhados: Number(acessosFalhados),
          funcionariosUnicos: Number(funcionariosUnicos),
          ultimoAcesso: ultimoAcesso?.dataHora || null,
        };
      }),

    // Listar condomínios vinculados ao funcionário
    listCondominios: protectedProcedure
      .input(z.object({ funcionarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFuncionario(ctx, input.funcionarioId);
        const db = await getDb();
        if (!db) return [];
        return db.select({
          id: condominios.id,
          nome: condominios.nome,
          logoUrl: condominios.logoUrl,
        }).from(funcionarioCondominios)
          .innerJoin(condominios, eq(funcionarioCondominios.condominioId, condominios.id))
          .where(and(
            eq(funcionarioCondominios.funcionarioId, input.funcionarioId),
            eq(funcionarioCondominios.ativo, true)
          ));
      }),

    // Listar apps vinculados ao funcionário
    listApps: protectedProcedure
      .input(z.object({ funcionarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFuncionario(ctx, input.funcionarioId);
        const db = await getDb();
        if (!db) return [];
        return db.select({
          id: apps.id,
          nome: apps.nome,
          condominioId: apps.condominioId,
          logoUrl: apps.logoUrl,
          shareLink: apps.shareLink,
        }).from(funcionarioApps)
          .innerJoin(apps, eq(funcionarioApps.appId, apps.id))
          .where(and(
            eq(funcionarioApps.funcionarioId, input.funcionarioId),
            eq(funcionarioApps.ativo, true)
          ));
      }),

    // Atualizar condomínios vinculados
    updateCondominios: protectedProcedure
      .input(z.object({
        funcionarioId: z.number(),
        condominiosIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFuncionario(ctx, input.funcionarioId);
        for (const alvo of input.condominiosIds) await assertOrganizacao(ctx, alvo);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Remover vínculos existentes
        await db.delete(funcionarioCondominios)
          .where(eq(funcionarioCondominios.funcionarioId, input.funcionarioId));
        
        // Adicionar novos vínculos
        if (input.condominiosIds.length > 0) {
          await db.insert(funcionarioCondominios).values(
            input.condominiosIds.map(condominioId => ({
              funcionarioId: input.funcionarioId,
              condominioId,
              ativo: true,
            }))
          );
        }
        
        return { success: true };
      }),

    // Atualizar apps vinculados
    updateApps: protectedProcedure
      .input(z.object({
        funcionarioId: z.number(),
        appsIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFuncionario(ctx, input.funcionarioId);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Remover vínculos existentes
        await db.delete(funcionarioApps)
          .where(eq(funcionarioApps.funcionarioId, input.funcionarioId));
        
        // Adicionar novos vínculos
        if (input.appsIds.length > 0) {
          await db.insert(funcionarioApps).values(
            input.appsIds.map(appId => ({
              funcionarioId: input.funcionarioId,
              appId,
              ativo: true,
            }))
          );
        }
        
        return { success: true };
      }),
});
