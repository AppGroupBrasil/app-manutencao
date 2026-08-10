import { publicProcedure, moduloProcedure, moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { z } from "zod";
import { getDb } from "../../db";
import { proximoProtocoloComData } from "../../_core/protocolo";
import { 
  osCategorias,
  osPrioridades,
  osStatus,
  osSetores,
  osConfiguracoes,
  ordensServico,
  osResponsaveis,
  osMateriais,
  osOrcamentos,
  osTimeline,
  osChat,
  osImagens,
  osAnexos,
  notificacoes,
  manutencoes,
  funcionarios,
  condominios,
  users
} from "../../../drizzle/schema"; // Adjusted path
import { eq, and, desc, like, or, sql, gte, inArray, asc, not, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { storagePut } from "../../storage";
import { autorDaRequisicao } from "../../_core/autor";
import { assegurarExclusaoFuncionario } from "../../_core/permissaoFuncionario";

// Exige o modulo "ordens-servico" habilitado e valida que cada id recebido
// pertence a organizacao da requisicao. `id` aponta para a OS por padrao; nas
// rotas de cadastro auxiliar aponta para categoria/prioridade/status/setor.
// Rotas de registro filho (responsavel, material, orcamento, imagem) ja recebem
// `ordemServicoId`, entao ficam cobertas pelo padrao.
const escopoOs = escopoPorRegistro(
  {
    id: direto(ordensServico),
    ordemServicoId: direto(ordensServico),
    osId: direto(ordensServico),
    categoriaId: direto(osCategorias),
    prioridadeId: direto(osPrioridades),
    statusId: direto(osStatus),
    setorId: direto(osSetores),
    // Impede vincular a OS a registros de outra organizacao
    manutencaoId: direto(manutencoes),
    funcionarioId: direto(funcionarios),
  },
  {
    updateCategoria: { id: direto(osCategorias) },
    deleteCategoria: { id: direto(osCategorias) },
    updatePrioridade: { id: direto(osPrioridades) },
    deletePrioridade: { id: direto(osPrioridades) },
    updateOsStatus: { id: direto(osStatus) },
    deleteStatus: { id: direto(osStatus) },
    updateSetor: { id: direto(osSetores) },
    deleteSetor: { id: direto(osSetores) },
    deletarImagem: { imagemId: via(osImagens, "ordemServicoId", ordensServico) },
    deletarAnexo: { anexoId: via(osAnexos, "ordemServicoId", ordensServico) },
    // Nestas, `id` e o registro filho e `ordemServicoId` ja garante o escopo.
    removeResponsavel: { id: via(osResponsaveis, "ordemServicoId", ordensServico) },
    removeMaterial: { id: via(osMateriais, "ordemServicoId", ordensServico) },
    removeOrcamento: { id: via(osOrcamentos, "ordemServicoId", ordensServico) },
    aprovarOrcamento: { id: via(osOrcamentos, "ordemServicoId", ordensServico) },
    rejeitarOrcamento: { id: via(osOrcamentos, "ordemServicoId", ordensServico) },
    removeImagem: { id: via(osImagens, "ordemServicoId", ordensServico) },
  },
);

const osProcedure = moduloProcedure(
  "ordens-servico",
  escopoOs,
  // Permissao individual do funcionario vale aqui, nao so na tela.
  "ordens",
);

/**
 * Cadastros e configuracao da unidade: categoria, prioridade, status, setor e
 * avisos de abertura. Sao decisao do gestor, entao ficam fora do alcance do
 * funcionario mesmo quando ele tem permissao de criar O.S.
 */
const osConfigProcedure = moduloUserProcedure("ordens-servico", escopoOs);

/**
 * Excluir O.S. leva junto fotos, anexos, orçamentos, chat e histórico. Para o
 * funcionário, depende de o gestor ter ligado a chave de exclusão dele.
 */
const osExclusaoProcedure = osProcedure.use(async ({ ctx, next }) => {
  await assegurarExclusaoFuncionario(ctx, "ordens");
  return next({ ctx });
});

/**
 * Aviso de abertura de O.S. aos funcionários da unidade.
 *
 * Dois canais, como no Manutenção X: notificação no aplicativo — só quando a
 * organização liga `osAutoNotificar`, porque avisa todo mundo — e e-mail para
 * quem tem `notificarOsEmail`, que é o padrão e a tela permite desmarcar.
 */
async function notificarAberturaDeOS(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  os: { condominioId: number; protocolo: string; titulo: string; descricao?: string },
): Promise<void> {
  const [organizacao] = await db
    .select({ nome: condominios.nome, autoNotificar: condominios.osAutoNotificar })
    .from(condominios)
    .where(eq(condominios.id, os.condominioId))
    .limit(1);

  const equipe = await db
    .select({
      nome: funcionarios.nome,
      email: funcionarios.email,
      loginEmail: funcionarios.loginEmail,
      notificarEmail: funcionarios.notificarOsEmail,
    })
    .from(funcionarios)
    .where(and(eq(funcionarios.condominioId, os.condominioId), eq(funcionarios.ativo, true)));

  if (organizacao?.autoNotificar) {
    // `funcionarios` não tem coluna de usuário e `notificacoes` exige uma:
    // o vínculo possível é o e-mail. Quem não tem conta recebe só o e-mail.
    const enderecos = equipe
      .flatMap((f) => [f.loginEmail, f.email])
      .filter((e): e is string => !!e)
      .map((e) => e.toLowerCase());

    if (enderecos.length > 0) {
      const contas = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(sql`lower(${users.email})`, enderecos));

      if (contas.length > 0) {
        await db.insert(notificacoes).values(
          contas.map((conta) => ({
            userId: conta.id,
            condominioId: os.condominioId,
            tipo: "geral" as const,
            titulo: `Nova O.S. ${os.protocolo}`,
            mensagem: os.titulo,
            link: `/manutencoes/ordens-servico`,
          })),
        );
      }
    }
  }

  const emails = equipe
    .filter((f) => f.notificarEmail && f.email)
    .map((f) => f.email as string);

  if (emails.length === 0) return;

  const { isEmailConfigured, sendEmail } = await import("../../_core/email");
  if (!isEmailConfigured()) return;

  await sendEmail({
    to: emails,
    subject: `Nova ordem de serviço ${os.protocolo}`,
    text: [
      `Foi aberta uma ordem de serviço em ${organizacao?.nome ?? "sua unidade"}.`,
      ``,
      `Protocolo: ${os.protocolo}`,
      `Título: ${os.titulo}`,
      os.descricao ? `Descrição: ${os.descricao}` : ``,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export const osRouter = router({
    // ========== CONFIGURAÇÕES ==========
    getConfiguracoes: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [config] = await db.select().from(osConfiguracoes)
          .where(eq(osConfiguracoes.condominioId, input.condominioId))
          .limit(1);
        
        if (!config) {
          const [result] = await db.insert(osConfiguracoes).values({
            condominioId: input.condominioId,
            habilitarOrcamentos: true,
            habilitarAprovacaoOrcamento: true,
            habilitarGestaoFinanceira: true,
            habilitarRelatoriosGastos: true,
            habilitarVinculoManutencao: true,
          }).returning();
          
          return {
            id: result.id,
            condominioId: input.condominioId,
            habilitarOrcamentos: true,
            habilitarAprovacaoOrcamento: true,
            habilitarGestaoFinanceira: true,
            habilitarRelatoriosGastos: true,
            habilitarVinculoManutencao: true,
          };
        }
        
        return config;
      }),
    
    updateConfiguracoes: osConfigProcedure
      .input(z.object({
        condominioId: z.number(),
        habilitarOrcamentos: z.boolean().optional(),
        habilitarAprovacaoOrcamento: z.boolean().optional(),
        habilitarGestaoFinanceira: z.boolean().optional(),
        habilitarRelatoriosGastos: z.boolean().optional(),
        habilitarVinculoManutencao: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { condominioId, ...updates } = input;
        
        await db.update(osConfiguracoes)
          .set(updates)
          .where(eq(osConfiguracoes.condominioId, condominioId));
        
        return { success: true };
      }),

    // ========== CATEGORIAS ==========
    getCategorias: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        let categorias = await db.select().from(osCategorias)
          .where(and(
            eq(osCategorias.condominioId, input.condominioId),
            eq(osCategorias.ativo, true)
          ))
          .orderBy(asc(osCategorias.nome));
        
        if (categorias.length === 0) {
          const categoriasPadrao = [
            { nome: "Elétrica", icone: "Zap", cor: "#EAB308" },
            { nome: "Hidráulica", icone: "Droplets", cor: "#3B82F6" },
            { nome: "Estrutural", icone: "Building2", cor: "#6B7280" },
            { nome: "Jardinagem", icone: "TreePine", cor: "#22C55E" },
            { nome: "Limpeza", icone: "Sparkles", cor: "#06B6D4" },
            { nome: "Pintura", icone: "Paintbrush", cor: "#EC4899" },
            { nome: "Segurança", icone: "Shield", cor: "#EF4444" },
            { nome: "Outros", icone: "MoreHorizontal", cor: "#8B5CF6" },
          ];
          
          for (const cat of categoriasPadrao) {
            await db.insert(osCategorias).values({
              condominioId: input.condominioId,
              nome: cat.nome,
              icone: cat.icone,
              cor: cat.cor,
              isPadrao: true,
            });
          }
          
          categorias = await db.select().from(osCategorias)
            .where(and(
              eq(osCategorias.condominioId, input.condominioId),
              eq(osCategorias.ativo, true)
            ))
            .orderBy(asc(osCategorias.nome));
        }
        
        return categorias;
      }),
    
    createCategoria: osConfigProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
        icone: z.string().optional(),
        cor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(osCategorias).values({
          condominioId: input.condominioId,
          nome: input.nome,
          descricao: input.descricao,
          icone: input.icone || "Tag",
          cor: input.cor || "#6B7280",
          isPadrao: false,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    updateCategoria: osConfigProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        cor: z.string().optional(),
        icone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: any = { updatedAt: new Date() };
        if (input.nome) updateData.nome = input.nome;
        if (input.cor) updateData.cor = input.cor;
        if (input.icone) updateData.icone = input.icone;
        
        await db.update(osCategorias)
          .set(updateData)
          .where(eq(osCategorias.id, input.id));
        
        return { success: true };
      }),

    deleteCategoria: osConfigProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(osCategorias)
          .set({ ativo: false })
          .where(eq(osCategorias.id, input.id));
        
        return { success: true };
      }),

    // ========== PRIORIDADES ==========
    getPrioridades: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        let prioridades = await db.select().from(osPrioridades)
          .where(and(
            eq(osPrioridades.condominioId, input.condominioId),
            eq(osPrioridades.ativo, true)
          ))
          .orderBy(asc(osPrioridades.nivel));
        
        if (prioridades.length === 0) {
          const prioridadesPadrao = [
            { nome: "Baixa", nivel: 1, cor: "#22C55E", icone: "ArrowDown" },
            { nome: "Normal", nivel: 2, cor: "#3B82F6", icone: "Minus" },
            { nome: "Alta", nivel: 3, cor: "#F97316", icone: "ArrowUp" },
            { nome: "Urgente", nivel: 4, cor: "#EF4444", icone: "AlertTriangle" },
          ];
          
          for (const prio of prioridadesPadrao) {
            await db.insert(osPrioridades).values({
              condominioId: input.condominioId,
              nome: prio.nome,
              nivel: prio.nivel,
              cor: prio.cor,
              icone: prio.icone,
              isPadrao: true,
            });
          }
          
          prioridades = await db.select().from(osPrioridades)
            .where(and(
              eq(osPrioridades.condominioId, input.condominioId),
              eq(osPrioridades.ativo, true)
            ))
            .orderBy(asc(osPrioridades.nivel));
        }
        
        return prioridades;
      }),
    
    createPrioridade: osConfigProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(1),
        nivel: z.number().optional(),
        cor: z.string().optional(),
        icone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [maxNivel] = await db.select({ max: sql<number>`MAX(nivel)` })
          .from(osPrioridades)
          .where(eq(osPrioridades.condominioId, input.condominioId));
        
        const [result] = await db.insert(osPrioridades).values({
          condominioId: input.condominioId,
          nome: input.nome,
          nivel: input.nivel || (maxNivel?.max || 0) + 1,
          cor: input.cor || "#6B7280",
          icone: input.icone || "Flag",
          isPadrao: false,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    updatePrioridade: osConfigProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        nivel: z.number().optional(),
        cor: z.string().optional(),
        icone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: any = { updatedAt: new Date() };
        if (input.nome) updateData.nome = input.nome;
        if (input.nivel !== undefined) updateData.nivel = input.nivel;
        if (input.cor) updateData.cor = input.cor;
        if (input.icone) updateData.icone = input.icone;
        
        await db.update(osPrioridades)
          .set(updateData)
          .where(eq(osPrioridades.id, input.id));
        
        return { success: true };
      }),

    deletePrioridade: osConfigProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(osPrioridades)
          .set({ ativo: false })
          .where(eq(osPrioridades.id, input.id));
        
        return { success: true };
      }),

    // ========== STATUS ==========
    getStatus: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        let statusList = await db.select().from(osStatus)
          .where(and(
            eq(osStatus.condominioId, input.condominioId),
            eq(osStatus.ativo, true)
          ))
          .orderBy(asc(osStatus.ordem));
        
        if (statusList.length === 0) {
          const statusPadrao = [
            { nome: "Aberta", ordem: 1, cor: "#3B82F6", icone: "FolderOpen", isFinal: false },
            { nome: "Em Análise", ordem: 2, cor: "#8B5CF6", icone: "Search", isFinal: false },
            { nome: "Aprovada", ordem: 3, cor: "#22C55E", icone: "CheckCircle", isFinal: false },
            { nome: "Em Execução", ordem: 4, cor: "#F97316", icone: "Wrench", isFinal: false },
            { nome: "Aguardando Material", ordem: 5, cor: "#EAB308", icone: "Package", isFinal: false },
            { nome: "Concluída", ordem: 6, cor: "#10B981", icone: "CheckCircle2", isFinal: true },
            { nome: "Cancelada", ordem: 7, cor: "#EF4444", icone: "XCircle", isFinal: true },
          ];
          
          for (const st of statusPadrao) {
            await db.insert(osStatus).values({
              condominioId: input.condominioId,
              nome: st.nome,
              ordem: st.ordem,
              cor: st.cor,
              icone: st.icone,
              isFinal: st.isFinal,
              isPadrao: true,
            });
          }
          
          statusList = await db.select().from(osStatus)
            .where(and(
              eq(osStatus.condominioId, input.condominioId),
              eq(osStatus.ativo, true)
            ))
            .orderBy(asc(osStatus.ordem));
        }
        
        return statusList;
      }),
    
    createStatus: osConfigProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(1),
        cor: z.string().optional(),
        icone: z.string().optional(),
        isFinal: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [maxOrdem] = await db.select({ max: sql<number>`MAX(ordem)` })
          .from(osStatus)
          .where(eq(osStatus.condominioId, input.condominioId));
        
        const [result] = await db.insert(osStatus).values({
          condominioId: input.condominioId,
          nome: input.nome,
          ordem: (maxOrdem?.max || 0) + 1,
          cor: input.cor || "#6B7280",
          icone: input.icone || "Circle",
          isFinal: input.isFinal || false,
          isPadrao: false,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    updateOsStatus: osConfigProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        ordem: z.number().optional(),
        cor: z.string().optional(),
        icone: z.string().optional(),
        isFinal: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: any = { updatedAt: new Date() };
        if (input.nome) updateData.nome = input.nome;
        if (input.ordem !== undefined) updateData.ordem = input.ordem;
        if (input.cor) updateData.cor = input.cor;
        if (input.icone) updateData.icone = input.icone;
        if (input.isFinal !== undefined) updateData.isFinal = input.isFinal;
        
        await db.update(osStatus)
          .set(updateData)
          .where(eq(osStatus.id, input.id));
        
        return { success: true };
      }),

    deleteStatus: osConfigProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(osStatus)
          .set({ ativo: false })
          .where(eq(osStatus.id, input.id));
        
        return { success: true };
      }),

    // ========== SETORES ==========
    getSetores: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        return await db.select().from(osSetores)
          .where(and(
            eq(osSetores.condominioId, input.condominioId),
            eq(osSetores.ativo, true)
          ))
          .orderBy(asc(osSetores.nome));
      }),
    
    createSetor: osConfigProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(osSetores).values({
          condominioId: input.condominioId,
          nome: input.nome,
          descricao: input.descricao,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    updateSetor: osConfigProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: any = { updatedAt: new Date() };
        if (input.nome) updateData.nome = input.nome;
        if (input.descricao !== undefined) updateData.descricao = input.descricao;
        
        await db.update(osSetores)
          .set(updateData)
          .where(eq(osSetores.id, input.id));
        
        return { success: true };
      }),

    deleteSetor: osConfigProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(osSetores)
          .set({ ativo: false })
          .where(eq(osSetores.id, input.id));
        
        return { success: true };
      }),

    // ========== ORDENS DE SERVIÇO CRUD ==========
    list: osProcedure
      .input(z.object({
        condominioId: z.number(),
        statusId: z.number().optional(),
        categoriaId: z.number().optional(),
        prioridadeId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const conditions = [eq(ordensServico.condominioId, input.condominioId)];
        
        if (input.statusId) conditions.push(eq(ordensServico.statusId, input.statusId));
        if (input.categoriaId) conditions.push(eq(ordensServico.categoriaId, input.categoriaId));
        if (input.prioridadeId) conditions.push(eq(ordensServico.prioridadeId, input.prioridadeId));
        if (input.search) {
          conditions.push(or(
            like(ordensServico.protocolo, `%${input.search}%`),
            like(ordensServico.titulo, `%${input.search}%`)
          )!);
        }
        
        const lista = await db.select().from(ordensServico)
          .where(and(...conditions))
          .orderBy(desc(ordensServico.createdAt))
          .limit(input.limit)
          .offset(input.offset);
        
        // Contar total para paginação
        const [totalResult] = await db.select({ count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(and(...conditions));
        const total = Number(totalResult?.count || 0);
        
        // Buscar dados relacionados
        const osIds = lista.map(os => os.id);
        
        const categorias = await db.select().from(osCategorias)
          .where(eq(osCategorias.condominioId, input.condominioId));
        const prioridades = await db.select().from(osPrioridades)
          .where(eq(osPrioridades.condominioId, input.condominioId));
        const statusList = await db.select().from(osStatus)
          .where(eq(osStatus.condominioId, input.condominioId));
        
        return {
          items: lista.map(os => ({
            ...os,
            categoria: categorias.find(c => c.id === os.categoriaId),
            prioridade: prioridades.find(p => p.id === os.prioridadeId),
            status: statusList.find(s => s.id === os.statusId),
          })),
          total,
        };
      }),
    
    getById: osProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [os] = await db.select().from(ordensServico)
          .where(eq(ordensServico.id, input.id))
          .limit(1);
        
        if (!os) throw new Error("Ordem de serviço não encontrada");
        
        // Buscar dados relacionados
        const [categoria] = os.categoriaId ? await db.select().from(osCategorias).where(eq(osCategorias.id, os.categoriaId)) : [null];
        const [prioridade] = os.prioridadeId ? await db.select().from(osPrioridades).where(eq(osPrioridades.id, os.prioridadeId)) : [null];
        const [status] = os.statusId ? await db.select().from(osStatus).where(eq(osStatus.id, os.statusId)) : [null];
        const [setor] = os.setorId ? await db.select().from(osSetores).where(eq(osSetores.id, os.setorId)) : [null];
        
        const responsaveis = await db.select().from(osResponsaveis)
          .where(eq(osResponsaveis.ordemServicoId, os.id));
        const materiais = await db.select().from(osMateriais)
          .where(eq(osMateriais.ordemServicoId, os.id));
        const orcamentos = await db.select().from(osOrcamentos)
          .where(eq(osOrcamentos.ordemServicoId, os.id));
        const timeline = await db.select().from(osTimeline)
          .where(eq(osTimeline.ordemServicoId, os.id))
          .orderBy(desc(osTimeline.createdAt));
        const imagens = await db.select().from(osImagens)
          .where(eq(osImagens.ordemServicoId, os.id))
          .orderBy(asc(osImagens.ordem));
        
        return {
          ...os,
          categoria,
          prioridade,
          status,
          setor,
          responsaveis,
          materiais,
          orcamentos,
          timeline,
          imagens,
        };
      }),
    
    create: osProcedure
      .input(z.object({
        condominioId: z.number(),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        categoriaId: z.number().optional(),
        prioridadeId: z.number().optional(),
        statusId: z.number().optional(),
        setorId: z.number().optional(),
        endereco: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        localizacaoDescricao: z.string().optional(),
        tempoEstimadoDias: z.number().optional(),
        tempoEstimadoHoras: z.number().optional(),
        tempoEstimadoMinutos: z.number().optional(),
        valorEstimado: z.string().optional(),
        manutencaoId: z.number().optional(),
        solicitanteNome: z.string().optional(),
        solicitanteTipo: z.enum(["sindico", "morador", "funcionario", "administradora"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // O numero vem da sequence do banco: dois pedidos simultaneos nunca
        // recebem o mesmo protocolo.
        const protocolo = await proximoProtocoloComData(db, "os", "OS-");
        
        // Gerar tokens
        const chatToken = nanoid(32);
        const shareToken = nanoid(32);
        
        // Se não tiver statusId, buscar o primeiro status (Aberta)
        let statusId = input.statusId;
        if (!statusId) {
          const [primeiroStatus] = await db.select().from(osStatus)
            .where(and(
              eq(osStatus.condominioId, input.condominioId),
              eq(osStatus.ativo, true)
            ))
            .orderBy(asc(osStatus.ordem))
            .limit(1);
          statusId = primeiroStatus?.id;
        }
        
        const [result] = await db.insert(ordensServico).values({
          condominioId: input.condominioId,
          protocolo,
          titulo: input.titulo,
          descricao: input.descricao,
          categoriaId: input.categoriaId,
          prioridadeId: input.prioridadeId,
          statusId,
          setorId: input.setorId,
          endereco: input.endereco,
          latitude: input.latitude,
          longitude: input.longitude,
          localizacaoDescricao: input.localizacaoDescricao,
          tempoEstimadoDias: input.tempoEstimadoDias || 0,
          tempoEstimadoHoras: input.tempoEstimadoHoras || 0,
          tempoEstimadoMinutos: input.tempoEstimadoMinutos || 0,
          valorEstimado: input.valorEstimado,
          manutencaoId: input.manutencaoId,
          chatToken,
          shareToken,
          solicitanteId: autor.userId,
          solicitanteNome: input.solicitanteNome || autor.nome,
          solicitanteTipo: input.solicitanteTipo || (ctx.user ? "sindico" : "funcionario"),
        }).returning();
        
        // Adicionar evento na timeline
        await db.insert(osTimeline).values({
          ordemServicoId: result.id,
          tipo: "criacao",
          descricao: "Ordem de serviço criada",
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });

        // Aviso de abertura aos funcionários da unidade. Falha aqui não desfaz
        // a O.S.: ela já existe e o aviso é acessório.
        try {
          await notificarAberturaDeOS(db, {
            condominioId: input.condominioId,
            protocolo,
            titulo: input.titulo,
            descricao: input.descricao,
          });
        } catch (erro) {
          console.error("[os] falha ao notificar abertura:", erro);
        }

        return { id: result.id, protocolo, success: true };
      }),
    
    update: osProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        categoriaId: z.number().optional(),
        prioridadeId: z.number().optional(),
        statusId: z.number().optional(),
        setorId: z.number().optional(),
        endereco: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        localizacaoDescricao: z.string().optional(),
        tempoEstimadoDias: z.number().optional(),
        tempoEstimadoHoras: z.number().optional(),
        tempoEstimadoMinutos: z.number().optional(),
        valorEstimado: z.string().optional(),
        valorReal: z.string().optional(),
        manutencaoId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...updates } = input;
        
        // Buscar OS atual para comparar mudanças
        const [osAtual] = await db.select().from(ordensServico)
          .where(eq(ordensServico.id, id));
        
        if (!osAtual) throw new Error("Ordem de serviço não encontrada");
        
        await db.update(ordensServico)
          .set(updates)
          .where(eq(ordensServico.id, id));
        
        // Registar mudança de status na timeline
        if (input.statusId && input.statusId !== osAtual.statusId) {
          const [novoStatus] = await db.select().from(osStatus)
            .where(eq(osStatus.id, input.statusId));
          
          await db.insert(osTimeline).values({
            ordemServicoId: id,
            tipo: "status_alterado",
            descricao: `Status alterado para: ${novoStatus?.nome || "Desconhecido"}`,
            usuarioId: autor.userId,
            usuarioNome: autor.nome,
            dadosAnteriores: { statusId: osAtual.statusId },
            dadosNovos: { statusId: input.statusId },
          }).returning();
          
          // Enviar notificação de mudança de status
          try {
            if (osAtual.solicitanteId) {
              await db.insert(notificacoes).values({
                userId: osAtual.solicitanteId,
                tipo: "geral",
                titulo: `OS #${osAtual.protocolo} - Status Atualizado`,
                mensagem: `A ordem de serviço "${osAtual.titulo}" teve o status alterado para: ${novoStatus?.nome || "Desconhecido"}`,
                link: `/dashboard/ordens-servico/${id}`,
              });
            }
          } catch (e) {
            console.error("Erro ao enviar notificação de OS:", e);
          }
        }
        
        return { success: true };
      }),
    
    delete: osExclusaoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Deletar registos relacionados
        await db.delete(osTimeline).where(eq(osTimeline.ordemServicoId, input.id));
        await db.delete(osChat).where(eq(osChat.ordemServicoId, input.id));
        await db.delete(osImagens).where(eq(osImagens.ordemServicoId, input.id));
        await db.delete(osAnexos).where(eq(osAnexos.ordemServicoId, input.id));
        await db.delete(osMateriais).where(eq(osMateriais.ordemServicoId, input.id));
        await db.delete(osOrcamentos).where(eq(osOrcamentos.ordemServicoId, input.id));
        await db.delete(osResponsaveis).where(eq(osResponsaveis.ordemServicoId, input.id));
        await db.delete(ordensServico).where(eq(ordensServico.id, input.id));
        
        return { success: true };
      }),

    // ========== INÍCIO/FIM DO SERVIÇO ==========
    iniciarServico: osProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se já foi iniciada
        const [osAtual] = await db.select().from(ordensServico)
          .where(eq(ordensServico.id, input.id));
        if (!osAtual) throw new Error("Ordem de serviço não encontrada");
        if (osAtual.dataInicio) throw new Error("Esta ordem de serviço já foi iniciada");

        await db.update(ordensServico)
          .set({ dataInicio: new Date() })
          .where(eq(ordensServico.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.id,
          tipo: "inicio_servico",
          descricao: "Serviço iniciado",
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { success: true };
      }),
    
    finalizarServico: osProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [os] = await db.select().from(ordensServico)
          .where(eq(ordensServico.id, input.id));
        
        if (!os) throw new Error("Ordem de serviço não encontrada");
        if (!os.dataInicio) throw new Error("Esta ordem de serviço ainda não foi iniciada");
        
        const dataFim = new Date();
        let tempoDecorridoMinutos = 0;
        
        if (os.dataInicio) {
          tempoDecorridoMinutos = Math.floor((dataFim.getTime() - new Date(os.dataInicio).getTime()) / 60000);
        }
        
        await db.update(ordensServico)
          .set({ dataFim, tempoDecorridoMinutos })
          .where(eq(ordensServico.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.id,
          tipo: "fim_servico",
          descricao: `Serviço finalizado. Tempo total: ${Math.floor(tempoDecorridoMinutos / 60)}h ${tempoDecorridoMinutos % 60}min`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true, tempoDecorridoMinutos };
      }),

    // ========== RESPONSÁVEIS ==========
    addResponsavel: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        nome: z.string().min(1),
        cargo: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        funcionarioId: z.number().optional(),
        principal: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(osResponsaveis).values(input).returning();
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "responsavel_adicionado",
          descricao: `Responsável adicionado: ${input.nome}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    removeResponsavel: osProcedure
      .input(z.object({ id: z.number(), ordemServicoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [resp] = await db.select().from(osResponsaveis)
          .where(eq(osResponsaveis.id, input.id));
        
        await db.delete(osResponsaveis).where(eq(osResponsaveis.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "responsavel_removido",
          descricao: `Responsável removido: ${resp?.nome || "Desconhecido"}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true };
      }),

    // ========== MATERIAIS ==========
    addMaterial: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
        quantidade: z.number().optional(),
        unidade: z.string().optional(),
        emEstoque: z.boolean().optional(),
        precisaPedir: z.boolean().optional(),
        pedidoDescricao: z.string().optional(),
        valorUnitario: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const valorTotal = input.valorUnitario && input.quantidade 
          ? String(parseFloat(input.valorUnitario) * input.quantidade)
          : undefined;
        
        const [result] = await db.insert(osMateriais).values({
          ...input,
          valorTotal,
        }).returning();
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "material_adicionado",
          descricao: `Material adicionado: ${input.nome} (${input.quantidade || 1} ${input.unidade || "un"})`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    removeMaterial: osProcedure
      .input(z.object({ id: z.number(), ordemServicoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [mat] = await db.select().from(osMateriais)
          .where(eq(osMateriais.id, input.id));
        
        await db.delete(osMateriais).where(eq(osMateriais.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "material_removido",
          descricao: `Material removido: ${mat?.nome || "Desconhecido"}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true };
      }),

    // ========== ORÇAMENTOS ==========
    addOrcamento: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        fornecedor: z.string().optional(),
        descricao: z.string().optional(),
        valor: z.string(),
        dataValidade: z.string().optional(),
        anexoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(osOrcamentos).values({
          ordemServicoId: input.ordemServicoId,
          fornecedor: input.fornecedor,
          descricao: input.descricao,
          valor: input.valor,
          dataValidade: input.dataValidade ? new Date(input.dataValidade) : undefined,
          anexoUrl: input.anexoUrl,
        }).returning();
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "orcamento_adicionado",
          descricao: `Orçamento adicionado: R$ ${input.valor} - ${input.fornecedor || "Sem fornecedor"}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { id: result.id, success: true };
      }),
    
    aprovarOrcamento: osProcedure
      .input(z.object({ id: z.number(), ordemServicoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(osOrcamentos)
          .set({
            aprovado: true,
            aprovadoPor: autor.userId,
            dataAprovacao: new Date(),
          })
          .where(eq(osOrcamentos.id, input.id));
        
        const [orc] = await db.select().from(osOrcamentos)
          .where(eq(osOrcamentos.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "orcamento_aprovado",
          descricao: `Orçamento aprovado: R$ ${orc?.valor} - ${orc?.fornecedor || "Sem fornecedor"}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true };
      }),
    
    rejeitarOrcamento: osProcedure
      .input(z.object({ id: z.number(), ordemServicoId: z.number(), motivo: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(osOrcamentos)
          .set({
            aprovado: false,
            motivoRejeicao: input.motivo,
          })
          .where(eq(osOrcamentos.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "orcamento_rejeitado",
          descricao: `Orçamento rejeitado${input.motivo ? `: ${input.motivo}` : ""}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { success: true };
      }),

    removeOrcamento: osProcedure
      .input(z.object({ id: z.number(), ordemServicoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(osOrcamentos).where(eq(osOrcamentos.id, input.id));
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "orcamento_removido",
          descricao: "Orçamento removido",
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true };
      }),

    // ========== IMAGENS ==========
    addImagem: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        url: z.string(),
        tipo: z.enum(["antes", "durante", "depois", "orcamento", "outro"]).optional(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Safety net: upload base64 to S3 if needed
        let url = input.url;
        if (url.startsWith('data:')) {
          try {
            const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const uniqueId = nanoid(10);
            const fileKey = `os-imagens/${input.ordemServicoId}/${uniqueId}.jpg`;
            const uploaded = await storagePut(fileKey, buffer, "image/jpeg");
            url = uploaded.url;
          } catch (e) {
            console.error("Erro ao fazer upload de imagem:", e);
            throw new Error("Falha ao fazer upload da imagem. Tente novamente.");
          }
        }
        
        const [maxOrdem] = await db.select({ max: sql<number>`MAX(ordem)` })
          .from(osImagens)
          .where(eq(osImagens.ordemServicoId, input.ordemServicoId));
        
        const [result] = await db.insert(osImagens).values({
          ordemServicoId: input.ordemServicoId,
          url,
          tipo: input.tipo || "outro",
          descricao: input.descricao,
          ordem: (maxOrdem?.max || 0) + 1,
        }).returning();
        
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "foto_adicionada",
          descricao: `Foto adicionada: ${input.tipo || "outro"}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    removeImagem: osProcedure
      .input(z.object({ id: z.number(), ordemServicoId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [imagem] = await db.select().from(osImagens)
          .where(eq(osImagens.id, input.id));
        
        if (!imagem) throw new Error("Imagem não encontrada");
        
        await db.delete(osImagens).where(eq(osImagens.id, input.id));
        
        // Registrar na timeline
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId || imagem.ordemServicoId,
          tipo: "foto_removida",
          descricao: `Foto removida`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true };
      }),

    // ========== CHAT ==========
    getChat: osProcedure
      .input(z.object({ ordemServicoId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        return await db.select().from(osChat)
          .where(eq(osChat.ordemServicoId, input.ordemServicoId))
          .orderBy(asc(osChat.createdAt));
      }),
    
    sendMessage: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        mensagem: z.string().optional(),
        anexoUrl: z.string().optional(),
        anexoNome: z.string().optional(),
        anexoTipo: z.string().optional(),
        anexoTamanho: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Validar que tem mensagem ou anexo
        if (!input.mensagem && !input.anexoUrl) {
          throw new Error("Mensagem ou anexo é obrigatório");
        }
        
        const roleMap: Record<string, string> = { admin: "sindico", user: "sindico", sindico: "sindico", morador: "morador", funcionario: "funcionario", visitante: "visitante" };
        const [result] = await db.insert(osChat).values({
          ordemServicoId: input.ordemServicoId,
          remetenteId: autor.userId,
          remetenteNome: autor.nome,
          remetenteTipo: (ctx.user ? roleMap[ctx.user.role || ""] || "sindico" : "funcionario") as any,
          mensagem: input.mensagem || null,
          anexoUrl: input.anexoUrl || null,
          anexoNome: input.anexoNome || null,
          anexoTipo: input.anexoTipo || null,
          anexoTamanho: input.anexoTamanho || null,
        }).returning();
        
        return { id: result.id, success: true };
      }),
    
    // Chat público via token
    getChatByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [os] = await db.select().from(ordensServico)
          .where(eq(ordensServico.chatToken, input.token))
          .limit(1);
        
        if (!os || !os.chatAtivo) throw new Error("Chat não encontrado ou inativo");
        
        const mensagens = await db.select().from(osChat)
          .where(eq(osChat.ordemServicoId, os.id))
          .orderBy(asc(osChat.createdAt));
        
        return { os, mensagens };
      }),
    
    sendMessageByToken: publicProcedure
      .input(z.object({
        token: z.string(),
        nome: z.string().min(1),
        mensagem: z.string().optional(),
        anexoUrl: z.string().optional(),
        anexoNome: z.string().optional(),
        anexoTipo: z.string().optional(),
        anexoTamanho: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Validar que tem mensagem ou anexo
        if (!input.mensagem && !input.anexoUrl) {
          throw new Error("Mensagem ou anexo é obrigatório");
        }
        
        const [os] = await db.select().from(ordensServico)
          .where(eq(ordensServico.chatToken, input.token))
          .limit(1);
        
        if (!os || !os.chatAtivo) throw new Error("Chat não encontrado ou inativo");
        
        const [result] = await db.insert(osChat).values({
          ordemServicoId: os.id,
          remetenteNome: input.nome,
          remetenteTipo: "visitante",
          mensagem: input.mensagem || null,
          anexoUrl: input.anexoUrl || null,
          anexoNome: input.anexoNome || null,
          anexoTipo: input.anexoTipo || null,
          anexoTamanho: input.anexoTamanho || null,
        }).returning();
        
        return { id: result.id, success: true };
      }),

    // ========== TIMELINE ==========
    addComentario: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        descricao: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "comentario",
          descricao: input.descricao,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { id: result.id, success: true };
      }),

    // ========== ESTATÍSTICAS ==========
    getEstatisticas: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Total via SQL
        const [totalResult] = await db.select({ count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId));
        const total = Number(totalResult?.count || 0);
        
        const statusList = await db.select().from(osStatus)
          .where(eq(osStatus.condominioId, input.condominioId));
        
        const categorias = await db.select().from(osCategorias)
          .where(eq(osCategorias.condominioId, input.condominioId));
        
        // Contar por status via SQL
        const porStatusResult = await db.select({
          statusId: ordensServico.statusId,
          count: sql<number>`count(*)`
        })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId))
          .groupBy(ordensServico.statusId);
        
        const porStatus = statusList.map(s => ({
          ...s,
          total: Number(porStatusResult.find(r => r.statusId === s.id)?.count || 0),
        }));
        
        // Contar por categoria via SQL
        const porCategoriaResult = await db.select({
          categoriaId: ordensServico.categoriaId,
          count: sql<number>`count(*)`
        })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId))
          .groupBy(ordensServico.categoriaId);
        
        const porCategoria = categorias.map(c => ({
          ...c,
          total: Number(porCategoriaResult.find(r => r.categoriaId === c.id)?.count || 0),
        }));
        
        // Calcular valores via SQL
        const [valoresResult] = await db.select({
          valorEstimadoTotal: sql<number>`COALESCE(SUM(CAST(valorEstimado AS DECIMAL(12,2))), 0)`,
          valorRealTotal: sql<number>`COALESCE(SUM(CAST(valorReal AS DECIMAL(12,2))), 0)`,
        })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId));
        
        // Tempo médio de resolução via SQL
        const [tempoResult] = await db.select({
          avgTempo: sql<number>`AVG(tempoDecorridoMinutos)`,
          countConcluidas: sql<number>`count(*)`
        })
          .from(ordensServico)
          .where(and(
            eq(ordensServico.condominioId, input.condominioId),
            sql`dataFim IS NOT NULL AND dataInicio IS NOT NULL`
          ));
        
        // Contar abertas (status não final)
        const statusFinaisIds = statusList.filter(s => s.isFinal).map(s => s.id);
        let abertas = total;
        if (statusFinaisIds.length > 0) {
          const [concluidasCount] = await db.select({ count: sql<number>`count(*)` })
            .from(ordensServico)
            .where(and(
              eq(ordensServico.condominioId, input.condominioId),
              inArray(ordensServico.statusId, statusFinaisIds)
            ));
          abertas = total - Number(concluidasCount?.count || 0);
        }
        
        return {
          total,
          porStatus,
          porCategoria,
          valorEstimadoTotal: Number(valoresResult?.valorEstimadoTotal || 0),
          valorRealTotal: Number(valoresResult?.valorRealTotal || 0),
          tempoMedioMinutos: Number(tempoResult?.avgTempo || 0),
          abertas,
          concluidas: Number(tempoResult?.countConcluidas || 0),
        };
      }),

    // ========== COMPARTILHAMENTO ==========
    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [os] = await db.select().from(ordensServico)
          .where(eq(ordensServico.shareToken, input.token))
          .limit(1);
        
        if (!os) throw new Error("Ordem de serviço não encontrada");
        
        const [categoria] = os.categoriaId ? await db.select().from(osCategorias).where(eq(osCategorias.id, os.categoriaId)) : [null];
        const [prioridade] = os.prioridadeId ? await db.select().from(osPrioridades).where(eq(osPrioridades.id, os.prioridadeId)) : [null];
        const [status] = os.statusId ? await db.select().from(osStatus).where(eq(osStatus.id, os.statusId)) : [null];
        
        const imagens = await db.select().from(osImagens)
          .where(eq(osImagens.ordemServicoId, os.id))
          .orderBy(asc(osImagens.ordem));
        
        const timeline = await db.select().from(osTimeline)
          .where(eq(osTimeline.ordemServicoId, os.id))
          .orderBy(desc(osTimeline.createdAt));
        
        return {
          ...os,
          categoria,
          prioridade,
          status,
          imagens,
          timeline,
        };
      }),

    // ========== LOCALIZAÇÃO ==========
    updateLocalizacao: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        endereco: z.string().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(ordensServico)
          .set({
            latitude: input.latitude?.toString() || null,
            longitude: input.longitude?.toString() || null,
            endereco: input.endereco,
          })
          .where(eq(ordensServico.id, input.ordemServicoId));
        
        // Registrar na timeline
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "localizacao_atualizada",
          descricao: `Localização atualizada: ${input.endereco || 'Coordenadas atualizadas'}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { success: true };
      }),

    uploadImagem: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(),
        descricao: z.string().optional(),
        // Fase da foto. Sem isto a imagem cai em "outro" e some das galerias
        // de antes e depois.
        tipo: z.enum(["antes", "durante", "depois", "orcamento", "outro"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(input.fileType)) {
          throw new Error("Tipo de ficheiro nao suportado");
        }
        
        const base64Data = input.fileData.replace(/^data:image\/\w+;base64,/, "");
        let buffer = Buffer.from(base64Data, "base64");
        
        const maxSize = 100 * 1024 * 1024;
        if (buffer.length > maxSize) {
          throw new Error("Ficheiro muito grande. Maximo 100MB.");
        }
        
        const ext = input.fileName.split(".").pop() || "jpg";
        const uniqueId = nanoid(10);
        const fileKey = `os-imagens/${input.ordemServicoId}/${uniqueId}.${ext}`;
        
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        
        const [result] = await db.insert(osImagens).values({
          ordemServicoId: input.ordemServicoId,
          url,
          tipo: input.tipo ?? "outro",
          descricao: input.descricao,
        }).returning();

        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "foto_adicionada",
          descricao: `Imagem adicionada: ${input.fileName}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        }).returning();
        
        return { success: true, id: result.id, url };
      }),

    listarImagens: osProcedure
      .input(z.object({ ordemServicoId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const imagens = await db.select().from(osImagens)
          .where(eq(osImagens.ordemServicoId, input.ordemServicoId))
          .orderBy(desc(osImagens.createdAt));
        
        return imagens;
      }),

    deletarImagem: osProcedure
      .input(z.object({ imagemId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [imagem] = await db.select().from(osImagens)
          .where(eq(osImagens.id, input.imagemId));
        
        if (!imagem) throw new Error("Imagem nao encontrada");
        
        await db.delete(osImagens).where(eq(osImagens.id, input.imagemId));
        
        // Registrar na timeline
        await db.insert(osTimeline).values({
          ordemServicoId: imagem.ordemServicoId,
          tipo: "foto_removida",
          descricao: `Foto removida`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { success: true };
      }),

    // Gerar PDF da ordem de serviço
    generatePDF: osProcedure
      .input(z.object({ osId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar ordem de serviço
        const [os] = await db.select().from(ordensServico)
          .where(eq(ordensServico.id, input.osId));
        
        if (!os) {
          throw new Error("Ordem de serviço não encontrada");
        }
        
        // Buscar imagens
        const imagens = await db.select().from(osImagens)
          .where(eq(osImagens.ordemServicoId, input.osId));
        
        // Buscar materiais
        const materiais = await db.select().from(osMateriais)
          .where(eq(osMateriais.ordemServicoId, input.osId));
        
        // Buscar chat/comentários
        const chatMessages = await db.select().from(osChat)
          .where(eq(osChat.ordemServicoId, input.osId))
          .orderBy(osChat.createdAt);
        
        // Buscar timeline
        const timelineEvents = await db.select().from(osTimeline)
          .where(eq(osTimeline.ordemServicoId, input.osId))
          .orderBy(osTimeline.createdAt);
        
        // Importar gerador de PDF
        const { generateOSPDF } = await import("../../pdf-generator"); // Adjusted path
        
        // Buscar nomes de categoria, prioridade, status e setor
        const [categoria] = os.categoriaId ? await db.select().from(osCategorias).where(eq(osCategorias.id, os.categoriaId)) : [null];
        const [prioridade] = os.prioridadeId ? await db.select().from(osPrioridades).where(eq(osPrioridades.id, os.prioridadeId)) : [null];
        const [status] = os.statusId ? await db.select().from(osStatus).where(eq(osStatus.id, os.statusId)) : [null];
        const [setor] = os.setorId ? await db.select().from(osSetores).where(eq(osSetores.id, os.setorId)) : [null];

        // Buscar orçamentos
        const orcamentos = await db.select().from(osOrcamentos)
          .where(eq(osOrcamentos.ordemServicoId, input.osId));
        
        // Buscar responsáveis
        const responsaveis = await db.select().from(osResponsaveis)
          .where(eq(osResponsaveis.ordemServicoId, input.osId));
        
        // Buscar condomínio
        const [condominio] = await db.select().from(condominios)
          .where(eq(condominios.id, os.condominioId));

        // Preparar dados para PDF
        const pdfData = {
          osId: input.osId,
          protocolo: os.protocolo || "",
          titulo: os.titulo || "",
          descricao: os.descricao || "",
          responsavelPrincipalNome: os.responsavelPrincipalNome || "",
          tempoEstimadoDias: os.tempoEstimadoDias || 0,
          tempoEstimadoHoras: os.tempoEstimadoHoras || 0,
          tempoEstimadoMinutos: os.tempoEstimadoMinutos || 0,
          latitude: os.latitude || undefined,
          longitude: os.longitude || undefined,
          localizacaoDescricao: os.localizacaoDescricao || "",
          materiais: materiais.map(m => ({
            nome: m.nome,
            quantidade: m.quantidade || 0,
            unidade: m.unidade || undefined,
            valorUnitario: m.valorUnitario ? parseFloat(String(m.valorUnitario)) : undefined,
            valorTotal: m.valorTotal ? parseFloat(String(m.valorTotal)) : undefined,
          })),
          imagens: imagens.map(img => ({ url: img.url, tipo: img.tipo || undefined, descricao: img.descricao || undefined })),
          dataCriacao: os.createdAt,
          prioridadeNome: prioridade?.nome || "",
          categoriaNome: categoria?.nome || "",
          setorNome: setor?.nome || "",
          statusNome: status?.nome || "",
          statusCor: status?.cor || undefined,
          // Orçamentos
          orcamentos: orcamentos.map(o => ({
            fornecedor: o.fornecedor || undefined,
            descricao: o.descricao || undefined,
            valor: parseFloat(String(o.valor)) || 0,
            aprovado: o.aprovado || false,
            dataOrcamento: o.dataOrcamento || undefined,
          })),
          // Responsáveis
          responsaveis: responsaveis.map(r => ({
            nome: r.nome,
            cargo: r.cargo || undefined,
            telefone: r.telefone || undefined,
            email: r.email || undefined,
          })),
          // Dados de chat e timeline
          chat: chatMessages.map(msg => ({
            remetente: msg.remetenteNome || "Usuário",
            mensagem: msg.mensagem || "",
            data: msg.createdAt,
          })),
          timeline: timelineEvents.map(evt => ({
            tipo: evt.tipo || "",
            descricao: evt.descricao || "",
            usuarioNome: evt.usuarioNome || "Sistema",
            data: evt.createdAt,
          })),
          // Branding
          condominioNome: condominio?.nome || "",
          condominioEndereco: condominio?.endereco || "",
          // Financeiro
          valorEstimado: os.valorEstimado ? parseFloat(String(os.valorEstimado)) : undefined,
          valorReal: os.valorReal ? parseFloat(String(os.valorReal)) : undefined,
          // Solicitante
          solicitanteNome: os.solicitanteNome || undefined,
          solicitanteTipo: os.solicitanteTipo || undefined,
        };

        // Gerar PDF
        const pdfBuffer = await generateOSPDF(pdfData);
        
        // Retornar base64 para download
        return {
          success: true,
          pdfBase64: pdfBuffer.toString("base64"),
          filename: `OS-${os.protocolo || os.id}-${new Date().toISOString().split("T")[0]}.pdf`,
        };
      }),

    // ========== ANEXOS (PDF e Documentos) ==========
    uploadAnexo: osProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const allowedTypes = [
          "application/pdf",
          "image/jpeg", "image/png", "image/gif", "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        
        if (!allowedTypes.includes(input.fileType)) {
          throw new Error("Tipo de ficheiro não suportado. Permitidos: PDF, imagens, Word, Excel");
        }
        
        const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
        let buffer = Buffer.from(base64Data, "base64");
        
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (buffer.length > maxSize) {
          throw new Error("Ficheiro muito grande. Máximo 100MB.");
        }
        
        // Determinar tipo de anexo
        let tipo: "pdf" | "imagem" | "documento" | "outro" = "outro";
        if (input.fileType === "application/pdf") {
          tipo = "pdf";
        } else if (input.fileType.startsWith("image/")) {
          tipo = "imagem";
        } else if (input.fileType.includes("word") || input.fileType.includes("excel") || input.fileType.includes("spreadsheet")) {
          tipo = "documento";
        }
        
        const ext = input.fileName.split(".").pop() || "pdf";
        const uniqueId = nanoid(10);
        const fileKey = `os-anexos/${input.ordemServicoId}/${uniqueId}.${ext}`;
        
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        
        const [result] = await db.insert(osAnexos).values({
          ordemServicoId: input.ordemServicoId,
          nome: fileKey,
          nomeOriginal: input.fileName,
          url,
          tipo,
          mimeType: input.fileType,
          tamanho: buffer.length,
          descricao: input.descricao,
          uploadPor: autor.userId,
          uploadPorNome: autor.nome,
        }).returning();
        
        // Registrar na timeline
        await db.insert(osTimeline).values({
          ordemServicoId: input.ordemServicoId,
          tipo: "anexo_adicionado",
          descricao: `Anexo adicionado: ${input.fileName}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { success: true, id: result.id, url };
      }),

    listarAnexos: osProcedure
      .input(z.object({ ordemServicoId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const anexos = await db.select().from(osAnexos)
          .where(eq(osAnexos.ordemServicoId, input.ordemServicoId))
          .orderBy(desc(osAnexos.createdAt));
        
        return anexos;
      }),

    deletarAnexo: osProcedure
      .input(z.object({ anexoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [anexo] = await db.select().from(osAnexos)
          .where(eq(osAnexos.id, input.anexoId));
        
        if (!anexo) throw new Error("Anexo não encontrado");
        
        await db.delete(osAnexos).where(eq(osAnexos.id, input.anexoId));
        
        // Registrar na timeline
        await db.insert(osTimeline).values({
          ordemServicoId: anexo.ordemServicoId,
          tipo: "anexo_removido",
          descricao: `Anexo removido: ${anexo.nomeOriginal}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });
        
        return { success: true };
      }),

    // ==================== ESTATÍSTICAS ====================
    estatisticas: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return {
          total: 0,
          abertas: 0,
          concluidas: 0,
          atrasadas: 0,
          porStatus: [],
          porMes: [],
        };
        
        // Total de OS
        const totalResult = await db.select({ count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId));
        const total = Number(totalResult[0]?.count || 0);
        
        // OS Abertas (status diferente de concluído/fechado) - usar flag isFinal
        const statusConcluido = await db.select().from(osStatus)
          .where(and(
            eq(osStatus.condominioId, input.condominioId),
            eq(osStatus.isFinal, true)
          ));
        const statusConcluidoIds = statusConcluido.map(s => s.id);
        
        let abertas = total;
        let concluidas = 0;
        
        if (statusConcluidoIds.length > 0) {
          const concluidasResult = await db.select({ count: sql<number>`count(*)` })
            .from(ordensServico)
            .where(and(
              eq(ordensServico.condominioId, input.condominioId),
              inArray(ordensServico.statusId, statusConcluidoIds)
            ));
          concluidas = Number(concluidasResult[0]?.count || 0);
          abertas = total - concluidas;
        }
        
        // OS Atrasadas (usando tempoEstimadoDias para calcular atraso)
        // Uma OS está atrasada se passou mais dias do que o estimado desde a criação
        const atrasadasResult = await db.select({ count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(and(
            eq(ordensServico.condominioId, input.condominioId),
            sql`(CURRENT_DATE - ${ordensServico.createdAt}::date) > COALESCE(${ordensServico.tempoEstimadoDias}, 30)`,
            // O.S. sem status também conta: `NOT IN` sobre NULL devolve NULL e
            // sumiria com ela da contagem.
            statusConcluidoIds.length > 0
              ? or(
                  isNull(ordensServico.statusId),
                  not(inArray(ordensServico.statusId, statusConcluidoIds)),
                )
              : sql`1=1`
          ));
        const atrasadas = Number(atrasadasResult[0]?.count || 0);
        
        // Por Status
        const porStatusResult = await db.select({
          statusId: ordensServico.statusId,
          count: sql<number>`count(*)`
        })
          .from(ordensServico)
          .where(eq(ordensServico.condominioId, input.condominioId))
          .groupBy(ordensServico.statusId);
        
        const statusList = await db.select().from(osStatus)
          .where(eq(osStatus.condominioId, input.condominioId));
        
        const porStatus = porStatusResult.map(item => {
          const status = statusList.find(s => s.id === item.statusId);
          return {
            status: status?.nome || 'Sem status',
            count: Number(item.count),
            cor: status?.cor || '#6B7280'
          };
        });
        
        // Por Mês (últimos 12 meses)
        const porMesResult = await db.select({
          mes: sql<number>`EXTRACT(MONTH FROM ${ordensServico.createdAt})::int`,
          ano: sql<number>`EXTRACT(YEAR FROM ${ordensServico.createdAt})::int`,
          count: sql<number>`count(*)`
        })
          .from(ordensServico)
          .where(and(
            eq(ordensServico.condominioId, input.condominioId),
            gte(ordensServico.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
          ))
          .groupBy(
            sql`EXTRACT(MONTH FROM ${ordensServico.createdAt})`,
            sql`EXTRACT(YEAR FROM ${ordensServico.createdAt})`,
          );
        
        const porMes = porMesResult.map(item => ({
          mes: Number(item.mes),
          ano: Number(item.ano),
          count: Number(item.count)
        }));
        
        return {
          total,
          abertas,
          concluidas,
          atrasadas,
          porStatus,
          porMes,
        };
      }),

    // ========== RESPONSÁVEIS, AVISOS E AVALIAÇÃO ==========

    /** Quem pode ser marcado como responsável: a equipe ativa da unidade. */
    listarCandidatos: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select({
            id: funcionarios.id,
            nome: funcionarios.nome,
            cargo: funcionarios.cargo,
            email: funcionarios.email,
            telefone: funcionarios.telefone,
            notificarOsEmail: funcionarios.notificarOsEmail,
          })
          .from(funcionarios)
          .where(and(eq(funcionarios.condominioId, input.condominioId), eq(funcionarios.ativo, true)))
          .orderBy(asc(funcionarios.nome));
      }),

    /** Liga/desliga o aviso no aplicativo para toda a equipe da unidade. */
    setAutoNotificar: osConfigProcedure
      .input(z.object({ condominioId: z.number(), ativo: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(condominios)
          .set({ osAutoNotificar: input.ativo })
          .where(eq(condominios.id, input.condominioId));

        return { success: true };
      }),

    /** Marca/desmarca um funcionário para receber o e-mail de abertura. */
    setNotificarEmail: osConfigProcedure
      .input(z.object({ funcionarioId: z.number(), ativo: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(funcionarios)
          .set({ notificarOsEmail: input.ativo })
          .where(eq(funcionarios.id, input.funcionarioId));

        return { success: true };
      }),

    avaliar: osProcedure
      .input(z.object({
        id: z.number(),
        nota: z.number().int().min(1).max(5),
        comentario: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(ordensServico)
          .set({ avaliacaoNota: input.nota, avaliacaoComentario: input.comentario ?? null })
          .where(eq(ordensServico.id, input.id));

        // O enum da timeline não tem "avaliacao"; entra como comentário para
        // não exigir migration de tipo só por causa do rótulo.
        await db.insert(osTimeline).values({
          ordemServicoId: input.id,
          tipo: "comentario",
          descricao: `Serviço avaliado com ${input.nota} estrela(s)`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });

        return { success: true };
      }),
});
