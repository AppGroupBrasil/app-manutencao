import { z } from "zod";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { funcoesPersonalizadas, registrosPersonalizados } from "../../../drizzle/schema";
import { router, protectedProcedure, publicProcedure, escopoProcedure } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";
import crypto from "crypto";

function generateShareToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Campos disponíveis para personalização
export const CAMPOS_DISPONIVEIS = [
  { key: "titulo", label: "Título", descricao: "Nome/título da tarefa", tipo: "texto" },
  { key: "descricao", label: "Descrição", descricao: "Descrição detalhada", tipo: "textarea" },
  { key: "local", label: "Local", descricao: "Local/área onde ocorre", tipo: "texto" },
  { key: "imagens", label: "Fotos", descricao: "Galeria de imagens com legenda", tipo: "imagens" },
  { key: "statusPersonalizado", label: "Status", descricao: "Status personalizado", tipo: "texto" },
  { key: "protocolo", label: "Protocolo", descricao: "Número de protocolo automático", tipo: "auto" },
  { key: "localizacao", label: "Localização GPS", descricao: "Captura automática de GPS", tipo: "gps" },
  { key: "prioridade", label: "Prioridade", descricao: "Baixa, Média, Alta, Urgente", tipo: "select" },
  { key: "responsavelId", label: "Responsável", descricao: "Membro da equipe responsável", tipo: "select" },
  { key: "itensChecklist", label: "Checklist", descricao: "Lista de itens a verificar", tipo: "checklist" },
  { key: "prazoConclusao", label: "Prazo de Conclusão", descricao: "Data limite para conclusão", tipo: "data" },
  { key: "nivelUrgencia", label: "Nível de Urgência", descricao: "Baixo, Médio, Alto, Crítico", tipo: "select" },
  { key: "anexos", label: "Anexos", descricao: "Documentos e arquivos anexos", tipo: "arquivos" },
  { key: "qrcode", label: "QR Code", descricao: "Leitura de QR Code", tipo: "qrcode" },
  { key: "assinaturaTecnico", label: "Assinatura Técnico", descricao: "Assinatura digital do técnico", tipo: "assinatura" },
  { key: "assinaturaSolicitante", label: "Assinatura Solicitante", descricao: "Assinatura digital do solicitante", tipo: "assinatura" },
] as const;

/** Rotas por `id`: a função precisa ser de uma organização do solicitante. */
const funcaoProcedure = escopoProcedure(escopoPorRegistro({ id: direto(funcoesPersonalizadas) }));

