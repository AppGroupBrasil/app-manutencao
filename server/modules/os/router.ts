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
  funcionarioCondominios,
  equipes,
  equipeFuncionarios,
  equipeUnidades,
  condominios,
  users
} from "../../../drizzle/schema"; // Adjusted path
import { eq, and, desc, like, or, sql, gte, inArray, asc, not, isNull } from "drizzle-orm";
import { IDS_CAMPOS_OCULTAVEIS_OS } from "../../../shared/camposOcultaveisOs";
import { camposOcultosDaUnidade } from "../../_core/camposOcultosOs";

/**
 * Ficha em uso.
 *
 * `ativo` aceita nulo e só ganhou valor padrão depois: quem foi cadastrado
 * antes disso ficou com o campo em branco e sumia de tudo — não aparecia para
 * ser responsável, não era avisado da O.S. e não entrava na equipe designada.
 * Em branco é ficha ativa; desligada é a que tem `false` gravado.
 */
const funcionarioEmUso = or(eq(funcionarios.ativo, true), isNull(funcionarios.ativo));

/**
 * Quem trabalha na unidade: a ficha é dela, ou a pessoa está vinculada a ela.
 *
 * A ficha guarda uma unidade só, mas o funcionário pode atender várias — é o
 * que `funcionario_condominios` registra desde sempre, e nenhuma lista olhava.
 * Quem foi cadastrado numa unidade e vinculado a outra não aparecia na
 * segunda: nem para ser responsável pela O.S., nem para entrar na equipe.
 */
function funcionarioDaUnidade(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  unidades: number[],
) {
  return or(
    inArray(funcionarios.condominioId, unidades),
    inArray(
      funcionarios.id,
      db
        .select({ id: funcionarioCondominios.funcionarioId })
        .from(funcionarioCondominios)
        .where(
          and(
            inArray(funcionarioCondominios.condominioId, unidades),
            or(
              eq(funcionarioCondominios.ativo, true),
              isNull(funcionarioCondominios.ativo),
            ),
          ),
        ),
    ),
  );
}
import { nanoid } from "nanoid";
import { storagePut } from "../../storage";
import { autorDaRequisicao } from "../../_core/autor";
import { unidadesDaConsulta, unidadesSelecionadas } from "../../_core/unidadesConsulta";
import { assegurarExclusaoFuncionario } from "../../_core/permissaoFuncionario";
import {
  seedCategoriasOs,
  seedPrioridadesOs,
  seedStatusOs,
} from "../../_core/seedUnidade";
import { TRPCError } from "@trpc/server";

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
    equipeId: direto(equipes),
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
    .where(and(funcionarioDaUnidade(db, [os.condominioId]), funcionarioEmUso));

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

/**
 * Aviso da equipe designada.
 *
 * Quem precisa saber é o supervisor: é ele que distribui o serviço dentro do
 * time. Equipe sem supervisor cadastrado avisa todos os membros — melhor o
 * time inteiro saber do que ninguém ficar sabendo.
 */
/**
 * A equipe é da mesma unidade da O.S.?
 *
 * O escopo por registro garante que a equipe pertence a alguma organização de
 * quem chamou — e quem cuida de 15 unidades passa nessa checagem com a equipe
 * de qualquer uma delas. Aqui é a segunda pergunta: é a equipe DESTA unidade.
 * Sem ela, o aviso sairia para o time errado e o nome nem apareceria na lista,
 * que só busca equipes da unidade da ordem.
 */
async function exigirEquipeDaUnidade(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  equipeId: number,
  condominioId: number,
  ctx: { funcionario: { id: number } | null },
): Promise<void> {
  // Designar decide quem responde pelo serviço e dispara aviso: é decisão de
  // quem gerencia. O portal do funcionário mostra a equipe, sem editar.
  if (ctx.funcionario) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Só quem responde pela unidade designa a equipe.",
    });
  }

  const [equipe] = await db
    .select({ ativo: equipes.ativo })
    .from(equipes)
    .where(eq(equipes.id, equipeId))
    .limit(1);

  if (!equipe) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Esta equipe não atende a unidade da ordem de serviço.",
    });
  }

  if (!equipe.ativo) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Esta equipe foi desativada.",
    });
  }

  // Atender, e não pertencer: a equipe de rede cobre várias unidades e a
  // pergunta certa é se esta unidade está entre elas.
  const [atende] = await db
    .select({ id: equipeUnidades.id })
    .from(equipeUnidades)
    .where(
      and(eq(equipeUnidades.equipeId, equipeId), eq(equipeUnidades.condominioId, condominioId)),
    )
    .limit(1);

  if (!atende) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Esta equipe não atende a unidade da ordem de serviço.",
    });
  }
}

