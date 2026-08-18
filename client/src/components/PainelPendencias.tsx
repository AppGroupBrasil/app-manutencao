import { useMemo } from "react";
import { useLocation } from "wouter";
import { useBootstrap } from "@/hooks/useBootstrap";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";

/**
 * Chamados em aberto: tudo que espera resposta do gestor, de todas as funções,
 * numa tela só.
 *
 * A contagem é feita aqui no cliente a partir das mesmas consultas que cada
 * função já usa — assim uma função nova entra somando uma linha nesta lista,
 * sem endpoint novo. Cada linha leva direto para a tela da função.
 *
 * Função desligada para a organização não é consultada nem contada: o servidor
 * recusaria a chamada, e cobrar do gestor algo que ele não tem seria pior.
 */
export function PainelPendencias({
  condominioId,
  unidades,
}: {
  condominioId: number;
  /**
   * Unidades marcadas no seletor. Todas as linhas somam exatamente estas.
   *
   * Sem a lista, cada linha conta só a unidade da tela — é o caso do portal do
   * funcionário, que não tem seletor nenhum.
   */
  unidades?: number[];
}) {
  const [, setLocation] = useLocation();
  const { temModulo, modulosIndefinidos } = useBootstrap();
  const habilitado = condominioId > 0;
  // Espera o bootstrap: com meia dúzia de funções desligadas, disparar antes
  // encheria a tela de chamadas recusadas a cada abertura do painel.
  const ativa = (modulo: string) =>
    habilitado && !modulosIndefinidos && temModulo(modulo);

  /**
   * Quais unidades cada consulta soma.
   *
   * O gerente da rede cobrava a O.S. aberta em outra unidade e via aqui um
   * número só da unidade da tela — parecia que não havia nada esperando. Agora
   * o número é o das unidades que ele marcou. O servidor confere a marcação
   * contra o alcance dele; a conta da plataforma segue por organização.
   */
  const escopo = { condominioId, unidades };

  const { data: ordens, isLoading: carregandoOS } = trpc.ordensServico.list.useQuery(
    { ...escopo, limit: 500, todasUnidades: !unidades },
    { enabled: ativa("ordens-servico") },
  );
  const { data: vencimentos, isLoading: carregandoVenc } = trpc.vencimentos.stats.useQuery(
    escopo,
    { enabled: ativa("agenda-vencimentos") },
  );
  const { data: manutencoes, isLoading: carregandoManut } = trpc.manutencao.getStats.useQuery(
    escopo,
    { enabled: ativa("manutencoes") },
  );
  const { data: reportesChecklist } = trpc.checklist.listarReportes.useQuery(
    { ...escopo, status: "todos" },
    { enabled: ativa("checklists") },
  );
  const { data: reportesVistoria } = trpc.vistoria.listarReportes.useQuery(
    escopo,
    { enabled: ativa("vistorias") },
  );
  const { data: respostasQr } = trpc.qrcode.listarRespostas.useQuery(
    escopo,
    { enabled: ativa("qrcode") },
  );
  const { data: tarefas } = trpc.tarefasAgendadas.listar.useQuery(
    escopo,
    { enabled: ativa("tarefas-agendadas") },
  );
  const { data: execucoes } = trpc.tarefasAgendadas.listarExecucoesDaOrganizacao.useQuery(
    escopo,
    { enabled: ativa("tarefas-agendadas") },
  );
  const linhas = useMemo(() => {
    // Status marcado como `isFinal` encerra a O.S.; o resto continua na mesa
    // do gestor. Os status vêm da consulta, e não da unidade da tela: cada
    // unidade tem os seus, e o "concluída" de uma não fecha a ordem da outra.
    const idsFinais = new Set(
      (ordens?.statusPorUnidade ?? []).filter((s) => s.isFinal).map((s) => s.id),
    );
    const osAbertas = (ordens?.items ?? []).filter(
      (os) => !os.statusId || !idsFinais.has(os.statusId),
    ).length;

    const vencidos = vencimentos?.vencidos ?? 0;
    const proximos = vencimentos?.proximos ?? 0;

    return [
      {
        chave: "os",
        modulo: "ordens-servico",
        rotulo: "Ordens de Serviço",
        total: osAbertas,
        detalhe: "em aberto, aguardando andamento",
        destino: "/manutencoes/ordens-servico",
      },
      {
        chave: "vencimentos",
        modulo: "agenda-vencimentos",
        rotulo: "Agenda de Vencimentos",
        total: vencidos + proximos,
        detalhe: `${vencidos} vencidos · ${proximos} vencem em até 30 dias`,
        destino: "/manutencoes/vencimentos",
      },
      {
        chave: "manutencoes",
        modulo: "manutencoes",
        rotulo: "Registro de Manutenções",
        total: (manutencoes?.requerAcao ?? 0) + (manutencoes?.pendentes ?? 0),
        detalhe: `${manutencoes?.requerAcao ?? 0} requerem ação · ${manutencoes?.pendentes ?? 0} pendentes`,
        destino: "/manutencoes",
      },
      {
        chave: "checklists",
        modulo: "checklists",
        rotulo: "Checklists",
        total: (reportesChecklist ?? []).filter((r) => r.status !== "resolvido").length,
        detalhe: "problemas reportados sem solução",
        destino: "/manutencoes/checklists",
      },
      {
        chave: "vistorias",
        modulo: "vistorias",
        rotulo: "Vistorias",
        total: (reportesVistoria ?? []).filter((r) => r.status !== "resolvido").length,
        detalhe: "problemas reportados sem solução",
        destino: "/manutencoes/vistorias",
      },
      {
        chave: "qrcode",
        modulo: "qrcode",
        rotulo: "QR Code",
        total: (respostasQr ?? []).filter((r) => r.status !== "resolvida").length,
        detalhe: "registros recebidos sem tratativa",
        destino: "/manutencoes/qrcode",
      },
      {
        chave: "tarefas",
        modulo: "tarefas-agendadas",
        rotulo: "Lista de Tarefas",
        // Tarefa sem nenhuma execução registrada ainda espera alguém.
        total: (tarefas ?? []).filter(
          (t) => !(execucoes ?? []).some((e) => e.tarefaId === t.id),
        ).length,
        detalhe: "sem execução registrada",
        destino: "/manutencoes/tarefas",
      },
    ].filter((linha) => linha.total > 0 && temModulo(linha.modulo));
  }, [
    temModulo,
    ordens,
    vencimentos,
    manutencoes,
    reportesChecklist,
    reportesVistoria,
    respostasQr,
    tarefas,
    execucoes,
  ]);

  const carregando = carregandoOS || carregandoVenc || carregandoManut;
  const total = linhas.reduce((soma, linha) => soma + linha.total, 0);

  if (!habilitado) return null;

  if (carregando) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Verificando chamados em aberto…
        </CardContent>
      </Card>
    );
  }

  if (linhas.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-emerald-800">Nada esperando resposta</p>
          <p className="text-xs text-emerald-700">
            Nenhuma função tem item pendente de verificação neste momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Chamados em aberto ({total})
            </p>
            <p className="text-xs text-amber-800">
              Itens de todas as funções que aguardam resposta ou verificação
              {/* Com mais de uma unidade marcada os números são a soma delas:
                  sem esta linha, o total parece ser só da unidade da tela. */}
              {(unidades?.length ?? 0) > 1 ? `, somando ${unidades!.length} unidades` : ""}.
            </p>

            <div className="mt-3 space-y-1.5">
              {linhas.map((linha) => (
                <button
                  key={linha.chave}
                  onClick={() => setLocation(linha.destino)}
                  className="w-full flex items-center gap-3 bg-white rounded-lg border border-amber-200 px-3 py-2 text-left hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <span className="text-lg font-bold text-amber-700 w-8 shrink-0">
                    {linha.total}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">
                      {linha.rotulo}
                    </span>
                    <span className="block text-xs text-slate-500 truncate">{linha.detalhe}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PainelPendencias;