export const funcoesPersonalizadasRouter = router({
  // Listar campos disponíveis
  camposDisponiveis: protectedProcedure
    .query(() => {
      return CAMPOS_DISPONIVEIS;
    }),

  // Listar funções personalizadas de um condomínio
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return db.select()
        .from(funcoesPersonalizadas)
        .where(and(
          eq(funcoesPersonalizadas.condominioId, input.condominioId),
          eq(funcoesPersonalizadas.ativo, true),
        ))
        .orderBy(asc(funcoesPersonalizadas.ordem), desc(funcoesPersonalizadas.updatedAt));
    }),

  // Listar TODAS (incluindo inativas) - para admin
  listarTodas: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return db.select()
        .from(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.condominioId, input.condominioId))
        .orderBy(asc(funcoesPersonalizadas.ordem), desc(funcoesPersonalizadas.updatedAt));
    }),

  // Listar funções ativas para a home (todos os condomínios do usuário)
  listarParaHome: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return db.select()
        .from(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.ativo, true))
        .orderBy(asc(funcoesPersonalizadas.ordem), desc(funcoesPersonalizadas.updatedAt));
    }),

  // Obter função específica
  obter: funcaoProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [funcao] = await db.select()
        .from(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.id, input.id));
      
      return funcao || null;
    }),

  // Criar nova função personalizada
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1, "Nome é obrigatório"),
      descricao: z.string().optional(),
      icone: z.string().default("ClipboardList"),
      cor: z.string().default("#3B82F6"),
      camposAtivos: z.record(z.boolean()),
      camposObrigatorios: z.record(z.boolean()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Contar existentes para ordem
      const existentes = await db.select()
        .from(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.condominioId, input.condominioId));
      
      const token = generateShareToken();
      const [result] = await db.insert(funcoesPersonalizadas).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        nome: input.nome,
        descricao: input.descricao || null,
        icone: input.icone,
        cor: input.cor,
        camposAtivos: input.camposAtivos,
        camposObrigatorios: input.camposObrigatorios,
        ordem: existentes.length,
        shareToken: token,
      }).returning();
      
      return { id: Number(result.id), nome: input.nome, shareToken: token };
    }),

  // Atualizar função existente
  atualizar: funcaoProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      icone: z.string().optional(),
      cor: z.string().optional(),
      camposAtivos: z.record(z.boolean()).optional(),
      camposObrigatorios: z.record(z.boolean()).optional(),
      ativo: z.boolean().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.icone !== undefined) updateData.icone = data.icone;
      if (data.cor !== undefined) updateData.cor = data.cor;
      if (data.camposAtivos !== undefined) updateData.camposAtivos = data.camposAtivos;
      if (data.camposObrigatorios !== undefined) updateData.camposObrigatorios = data.camposObrigatorios;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;
      if (data.ordem !== undefined) updateData.ordem = data.ordem;
      
      await db.update(funcoesPersonalizadas)
        .set(updateData)
        .where(eq(funcoesPersonalizadas.id, id));
      
      return { success: true };
    }),

  // Deletar função
  deletar: funcaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.id, input.id));
      
      return { success: true };
    }),

  // Duplicar função existente
  duplicar: funcaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [original] = await db.select()
        .from(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.id, input.id));
      
      if (!original) throw new Error("Função não encontrada");
      
      const [result] = await db.insert(funcoesPersonalizadas).values({
        condominioId: original.condominioId,
        userId: ctx.user?.id,
        nome: `${original.nome} (Cópia)`,
        descricao: original.descricao,
        icone: original.icone,
        cor: original.cor,
        camposAtivos: original.camposAtivos,
        camposObrigatorios: original.camposObrigatorios,
        ordem: (original.ordem || 0) + 1,
      }).returning();
      
      return { id: Number(result.id) };
    }),

  // ==================== ENDPOINTS PÚBLICOS ====================

  // Gerar shareToken para uma função existente que não tem
  gerarShareToken: funcaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      
      const token = generateShareToken();
      await db.update(funcoesPersonalizadas)
        .set({ shareToken: token } as any)
        .where(eq(funcoesPersonalizadas.id, input.id));
      
      return { shareToken: token };
    }),

  // Obter função pública pelo shareToken (sem autenticação)
  obterPublica: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      
      const [funcao] = await db.select()
        .from(funcoesPersonalizadas)
        .where(sql`${funcoesPersonalizadas}.shareToken = ${input.token}`);
      
      if (!funcao || !funcao.ativo) return null;
      
      // Retornar apenas dados necessários (sem dados sensíveis)
      return {
        id: funcao.id,
        nome: funcao.nome,
        descricao: funcao.descricao,
        icone: funcao.icone,
        cor: funcao.cor,
        camposAtivos: funcao.camposAtivos,
        camposObrigatorios: funcao.camposObrigatorios,
        condominioId: funcao.condominioId,
      };
    }),

  // Criar registro público (sem autenticação)
  criarRegistroPublico: publicProcedure
    .input(z.object({
      token: z.string(),
      protocolo: z.string().optional(),
      dados: z.record(z.any()),
      imagens: z.array(z.object({ url: z.string(), legenda: z.string() })).optional(),
      checklistItems: z.array(z.object({ texto: z.string(), checked: z.boolean() })).optional(),
      assinaturas: z.record(z.string()).optional(),
      status: z.string().optional().default("aberto"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar função pelo token
      const [funcao] = await db.select()
        .from(funcoesPersonalizadas)
        .where(sql`${funcoesPersonalizadas}.shareToken = ${input.token}`);
      
      if (!funcao || !funcao.ativo) throw new Error("Função não encontrada ou inativa");
      
      const [result] = await db.insert(registrosPersonalizados).values({
        funcaoId: funcao.id,
        condominioId: funcao.condominioId,
        userId: null,
        protocolo: input.protocolo || null,
        dados: input.dados,
        imagens: input.imagens || null,
        checklistItems: input.checklistItems || null,
        assinaturas: input.assinaturas || null,
        status: input.status,
      }).returning();
      
      return { id: Number(result.id), funcaoNome: funcao.nome };
    }),
});
