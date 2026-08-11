import { publicProcedure, escopoProcedure, router } from "./_core/trpc";
import { direto, escopoPorRegistro, via } from "./_core/escopoRegistro";
import { z } from "zod";
import { getDb } from "./db";
import { 
  apps, 
  appCodigosAcesso, 
  appUsuarios, 
  appSessoes, 
  appAcessosLog 
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Gerar token aleatório
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Gerar código de acesso único
function generateCodigoAcesso(): string {
  const prefixo = "APP";
  const ano = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefixo}-${ano}-${random}`;
}

// Hash de senha
async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

// Verificar senha
async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/**
 * Códigos e utilizadores do app pertencem a um `app`, que pertence a uma
 * organização. O `id` aqui aponta ora para o código, ora para o utilizador —
 * daí os overrides por rota.
 */
const acessoProcedure = escopoProcedure(
  escopoPorRegistro(
    { appId: direto(apps) },
    {
      desativarCodigo: { id: via(appCodigosAcesso, "appId", apps) },
      reativarCodigo: { id: via(appCodigosAcesso, "appId", apps) },
      atualizarUsuario: { id: via(appUsuarios, "appId", apps) },
      redefinirSenhaUsuario: { id: via(appUsuarios, "appId", apps) },
      removerUsuario: { id: via(appUsuarios, "appId", apps) },
    },
  ),
);

export const appAcessoRouter = router({
  // ==================== CÓDIGOS DE ACESSO ====================
  
  // Gerar novo código de acesso para um app
  gerarCodigo: acessoProcedure
    .input(z.object({
      appId: z.number(),
      descricao: z.string().optional(),
      permissao: z.enum(["visualizar", "editar", "administrar"]).default("visualizar"),
      validoAte: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let codigo = generateCodigoAcesso();
      
      // Garantir que o código é único
      let tentativas = 0;
      while (tentativas < 10) {
        const existente = await db.select().from(appCodigosAcesso).where(eq(appCodigosAcesso.codigo, codigo));
        if (existente.length === 0) break;
        codigo = generateCodigoAcesso();
        tentativas++;
      }
      
      const [novoCodigo] = await db.insert(appCodigosAcesso).values({
        appId: input.appId,
        codigo,
        descricao: input.descricao,
        permissao: input.permissao,
        validoAte: input.validoAte,
      }).returning();
      
      return { id: novoCodigo.id, codigo };
    }),
  
  // Listar códigos de acesso de um app
  listarCodigos: acessoProcedure
    .input(z.object({ appId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(appCodigosAcesso)
        .where(eq(appCodigosAcesso.appId, input.appId))
        .orderBy(desc(appCodigosAcesso.createdAt));
    }),
  
  // Desativar código de acesso
  desativarCodigo: acessoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(appCodigosAcesso)
        .set({ ativo: false })
        .where(eq(appCodigosAcesso.id, input.id));
      return { success: true };
    }),
  
  // Reativar código de acesso
  reativarCodigo: acessoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(appCodigosAcesso)
        .set({ ativo: true })
        .where(eq(appCodigosAcesso.id, input.id));
      return { success: true };
    }),
  
  // ==================== UTILIZADORES ====================
  
  // Cadastrar novo utilizador
  cadastrarUsuario: acessoProcedure
    .input(z.object({
      appId: z.number(),
      nome: z.string().min(2),
      email: z.string().email(),
      senha: z.string().min(6),
      permissao: z.enum(["visualizar", "editar", "administrar"]).default("visualizar"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar se email já existe para este app
      const existente = await db.select().from(appUsuarios)
        .where(and(
          eq(appUsuarios.appId, input.appId),
          eq(appUsuarios.email, input.email)
        ));
      
      if (existente.length > 0) {
        throw new Error("Este email já está cadastrado para este app");
      }
      
      const senhaHash = await hashSenha(input.senha);
      
      const [novoUsuario] = await db.insert(appUsuarios).values({
        appId: input.appId,
        nome: input.nome,
        email: input.email,
        senhaHash,
        permissao: input.permissao,
      }).returning();
      
      return { id: novoUsuario.id, email: input.email };
    }),
  
  // Listar utilizadores de um app
  listarUsuarios: acessoProcedure
    .input(z.object({ appId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select({
        id: appUsuarios.id,
        nome: appUsuarios.nome,
        email: appUsuarios.email,
        permissao: appUsuarios.permissao,
        ativo: appUsuarios.ativo,
        emailVerificado: appUsuarios.emailVerificado,
        ultimoAcesso: appUsuarios.ultimoAcesso,
        vezesAcesso: appUsuarios.vezesAcesso,
        createdAt: appUsuarios.createdAt,
      }).from(appUsuarios)
        .where(eq(appUsuarios.appId, input.appId))
        .orderBy(desc(appUsuarios.createdAt));
    }),
  
  // Atualizar utilizador
  atualizarUsuario: acessoProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2).optional(),
      permissao: z.enum(["visualizar", "editar", "administrar"]).optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...dados } = input;
      await db.update(appUsuarios).set(dados).where(eq(appUsuarios.id, id));
      return { success: true };
    }),
  
  // Redefinir senha de utilizador
  redefinirSenhaUsuario: acessoProcedure
    .input(z.object({
      id: z.number(),
      novaSenha: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const senhaHash = await hashSenha(input.novaSenha);
      await db.update(appUsuarios)
        .set({ senhaHash })
        .where(eq(appUsuarios.id, input.id));
      return { success: true };
    }),
  
  // Remover utilizador
  removerUsuario: acessoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(appUsuarios).where(eq(appUsuarios.id, input.id));
      return { success: true };
    }),
  
  // ==================== LOGIN PÚBLICO ====================
  
  // Login com código de acesso
  loginComCodigo: publicProcedure
    .input(z.object({
      codigo: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar código
      const [codigoAcesso] = await db.select()
        .from(appCodigosAcesso)
        .innerJoin(apps, eq(appCodigosAcesso.appId, apps.id))
        .where(and(
          eq(appCodigosAcesso.codigo, input.codigo.toUpperCase()),
          eq(appCodigosAcesso.ativo, true)
        ));
      
      if (!codigoAcesso) {
        // Não registrar log quando código é inválido (não temos appId válido)
        throw new Error("Código de acesso inválido ou inativo");
      }
      
      // Verificar validade
      if (codigoAcesso.app_codigos_acesso.validoAte && 
          new Date(codigoAcesso.app_codigos_acesso.validoAte) < new Date()) {
        throw new Error("Código de acesso expirado");
      }
      
      // Criar sessão
      const token = generateToken();
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 7); // 7 dias
      
      await db.insert(appSessoes).values({
        appId: codigoAcesso.apps.id,
        codigoAcessoId: codigoAcesso.app_codigos_acesso.id,
        token,
        ip: ctx.req?.ip || null,
        userAgent: ctx.req?.headers?.["user-agent"] || null,
        expiraEm,
      });
      
      // Atualizar estatísticas do código
      await db.update(appCodigosAcesso)
        .set({ 
          vezesUsado: sql`${appCodigosAcesso.vezesUsado} + 1`,
          ultimoUso: new Date(),
        })
        .where(eq(appCodigosAcesso.id, codigoAcesso.app_codigos_acesso.id));
      
      // Registrar acesso
      await db.insert(appAcessosLog).values({
        appId: codigoAcesso.apps.id,
        codigoAcessoId: codigoAcesso.app_codigos_acesso.id,
        tipoAcesso: "codigo",
        ip: ctx.req?.ip || null,
        userAgent: ctx.req?.headers?.["user-agent"] || null,
        sucesso: true,
      });
      
      return {
        token,
        app: {
          id: codigoAcesso.apps.id,
          nome: codigoAcesso.apps.nome,
          shareLink: codigoAcesso.apps.shareLink,
        },
        permissao: codigoAcesso.app_codigos_acesso.permissao,
        expiraEm,
      };
    }),
  
  // Login com email e senha
  loginComEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      senha: z.string(),
      appShareLink: z.string().optional(), // Para login direto num app específico
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar utilizador
      let query = db.select()
        .from(appUsuarios)
        .innerJoin(apps, eq(appUsuarios.appId, apps.id))
        .where(and(
          eq(appUsuarios.email, input.email),
          eq(appUsuarios.ativo, true)
        ));
      
      const usuarios = await query;
      
      if (usuarios.length === 0) {
        throw new Error("Email ou senha incorretos");
      }
      
      // Se há múltiplos apps, verificar qual
      let usuario = usuarios[0];
      if (input.appShareLink) {
        usuario = usuarios.find(u => u.apps.shareLink === input.appShareLink) || usuarios[0];
      }
      
      // Verificar senha
      const senhaCorreta = await verificarSenha(input.senha, usuario.app_usuarios.senhaHash);
      if (!senhaCorreta) {
        // Registrar tentativa falha
        await db.insert(appAcessosLog).values({
          appId: usuario.apps.id,
          usuarioId: usuario.app_usuarios.id,
          tipoAcesso: "email",
          ip: ctx.req?.ip || null,
          userAgent: ctx.req?.headers?.["user-agent"] || null,
          sucesso: false,
          motivoFalha: "Senha incorreta",
        });
        throw new Error("Email ou senha incorretos");
      }
      
      // Criar sessão
      const token = generateToken();
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 30); // 30 dias
      
      await db.insert(appSessoes).values({
        appId: usuario.apps.id,
        usuarioId: usuario.app_usuarios.id,
        token,
        ip: ctx.req?.ip || null,
        userAgent: ctx.req?.headers?.["user-agent"] || null,
        expiraEm,
      });
      
      // Atualizar estatísticas do utilizador
      await db.update(appUsuarios)
        .set({ 
          vezesAcesso: sql`${appUsuarios.vezesAcesso} + 1`,
          ultimoAcesso: new Date(),
        })
        .where(eq(appUsuarios.id, usuario.app_usuarios.id));
      
      // Registrar acesso
      await db.insert(appAcessosLog).values({
        appId: usuario.apps.id,
        usuarioId: usuario.app_usuarios.id,
        tipoAcesso: "email",
        ip: ctx.req?.ip || null,
        userAgent: ctx.req?.headers?.["user-agent"] || null,
        sucesso: true,
      });
      
      // Se utilizador tem acesso a múltiplos apps, retornar lista
      const appsDisponiveis = usuarios.map(u => ({
        id: u.apps.id,
        nome: u.apps.nome,
        shareLink: u.apps.shareLink,
      }));
      
      return {
        token,
        app: {
          id: usuario.apps.id,
          nome: usuario.apps.nome,
          shareLink: usuario.apps.shareLink,
        },
        usuario: {
          id: usuario.app_usuarios.id,
          nome: usuario.app_usuarios.nome,
          email: usuario.app_usuarios.email,
        },
        permissao: usuario.app_usuarios.permissao,
        expiraEm,
        appsDisponiveis: appsDisponiveis.length > 1 ? appsDisponiveis : undefined,
      };
    }),
  
  // Validar sessão
  validarSessao: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [sessao] = await db.select()
        .from(appSessoes)
        .innerJoin(apps, eq(appSessoes.appId, apps.id))
        .leftJoin(appUsuarios, eq(appSessoes.usuarioId, appUsuarios.id))
        .leftJoin(appCodigosAcesso, eq(appSessoes.codigoAcessoId, appCodigosAcesso.id))
        .where(and(
          eq(appSessoes.token, input.token),
          eq(appSessoes.ativo, true)
        ));
      
      if (!sessao) {
        return { valida: false };
      }
      
      // Verificar expiração
      if (new Date(sessao.app_sessoes.expiraEm) < new Date()) {
        return { valida: false, motivo: "Sessão expirada" };
      }
      
      return {
        valida: true,
        app: {
          id: sessao.apps.id,
          nome: sessao.apps.nome,
          shareLink: sessao.apps.shareLink,
        },
        usuario: sessao.app_usuarios ? {
          id: sessao.app_usuarios.id,
          nome: sessao.app_usuarios.nome,
          email: sessao.app_usuarios.email,
        } : null,
        permissao: sessao.app_usuarios?.permissao || sessao.app_codigos_acesso?.permissao || "visualizar",
        expiraEm: sessao.app_sessoes.expiraEm,
      };
    }),
  
  // Logout
  logout: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(appSessoes)
        .set({ ativo: false })
        .where(eq(appSessoes.token, input.token));
      return { success: true };
    }),
  
  // ==================== RECUPERAÇÃO DE SENHA ====================
  
  // Solicitar recuperação de senha
  solicitarRecuperacao: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [usuario] = await db.select()
        .from(appUsuarios)
        .where(eq(appUsuarios.email, input.email));
      
      if (!usuario) {
        // Não revelar se email existe
        return { success: true, message: "Se o email existir, receberá instruções de recuperação" };
      }
      
      const resetToken = generateToken();
      const resetTokenExpira = new Date();
      resetTokenExpira.setHours(resetTokenExpira.getHours() + 2); // 2 horas
      
      await db.update(appUsuarios)
        .set({ resetToken, resetTokenExpira })
        .where(eq(appUsuarios.id, usuario.id));
      
      // TODO: Enviar email com link de recuperação
      
      return { success: true, message: "Se o email existir, receberá instruções de recuperação" };
    }),
  
  // Redefinir senha com token
  redefinirSenhaComToken: publicProcedure
    .input(z.object({
      token: z.string(),
      novaSenha: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [usuario] = await db.select()
        .from(appUsuarios)
        .where(eq(appUsuarios.resetToken, input.token));
      
      if (!usuario) {
        throw new Error("Token inválido");
      }
      
      if (!usuario.resetTokenExpira || new Date(usuario.resetTokenExpira) < new Date()) {
        throw new Error("Token expirado");
      }
      
      const senhaHash = await hashSenha(input.novaSenha);
      
      await db.update(appUsuarios)
        .set({ 
          senhaHash,
          resetToken: null,
          resetTokenExpira: null,
        })
        .where(eq(appUsuarios.id, usuario.id));
      
      return { success: true };
    }),
  
  // ==================== LOG DE ACESSOS ====================
  
  // Listar log de acessos de um app
  listarLogAcessos: acessoProcedure
    .input(z.object({ 
      appId: z.number(),
      limite: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select()
        .from(appAcessosLog)
        .leftJoin(appUsuarios, eq(appAcessosLog.usuarioId, appUsuarios.id))
        .leftJoin(appCodigosAcesso, eq(appAcessosLog.codigoAcessoId, appCodigosAcesso.id))
        .where(eq(appAcessosLog.appId, input.appId))
        .orderBy(desc(appAcessosLog.createdAt))
        .limit(input.limite);
    }),
});
