import { useMemo } from "react";
import { useBootstrap } from "@/hooks/useBootstrap";
import { trpc } from "@/lib/trpc";

/**
 * Quantos registros existem em cada função de manutenção.
 *
 * O hub e o painel mostram o mesmo número, então a consulta mora aqui: com as
 * chamadas repetidas em cada tela, uma função nova precisaria ser lembrada nos
 * dois lugares — e foi assim que o cartão "Manutenções" do painel acabou
 * mostrando só o total do registro de manutenções, como se as O.S., os
 * vencimentos e os checklists não contassem.
 *
 * Módulo desligado não é consultado: o servidor recusaria a chamada.
 */
export type FuncaoManutencao =
  | "calendario"
  | "ordens-servico"
  | "agenda-vencimentos"
  | "checklists"
  | "tarefas-agendadas"
  | "vistorias"
  | "quadro-atividades"
  | "qrcode"
  | "ocorrencias"
  | "manutencoes";

export function useTotaisManutencao(condominioId: number) {
  const { temModulo, modulosIndefinidos } = useBootstrap();

  // O cartão aparece enquanto o bootstrap não responde (`temModulo` é
  // permissivo de propósito), mas a consulta espera: disparar antes devolveria
  // 403 de módulo desligado em toda visita à tela.
  const ativa = (modulo: string) =>
    condominioId > 0 && !modulosIndefinidos && temModulo(modulo);

  /** Mês corrente: é a janela que o Calendário mostra ao abrir. */
  const mes = useMemo(() => {
    const hoje = new Date();
    const dia = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    return {
      de: dia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
      ate: dia(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
    };
  }, []);

  const { data: itensCalendario } = trpc.calendario.listar.useQuery(
    { condominioId, ...mes, todasUnidades: true },
    { enabled: ativa("calendario") },
  );
  // `todasUnidades`: quem responde pela rede conta as ordens de todas elas, o
  // mesmo número que a tela de O.S. mostra. Gestor de unidade conta a dele.
  const { data: ordens } = trpc.ordensServico.list.useQuery(
    { condominioId, limit: 1, todasUnidades: true },
    { enabled: ativa("ordens-servico") },
  );
  const { data: statsVencimentos } = trpc.vencimentos.stats.useQuery(
    { condominioId },
    { enabled: ativa("agenda-vencimentos") },
  );
  const { data: manutencoes } = trpc.manutencao.getStats.useQuery(
    { condominioId },
    { enabled: ativa("manutencoes") },
  );
  const { data: checklists } = trpc.checklist.list.useQuery(
    { condominioId },
    { enabled: ativa("checklists") },
  );
  const { data: tarefas } = trpc.tarefasAgendadas.listar.useQuery(
    { condominioId },
    { enabled: ativa("tarefas-agendadas") },
  );
  const { data: vistorias } = trpc.vistoria.list.useQuery(
    { condominioId },
    { enabled: ativa("vistorias") },
  );
  const { data: atividades } = trpc.quadroAtividades.listar.useQuery(
    { condominioId },
    { enabled: ativa("quadro-atividades") },
  );
  const { data: qrcodes } = trpc.qrcode.listar.useQuery(
    { condominioId },
    { enabled: ativa("qrcode") },
  );
  const { data: ocorrencias } = trpc.ocorrencia.list.useQuery(
    { condominioId },
    { enabled: ativa("ocorrencias") },
  );

  const totais = useMemo(
    () =>
      ({
        calendario: itensCalendario?.length,
        "ordens-servico": ordens?.total,
        "agenda-vencimentos": statsVencimentos?.total,
        checklists: checklists?.length,
        "tarefas-agendadas": tarefas?.length,
        vistorias: vistorias?.length,
        "quadro-atividades": atividades?.length,
        qrcode: qrcodes?.length,
        ocorrencias: ocorrencias?.length,
        manutencoes: manutencoes?.total,
      }) satisfies Record<FuncaoManutencao, number | undefined>,
    [
      itensCalendario,
      ordens,
      statsVencimentos,
      checklists,
      tarefas,
      vistorias,
      atividades,
      qrcodes,
      ocorrencias,
      manutencoes,
    ],
  );

  /**
   * Soma dos registros, para o cartão que é a porta de entrada de todas.
   *
   * O calendário fica de fora: ele não guarda registro nenhum, só mostra os das
   * outras funções — somá-lo contaria a mesma O.S. duas vezes.
   */
  const somaRegistros = useMemo(
    () =>
      (Object.entries(totais) as [FuncaoManutencao, number | undefined][])
        .filter(([funcao]) => funcao !== "calendario")
        .reduce((soma, [, total]) => soma + (total ?? 0), 0),
    [totais],
  );

  /** A O.S. está somando mais de uma unidade? Muda o texto do cartão. */
  const osEmRede = (ordens?.unidades?.length ?? 0) > 1;

  return { totais, somaRegistros, osEmRede, statsVencimentos, manutencoes };
}

export default useTotaisManutencao;