/**
 * Os membros da equipe entram como responsáveis da O.S.
 *
 * Designar a equipe e escolher os responsáveis eram duas listas que diziam a
 * mesma coisa, e quem designava a equipe achava que tinha terminado — a ordem
 * não aparecia para ninguém no portal. Aqui o vínculo é um só: designou a
 * equipe, o time inteiro é responsável.
 *
 * Só acrescenta. Quem já era responsável continua, inclusive quem foi posto à
 * mão e não é da equipe: tirar alguém é decisão de quem gerencia, não efeito
 * colateral de trocar a equipe.
 */
async function membrosViramResponsaveis(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  ordemServicoId: number,
  equipeId: number,
): Promise<number> {
  // Empresa contratada não põe ninguém como responsável: quem responde por ela
  // não tem ficha no sistema. Perguntar aqui, e não confiar em "a tabela de
  // membros está vazia": um contato cadastrado por engano viraria responsável.
  const [equipe] = await db
    .select({ externa: equipes.externa })
    .from(equipes)
    .where(eq(equipes.id, equipeId))
    .limit(1);

  if (equipe?.externa) return 0;

  const membros = await db
    .select({
      id: funcionarios.id,
      nome: funcionarios.nome,
      cargo: funcionarios.cargo,
      telefone: funcionarios.telefone,
      email: funcionarios.email,
    })
    .from(equipeFuncionarios)
    .innerJoin(funcionarios, eq(equipeFuncionarios.funcionarioId, funcionarios.id))
    .where(and(eq(equipeFuncionarios.equipeId, equipeId), funcionarioEmUso));

  if (membros.length === 0) return 0;

  const jaEstao = await db
    .select({ funcionarioId: osResponsaveis.funcionarioId })
    .from(osResponsaveis)
    .where(eq(osResponsaveis.ordemServicoId, ordemServicoId));

  const existentes = new Set(jaEstao.map((r) => r.funcionarioId));
  const novos = membros.filter((m) => !existentes.has(m.id));
  if (novos.length === 0) return 0;

  await db.insert(osResponsaveis).values(
    novos.map((m) => ({
      ordemServicoId,
      funcionarioId: m.id,
      nome: m.nome,
      cargo: m.cargo ?? null,
      telefone: m.telefone ?? null,
      email: m.email ?? null,
    })),
  );

  return novos.length;
}

/**
 * O cadastro escolhido é da unidade da própria O.S.?
 *
 * Mesma pergunta da equipe, agora para status, categoria, prioridade e setor.
 * Com a lista da rede, a tela mostra ordens de várias unidades ao mesmo tempo,
 * e o escopo por registro aceita qualquer id do alcance de quem gerencia — sem
 * esta conferência, o status de uma unidade entra na ordem de outra e some da
 * tela, porque a lista de cada unidade só traz os cadastros dela.
 */
