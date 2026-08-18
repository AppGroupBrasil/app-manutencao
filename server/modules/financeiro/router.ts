import { z } from "zod";
import { router, protectedProcedure, moduloUserProcedure } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { getDb } from "../../db";
import { proximoProtocolo } from "../../_core/protocolo";
import { vencimentos, vencimentoAlertas, vencimentoAnexos, vencimentoEmails, vencimentoNotificacoes, vencimentoTipos, condominios } from "../../../drizzle/schema";
import { eq, and, asc, desc, gte, inArray, sql, lte, lt } from "drizzle-orm";
import { unidadesDaConsulta, unidadesSelecionadas } from "../../_core/unidadesConsulta";
import { storagePut } from "../../storage";

/**
 * Agenda de Vencimentos: módulo habilitado + ids da própria organização.
 *
 * `protectedProcedure` só exige login — com ele, um gestor de uma unidade
 * conseguia ler e alterar o vencimento de outra passando o id na chamada. Com
 * 15 unidades no mesmo sistema isso não é aceitável.
 */
const vencimentoProcedure = moduloUserProcedure(
  "agenda-vencimentos",
  escopoPorRegistro(
    {
      id: direto(vencimentos),
      vencimentoId: direto(vencimentos),
      anexoId: via(vencimentoAnexos, "vencimentoId", vencimentos),
    },
    {
      // Aqui `id` é o tipo de manutenção, não o vencimento.
      removerTipo: { id: direto(vencimentoTipos) },
      // Nos sub-routers `id` aponta para o próprio registro deles. A chave é o
      // caminho completo porque "delete" se repete entre routers.
      "vencimentoEmails.delete": { id: direto(vencimentoEmails) },
    },
  ),
);

/**
 * Aviso de vencimento no formato do Manutenção X: por dias de antecedência ou
 * por data específica, com descrição e imagens próprias. Máximo de três por
 * vencimento, como lá.
 */
const avisoSchema = z.object({
  id: z.string(),
  tipo: z.enum(['dias_antes', 'data_especifica']),
  valor: z.number().int().min(0),
  dataEspecifica: z.string().optional(),
  descricao: z.string().optional(),
  imagens: z.array(z.string()).optional(),
});

/**
 * Converte a data do formulário sem perder o dia.
 *
 * O campo manda "AAAA-MM-DD" e `new Date()` lê isso como meia-noite UTC; a
 * coluna é `timestamp` sem fuso, então a gravação e a leitura deslocam o
 * horário e o dia anda para trás — 10/08 aparecia como 09/08 na tela, no
 * calendário e na conta de dias restantes. Fixar no meio-dia local dá 12 horas
 * de folga para cada lado, o que nenhum fuso real alcança.
 */
function dataDoFormulario(valor: string): Date {
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!soData) return new Date(valor);

  const [, ano, mes, dia] = soData;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0, 0);
}

/** Protocolo do vencimento: VNC-000123, derivado do maior id da tabela. */

/** Slug estável para o tipo de manutenção cadastrado pelo usuário. */
function gerarSlug(valor: string): string {
  return (
    valor
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || String(Date.now())
  );
}

// Função auxiliar para gerar PDF de vencimentos usando jsPDF
async function generateVencimentosPDF(htmlContent: string): Promise<Buffer> {
  try {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vencimentos', margin, 13);
    
    // Conteúdo simplificado - extrair texto do HTML
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(textContent, contentWidth);
    let yPos = 30;
    
    for (const line of lines) {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }
    
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Buffer.from(htmlContent, 'utf-8');
  }
}

