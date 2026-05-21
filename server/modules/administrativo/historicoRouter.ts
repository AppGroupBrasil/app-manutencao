
import { z } from "zod";
import { eq, desc, and, or, like, sql, gte, lte } from "drizzle-orm";
import { getDb } from "../../db";
import { 
  historicoAtividades, 
  vistorias, 
  manutencoes, 
  ocorrencias, 
  ordensServico, 
  checklists, 
  tarefasSimples 
} from "../../../drizzle/schema";
import { router, protectedProcedure } from "../../_core/trpc";

export const historicoAtividadesRouter = router({
  // Listar histórico com filtros avançados
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      // Filtros
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "ordem_servico", "checklist", "antes_depois", "todos"]).optional().default("todos"),
      acao: z.string().optional(),
      protocolo: z.string().optional(),
      funcionarioId: z.number().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      busca: z.string().optional(),
      // Paginação
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const offset = (input.page - 1) * input.limit;
      
      // Construir condições de filtro
      const conditions = [eq(historicoAtividades.condominioId, input.condominioId)];
      
      if (input.tipo && input.tipo !== "todos") {
        conditions.push(eq(historicoAtividades.entidadeTipo, input.tipo));
      }
      
      if (input.acao) {
        conditions.push(eq(historicoAtividades.acao, input.acao as any));
      }
      
      if (input.protocolo) {
        conditions.push(like(historicoAtividades.entidadeProtocolo, `%${input.protocolo}%`));
      }
      
      if (input.funcionarioId) {
        conditions.push(eq(historicoAtividades.usuarioId, input.funcionarioId));
      }
      
      if (input.dataInicio) {
        conditions.push(gte(historicoAtividades.createdAt, new Date(input.dataInicio)));
      }
      
      if (input.dataFim) {
        const dataFim = new Date(input.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        conditions.push(lte(historicoAtividades.createdAt, dataFim));
      }
      
      if (input.busca) {
        conditions.push(
          or(
            like(historicoAtividades.entidadeProtocolo, `%${input.busca}%`),
            like(historicoAtividades.entidadeTitulo, `%${input.busca}%`),
            like(historicoAtividades.descricao, `%${input.busca}%`),
            like(historicoAtividades.usuarioNome, `%${input.busca}%`)
          )!
        );
      }
      
      // Contar total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(historicoAtividades)
        .where(and(...conditions));
      const total = countResult?.count || 0;
      
      // Buscar registros
      const registros = await db
        .select()
        .from(historicoAtividades)
        .where(and(...conditions))
        .orderBy(desc(historicoAtividades.createdAt))
        .limit(input.limit)
        .offset(offset);
      
      return {
        registros,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
  
  // Registrar nova atividade no histórico
  registrar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      entidadeTipo: z.enum(["vistoria", "manutencao", "ocorrencia", "ordem_servico", "checklist", "antes_depois"]),
      entidadeId: z.number(),
      entidadeProtocolo: z.string().optional(),
      entidadeTitulo: z.string().optional(),
      acao: z.enum([
        "criado", "editado", "status_alterado", "comentario_adicionado",
        "imagem_adicionada", "imagem_removida", "atribuido", "prioridade_alterada",
        "agendado", "iniciado", "pausado", "retomado", "concluido",
        "reaberto", "cancelado", "arquivado", "enviado", "compartilhado"
      ]),
      descricao: z.string().optional(),
      valorAnterior: z.string().optional(),
      valorNovo: z.string().optional(),
      metadados: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [registro] = await db.insert(historicoAtividades).values({
        condominioId: input.condominioId,
        entidadeTipo: input.entidadeTipo,
        entidadeId: input.entidadeId,
        entidadeProtocolo: input.entidadeProtocolo,
        entidadeTitulo: input.entidadeTitulo,
        acao: input.acao,
        descricao: input.descricao,
        valorAnterior: input.valorAnterior,
        valorNovo: input.valorNovo,
        usuarioId: ctx.user?.id,
        usuarioNome: ctx.user?.name || "Sistema",
        metadados: input.metadados,
      }).returning();
      
      return { id: registro.id };
    }),
  
  // Obter estatísticas do histórico
  estatisticas: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [eq(historicoAtividades.condominioId, input.condominioId)];
      
      if (input.dataInicio) {
        conditions.push(gte(historicoAtividades.createdAt, new Date(input.dataInicio)));
      }
      
      if (input.dataFim) {
        const dataFim = new Date(input.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        conditions.push(lte(historicoAtividades.createdAt, dataFim));
      }
      
      // Contar por tipo
      const porTipo = await db
        .select({
          tipo: historicoAtividades.entidadeTipo,
          total: sql<number>`count(*)`
        })
        .from(historicoAtividades)
        .where(and(...conditions))
        .groupBy(historicoAtividades.entidadeTipo);
      
      // Contar por ação
      const porAcao = await db
        .select({
          acao: historicoAtividades.acao,
          total: sql<number>`count(*)`
        })
        .from(historicoAtividades)
        .where(and(...conditions))
        .groupBy(historicoAtividades.acao);
      
      // Total geral
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(historicoAtividades)
        .where(and(...conditions));
      
      return {
        total: totalResult?.count || 0,
        porTipo,
        porAcao,
      };
    }),
  
  // Listar funcionários que têm atividades registradas
  funcionariosAtivos: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const funcionariosComAtividade = await db
        .selectDistinct({
          id: historicoAtividades.usuarioId,
          nome: historicoAtividades.usuarioNome,
        })
        .from(historicoAtividades)
        .where(and(
          eq(historicoAtividades.condominioId, input.condominioId),
          sql`${historicoAtividades.usuarioId} IS NOT NULL`
        ))
        .orderBy(historicoAtividades.usuarioNome);
      
      return funcionariosComAtividade;
    }),
  
  // Buscar histórico unificado de TODAS as tabelas (vistorias, manutenções, ocorrências, tarefas simples, OS, checklists)
  buscarUnificado: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      busca: z.string().optional(),
      tipo: z.enum(["todos", "vistoria", "manutencao", "ocorrencia", "ordem_servico", "checklist", "tarefa_simples"]).optional().default("todos"),
      status: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const offset = (input.page - 1) * input.limit;
      const resultados: any[] = [];
      
      // Buscar em Vistorias
      if (input.tipo === "todos" || input.tipo === "vistoria") {
        const vistoriasConditions = [eq(vistorias.condominioId, input.condominioId)];
        if (input.busca) {
          vistoriasConditions.push(
            or(
              like(vistorias.protocolo, `%${input.busca}%`),
              like(vistorias.titulo, `%${input.busca}%`),
              like(vistorias.descricao, `%${input.busca}%`)
            )!
          );
        }
        if (input.status) {
          vistoriasConditions.push(eq(vistorias.status, input.status as any));
        }
        if (input.dataInicio) {
          vistoriasConditions.push(gte(vistorias.createdAt, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          vistoriasConditions.push(lte(vistorias.createdAt, dataFim));
        }
        
        const vistoriasData = await db
          .select()
          .from(vistorias)
          .where(and(...vistoriasConditions))
          .orderBy(desc(vistorias.createdAt));
        
        vistoriasData.forEach(v => resultados.push({
          ...v,
          _tipo: "vistoria",
          _tipoLabel: "Vistoria Completa",
          _cor: "blue"
        }));
      }
      
      // Buscar em Manutenções
      if (input.tipo === "todos" || input.tipo === "manutencao") {
        const manutencoesConditions = [eq(manutencoes.condominioId, input.condominioId)];
        if (input.busca) {
          manutencoesConditions.push(
            or(
              like(manutencoes.protocolo, `%${input.busca}%`),
              like(manutencoes.titulo, `%${input.busca}%`),
              like(manutencoes.descricao, `%${input.busca}%`)
            )!
          );
        }
        if (input.status) {
          manutencoesConditions.push(eq(manutencoes.status, input.status as any));
        }
        if (input.dataInicio) {
          manutencoesConditions.push(gte(manutencoes.createdAt, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          manutencoesConditions.push(lte(manutencoes.createdAt, dataFim));
        }
        
        const manutencoesData = await db
          .select()
          .from(manutencoes)
          .where(and(...manutencoesConditions))
          .orderBy(desc(manutencoes.createdAt));
        
        manutencoesData.forEach(m => resultados.push({
          ...m,
          _tipo: "manutencao",
          _tipoLabel: "Manutenção Completa",
          _cor: "green"
        }));
      }
      
      // Buscar em Ocorrências
      if (input.tipo === "todos" || input.tipo === "ocorrencia") {
        const ocorrenciasConditions = [eq(ocorrencias.condominioId, input.condominioId)];
        if (input.busca) {
          ocorrenciasConditions.push(
            or(
              like(ocorrencias.protocolo, `%${input.busca}%`),
              like(ocorrencias.titulo, `%${input.busca}%`),
              like(ocorrencias.descricao, `%${input.busca}%`)
            )!
          );
        }
        if (input.status) {
          ocorrenciasConditions.push(eq(ocorrencias.status, input.status as any));
        }
        if (input.dataInicio) {
          ocorrenciasConditions.push(gte(ocorrencias.createdAt, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          ocorrenciasConditions.push(lte(ocorrencias.createdAt, dataFim));
        }
        
        const ocorrenciasData = await db
          .select()
          .from(ocorrencias)
          .where(and(...ocorrenciasConditions))
          .orderBy(desc(ocorrencias.createdAt));
        
        ocorrenciasData.forEach(o => resultados.push({
          ...o,
          _tipo: "ocorrencia",
          _tipoLabel: "Ocorrência Completa",
          _cor: "yellow"
        }));
      }
      
      // Buscar em Ordens de Serviço
      if (input.tipo === "todos" || input.tipo === "ordem_servico") {
        const osConditions = [eq(ordensServico.condominioId, input.condominioId)];
        if (input.busca) {
          osConditions.push(
            or(
              like(ordensServico.protocolo, `%${input.busca}%`),
              like(ordensServico.titulo, `%${input.busca}%`),
              like(ordensServico.descricao, `%${input.busca}%`)
            )!
          );
        }
        if (input.dataInicio) {
          osConditions.push(gte(ordensServico.createdAt, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          osConditions.push(lte(ordensServico.createdAt, dataFim));
        }
        
        const osData = await db
          .select()
          .from(ordensServico)
          .where(and(...osConditions))
          .orderBy(desc(ordensServico.createdAt));
        
        osData.forEach(os => resultados.push({
          ...os,
          _tipo: "ordem_servico",
          _tipoLabel: "Ordem de Serviço",
          _cor: "purple"
        }));
      }
      
      // Buscar em Checklists
      if (input.tipo === "todos" || input.tipo === "checklist") {
        const checklistsConditions = [eq(checklists.condominioId, input.condominioId)];
        if (input.busca) {
          checklistsConditions.push(
            or(
              like(checklists.protocolo, `%${input.busca}%`),
              like(checklists.titulo, `%${input.busca}%`),
              like(checklists.descricao, `%${input.busca}%`)
            )!
          );
        }
        if (input.status) {
          checklistsConditions.push(eq(checklists.status, input.status as any));
        }
        if (input.dataInicio) {
          checklistsConditions.push(gte(checklists.createdAt, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          checklistsConditions.push(lte(checklists.createdAt, dataFim));
        }
        
        const checklistsData = await db
          .select()
          .from(checklists)
          .where(and(...checklistsConditions))
          .orderBy(desc(checklists.createdAt));
        
        checklistsData.forEach(c => resultados.push({
          ...c,
          _tipo: "checklist",
          _tipoLabel: "Checklist Completo",
          _cor: "indigo"
        }));
      }
      
      // Buscar em Tarefas Simples (Funções Rápidas)
      if (input.tipo === "todos" || input.tipo === "tarefa_simples") {
        const tarefasConditions = [eq(tarefasSimples.condominioId, input.condominioId)];
        if (input.busca) {
          tarefasConditions.push(
            or(
              like(tarefasSimples.protocolo, `%${input.busca}%`),
              like(tarefasSimples.titulo, `%${input.busca}%`),
              like(tarefasSimples.descricao, `%${input.busca}%`)
            )!
          );
        }
        if (input.status) {
          tarefasConditions.push(eq(tarefasSimples.status, input.status as any));
        }
        if (input.dataInicio) {
          tarefasConditions.push(gte(tarefasSimples.createdAt, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          tarefasConditions.push(lte(tarefasSimples.createdAt, dataFim));
        }
        
        const tarefasData = await db
          .select()
          .from(tarefasSimples)
          .where(and(...tarefasConditions))
          .orderBy(desc(tarefasSimples.createdAt));
        
        tarefasData.forEach(t => {
          const tipoLabels: Record<string, string> = {
            vistoria: "Vistoria Rápida",
            manutencao: "Manutenção Rápida",
            ocorrencia: "Ocorrência Rápida",
            checklist: "Checklist Rápido",
            antes_depois: "Antes/Depois Rápido"
          };
          const cores: Record<string, string> = {
            vistoria: "blue",
            manutencao: "green",
            ocorrencia: "yellow",
            checklist: "indigo",
            antes_depois: "orange"
          };
          resultados.push({
            ...t,
            _tipo: "tarefa_simples",
            _tipoLabel: tipoLabels[t.tipo] || "Tarefa Rápida",
            _cor: cores[t.tipo] || "gray"
          });
        });
      }
      
      // Ordenar todos os resultados por data de criação (mais recente primeiro)
      resultados.sort((a, b) => {
        const dataA = new Date(a.createdAt).getTime();
        const dataB = new Date(b.createdAt).getTime();
        return dataB - dataA;
      });
      
      // Paginar resultados
      const total = resultados.length;
      const paginados = resultados.slice(offset, offset + input.limit);
      
      return {
        registros: paginados,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
});