async function exigirCadastroDaUnidade(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  tabela: typeof osStatus | typeof osCategorias | typeof osPrioridades | typeof osSetores,
  id: number,
  condominioId: number,
  rotulo: string,
): Promise<void> {
  const [registro] = await db
    .select({ condominioId: tabela.condominioId })
    .from(tabela)
    .where(eq(tabela.id, id))
    .limit(1);

  if (!registro || registro.condominioId !== condominioId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${rotulo} não é da unidade da ordem de serviço.`,
    });
  }
}

async function notificarEquipeDesignada(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  os: { id: number; condominioId: number; protocolo: string; titulo: string; prazoLimite?: string | null },
  equipeId: number,
): Promise<{ equipe: string | null; avisados: string[] }> {
  const [equipe] = await db
    .select({ nome: equipes.nome, externa: equipes.externa, email: equipes.email })
    .from(equipes)
    .where(eq(equipes.id, equipeId))
    .limit(1);

  // Empresa de fora não tem funcionário no sistema: o aviso é o e-mail dela, e
  // não existe supervisor para notificar dentro do portal.
  if (equipe?.externa) {
    if (equipe.email) {
      const { isEmailConfigured, sendEmail } = await import("../../_core/email");
      if (isEmailConfigured()) {
        await sendEmail({
          to: [equipe.email],
          subject: `O.S. ${os.protocolo} designada para ${equipe.nome}`,
          text: [
            `A ordem de serviço ${os.protocolo} foi designada para ${equipe.nome}.`,
            ``,
            `Serviço: ${os.titulo}`,
            os.prazoLimite ? `Data máxima para finalização: ${formatarDia(os.prazoLimite)}` : ``,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }
    }

    return { equipe: equipe.nome, avisados: equipe.email ? [equipe.email] : [] };
  }

  const membros = await db
    .select({
      id: funcionarios.id,
      nome: funcionarios.nome,
      email: funcionarios.email,
      loginEmail: funcionarios.loginEmail,
      tipo: funcionarios.tipoFuncionario,
    })
    .from(equipeFuncionarios)
    .innerJoin(funcionarios, eq(equipeFuncionarios.funcionarioId, funcionarios.id))
    .where(and(eq(equipeFuncionarios.equipeId, equipeId), funcionarioEmUso));

  const supervisores = membros.filter((m) => m.tipo === "supervisor");
  const alvos = supervisores.length > 0 ? supervisores : membros;
  if (alvos.length === 0) return { equipe: equipe?.nome ?? null, avisados: [] };

  // O aviso no portal de quem vai executar: endereçado ao funcionário, que não
  // tem conta em `users`. Sem isto o e-mail era o único caminho, e a ordem não
  // existia no aplicativo dele até alguém telefonar.
  //
  // O link é o do portal, e não o do painel: `/manutencoes/...` é tela de
  // gestor e devolveria "sessão expirada" para quem entra por aqui.
  await db.insert(notificacoes).values(
    alvos.map((m) => ({
      funcionarioId: m.id,
      condominioId: os.condominioId,
      tipo: "geral" as const,
      titulo: `O.S. ${os.protocolo} designada para ${equipe?.nome ?? "sua equipe"}`,
      mensagem: os.titulo,
      link: `/dashboard/ordens?os=${os.id}`,
      referenciaId: os.id,
    })),
  );

  const enderecos = alvos
    .flatMap((m) => [m.loginEmail, m.email])
    .filter((e): e is string => !!e)
    .map((e) => e.toLowerCase());

  // Aviso dentro do sistema para quem tem conta; o e-mail cobre o resto.
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
          titulo: `O.S. ${os.protocolo} designada para ${equipe?.nome ?? "sua equipe"}`,
          mensagem: os.titulo,
          link: `/manutencoes/ordens-servico/${os.id}`,
        })),
      );
    }
  }

  const emails = alvos.map((m) => m.email).filter((e): e is string => !!e);
  if (emails.length > 0) {
    const { isEmailConfigured, sendEmail } = await import("../../_core/email");
    if (isEmailConfigured()) {
      await sendEmail({
        to: emails,
        subject: `O.S. ${os.protocolo} designada para ${equipe?.nome ?? "sua equipe"}`,
        text: [
          `A ordem de serviço ${os.protocolo} foi designada para a equipe ${equipe?.nome ?? ""}.`,
          ``,
          `Serviço: ${os.titulo}`,
          os.prazoLimite ? `Data máxima para finalização: ${formatarDia(os.prazoLimite)}` : ``,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }
  }

  return { equipe: equipe?.nome ?? null, avisados: alvos.map((a) => a.nome) };
}

/** Registra o passo na linha do tempo, que é onde a auditoria vive. */
async function registrarEtapa(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  ordemServicoId: number,
  descricao: string,
  autor: { userId: number | null; nome: string },
) {
  // O enum da timeline é fechado; "status_alterado" é o que descreve o passo
  // sem exigir migration de tipo só pelo rótulo.
  await db.insert(osTimeline).values({
    ordemServicoId,
    tipo: "status_alterado",
    descricao,
    usuarioId: autor.userId,
    usuarioNome: autor.nome,
  });
}

function formatarDia(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

export const osRouter = router({
    // ========== CAMPOS OCULTOS ==========
    /**
     * Quais blocos da O.S. este cliente não vê.
     *
     * Leitura aberta a quem abre ordem, funcionário incluído: é ele quem vê o
     * formulário montado, e sem isto a tela dele mostraria o campo que o gestor
     * escondeu.
     */
    camposOcultos: osProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(({ input }) => camposOcultosDaUnidade(input.condominioId)),

    /**
     * Grava a lista — e repete em todas as unidades do mesmo cliente.
     *
     * O campo que o cliente não usa, ele não usa em nenhuma unidade; com quinze
     * delas, pedir que o gestor repita a escolha quinze vezes é o mesmo que não
     * ter a função. A tela lê pela unidade aberta, então a lista tem de existir
     * em cada uma.
     */
    setCamposOcultos: osConfigProcedure
      .input(
        z.object({
          condominioId: z.number(),
          campos: z.array(z.enum(IDS_CAMPOS_OCULTAVEIS_OS as [string, ...string[]])),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Sem repetidos: a tela alterna por clique e um duplo toque gravaria o
        // mesmo id duas vezes.
        const campos = [...new Set(input.campos)];

        /**
         * As unidades do mesmo dono, e só elas.
         *
         * O alcance do `admin_master` é a base inteira: gravar em
         * `ctx.tenant.ids()` cru esconderia o campo para todos os clientes da
         * plataforma de uma vez. O recorte é o `sindicoId` da unidade aberta,
         * cruzado com o alcance de quem está pedindo.
         */
        const [dona] = await db
          .select({ sindicoId: condominios.sindicoId })
          .from(condominios)
          .where(eq(condominios.id, input.condominioId))
          .limit(1);

        const alcance = new Set(await ctx.tenant.ids());
        const irmas = dona?.sindicoId
          ? await db
              .select({ id: condominios.id })
              .from(condominios)
              .where(eq(condominios.sindicoId, dona.sindicoId))
          : [];

        const destinos = [
          ...new Set(
            [input.condominioId, ...irmas.map((u) => u.id)].filter((id) => alcance.has(id)),
          ),
        ];

        for (const condominioId of destinos) {
          // A linha de configuração pode não existir: unidade criada antes de
          // alguém abrir a tela de configurações nunca ganhou a sua.
          const [existente] = await db
            .select({ id: osConfiguracoes.id })
            .from(osConfiguracoes)
            .where(eq(osConfiguracoes.condominioId, condominioId))
            .limit(1);

          if (existente) {
            await db
              .update(osConfiguracoes)
              .set({ camposOcultos: campos })
              .where(eq(osConfiguracoes.condominioId, condominioId));
          } else {
            await db.insert(osConfiguracoes).values({ condominioId, camposOcultos: campos });
          }
        }

        return { unidades: destinos.length };
      }),

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
        
        // Unidade criada antes de o preparo existir: completa aqui, uma vez.
        if (categorias.length === 0) {
          await seedCategoriasOs(input.condominioId);

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
          await seedPrioridadesOs(input.condominioId);

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
          await seedStatusOs(input.condominioId);

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
        /**
         * Junta as O.S. de todas as unidades que quem consulta alcança.
         *
         * É o que o gerente da rede precisa: ordem aberta pelo gestor de uma
         * unidade tem de aparecer para ele sem trocar a unidade da tela. Quais
         * unidades entram sai da identidade autenticada, nunca do input — o
         * client só diz "quero a rede".
         */
        todasUnidades: z.boolean().optional(),
        /**
         * Só as unidades marcadas no seletor, quando não são todas.
         *
         * Os ids são cruzados com o alcance de quem consulta: o que vier de
         * fora dele é descartado, não vira erro.
         */
        unidades: unidadesSelecionadas,
        statusId: z.number().optional(),
        categoriaId: z.number().optional(),
        prioridadeId: z.number().optional(),
        /**
         * Só as ordens designadas às equipes de quem está consultando.
         *
         * É a aba do portal: o funcionário abre Ordens de Serviço e vê a
         * unidade inteira, sem saber qual é a dele. Vale só para funcionário —
         * gestor não pertence a equipe nenhuma e receberia uma lista vazia.
         */
        minhasEquipes: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Unidades marcadas no seletor, ou a rede inteira quando a tela pede
        // "todas". A plataforma fica de fora da soma: o alcance dela é a base
        // inteira, e a tela de um cliente listaria a O.S. de todos os outros.
        const unidadesDaLista = await unidadesDaConsulta(ctx, input, "ordens-servico");

        const conditions = [inArray(ordensServico.condominioId, unidadesDaLista)];

        if (input.statusId) conditions.push(eq(ordensServico.statusId, input.statusId));
        if (input.categoriaId) conditions.push(eq(ordensServico.categoriaId, input.categoriaId));
        if (input.prioridadeId) conditions.push(eq(ordensServico.prioridadeId, input.prioridadeId));

        if (input.minhasEquipes && ctx.funcionario) {
          const minhas = await db
            .select({ equipeId: equipeFuncionarios.equipeId })
            .from(equipeFuncionarios)
            .where(eq(equipeFuncionarios.funcionarioId, ctx.funcionario.id));

          // Sem equipe, a aba mostra nada — e não a unidade inteira, que é o
          // oposto do que ela promete.
          conditions.push(
            minhas.length > 0
              ? inArray(ordensServico.equipeId, minhas.map((m) => m.equipeId))
              : sql`false`,
          );
        }
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
        
        // Cadastros de todas as unidades da consulta: categoria, prioridade e
        // status são por unidade, e sem isto a ordem da unidade vizinha viria
        // sem etiqueta nenhuma na lista da rede.
        const categorias = await db.select().from(osCategorias)
          .where(inArray(osCategorias.condominioId, unidadesDaLista));
        const prioridades = await db.select().from(osPrioridades)
          .where(inArray(osPrioridades.condominioId, unidadesDaLista));
        const statusList = await db.select().from(osStatus)
          .where(inArray(osStatus.condominioId, unidadesDaLista));
        // Pelos ids que as ordens apontam, e não pela unidade dona: a equipe de
        // rede pertence a uma unidade e trabalha em várias, e pela coluna dona
        // a etiqueta sumiria da lista das outras.
        const idsDeEquipe = [...new Set(lista.map((os) => os.equipeId).filter((id): id is number => !!id))];
        const equipesDaUnidade = idsDeEquipe.length
          ? await db
              .select({ id: equipes.id, nome: equipes.nome, cor: equipes.cor })
              .from(equipes)
              .where(inArray(equipes.id, idsDeEquipe))
          : [];
        // Em ordem de nome: é a lista que vira o filtro por unidade na tela, e
        // a ordem do banco deixaria as 15 unidades embaralhadas.
        const unidades = await db
          .select({ id: condominios.id, nome: condominios.nome })
          .from(condominios)
          .where(inArray(condominios.id, unidadesDaLista))
          .orderBy(asc(condominios.nome));

        return {
          items: lista.map(os => ({
            ...os,
            categoria: categorias.find(c => c.id === os.categoriaId),
            prioridade: prioridades.find(p => p.id === os.prioridadeId),
            status: statusList.find(s => s.id === os.statusId),
            equipe: equipesDaUnidade.find(e => e.id === os.equipeId) ?? null,
            // Em qual unidade a ordem foi aberta: na lista da rede é isso que
            // diferencia duas ordens com o mesmo título.
            unidade: unidades.find(u => u.id === os.condominioId) ?? null,
          })),
          total,
          unidades,
          /**
           * Status de cada unidade da consulta. A tela troca o status direto na
           * lista, e trocar usando os status da unidade ativa gravaria em uma
           * ordem de outra unidade o status que não é dela.
           */
          statusPorUnidade: statusList.map(s => ({
            id: s.id,
            nome: s.nome,
            cor: s.cor,
            // `isFinal` diz que a ordem está encerrada: é com ele que o painel
            // de pendências separa o que ainda espera alguém.
            isFinal: s.isFinal,
            condominioId: s.condominioId,
          })),
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
        
        // Unidade de atendimento e equipe designada: a ordem tem de dizer onde
        // é o serviço e quem ficou com ele sem obrigar a abrir outra tela.
        const [unidade] = await db
          .select({ id: condominios.id, nome: condominios.nome })
          .from(condominios)
          .where(eq(condominios.id, os.condominioId))
          .limit(1);

        const [equipe] = os.equipeId
          ? await db
              .select({ id: equipes.id, nome: equipes.nome, cor: equipes.cor })
              .from(equipes)
              .where(eq(equipes.id, os.equipeId))
              .limit(1)
          : [null];

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
          unidade: unidade ?? null,
          equipe: equipe ?? null,
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
        /** Dia em que o pedido chegou (`AAAA-MM-DD`); em branco, é hoje. */
        dataAbertura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        /** Data máxima de finalização (`AAAA-MM-DD`). Toda O.S. nasce com uma. */
        prazoLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        /** Equipe que fica com o serviço; o supervisor dela recebe o aviso. */
        equipeId: z.number().optional(),
        /** Empresa de fora que ficou com o serviço, digitada na hora. */
        equipeExterna: z.string().max(255).optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Sem prazo a O.S. não entra no calendário e não cobra ninguém: é o
        // que separa um chamado de um bilhete solto.
        if (!input.prazoLimite) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe a data máxima de finalização.",
          });
        }

        if (input.equipeId) {
          await exigirEquipeDaUnidade(db, input.equipeId, input.condominioId, ctx);
        }

        // Mesma trava do `update`: quem abre a O.S. escolhe a unidade no
        // formulário, e trocar de unidade com um cadastro já escolhido gravaria
        // a ordem apontando para a categoria/status de outra.
        if (input.statusId) {
          await exigirCadastroDaUnidade(db, osStatus, input.statusId, input.condominioId, "Este status");
        }
        if (input.categoriaId) {
          await exigirCadastroDaUnidade(db, osCategorias, input.categoriaId, input.condominioId, "Esta categoria");
        }
        if (input.prioridadeId) {
          await exigirCadastroDaUnidade(db, osPrioridades, input.prioridadeId, input.condominioId, "Esta prioridade");
        }
        if (input.setorId) {
          await exigirCadastroDaUnidade(db, osSetores, input.setorId, input.condominioId, "Este setor");
        }

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
          dataAbertura: input.dataAbertura,
          prazoLimite: input.prazoLimite,
          equipeId: input.equipeId,
          // Um responsável só pelo serviço: escolher a equipe de casa apaga o
          // nome do terceiro, e vice-versa.
          equipeExterna: input.equipeId ? null : input.equipeExterna?.trim() || null,
          observacoes: input.observacoes,
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

        // Designada já na abertura: o supervisor da equipe é avisado e o
        // registro fica na linha do tempo, que é onde se confere quem soube.
        if (input.equipeId) {
          // O time inteiro entra como responsável: é o que faz a ordem aparecer
          // no portal de quem vai executar. Vem antes do aviso e em bloco
          // próprio porque é dado da ordem — e-mail fora do ar não pode deixar
          // a O.S. sem ninguém respondendo por ela.
          try {
            await membrosViramResponsaveis(db, result.id, input.equipeId);
          } catch (erro) {
            console.error("[os] falha ao vincular a equipe como responsável:", erro);
          }

          try {
            const aviso = await notificarEquipeDesignada(
              db,
              {
                id: result.id,
                condominioId: input.condominioId,
                protocolo,
                titulo: input.titulo,
                prazoLimite: input.prazoLimite,
              },
              input.equipeId,
            );
            await registrarEtapa(
              db,
              result.id,
              `Equipe designada: ${aviso.equipe ?? "—"}${
                aviso.avisados.length ? ` · avisado(s): ${aviso.avisados.join(", ")}` : ""
              }`,
              autor,
            );
          } catch (erro) {
            console.error("[os] falha ao avisar a equipe designada:", erro);
          }
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
        dataAbertura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        prazoLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        /** `null` desfaz a designação sem apagar o histórico do aviso. */
        equipeId: z.number().nullable().optional(),
        /** Empresa de fora, digitada na hora; `null` limpa. */
        equipeExterna: z.string().max(255).nullable().optional(),
        observacoes: z.string().nullable().optional(),
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

        if (input.equipeId) {
          await exigirEquipeDaUnidade(db, input.equipeId, osAtual.condominioId, ctx);
        }

        if (input.statusId) {
          await exigirCadastroDaUnidade(db, osStatus, input.statusId, osAtual.condominioId, "Este status");
        }
        if (input.categoriaId) {
          await exigirCadastroDaUnidade(db, osCategorias, input.categoriaId, osAtual.condominioId, "Esta categoria");
        }
        if (input.prioridadeId) {
          await exigirCadastroDaUnidade(db, osPrioridades, input.prioridadeId, osAtual.condominioId, "Esta prioridade");
        }
        if (input.setorId) {
          await exigirCadastroDaUnidade(db, osSetores, input.setorId, osAtual.condominioId, "Este setor");
        }

        // Equipe de casa e empresa de fora são o mesmo campo da tela: escolher
        // uma limpa a outra, senão a O.S. ficaria dizendo que duas pessoas
        // diferentes estão com o serviço.
        if (input.equipeId) updates.equipeExterna = null;
        if (input.equipeExterna?.trim()) {
          updates.equipeId = null;
          updates.equipeExterna = input.equipeExterna.trim();
        }

        // Sem campo nenhum para gravar, o drizzle estoura com "No values to
        // set" — e a tela mostra erro interno num salvamento que não mudou nada.
        if (Object.keys(updates).length > 0) {
          await db.update(ordensServico)
            .set(updates)
            .where(eq(ordensServico.id, id));
        }
        
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

        // Equipe designada depois da abertura: mesmo aviso da criação. Só
        // dispara quando a equipe muda — salvar a O.S. de novo não reavisa.
        if (input.equipeId && input.equipeId !== osAtual.equipeId) {
          // Mesma ordem da abertura: primeiro quem responde, depois o aviso.
          try {
            await membrosViramResponsaveis(db, id, input.equipeId);
          } catch (erro) {
            console.error("[os] falha ao vincular a equipe como responsável:", erro);
          }

          try {
            const aviso = await notificarEquipeDesignada(
              db,
              {
                id,
                condominioId: osAtual.condominioId,
                protocolo: osAtual.protocolo,
                titulo: input.titulo ?? osAtual.titulo,
                prazoLimite: input.prazoLimite ?? osAtual.prazoLimite,
              },
              input.equipeId,
            );
            await membrosViramResponsaveis(db, id, input.equipeId);
            await registrarEtapa(
              db,
              id,
              `Equipe designada: ${aviso.equipe ?? "—"}${
                aviso.avisados.length ? ` · avisado(s): ${aviso.avisados.join(", ")}` : ""
              }`,
              autor,
            );
          } catch (erro) {
            console.error("[os] falha ao avisar a equipe designada:", erro);
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
    
    /**
     * Marca o dia em que o serviço vai ser feito e, se vier, quem executa.
     *
     * Serve também para reprogramar — o calendário chama a mesma rota quando a
     * data muda, e cada mudança fica na linha do tempo com quem mexeu. Fica em
     * `osConfigProcedure`: distribuir agenda é de quem responde pela unidade.
     */
    programar: osConfigProcedure
      .input(
        z.object({
          id: z.number(),
          dataProgramada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          /** Funcionários que executam; os já designados continuam. */
          responsaveisIds: z.array(z.number()).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [os] = await db
          .select()
          .from(ordensServico)
          .where(eq(ordensServico.id, input.id));
        if (!os) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Ordem de serviço não encontrada" });
        }

        const reprogramando = !!os.dataProgramada;

        await db
          .update(ordensServico)
          .set({ dataProgramada: input.dataProgramada })
          .where(eq(ordensServico.id, input.id));

        // Equipe: só acrescenta quem falta, para não apagar quem já estava.
        const designados: string[] = [];
        if (input.responsaveisIds?.length) {
          const jaTem = await db
            .select({ funcionarioId: osResponsaveis.funcionarioId })
            .from(osResponsaveis)
            .where(eq(osResponsaveis.ordemServicoId, input.id));
          const existentes = new Set(jaTem.map((r) => r.funcionarioId));

          const pessoas = await db
            .select()
            .from(funcionarios)
            .where(
              and(
                eq(funcionarios.condominioId, os.condominioId),
                inArray(funcionarios.id, input.responsaveisIds),
              ),
            );

          for (const pessoa of pessoas) {
            if (existentes.has(pessoa.id)) continue;
            await db.insert(osResponsaveis).values({
              ordemServicoId: input.id,
              nome: pessoa.nome,
              cargo: pessoa.cargo,
              email: pessoa.email,
              telefone: pessoa.telefone,
              funcionarioId: pessoa.id,
            });
            designados.push(pessoa.nome);
          }
        }

        const detalhe = designados.length ? ` · equipe: ${designados.join(", ")}` : "";
        await registrarEtapa(
          db,
          input.id,
          `${reprogramando ? "Serviço reprogramado" : "Serviço programado"} para ${formatarDia(
            input.dataProgramada,
          )}${detalhe}`,
          autor,
        );

        return { success: true };
      }),

    /**
     * Corrige a data máxima combinada.
     *
     * O prazo é obrigatório na abertura, e errar a digitação acontece. Sem esta
     * rota, o único jeito de consertar seria apagar a O.S. e abrir outra —
     * perdendo protocolo, fotos e histórico. Fica em `osConfigProcedure`: é
     * combinado da unidade, não algo que a equipe muda.
     */
    definirPrazo: osConfigProcedure
      .input(
        z.object({
          id: z.number(),
          prazoLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [os] = await db
          .select({ prazoLimite: ordensServico.prazoLimite })
          .from(ordensServico)
          .where(eq(ordensServico.id, input.id));
        if (!os) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Ordem de serviço não encontrada" });
        }

        await db
          .update(ordensServico)
          .set({ prazoLimite: input.prazoLimite })
          .where(eq(ordensServico.id, input.id));

        await registrarEtapa(
          db,
          input.id,
          os.prazoLimite
            ? `Data máxima alterada de ${formatarDia(os.prazoLimite)} para ${formatarDia(input.prazoLimite)}`
            : `Data máxima definida: ${formatarDia(input.prazoLimite)}`,
          autor,
        );

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

    /**
     * Reabre uma O.S. encerrada.
     *
     * Trocar o status pelo seletor não bastava: a ordem continuava com data de
     * fim e tempo total preenchidos, e nada registrava que ela tinha voltado.
     * Aqui a reabertura desfaz o encerramento, devolve a ordem para um status
     * não-final e deixa o motivo na linha do tempo — reabertura sem motivo é a
     * que ninguém consegue explicar depois.
     */
    // Reabrir desfaz o fechamento de uma ordem: é decisão de quem responde pela
    // unidade, não de quem executa. `osConfigProcedure` não aceita funcionário.
    reabrir: osConfigProcedure
      .input(z.object({ id: z.number(), motivo: z.string().min(3).max(500) }))
      .mutation(async ({ input, ctx }) => {
        const autor = autorDaRequisicao(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [os] = await db
          .select()
          .from(ordensServico)
          .where(eq(ordensServico.id, input.id));
        if (!os) throw new Error("Ordem de serviço não encontrada");

        // Primeiro status não-final da organização: é para onde ela volta.
        const [statusAberto] = await db
          .select({ id: osStatus.id, nome: osStatus.nome })
          .from(osStatus)
          .where(
            and(
              eq(osStatus.condominioId, os.condominioId),
              eq(osStatus.ativo, true),
              or(eq(osStatus.isFinal, false), isNull(osStatus.isFinal)),
            ),
          )
          .orderBy(asc(osStatus.ordem))
          .limit(1);

        await db
          .update(ordensServico)
          .set({
            dataFim: null,
            tempoDecorridoMinutos: null,
            statusId: statusAberto?.id ?? os.statusId,
          })
          .where(eq(ordensServico.id, input.id));

        await db.insert(osTimeline).values({
          ordemServicoId: input.id,
          tipo: "status_alterado",
          descricao: `Ordem reaberta: ${input.motivo.trim()}`,
          usuarioId: autor.userId,
          usuarioNome: autor.nome,
        });

        return { success: true, statusId: statusAberto?.id ?? os.statusId };
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

        // Já responsável não entra de novo. Desde que designar a equipe põe o
        // time inteiro na ordem, marcar à mão alguém que já veio pela equipe
        // criaria a mesma pessoa duas vezes na lista.
        if (input.funcionarioId) {
          const [jaEsta] = await db
            .select({ id: osResponsaveis.id })
            .from(osResponsaveis)
            .where(
              and(
                eq(osResponsaveis.ordemServicoId, input.ordemServicoId),
                eq(osResponsaveis.funcionarioId, input.funcionarioId),
              ),
            )
            .limit(1);

          if (jaEsta) return { success: true, id: jaEsta.id };
        }

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
        
        // O token do chat fica de fora: quem tem o link de leitura poderia
        // escrever no chat da O.S. pela rota pública de mensagem.
        const { chatToken, ...publico } = os;

        /**
         * Os blocos que o cliente escondeu — a folha pública obedece igual.
         *
         * Vai junto na resposta porque aqui não há login: quem abre o QR não
         * tem conta, e não poderia consultar a rota protegida que as outras
         * telas usam. É também a página que o cliente mais mostra para fora —
         * o pior lugar para reaparecer um campo que ele mandou tirar.
         */
        const camposOcultos = await camposOcultosDaUnidade(os.condominioId);

        return {
          ...publico,
          camposOcultos,
          // Escondido não vai nem no corpo da resposta: a página é pública, e
          // mandar o dado para o navegador contando que a tela não o desenhe
          // deixaria o campo a um "ver código-fonte" de distância.
          descricao: camposOcultos.includes("descricao") ? null : publico.descricao,
          endereco: camposOcultos.includes("local") ? null : publico.endereco,
          solicitanteNome: camposOcultos.includes("solicitante")
            ? null
            : publico.solicitanteNome,
          dataAbertura: camposOcultos.includes("dataAbertura") ? null : publico.dataAbertura,
          categoria: camposOcultos.includes("classificacao") ? null : categoria,
          prioridade: camposOcultos.includes("classificacao") ? null : prioridade,
          status,
          imagens: camposOcultos.includes("fotos") ? [] : imagens,
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
          // A mensagem antiga ("tipo não suportado") não dizia o que fazer.
          // O caso real é iPhone com "Manter original", que entrega HEIC.
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Formato de foto não aceito. Use JPG ou PNG — no iPhone, em Ajustes > Câmera > Formatos, escolha \"Mais compatível\".",
          });
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

        // Buscar responsáveis
        const responsaveis = await db.select().from(osResponsaveis)
          .where(eq(osResponsaveis.ordemServicoId, input.osId));
        
        // Buscar condomínio
        const [condominio] = await db.select().from(condominios)
          .where(eq(condominios.id, os.condominioId));

        /**
         * O que este cliente escondeu da ordem — a folha segue a mesma escolha.
         *
         * Pela unidade da O.S., e não pela unidade ativa de quem imprime: o
         * gerente que cuida da rede pode estar noutra tela, e a folha é da
         * ordem.
         */
        // Preparar dados para PDF
        const pdfData = {
          camposOcultos: await camposOcultosDaUnidade(os.condominioId),
          osId: input.osId,
          protocolo: os.protocolo || "",
          // Alimenta o QR da folha, que é link de leitura pública.
          shareToken: os.shareToken ?? undefined,
          titulo: os.titulo || "",
          descricao: os.descricao || "",
          responsavelPrincipalNome: os.responsavelPrincipalNome || "",
          tempoEstimadoDias: os.tempoEstimadoDias || 0,
          tempoEstimadoHoras: os.tempoEstimadoHoras || 0,
          tempoEstimadoMinutos: os.tempoEstimadoMinutos || 0,
          latitude: os.latitude || undefined,
          longitude: os.longitude || undefined,
          localizacaoDescricao: os.localizacaoDescricao || "",
          // Sem valores: o relatório lista o que foi usado, não quanto custou.
          materiais: materiais.map(m => ({
            nome: m.nome,
            quantidade: m.quantidade || 0,
            unidade: m.unidade || undefined,
          })),
          imagens: imagens.map(img => ({ url: img.url, tipo: img.tipo || undefined, descricao: img.descricao || undefined })),
          dataCriacao: os.createdAt,
          prioridadeNome: prioridade?.nome || "",
          categoriaNome: categoria?.nome || "",
          setorNome: setor?.nome || "",
          statusNome: status?.nome || "",
          statusCor: status?.cor || undefined,
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
          .where(and(funcionarioDaUnidade(db, [input.condominioId]), funcionarioEmUso))
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