export const financeiroRouter = router({
  // ==================== VENCIMENTOS ====================
  vencimentos: router({
    // Listar todos os vencimentos de um condomínio
    list: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        status: z.enum(['todos', 'ativo', 'vencido', 'renovado', 'cancelado']).optional().default('todos'),
        tipo: z.string().max(100).optional().default('todos'),
        mes: z.number().optional(),
        ano: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        
        const conditions = [eq(vencimentos.condominioId, input.condominioId)];
        
        if (input.status !== 'todos') {
          conditions.push(eq(vencimentos.status, input.status));
        }
        
        if (input.tipo !== 'todos') {
          conditions.push(eq(vencimentos.tipo, input.tipo));
        }
        
        if (input.mes && input.ano) {
          const startDate = new Date(input.ano, input.mes - 1, 1);
          const endDate = new Date(input.ano, input.mes, 0, 23, 59, 59);
          const dateFilter = and(
            gte(vencimentos.dataVencimento, startDate),
            lte(vencimentos.dataVencimento, endDate)
          );
          if (dateFilter) conditions.push(dateFilter);
        }
        
        if (input.search) {
          conditions.push(
            sql`(${vencimentos.titulo} LIKE ${`%${input.search}%`} OR ${vencimentos.fornecedor} LIKE ${`%${input.search}%`})`
          );
        }
        
        const whereClause = and(...conditions);
        
        // Contagem total
        const totalResult = await db.select({ count: sql<number>`count(*)` })
          .from(vencimentos)
          .where(whereClause);
        
        const total = Number(totalResult[0].count);
        
        // Consulta paginada
        let query = db.select().from(vencimentos).$dynamic().where(whereClause).orderBy(vencimentos.dataVencimento);
        
        if (input.limit) {
          query = query.limit(input.limit);
        }
        
        if (input.offset) {
          query = query.offset(input.offset);
        }
        
        const items = await query;
        
        // Adicionar dias restantes
        const hoje = new Date();
        const itemsComDias = items.map(item => {
          const dataVenc = new Date(item.dataVencimento);
          const diffTime = dataVenc.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { ...item, diasRestantes: diffDays, vencido: diffDays < 0 };
        });
        
        return { items: itemsComDias, total };
      }),

    // Obter um vencimento específico
    get: vencimentoProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const vencimento = await db.select().from(vencimentos)
          .where(eq(vencimentos.id, input.id))
          .limit(1);
          
        if (!vencimento[0]) return null;
        
        const alertas = await db.select().from(vencimentoAlertas)
          .where(eq(vencimentoAlertas.vencimentoId, input.id));
        
        const hoje = new Date();
        const dataVenc = new Date(vencimento[0].dataVencimento);
        const diffTime = dataVenc.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
        return {
          ...vencimento[0],
          alertas: alertas.map(a => a.tipoAlerta),
          diasRestantes: diffDays,
          vencido: diffDays < 0
        };
      }),

    // Criar vencimento
    create: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        tipo: z.string().min(1).max(100),
        titulo: z.string(),
        descricao: z.string().optional(),
        fornecedor: z.string().optional(),
        valor: z.string().optional(),
        dataInicio: z.string().optional(),
        dataVencimento: z.string(),
        ultimaRealizacao: z.string().optional(),
        proximaRealizacao: z.string().optional(),
        periodicidade: z.enum(['unico', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual']).optional(),
        observacoes: z.string().optional(),
        arquivoUrl: z.string().optional(),
        arquivoNome: z.string().optional(),
        setor: z.string().optional(),
        responsavel: z.string().optional(),
        imagemUrl: z.string().optional(),
        emailsNotificacao: z.string().optional(),
        alertas: z.array(z.enum(['na_data', 'um_dia_antes', 'uma_semana_antes', 'quinze_dias_antes', 'um_mes_antes'])).optional(),
        // Modelo do Manutenção X
        avisos: avisoSchema.array().max(3).optional(),
        emails: z.array(z.string()).optional(),
        qtdNotificacoes: z.number().int().min(0).optional(),
        imagens: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { alertas, ...vencimentoData } = input;

        const [result] = await db.insert(vencimentos).values({
          condominioId: vencimentoData.condominioId,
          protocolo: await proximoProtocolo(db, "vencimento", { prefixo: "VNC-" }),
          tipo: vencimentoData.tipo,
          avisos: vencimentoData.avisos ?? [],
          emails: vencimentoData.emails ?? [],
          qtdNotificacoes: vencimentoData.qtdNotificacoes ?? 0,
          imagens: vencimentoData.imagens ?? [],
          titulo: vencimentoData.titulo,
          descricao: vencimentoData.descricao || null,
          fornecedor: vencimentoData.fornecedor || null,
          valor: vencimentoData.valor || null,
          dataInicio: vencimentoData.dataInicio ? dataDoFormulario(vencimentoData.dataInicio) : null,
          dataVencimento: dataDoFormulario(vencimentoData.dataVencimento),
          ultimaRealizacao: vencimentoData.ultimaRealizacao ? dataDoFormulario(vencimentoData.ultimaRealizacao) : null,
          proximaRealizacao: vencimentoData.proximaRealizacao ? dataDoFormulario(vencimentoData.proximaRealizacao) : null,
          periodicidade: vencimentoData.periodicidade || 'unico',
          observacoes: vencimentoData.observacoes || null,
          arquivoUrl: vencimentoData.arquivoUrl || null,
          arquivoNome: vencimentoData.arquivoNome || null,
          setor: vencimentoData.setor || null,
          responsavel: vencimentoData.responsavel || null,
          imagemUrl: vencimentoData.imagemUrl || null,
          emailsNotificacao: vencimentoData.emailsNotificacao || null,
          status: 'ativo',
        }).returning();
        
        const vencimentoId = Number(result.id);
        
        // Criar alertas se especificados
        if (alertas && alertas.length > 0) {
          await db.insert(vencimentoAlertas).values(
            alertas.map(tipoAlerta => ({
              vencimentoId,
              tipoAlerta,
              ativo: true,
              enviado: false,
            }))
          ).returning();
        }
        
        return { id: vencimentoId };
      }),

    // Atualizar vencimento
    update: vencimentoProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        fornecedor: z.string().optional(),
        valor: z.string().optional(),
        dataInicio: z.string().optional(),
        dataVencimento: z.string().optional(),
        ultimaRealizacao: z.string().optional(),
        proximaRealizacao: z.string().optional(),
        periodicidade: z.enum(['unico', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual']).optional(),
        status: z.enum(['ativo', 'vencido', 'renovado', 'cancelado']).optional(),
        observacoes: z.string().optional(),
        arquivoUrl: z.string().optional(),
        arquivoNome: z.string().optional(),
        setor: z.string().optional(),
        responsavel: z.string().optional(),
        imagemUrl: z.string().optional(),
        emailsNotificacao: z.string().optional(),
        alertas: z.array(z.enum(['na_data', 'um_dia_antes', 'uma_semana_antes', 'quinze_dias_antes', 'um_mes_antes'])).optional(),
        // Modelo do Manutenção X
        tipo: z.string().max(100).optional(),
        avisos: avisoSchema.array().max(3).optional(),
        emails: z.array(z.string()).optional(),
        qtdNotificacoes: z.number().int().min(0).optional(),
        imagens: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, alertas, ...updateData } = input;
        
        const fieldsToUpdate: Record<string, unknown> = {};
        if (updateData.titulo !== undefined) fieldsToUpdate.titulo = updateData.titulo;
        if (updateData.descricao !== undefined) fieldsToUpdate.descricao = updateData.descricao || null;
        if (updateData.fornecedor !== undefined) fieldsToUpdate.fornecedor = updateData.fornecedor || null;
        if (updateData.valor !== undefined) fieldsToUpdate.valor = updateData.valor || null;
        if (updateData.dataInicio !== undefined) fieldsToUpdate.dataInicio = updateData.dataInicio ? dataDoFormulario(updateData.dataInicio) : null;
        if (updateData.dataVencimento !== undefined) fieldsToUpdate.dataVencimento = dataDoFormulario(updateData.dataVencimento);
        if (updateData.ultimaRealizacao !== undefined) fieldsToUpdate.ultimaRealizacao = updateData.ultimaRealizacao ? dataDoFormulario(updateData.ultimaRealizacao) : null;
        if (updateData.proximaRealizacao !== undefined) fieldsToUpdate.proximaRealizacao = updateData.proximaRealizacao ? dataDoFormulario(updateData.proximaRealizacao) : null;
        if (updateData.periodicidade !== undefined) fieldsToUpdate.periodicidade = updateData.periodicidade;
        if (updateData.status !== undefined) fieldsToUpdate.status = updateData.status;
        if (updateData.observacoes !== undefined) fieldsToUpdate.observacoes = updateData.observacoes || null;
        if (updateData.arquivoUrl !== undefined) fieldsToUpdate.arquivoUrl = updateData.arquivoUrl || null;
        if (updateData.arquivoNome !== undefined) fieldsToUpdate.arquivoNome = updateData.arquivoNome || null;
        if (updateData.setor !== undefined) fieldsToUpdate.setor = updateData.setor || null;
        if (updateData.responsavel !== undefined) fieldsToUpdate.responsavel = updateData.responsavel || null;
        if (updateData.imagemUrl !== undefined) fieldsToUpdate.imagemUrl = updateData.imagemUrl || null;
        if (updateData.emailsNotificacao !== undefined) fieldsToUpdate.emailsNotificacao = updateData.emailsNotificacao || null;
        if (updateData.tipo !== undefined) fieldsToUpdate.tipo = updateData.tipo;
        if (updateData.avisos !== undefined) fieldsToUpdate.avisos = updateData.avisos;
        if (updateData.emails !== undefined) fieldsToUpdate.emails = updateData.emails;
        if (updateData.qtdNotificacoes !== undefined) fieldsToUpdate.qtdNotificacoes = updateData.qtdNotificacoes;
        if (updateData.imagens !== undefined) fieldsToUpdate.imagens = updateData.imagens;

        if (Object.keys(fieldsToUpdate).length > 0) {
          await db.update(vencimentos).set(fieldsToUpdate).where(eq(vencimentos.id, id));
        }
        
        // Atualizar alertas se especificados
        if (alertas !== undefined) {
          // Remover alertas antigos
          await db.delete(vencimentoAlertas).where(eq(vencimentoAlertas.vencimentoId, id));
          
          // Criar novos alertas
          if (alertas.length > 0) {
            await db.insert(vencimentoAlertas).values(
              alertas.map(tipoAlerta => ({
                vencimentoId: id,
                tipoAlerta,
                ativo: true,
                enviado: false,
              }))
            ).returning();
          }
        }
        
        return { success: true };
      }),

    // Excluir vencimento
    delete: vencimentoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Excluir alertas e notificações relacionados
        await db.delete(vencimentoAlertas).where(eq(vencimentoAlertas.vencimentoId, input.id));
        await db.delete(vencimentoNotificacoes).where(eq(vencimentoNotificacoes.vencimentoId, input.id));
        await db.delete(vencimentos).where(eq(vencimentos.id, input.id));
        
        return { success: true };
      }),

    // Obter estatísticas de vencimentos
    stats: vencimentoProcedure
      .input(z.object({ condominioId: z.number(), unidades: unidadesSelecionadas }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { total: 0, proximos: 0, vencidos: 0, contratos: 0, servicos: 0, manutencoes: 0 };

        const hoje = new Date();
        const em30dias = new Date();
        em30dias.setDate(em30dias.getDate() + 30);

        const todos = await db.select().from(vencimentos)
          .where(and(
            inArray(
              vencimentos.condominioId,
              await unidadesDaConsulta(ctx, input, 'agenda-vencimentos'),
            ),
            eq(vencimentos.status, 'ativo')
          ));
        
        const vencidos = todos.filter(v => new Date(v.dataVencimento) < hoje);
        const proximos = todos.filter(v => {
          const data = new Date(v.dataVencimento);
          return data >= hoje && data <= em30dias;
        });
        
        return {
          total: todos.length,
          proximos: proximos.length,
          vencidos: vencidos.length,
          contratos: todos.filter(v => v.tipo === 'contrato').length,
          servicos: todos.filter(v => v.tipo === 'servico').length,
          manutencoes: todos.filter(v => v.tipo === 'manutencao').length,
        };
      }),

    // Listar próximos vencimentos (para card na visão geral)
    proximos: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        dias: z.number().optional().default(30),
        limite: z.number().optional().default(5),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(limite.getDate() + input.dias);
        
        const items = await db.select().from(vencimentos)
          .where(and(
            eq(vencimentos.condominioId, input.condominioId),
            eq(vencimentos.status, 'ativo')
          ))
          .orderBy(vencimentos.dataVencimento);
        
        // Filtrar e calcular dias
        return items
          .map(item => {
            const dataVenc = new Date(item.dataVencimento);
            const diffTime = dataVenc.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...item, diasRestantes: diffDays, vencido: diffDays < 0 };
          })
          .filter(item => item.diasRestantes >= 0 && item.diasRestantes <= input.dias)
          .slice(0, input.limite);
      }),

    // ── Registro de execução (descrição, status e anexos de antes/depois) ──

    getRegistro: vencimentoProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { descricao: '', status: '', anexos: [] };

        const [venc] = await db.select({
          descricao: vencimentos.registroDescricao,
          status: vencimentos.registroStatus,
        }).from(vencimentos).where(eq(vencimentos.id, input.id)).limit(1);

        if (!venc) throw new Error("Vencimento não encontrado");

        const anexos = await db.select().from(vencimentoAnexos)
          .where(eq(vencimentoAnexos.vencimentoId, input.id))
          .orderBy(asc(vencimentoAnexos.createdAt));

        return { descricao: venc.descricao ?? '', status: venc.status ?? '', anexos };
      }),

    salvarRegistro: vencimentoProcedure
      .input(z.object({
        id: z.number(),
        descricao: z.string().max(5000),
        status: z.string().max(20).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(vencimentos)
          .set({
            registroDescricao: input.descricao,
            ...(input.status !== undefined ? { registroStatus: input.status || null } : {}),
            updatedAt: new Date(),
          })
          .where(eq(vencimentos.id, input.id));

        return { success: true };
      }),

    // Mesmo teto do Manutenção X: 30 anexos por vencimento.
    adicionarAnexos: vencimentoProcedure
      .input(z.object({
        id: z.number(),
        anexos: z.array(z.object({
          url: z.string(),
          nome: z.string().max(255).optional(),
          tipo: z.enum(['imagem', 'arquivo']).optional(),
          fase: z.enum(['antes', 'depois']).optional(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [{ total }] = await db.select({ total: sql<number>`count(*)` })
          .from(vencimentoAnexos)
          .where(eq(vencimentoAnexos.vencimentoId, input.id));

        if (Number(total) + input.anexos.length > 30) {
          throw new Error("Limite de 30 anexos por vencimento");
        }

        await db.insert(vencimentoAnexos).values(
          input.anexos.map(anexo => ({
            vencimentoId: input.id,
            url: anexo.url,
            nome: anexo.nome ?? null,
            tipo: anexo.tipo ?? (/\.pdf$/i.test(anexo.url) ? 'arquivo' : 'imagem'),
            fase: anexo.fase ?? 'antes',
            autorId: ctx.user?.id,
            autorNome: ctx.user?.name,
          })),
        );

        return { success: true };
      }),

    removerAnexo: vencimentoProcedure
      .input(z.object({ anexoId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(vencimentoAnexos).where(eq(vencimentoAnexos.id, input.anexoId));
        return { success: true };
      }),

    // ── Tipos de manutenção cadastráveis ──

    listarTipos: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return db.select().from(vencimentoTipos)
          .where(and(
            eq(vencimentoTipos.condominioId, input.condominioId),
            eq(vencimentoTipos.ativo, true),
          ))
          .orderBy(asc(vencimentoTipos.nome));
      }),

    criarTipo: vencimentoProcedure
      .input(z.object({ condominioId: z.number(), nome: z.string().min(1).max(120) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const slug = gerarSlug(input.nome);

        const [existente] = await db.select().from(vencimentoTipos)
          .where(and(
            eq(vencimentoTipos.condominioId, input.condominioId),
            eq(vencimentoTipos.slug, slug),
          ))
          .limit(1);

        // Recadastrar um tipo desativado reativa o mesmo registro: assim os
        // vencimentos que já apontam para "manutencao:<slug>" continuam válidos.
        if (existente) {
          await db.update(vencimentoTipos)
            .set({ nome: input.nome, ativo: true })
            .where(eq(vencimentoTipos.id, existente.id));
          return { id: existente.id, slug };
        }

        const [criado] = await db.insert(vencimentoTipos)
          .values({ condominioId: input.condominioId, slug, nome: input.nome })
          .returning();

        return { id: criado.id, slug };
      }),

    removerTipo: vencimentoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Desativa em vez de apagar: vencimento antigo continua exibindo o nome.
        await db.update(vencimentoTipos).set({ ativo: false }).where(eq(vencimentoTipos.id, input.id));
        return { success: true };
      }),
  }),

  // ==================== E-MAILS DE VENCIMENTOS ====================
  vencimentoEmails: router({
    // Listar e-mails do condomínio
    list: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(vencimentoEmails)
          .where(eq(vencimentoEmails.condominioId, input.condominioId));
      }),

    // Adicionar e-mail
    create: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        email: z.string().email(),
        nome: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(vencimentoEmails).values({
          condominioId: input.condominioId,
          email: input.email,
          nome: input.nome || null,
          ativo: true,
        }).returning();
        
        return { id: Number(result.id) };
      }),

    // Atualizar e-mail
    update: vencimentoProcedure
      .input(z.object({
        id: z.number(),
        email: z.string().email().optional(),
        nome: z.string().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...updateData } = input;
        const fieldsToUpdate: Record<string, unknown> = {};
        if (updateData.email !== undefined) fieldsToUpdate.email = updateData.email;
        if (updateData.nome !== undefined) fieldsToUpdate.nome = updateData.nome || null;
        if (updateData.ativo !== undefined) fieldsToUpdate.ativo = updateData.ativo;
        
        if (Object.keys(fieldsToUpdate).length > 0) {
          await db.update(vencimentoEmails).set(fieldsToUpdate).where(eq(vencimentoEmails.id, id));
        }
        
        return { success: true };
      }),

    // Excluir e-mail
    delete: vencimentoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(vencimentoEmails).where(eq(vencimentoEmails.id, input.id));
        
        return { success: true };
      }),
  }),

  // ==================== NOTIFICAÇÕES DE VENCIMENTOS ====================
  vencimentoNotificacoes: router({
    // Listar notificações de um vencimento
    list: vencimentoProcedure
      .input(z.object({ vencimentoId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(vencimentoNotificacoes)
          .where(eq(vencimentoNotificacoes.vencimentoId, input.vencimentoId))
          .orderBy(desc(vencimentoNotificacoes.createdAt));
      }),

    // Enviar notificação manual
    enviar: vencimentoProcedure
      .input(z.object({
        vencimentoId: z.number(),
        condominioId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Obter vencimento
        const venc = await db.select().from(vencimentos)
          .where(eq(vencimentos.id, input.vencimentoId))
          .limit(1);
        
        if (!venc[0]) throw new Error("Vencimento não encontrado");
        
        // Obter e-mails do condomínio
        const emails = await db.select().from(vencimentoEmails)
          .where(and(
            eq(vencimentoEmails.condominioId, input.condominioId),
            eq(vencimentoEmails.ativo, true)
          ));
        
        if (emails.length === 0) {
          throw new Error("Nenhum e-mail configurado para notificações");
        }
        
        const dataVenc = new Date(venc[0].dataVencimento);
        const hoje = new Date();
        const diffTime = dataVenc.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const tipoLabel = venc[0].tipo === 'contrato' ? 'Contrato' : venc[0].tipo === 'servico' ? 'Serviço' : 'Manutenção';
        const statusLabel = diffDays < 0 ? `VENCIDO há ${Math.abs(diffDays)} dias` : diffDays === 0 ? 'VENCE HOJE' : `vence em ${diffDays} dias`;
        
        const assunto = `[Alerta] ${tipoLabel}: ${venc[0].titulo} - ${statusLabel}`;
        const conteudo = `
Olá,

Este é um alerta automático sobre o seguinte vencimento:

Título: ${venc[0].titulo}
Tipo: ${tipoLabel}
Data de Vencimento: ${dataVenc.toLocaleDateString('pt-BR')}
Status: ${statusLabel}
${venc[0].fornecedor ? `Fornecedor: ${venc[0].fornecedor}` : ''}
${venc[0].descricao ? `\nDescrição: ${venc[0].descricao}` : ''}
${venc[0].observacoes ? `\nObservações: ${venc[0].observacoes}` : ''}

Atenciosamente,
Sistema de Gestão do Condomínio
        `.trim();
        
        // Registrar notificações enviadas
        const notificacoes = emails.map(email => ({
          vencimentoId: input.vencimentoId,
          emailDestinatario: email.email,
          assunto,
          conteudo,
          status: 'enviado' as const,
        }));
        
        await db.insert(vencimentoNotificacoes).values(notificacoes).returning();
        
        return { success: true, enviados: emails.length };
      }),
  }),

  // ==================== DISPARO AUTOMÁTICO DE E-MAILS ====================
  alertasAutomaticos: router({
    // Verificar e enviar alertas pendentes
    processarAlertas: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        // Buscar todos os alertas não enviados com seus vencimentos
        const alertas = await db.select({
          alerta: vencimentoAlertas,
          vencimento: vencimentos,
        })
          .from(vencimentoAlertas)
          .innerJoin(vencimentos, eq(vencimentoAlertas.vencimentoId, vencimentos.id))
          .where(and(
            eq(vencimentoAlertas.ativo, true),
            eq(vencimentoAlertas.enviado, false),
            eq(vencimentos.status, 'ativo'),
            eq(vencimentos.condominioId, input.condominioId)
          ));
        
        // Filtrar alertas que devem ser enviados hoje
        const diasAntecedencia: Record<string, number> = {
          'na_data': 0,
          'um_dia_antes': 1,
          'uma_semana_antes': 7,
          'quinze_dias_antes': 15,
          'um_mes_antes': 30,
        };
        
        const alertasParaEnviar = alertas.filter(({ alerta, vencimento }) => {
          const dataVencimento = new Date(vencimento.dataVencimento);
          dataVencimento.setHours(0, 0, 0, 0);
          
          const diasAntes = diasAntecedencia[alerta.tipoAlerta] || 0;
          const dataAlerta = new Date(dataVencimento);
          dataAlerta.setDate(dataAlerta.getDate() - diasAntes);
          
          return dataAlerta <= hoje;
        });
        
        if (alertasParaEnviar.length === 0) {
          return { enviados: 0, mensagem: 'Nenhum alerta pendente para enviar' };
        }
        
        // Obter e-mails do condomínio
        const emails = await db.select().from(vencimentoEmails)
          .where(and(
            eq(vencimentoEmails.condominioId, input.condominioId),
            eq(vencimentoEmails.ativo, true)
          ));
        
        if (emails.length === 0) {
          return { enviados: 0, mensagem: 'Nenhum e-mail configurado para notificações' };
        }
        
        let enviados = 0;
        
        for (const { alerta, vencimento } of alertasParaEnviar) {
          const dataVenc = new Date(vencimento.dataVencimento);
          const diffTime = dataVenc.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const tipoLabel = vencimento.tipo === 'contrato' ? 'Contrato' : vencimento.tipo === 'servico' ? 'Serviço' : 'Manutenção';
          const alertaLabel: Record<string, string> = {
            'na_data': 'VENCE HOJE',
            'um_dia_antes': 'Vence amanhã',
            'uma_semana_antes': 'Vence em 1 semana',
            'quinze_dias_antes': 'Vence em 15 dias',
            'um_mes_antes': 'Vence em 1 mês',
          };
          const statusLabel = diffDays < 0 ? `VENCIDO há ${Math.abs(diffDays)} dias` : alertaLabel[alerta.tipoAlerta] || `vence em ${diffDays} dias`;
          
          const assunto = `[⚠️ Alerta de Vencimento] ${tipoLabel}: ${vencimento.titulo} - ${statusLabel}`;
          const conteudo = `
Olá,

Este é um alerta automático sobre o seguinte vencimento:

📄 Título: ${vencimento.titulo}
📌 Tipo: ${tipoLabel}
📅 Data de Vencimento: ${dataVenc.toLocaleDateString('pt-BR')}
⏰ Status: ${statusLabel}
${vencimento.fornecedor ? `🏢 Fornecedor: ${vencimento.fornecedor}` : ''}
${vencimento.descricao ? `\n📝 Descrição: ${vencimento.descricao}` : ''}
${vencimento.observacoes ? `\n💬 Observações: ${vencimento.observacoes}` : ''}

---
Este e-mail foi enviado automaticamente pelo Sistema de Gestão do Condomínio.
Para gerenciar suas notificações, acesse a Agenda de Vencimentos no painel.
          `.trim();
          
          // Registrar notificações para cada e-mail
          for (const email of emails) {
            await db.insert(vencimentoNotificacoes).values({
              vencimentoId: vencimento.id,
              alertaId: alerta.id,
              emailDestinatario: email.email,
              assunto,
              conteudo,
              status: 'enviado',
            });
          }
          
          // Marcar alerta como enviado
          await db.update(vencimentoAlertas)
            .set({ enviado: true, dataEnvio: new Date() })
            .where(eq(vencimentoAlertas.id, alerta.id));
          
          enviados++;
        }
        
        return { 
          enviados, 
          totalDestinatarios: emails.length,
          mensagem: `${enviados} alerta(s) processado(s) para ${emails.length} destinatário(s)` 
        };
      }),

    // Verificar alertas pendentes (sem enviar)
    verificarPendentes: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { pendentes: 0, alertas: [] };
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const alertas = await db.select({
          alerta: vencimentoAlertas,
          vencimento: vencimentos,
        })
          .from(vencimentoAlertas)
          .innerJoin(vencimentos, eq(vencimentoAlertas.vencimentoId, vencimentos.id))
          .where(and(
            eq(vencimentoAlertas.ativo, true),
            eq(vencimentoAlertas.enviado, false),
            eq(vencimentos.status, 'ativo'),
            eq(vencimentos.condominioId, input.condominioId)
          ));
        
        const diasAntecedencia: Record<string, number> = {
          'na_data': 0,
          'um_dia_antes': 1,
          'uma_semana_antes': 7,
          'quinze_dias_antes': 15,
          'um_mes_antes': 30,
        };
        
        const alertasPendentes = alertas.filter(({ alerta, vencimento }) => {
          const dataVencimento = new Date(vencimento.dataVencimento);
          dataVencimento.setHours(0, 0, 0, 0);
          
          const diasAntes = diasAntecedencia[alerta.tipoAlerta] || 0;
          const dataAlerta = new Date(dataVencimento);
          dataAlerta.setDate(dataAlerta.getDate() - diasAntes);
          
          return dataAlerta <= hoje;
        });
        
        return {
          pendentes: alertasPendentes.length,
          alertas: alertasPendentes.map(({ alerta, vencimento }) => ({
            alertaId: alerta.id,
            vencimentoId: vencimento.id,
            titulo: vencimento.titulo,
            tipo: vencimento.tipo,
            tipoAlerta: alerta.tipoAlerta,
            dataVencimento: vencimento.dataVencimento,
          })),
        };
      }),

    // Histórico de notificações enviadas
    historico: vencimentoProcedure
      .input(z.object({ 
        condominioId: z.number(),
        limite: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const notifs = await db.select({
          notificacao: vencimentoNotificacoes,
          vencimento: vencimentos,
        })
          .from(vencimentoNotificacoes)
          .innerJoin(vencimentos, eq(vencimentoNotificacoes.vencimentoId, vencimentos.id))
          .where(eq(vencimentos.condominioId, input.condominioId))
          .orderBy(desc(vencimentoNotificacoes.createdAt))
          .limit(input.limite);
        
        return notifs.map(({ notificacao, vencimento }) => ({
          ...notificacao,
          vencimentoTitulo: vencimento.titulo,
          vencimentoTipo: vencimento.tipo,
        }));
      }),

    // Enviar resumo de vencimentos por email
    enviarResumoPorEmail: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        email: z.string().email(),
        diasAntecedencia: z.number().optional().default(7),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const dataLimite = new Date(hoje);
        dataLimite.setDate(dataLimite.getDate() + input.diasAntecedencia);
        
        // Buscar vencimentos
        const todosVencimentos = await db.select().from(vencimentos)
          .where(and(
            eq(vencimentos.condominioId, input.condominioId),
            eq(vencimentos.status, 'ativo')
          ));
        
        // Classificar vencimentos
        const vencimentosAtrasados: Array<{ titulo: string; tipo: string; diasAtraso: number }> = [];
        const vencimentosHoje: Array<{ titulo: string; tipo: string }> = [];
        const vencimentosProximos: Array<{ titulo: string; tipo: string; diasRestantes: number }> = [];
        
        for (const v of todosVencimentos) {
          const dataVenc = new Date(v.dataVencimento);
          dataVenc.setHours(0, 0, 0, 0);
          
          const diffTime = dataVenc.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
            vencimentosAtrasados.push({
              titulo: v.titulo,
              tipo: v.tipo,
              diasAtraso: Math.abs(diffDays),
            });
          } else if (diffDays === 0) {
            vencimentosHoje.push({
              titulo: v.titulo,
              tipo: v.tipo,
            });
          } else if (diffDays <= input.diasAntecedencia) {
            vencimentosProximos.push({
              titulo: v.titulo,
              tipo: v.tipo,
              diasRestantes: diffDays,
            });
          }
        }
        
        // Enviar email
        const { sendResumoDiarioVencimentos } = await import("../../_core/email");
        const result = await sendResumoDiarioVencimentos({
          destinatario: input.email,
          vencimentosHoje,
          vencimentosAtrasados,
          vencimentosProximos,
        });
        
        // Registrar envio
        if (result.success) {
          // Registrar na tabela de notificações (se necessário)
          console.log(`[Vencimentos] Resumo enviado para ${input.email} por ${ctx.user.name}`);
        }
        
        return {
          success: result.success,
          message: result.success 
            ? `Resumo enviado para ${input.email}` 
            : `Erro ao enviar: ${result.error}`,
          totais: {
            atrasados: vencimentosAtrasados.length,
            hoje: vencimentosHoje.length,
            proximos: vencimentosProximos.length,
          },
        };
      }),
  }),

  // ==================== RELATÓRIO DE VENCIMENTOS EM PDF ====================
  vencimentosRelatorio: router({
    // Gerar relatório em PDF
    gerarPDF: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        tipo: z.string().max(100).optional().default('todos'),
        status: z.enum(['todos', 'ativo', 'vencido', 'renovado', 'cancelado']).optional().default('todos'),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Obter condomínio
        const cond = await db.select().from(condominios)
          .where(eq(condominios.id, input.condominioId))
          .limit(1);
        
        if (!cond[0]) throw new Error("Condomínio não encontrado");
        
        // Construir query com filtros
        const conditions = [eq(vencimentos.condominioId, input.condominioId)];
        
        if (input.tipo !== 'todos') {
          conditions.push(eq(vencimentos.tipo, input.tipo));
        }
        if (input.status !== 'todos') {
          conditions.push(eq(vencimentos.status, input.status));
        }
        if (input.dataInicio) {
          conditions.push(gte(vencimentos.dataVencimento, new Date(input.dataInicio)));
        }
        if (input.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          conditions.push(sql`${vencimentos.dataVencimento} <= ${dataFim}`);
        }
        
        const items = await db.select().from(vencimentos)
          .where(and(...conditions))
          .orderBy(vencimentos.dataVencimento);
        
        const hoje = new Date();
        
        // Calcular estatísticas
        const stats = {
          total: items.length,
          vencidos: items.filter(v => new Date(v.dataVencimento) < hoje && v.status === 'ativo').length,
          proximos30dias: items.filter(v => {
            const data = new Date(v.dataVencimento);
            const diff = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff <= 30 && v.status === 'ativo';
          }).length,
          contratos: items.filter(v => v.tipo === 'contrato').length,
          servicos: items.filter(v => v.tipo === 'servico').length,
          manutencoes: items.filter(v => v.tipo === 'manutencao').length,
        };
        
        // Gerar HTML do relatório
        const tipoLabel = input.tipo === 'todos' ? 'Todos os Tipos' : 
          input.tipo === 'contrato' ? 'Contratos' : 
          input.tipo === 'servico' ? 'Serviços' : 'Manutenções';
        
        const statusLabel = input.status === 'todos' ? 'Todos os Status' : 
          input.status === 'ativo' ? 'Ativos' : 
          input.status === 'vencido' ? 'Vencidos' : 
          input.status === 'renovado' ? 'Renovados' : 'Cancelados';
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Vencimentos - ${cond[0].nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 15px; }
    .header h1 { color: #4F46E5; font-size: 24px; margin-bottom: 5px; }
    .header h2 { color: #666; font-size: 14px; font-weight: normal; }
    .header .date { color: #888; font-size: 11px; margin-top: 10px; }
    .filters { background: #f8f9fa; padding: 10px 15px; border-radius: 5px; margin-bottom: 20px; }
    .filters span { margin-right: 20px; }
    .stats { display: flex; justify-content: space-around; margin-bottom: 25px; }
    .stat-box { text-align: center; padding: 15px 20px; background: #f8f9fa; border-radius: 8px; min-width: 100px; }
    .stat-box .number { font-size: 28px; font-weight: bold; color: #4F46E5; }
    .stat-box .label { font-size: 10px; color: #666; text-transform: uppercase; }
    .stat-box.danger .number { color: #dc3545; }
    .stat-box.warning .number { color: #ffc107; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #4F46E5; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 10px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) { background: #f8f9fa; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; }
    .badge-contrato { background: #e3f2fd; color: #1565c0; }
    .badge-servico { background: #f3e5f5; color: #7b1fa2; }
    .badge-manutencao { background: #fff3e0; color: #e65100; }
    .badge-vencido { background: #ffebee; color: #c62828; }
    .badge-proximo { background: #fff8e1; color: #f57f17; }
    .badge-ok { background: #e8f5e9; color: #2e7d32; }
    .footer { margin-top: 30px; text-align: center; color: #888; font-size: 10px; border-top: 1px solid #eee; padding-top: 15px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📅 Relatório de Vencimentos</h1>
    <h2>${cond[0].nome}</h2>
    <div class="date">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
  </div>
  
  <div class="filters">
    <span><strong>Tipo:</strong> ${tipoLabel}</span>
    <span><strong>Status:</strong> ${statusLabel}</span>
    ${input.dataInicio ? `<span><strong>De:</strong> ${new Date(input.dataInicio).toLocaleDateString('pt-BR')}</span>` : ''}
    ${input.dataFim ? `<span><strong>Até:</strong> ${new Date(input.dataFim).toLocaleDateString('pt-BR')}</span>` : ''}
  </div>
  
  <div class="stats">
    <div class="stat-box">
      <div class="number">${stats.total}</div>
      <div class="label">Total</div>
    </div>
    <div class="stat-box danger">
      <div class="number">${stats.vencidos}</div>
      <div class="label">Vencidos</div>
    </div>
    <div class="stat-box warning">
      <div class="number">${stats.proximos30dias}</div>
      <div class="label">Próx. 30 dias</div>
    </div>
    <div class="stat-box">
      <div class="number">${stats.contratos}</div>
      <div class="label">Contratos</div>
    </div>
    <div class="stat-box">
      <div class="number">${stats.servicos}</div>
      <div class="label">Serviços</div>
    </div>
    <div class="stat-box">
      <div class="number">${stats.manutencoes}</div>
      <div class="label">Manutenções</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Título</th>
        <th>Fornecedor</th>
        <th>Vencimento</th>
        <th>Dias</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => {
        const dataVenc = new Date(item.dataVencimento);
        const diffDays = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const tipoBadge = item.tipo === 'contrato' ? 'badge-contrato' : item.tipo === 'servico' ? 'badge-servico' : 'badge-manutencao';
        const tipoText = item.tipo === 'contrato' ? 'Contrato' : item.tipo === 'servico' ? 'Serviço' : 'Manutenção';
        const statusBadge = diffDays < 0 ? 'badge-vencido' : diffDays <= 30 ? 'badge-proximo' : 'badge-ok';
        const diasText = diffDays < 0 ? `${Math.abs(diffDays)} atrasado` : diffDays === 0 ? 'Hoje' : `${diffDays} restantes`;
        
        return `
          <tr>
            <td><span class="badge ${tipoBadge}">${tipoText}</span></td>
            <td><strong>${item.titulo}</strong>${item.descricao ? `<br><small style="color:#666">${item.descricao.substring(0, 50)}${item.descricao.length > 50 ? '...' : ''}</small>` : ''}</td>
            <td>${item.fornecedor || '-'}</td>
            <td>${dataVenc.toLocaleDateString('pt-BR')}</td>
            <td><span class="badge ${statusBadge}">${diasText}</span></td>
            <td>${item.status}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Sistema de Gestão de Condomínios - Revista Digital</p>
    <p>Este relatório foi gerado automaticamente e não requer assinatura.</p>
  </div>
</body>
</html>
        `;
        
        // Converter HTML para PDF usando o gerador existente
        const pdfBuffer = await generateVencimentosPDF(htmlContent);
        
        // Salvar no storage
        const fileName = `relatorio-vencimentos-${input.condominioId}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, 'application/pdf');
        
        return { url, fileName, stats };
      }),

    // Obter dados para o relatório (sem gerar PDF)
    dados: vencimentoProcedure
      .input(z.object({
        condominioId: z.number(),
        tipo: z.string().max(100).optional().default('todos'),
        status: z.enum(['todos', 'ativo', 'vencido', 'renovado', 'cancelado']).optional().default('todos'),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], stats: { total: 0, vencidos: 0, proximos30dias: 0 } };
        
        const conditions = [eq(vencimentos.condominioId, input.condominioId)];
        
        if (input.tipo !== 'todos') {
          conditions.push(eq(vencimentos.tipo, input.tipo));
        }
        if (input.status !== 'todos') {
          conditions.push(eq(vencimentos.status, input.status));
        }
        
        const items = await db.select().from(vencimentos)
          .where(and(...conditions))
          .orderBy(vencimentos.dataVencimento);
        
        const hoje = new Date();
        
        const itemsComDias = items.map(item => {
          const dataVenc = new Date(item.dataVencimento);
          const diffDays = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          return { ...item, diasRestantes: diffDays, vencido: diffDays < 0 };
        });
        
        return {
          items: itemsComDias,
          stats: {
            total: items.length,
            vencidos: itemsComDias.filter(v => v.vencido && v.status === 'ativo').length,
            proximos30dias: itemsComDias.filter(v => v.diasRestantes >= 0 && v.diasRestantes <= 30 && v.status === 'ativo').length,
          },
        };
      }),
  }),

  // ==================== DASHBOARD DE VENCIMENTOS ====================
  vencimentosDashboard: router({
    // Estatísticas gerais
    estatisticasGerais: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const hoje = new Date();
        
        const items = await db.select().from(vencimentos)
          .where(eq(vencimentos.condominioId, input.condominioId));
        
        const total = items.length;
        const ativos = items.filter(v => v.status === 'ativo').length;
        const vencidos = items.filter(v => {
          const dataVenc = new Date(v.dataVencimento);
          return dataVenc < hoje && v.status === 'ativo';
        }).length;
        const proximos30dias = items.filter(v => {
          const dataVenc = new Date(v.dataVencimento);
          const diff = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 30 && v.status === 'ativo';
        }).length;
        const contratos = items.filter(v => v.tipo === 'contrato').length;
        const servicos = items.filter(v => v.tipo === 'servico').length;
        const manutencoes = items.filter(v => v.tipo === 'manutencao').length;
        const valorTotalAtivo = items.filter(v => v.status === 'ativo').reduce((sum, v) => sum + Number(v.valor || 0), 0);
        
        return { total, ativos, vencidos, proximos30dias, contratos, servicos, manutencoes, valorTotalAtivo };
      }),

    // Vencimentos por mês (para gráfico de barras)
    porMes: vencimentoProcedure
      .input(z.object({ condominioId: z.number(), ano: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const items = await db.select().from(vencimentos)
          .where(eq(vencimentos.condominioId, input.condominioId));
        
        const hoje = new Date();
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const resultado = meses.map((nome, index) => {
          const mesItems = items.filter(v => {
            const data = new Date(v.dataVencimento);
            return data.getMonth() === index && data.getFullYear() === input.ano;
          });
          
          return {
            mes: index + 1,
            nome,
            total: mesItems.length,
            vencidos: mesItems.filter(v => {
              const dataVenc = new Date(v.dataVencimento);
              return dataVenc < hoje && v.status === 'ativo';
            }).length,
            ativos: mesItems.filter(v => v.status === 'ativo').length,
            contratos: mesItems.filter(v => v.tipo === 'contrato').length,
            servicos: mesItems.filter(v => v.tipo === 'servico').length,
            manutencoes: mesItems.filter(v => v.tipo === 'manutencao').length,
          };
        });
        
        return resultado;
      }),

    // Vencimentos por categoria (para gráfico de pizza)
    porCategoria: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const items = await db.select().from(vencimentos)
          .where(eq(vencimentos.condominioId, input.condominioId));
        
        const hoje = new Date();
        const categorias = [
          { tipo: 'contrato' as const, nome: 'Contratos', cor: '#3B82F6' },
          { tipo: 'servico' as const, nome: 'Serviços', cor: '#8B5CF6' },
          { tipo: 'manutencao' as const, nome: 'Manutenções', cor: '#F59E0B' },
        ];
        
        return categorias.map(cat => {
          const catItems = items.filter(v => v.tipo === cat.tipo);
          return {
            tipo: cat.tipo,
            nome: cat.nome,
            cor: cat.cor,
            total: catItems.length,
            ativos: catItems.filter(v => v.status === 'ativo').length,
            vencidos: catItems.filter(v => {
              const dataVenc = new Date(v.dataVencimento);
              return dataVenc < hoje && v.status === 'ativo';
            }).length,
            valorTotal: catItems.reduce((sum, v) => sum + Number(v.valor || 0), 0),
          };
        });
      }),

    // Vencimentos por status (para gráfico de pizza)
    porStatus: vencimentoProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const items = await db.select().from(vencimentos)
          .where(eq(vencimentos.condominioId, input.condominioId));
        
        const statusMap = {
          'ativo': { nome: 'Ativos', cor: '#10B981' },
          'vencido': { nome: 'Vencidos', cor: '#EF4444' },
          'renovado': { nome: 'Renovados', cor: '#3B82F6' },
          'cancelado': { nome: 'Cancelados', cor: '#6B7280' },
        };
        
        const result = Object.entries(statusMap).map(([key, info]) => {
          const count = items.filter(v => v.status === key).length;
          return {
            status: key,
            nome: info.nome,
            cor: info.cor,
            total: count,
          };
        });
        
        return result.filter(r => r.total > 0);
      }),

    // Vencimentos vencidos
    vencidos: vencimentoProcedure
      .input(z.object({ condominioId: z.number(), limite: z.number().optional().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const items = await db.select().from(vencimentos)
          .where(and(
             eq(vencimentos.condominioId, input.condominioId),
             lt(vencimentos.dataVencimento, hoje),
             eq(vencimentos.status, 'ativo')
          ))
          .orderBy(desc(vencimentos.dataVencimento))
          .limit(input.limite);
          
        return items.map(item => {
           const dataVenc = new Date(item.dataVencimento);
           const diffTime = hoje.getTime() - dataVenc.getTime();
           const diasAtrasados = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           return { ...item, diasAtrasados };
        });
      }),

    // Evolução temporal
    evolucao: vencimentoProcedure
      .input(z.object({ condominioId: z.number(), meses: z.number().optional().default(12) }))
      .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return [];
          
          const hoje = new Date();
          const startParams = new Date(hoje);
          startParams.setMonth(hoje.getMonth() - input.meses + 1);
          startParams.setDate(1); 
          
          const items = await db.select().from(vencimentos)
            .where(and(
                eq(vencimentos.condominioId, input.condominioId),
                gte(vencimentos.dataVencimento, startParams)
            ));
            
          const result = [];
          for (let i = 0; i < input.meses; i++) {
              const d = new Date(startParams);
              d.setMonth(startParams.getMonth() + i);
              const mesNome = d.toLocaleDateString('pt-BR', { month: 'short' });
              
              const count = items.filter(v => {
                  const data = new Date(v.dataVencimento);
                  return data.getMonth() === d.getMonth() && data.getFullYear() === d.getFullYear();
              }).length;
              
              result.push({ nome: mesNome, total: count });
          }
          return result;
      }),
  }),
});
