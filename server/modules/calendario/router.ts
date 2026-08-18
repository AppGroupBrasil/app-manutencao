import { z } from "zod";
import { and, asc, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { moduloUserProcedure, router } from "../../_core/trpc";
import { isModuloHabilitado } from "../../_core/modules";
import { unidadesDaConsulta, unidadesSelecionadas } from "../../_core/unidadesConsulta";
import { getDb } from "../../db";
import {
  checklists,
  condominios,
  manutencoes,
  ordensServico,
  quadroAtividades,
  tarefasAgendadas,
  tarefasExecucoes,
  vencimentos,
  vistorias,
} from "../../../drizzle/schema";

/**
 * Calendário: um lugar só para tudo que tem data marcada.
 *
 * Não é uma tabela nova — é uma leitura das funções que já existem. Cada fonte
 * entra só se o módulo dela estiver ligado para a organização, então o
 * calendário nunca mostra o que o cliente não contratou, e um módulo desligado
 * simplesmente desaparece daqui sem código condicional na tela.
 *
 * A situação (vencido / próximo / em dia) é calculada no client, a partir da
 * data que devolvemos em `AAAA-MM-DD`. Fazer isso no servidor amarraria a cor
 * ao fuso e ao relógio do container — e quem olha o calendário está no fuso do
 * condomínio, não no do servidor.
 */

/** Teto da janela consultada: segura a expansão das tarefas recorrentes. */
const DIAS_MAXIMOS = 120;

/** Fonte de cada item: rótulo, módulo que a liga e tela de destino. */
const FONTES = {
  os: { rotulo: "Ordem de Serviço", modulo: "ordens-servico", rota: "/manutencoes/ordens-servico" },
  vencimento: { rotulo: "Vencimento", modulo: "agenda-vencimentos", rota: "/manutencoes/vencimentos" },
  manutencao: { rotulo: "Manutenção", modulo: "manutencoes", rota: "/manutencoes" },
  vistoria: { rotulo: "Vistoria", modulo: "vistorias", rota: "/manutencoes/vistorias" },
  checklist: { rotulo: "Checklist", modulo: "checklists", rota: "/manutencoes/checklists" },
  tarefa: { rotulo: "Tarefa", modulo: "tarefas-agendadas", rota: "/manutencoes/tarefas" },
  atividade: { rotulo: "Atividade", modulo: "quadro-atividades", rota: "/manutencoes/quadro" },
} as const;

export type FonteCalendario = keyof typeof FONTES;

export interface ItemCalendario {
  /** Único na lista: a mesma tarefa recorrente aparece em vários dias. */
  chave: string;
  fonte: FonteCalendario;
  rotuloFonte: string;
  id: number;
  protocolo: string | null;
  titulo: string;
  /** Dia do vencimento em `AAAA-MM-DD`, sem hora. */
  data: string;
  concluido: boolean;
  /** Local, responsável ou tipo — o que ajuda a reconhecer o item na lista. */
  detalhe: string | null;
  /** Para onde o atalho leva; já com a busca pelo protocolo quando dá. */
  rota: string;
  /** Data máxima combinada: deixa o calendário reprogramar sem abrir a O.S. */
  prazoLimite?: string | null;
  /** Falso quando o dia mostrado é o prazo, porque ninguém programou ainda. */
  programada?: boolean;
  /**
   * Unidade do registro, preenchida só quando o calendário soma a rede.
   *
   * O gerente precisa saber onde é o serviço antes de reprogramar — e a tela
   * usa este id para oferecer a equipe da unidade certa, não a da unidade
   * ativa dela.
   */
  unidadeId?: number | null;
  unidade?: string | null;
}

/** `AAAA-MM-DD` no fuso local do servidor, sem passar por UTC. */
function chaveDoDia(valor: Date | string): string {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Meio-dia: hora cheia evitaria o dia anterior em fuso negativo. */
function doDia(chave: string): Date {
  return new Date(`${chave}T12:00:00`);
}

/**
 * Leva o atalho para a tela da função já filtrada pelo protocolo.
 *
 * As telas de lista leem `?busca=` no endereço, então o registro aparece
 * sozinho no topo em vez de deixar a pessoa procurando numa lista de 200.
 */
function rotaDoItem(fonte: FonteCalendario, id: number, protocolo: string | null): string {
  const base = FONTES[fonte].rota;
  // A O.S. tem rota própria por id, que já abre a ordem na tela de edição.
  if (fonte === "os") return `${base}/${id}`;
  if (!protocolo) return base;
  return `${base}?busca=${encodeURIComponent(protocolo)}`;
}

/** Dias do intervalo, inclusive as duas pontas. */
function diasDoIntervalo(de: string, ate: string): string[] {
  const dias: string[] = [];
  const fim = doDia(ate);
  for (let d = doDia(de); d <= fim; d.setDate(d.getDate() + 1)) {
    dias.push(chaveDoDia(d));
  }
  return dias;
}

/**
 * O calendário é um módulo como os outros: cliente que só quer O.S. na tela
 * desliga em `/admin/modulos` e a rota some junto com o cartão.
 */
const calendarioProcedure = moduloUserProcedure("calendario");

export const calendarioRouter = router({
  /**
   * Tudo que cai no intervalo, de todas as funções com data.
   *
   * A janela vem do client (a grade do mês visível), e não o mês do servidor:
   * a grade mostra dias do mês anterior e do seguinte, e eles também precisam
   * de marca.
   */
  listar: calendarioProcedure
    .input(
      z.object({
        condominioId: z.number(),
        /** `AAAA-MM-DD`. */
        de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        /**
         * Traz a agenda de todas as unidades que quem consulta alcança.
         *
         * Quais unidades entram sai da identidade autenticada, nunca do input.
         */
        todasUnidades: z.boolean().optional(),
        /**
         * Só as unidades marcadas no seletor, quando não são todas.
         *
         * Cada fonte entra pelas unidades marcadas que têm aquela função
         * ligada: marcar três unidades não faz o calendário mostrar checklist
         * de quem não contratou checklist.
         */
        unidades: unidadesSelecionadas,
      }),
    )
    .query(async ({ ctx, input }): Promise<ItemCalendario[]> => {
      const db = await getDb();
      if (!db) return [];

      const inicio = doDia(input.de);
      const fim = doDia(input.ate);
      if (fim < inicio) return [];

      const dias = diasDoIntervalo(input.de, input.ate);
      if (dias.length > DIAS_MAXIMOS) {
        // Janela absurda não é caso de erro na tela: corta e devolve o começo.
        dias.length = DIAS_MAXIMOS;
      }
      const ultimoDia = dias[dias.length - 1];
      const limiteFim = new Date(`${ultimoDia}T23:59:59`);
      const limiteInicio = new Date(`${dias[0]}T00:00:00`);

      const tenant = ctx.condominioId;
      const ligado = async (fonte: FonteCalendario) =>
        ctx.tenant.isMaster() || (await isModuloHabilitado(tenant, FONTES[fonte].modulo));

      /**
       * Unidades que entram em cada fonte.
       *
       * Uma função ligada em três unidades e desligada na quarta só traz as
       * três. Sem seleção nenhuma sobra a unidade da tela — e aí quem decide é
       * o portão do módulo dela, como sempre foi.
       */
      const alvoDaFonte = async (fonte: FonteCalendario): Promise<number[]> => {
        const marcadas = await unidadesDaConsulta(ctx, input, FONTES[fonte].modulo);
        if (marcadas.length === 1 && marcadas[0] === tenant) {
          return (await ligado(fonte)) ? marcadas : [];
        }
        return marcadas;
      };

      /**
       * Nome da unidade de cada item, quando a agenda soma mais de uma.
       *
       * É o que diz onde é o serviço: com a rede somada, duas ordens iguais em
       * unidades diferentes ficariam indistinguíveis na mesma linha do dia.
       */
      const nomes = new Map<number, string>();
      const nomearUnidades = async (ids: number[]) => {
        const faltando = ids.filter((id) => !nomes.has(id));
        if (faltando.length === 0) return;
        const linhas = await db
          .select({ id: condominios.id, nome: condominios.nome })
          .from(condominios)
          .where(inArray(condominios.id, faltando))
          .orderBy(asc(condominios.nome));
        for (const u of linhas) nomes.set(u.id, u.nome);
      };

      const itens: ItemCalendario[] = [];

      const registrar = (
        fonte: FonteCalendario,
        dados: {
          id: number;
          protocolo: string | null;
          titulo: string;
          data: string;
          concluido: boolean;
          detalhe?: string | null;
          sufixoChave?: string;
          prazoLimite?: string | null;
          programada?: boolean;
          unidadeId?: number | null;
          unidade?: string | null;
        },
      ) => {
        itens.push({
          chave: `${fonte}:${dados.id}:${dados.sufixoChave ?? dados.data}`,
          fonte,
          rotuloFonte: FONTES[fonte].rotulo,
          id: dados.id,
          protocolo: dados.protocolo,
          titulo: dados.titulo,
          data: dados.data,
          concluido: dados.concluido,
          detalhe: dados.detalhe ?? null,
          rota: rotaDoItem(fonte, dados.id, dados.protocolo),
          prazoLimite: dados.prazoLimite ?? null,
          programada: dados.programada,
          unidadeId: dados.unidadeId ?? null,
          unidade: dados.unidade ?? null,
        });
      };

      // ------------------------------------------------ ordens de serviço
      // Mostra o dia programado; enquanto ninguém programou, mostra o prazo
      // máximo — é assim que a O.S. sem data marcada ainda cobra alguém.
      const unidadesDaOs = await alvoDaFonte("os");
      if (unidadesDaOs.length > 0) {
        // Nome da unidade só quando há mais de uma: é o que identifica onde é o
        // serviço na agenda do gerente.
        if (unidadesDaOs.length > 1) await nomearUnidades(unidadesDaOs);

        const linhas = await db
          .select({
            id: ordensServico.id,
            condominioId: ordensServico.condominioId,
            protocolo: ordensServico.protocolo,
            titulo: ordensServico.titulo,
            programada: ordensServico.dataProgramada,
            prazo: ordensServico.prazoLimite,
            dataFim: ordensServico.dataFim,
            responsavel: ordensServico.responsavelPrincipalNome,
            endereco: ordensServico.endereco,
          })
          .from(ordensServico)
          .where(
            and(
              inArray(ordensServico.condominioId, unidadesDaOs),
              // O mesmo critério da exibição, mas no banco: dia programado
              // dentro da janela, ou — sem programação — a data máxima. Sem
              // isto, a unidade com milhares de ordens vinha inteira para a
              // memória a cada troca de mês.
              or(
                and(
                  isNotNull(ordensServico.dataProgramada),
                  gte(ordensServico.dataProgramada, dias[0]),
                  lte(ordensServico.dataProgramada, ultimoDia),
                ),
                and(
                  isNull(ordensServico.dataProgramada),
                  isNotNull(ordensServico.prazoLimite),
                  gte(ordensServico.prazoLimite, dias[0]),
                  lte(ordensServico.prazoLimite, ultimoDia),
                ),
              ),
            ),
          );

        for (const linha of linhas) {
          const dia = linha.programada ?? linha.prazo;
          if (!dia || !dias.includes(dia)) continue;
          registrar("os", {
            id: linha.id,
            protocolo: linha.protocolo,
            titulo: linha.titulo,
            data: dia,
            concluido: !!linha.dataFim,
            detalhe: linha.responsavel || linha.endereco,
            prazoLimite: linha.prazo,
            programada: !!linha.programada,
            unidadeId: linha.condominioId,
            unidade: nomes.get(linha.condominioId) ?? null,
          });
        }
      }

      // ---------------------------------------------------- vencimentos
      const unidadesDosVencimentos = await alvoDaFonte("vencimento");
      if (unidadesDosVencimentos.length > 0) {
        if (unidadesDosVencimentos.length > 1) await nomearUnidades(unidadesDosVencimentos);

        const linhas = await db
          .select({
            id: vencimentos.id,
            condominioId: vencimentos.condominioId,
            protocolo: vencimentos.protocolo,
            titulo: vencimentos.titulo,
            data: vencimentos.dataVencimento,
            tipo: vencimentos.tipo,
            fornecedor: vencimentos.fornecedor,
            status: vencimentos.status,
            registroStatus: vencimentos.registroStatus,
          })
          .from(vencimentos)
          .where(
            and(
              inArray(vencimentos.condominioId, unidadesDosVencimentos),
              gte(vencimentos.dataVencimento, limiteInicio),
              lte(vencimentos.dataVencimento, limiteFim),
            ),
          );

        for (const linha of linhas) {
          registrar("vencimento", {
            id: linha.id,
            protocolo: linha.protocolo,
            titulo: linha.titulo,
            data: chaveDoDia(linha.data),
            // O registro de execução é o que encerra o vencimento; sem ele,
            // renovado e cancelado também saem do caminho do gestor.
            concluido:
              !!linha.registroStatus ||
              linha.status === "renovado" ||
              linha.status === "cancelado",
            detalhe: linha.fornecedor || linha.tipo,
            unidadeId: linha.condominioId,
            unidade: nomes.get(linha.condominioId) ?? null,
          });
        }
      }

      // ------------------------------- checklists, vistorias e manutenções
      // As três tabelas têm o mesmo desenho: `dataAgendada`, `dataRealizada` e
      // o mesmo enum de status. Uma volta de laço evita três blocos iguais.
      const agendadas = [
        { fonte: "checklist" as const, tabela: checklists },
        { fonte: "vistoria" as const, tabela: vistorias },
        { fonte: "manutencao" as const, tabela: manutencoes },
      ];

      for (const { fonte, tabela } of agendadas) {
        const unidadesDaFonte = await alvoDaFonte(fonte);
        if (unidadesDaFonte.length === 0) continue;
        if (unidadesDaFonte.length > 1) await nomearUnidades(unidadesDaFonte);

        const linhas = await db
          .select({
            id: tabela.id,
            condominioId: tabela.condominioId,
            protocolo: tabela.protocolo,
            titulo: tabela.titulo,
            data: tabela.dataAgendada,
            realizada: tabela.dataRealizada,
            status: tabela.status,
            localizacao: tabela.localizacao,
            responsavel: tabela.responsavelNome,
          })
          .from(tabela)
          .where(
            and(
              inArray(tabela.condominioId, unidadesDaFonte),
              isNotNull(tabela.dataAgendada),
              gte(tabela.dataAgendada, limiteInicio),
              lte(tabela.dataAgendada, limiteFim),
            ),
          );

        for (const linha of linhas) {
          if (!linha.data) continue;
          registrar(fonte, {
            id: linha.id,
            protocolo: linha.protocolo,
            titulo: linha.titulo,
            data: chaveDoDia(linha.data),
            concluido:
              !!linha.realizada ||
              linha.status === "finalizada" ||
              linha.status === "realizada",
            detalhe: linha.localizacao || linha.responsavel,
            unidadeId: linha.condominioId,
            unidade: nomes.get(linha.condominioId) ?? null,
          });
        }
      }

      // -------------------------------------------------------- tarefas
      const unidadesDasTarefas = await alvoDaFonte("tarefa");
      if (unidadesDasTarefas.length > 0) {
        if (unidadesDasTarefas.length > 1) await nomearUnidades(unidadesDasTarefas);

        const linhas = await db
          .select({
            id: tarefasAgendadas.id,
            condominioId: tarefasAgendadas.condominioId,
            protocolo: tarefasAgendadas.protocolo,
            titulo: tarefasAgendadas.titulo,
            recorrencia: tarefasAgendadas.recorrencia,
            diasSemana: tarefasAgendadas.diasSemana,
            dataEspecifica: tarefasAgendadas.dataEspecifica,
            diaMes: tarefasAgendadas.diaMes,
            funcionario: tarefasAgendadas.funcionarioNome,
            local: tarefasAgendadas.local,
          })
          .from(tarefasAgendadas)
          .where(inArray(tarefasAgendadas.condominioId, unidadesDasTarefas));

        // Uma tarefa diária cai em todos os dias da janela: sem saber o que já
        // foi executado, o calendário mostraria em aberto o que está feito.
        const idsTarefas = linhas.map((t) => t.id);
        const execucoes = idsTarefas.length
          ? await db
              .select({
                tarefaId: tarefasExecucoes.tarefaId,
                dia: tarefasExecucoes.dataExecucao,
              })
              .from(tarefasExecucoes)
              .where(
                and(
                  inArray(tarefasExecucoes.tarefaId, idsTarefas),
                  gte(tarefasExecucoes.dataExecucao, dias[0]),
                  lte(tarefasExecucoes.dataExecucao, ultimoDia),
                ),
              )
          : [];

        const feitas = new Set(execucoes.map((e) => `${e.tarefaId}:${e.dia}`));

        for (const tarefa of linhas) {
          const cair = (dia: string) => {
            registrar("tarefa", {
              id: tarefa.id,
              protocolo: tarefa.protocolo,
              titulo: tarefa.titulo,
              data: dia,
              concluido: feitas.has(`${tarefa.id}:${dia}`),
              detalhe: tarefa.funcionario || tarefa.local,
              // A recorrente repete; a chave precisa do dia para não colidir.
              sufixoChave: dia,
              unidadeId: tarefa.condominioId,
              unidade: nomes.get(tarefa.condominioId) ?? null,
            });
          };

          if (tarefa.recorrencia === "unica") {
            const dia = tarefa.dataEspecifica ? chaveDoDia(`${tarefa.dataEspecifica}T12:00:00`) : "";
            if (dia && dias.includes(dia)) cair(dia);
            continue;
          }

          for (const dia of dias) {
            const data = doDia(dia);
            if (tarefa.recorrencia === "diaria") cair(dia);
            else if (tarefa.recorrencia === "semanal") {
              if ((tarefa.diasSemana ?? []).includes(data.getDay())) cair(dia);
            } else if (tarefa.recorrencia === "mensal") {
              if (tarefa.diaMes && data.getDate() === tarefa.diaMes) cair(dia);
            }
          }
        }
      }

      // ------------------------------------------- atividades do quadro
      const unidadesDasAtividades = await alvoDaFonte("atividade");
      if (unidadesDasAtividades.length > 0) {
        if (unidadesDasAtividades.length > 1) await nomearUnidades(unidadesDasAtividades);

        const linhas = await db
          .select({
            id: quadroAtividades.id,
            condominioId: quadroAtividades.condominioId,
            protocolo: quadroAtividades.protocolo,
            titulo: quadroAtividades.titulo,
            data: quadroAtividades.dataEspecifica,
            status: quadroAtividades.status,
            responsavel: quadroAtividades.responsavelNome,
          })
          .from(quadroAtividades)
          .where(
            and(
              inArray(quadroAtividades.condominioId, unidadesDasAtividades),
              isNotNull(quadroAtividades.dataEspecifica),
              gte(quadroAtividades.dataEspecifica, dias[0]),
              lte(quadroAtividades.dataEspecifica, ultimoDia),
            ),
          );

        for (const linha of linhas) {
          if (!linha.data) continue;
          registrar("atividade", {
            id: linha.id,
            protocolo: linha.protocolo,
            titulo: linha.titulo,
            data: chaveDoDia(`${linha.data}T12:00:00`),
            concluido: linha.status === "concluido",
            detalhe: linha.responsavel,
            unidadeId: linha.condominioId,
            unidade: nomes.get(linha.condominioId) ?? null,
          });
        }
      }

      // Dia crescente e, no mesmo dia, o que está em aberto antes do resolvido.
      return itens.sort((a, b) => {
        if (a.data !== b.data) return a.data < b.data ? -1 : 1;
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        return a.titulo.localeCompare(b.titulo, "pt-BR");
      });
    }),

});
