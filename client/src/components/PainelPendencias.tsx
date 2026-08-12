import { useMemo } from "react";
import { useLocation } from "wouter";
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
 */
export function PainelPendencias({ condominioId }: { condominioId: number }) {
  const [, setLocation] = useLocation();
  const habilitado = condominioId > 0;

  const { data: ordens, isLoading: carregandoOS } = trpc.ordensServico.list.useQuery(
    { condominioId, limit: 500 },
    { enabled: habilitado },
  );
  const { data: statusOS } = trpc.ordensServico.getStatus.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: vencimentos, isLoading: carregandoVenc } = trpc.vencimentos.stats.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: manutencoes, isLoading: carregandoManut } = trpc.manutencao.getStats.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: reportesChecklist } = trpc.checklist.listarReportes.useQuery(
    { condominioId, status: "todos" },
    { enabled: habilitado },
  );
  const { data: reportesVistoria } = trpc.vistoria.listarReportes.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: respostasQr } = trpc.qrcode.listarRespostas.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: tarefas } = trpc.tarefasAgendadas.listar.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: execucoes } = trpc.tarefasAgendadas.listarExecucoesDaOrganizacao.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  // Cada etapa do fluxo espera uma pessoa: o gerente só é cobrado do que é dele.
  const { data: podeGerenciar } = trpc.gestores.podeGerenciar.useQuery();
  const ehGerente = !!podeGerenciar;

  const linhas = useMemo(() => {
    // Status marcado como `isFinal` encerra a O.S.; o resto continua na mesa
    // do gestor.
    const idsFinais = new Set((statusOS ?? []).filter((s) => s.isFinal).map((s) => s.id));
    const osAbertas = (ordens?.items ?? []).filter(
      (os) => !os.statusId || !idsFinais.has(os.statusId),
    ).length;

    // Fluxo com confirmação de baixa: cada etapa espera uma pessoa diferente, e
    // é isso que a faixa precisa dizer — quem está devendo o próximo passo.
    const naEtapa = (etapa: string) =>
      (ordens?.items ?? []).filter((os) => os.etapa === etapa).length;
    const aguardandoProgramacao = naEtapa("solicitada");
    const baixaAConfirmar = naEtapa("baixa_pedida");
    const aFinalizar = naEtapa("baixa_confirmada");

    const vencidos = vencimentos?.vencidos ?? 0;
    const proximos = vencimentos?.proximos ?? 0;

    return [
      // Programar e finalizar são passos do gerente: mostrar essas linhas ao
      // gestor da unidade seria cobrar dele algo que o sistema não deixa fazer.
      {
        chave: "os-programar",
        rotulo: "Serviços a programar",
        total: ehGerente ? aguardandoProgramacao : 0,
        detalhe: "o gestor pediu; falta marcar a data e a equipe",
        destino: "/manutencoes/calendario",
      },
      {
        chave: "os-confirmar",
        rotulo: "Baixas a confirmar",
        total: baixaAConfirmar,
        detalhe: "a equipe deu baixa e espera a conferência do gestor",
        destino: "/manutencoes/ordens-servico",
      },
      {
        chave: "os-finalizar",
        rotulo: "Ordens a finalizar",
        total: ehGerente ? aFinalizar : 0,
        detalhe: "baixa confirmada, aguardando o gerente encerrar",
        destino: "/manutencoes/ordens-servico",
      },
      {
        chave: "os",
        rotulo: "Ordens de Serviço",
        total: osAbertas,
        detalhe: "em aberto, aguardando andamento",
        destino: "/manutencoes/ordens-servico",
      },
      {
        chave: "vencimentos",
        rotulo: "Agenda de Vencimentos",
        total: vencidos + proximos,
        detalhe: `${vencidos} vencidos · ${proximos} vencem em até 30 dias`,
        destino: "/manutencoes/vencimentos",
      },
      {
        chave: "manutencoes",
        rotulo: "Registro de Manutenções",
        total: (manutencoes?.requerAcao ?? 0) + (manutencoes?.pendentes ?? 0),
        detalhe: `${manutencoes?.requerAcao ?? 0} requerem ação · ${manutencoes?.pendentes ?? 0} pendentes`,
        destino: "/manutencoes",
      },
      {
        chave: "checklists",
        rotulo: "Checklists",
        total: (reportesChecklist ?? []).filter((r) => r.status !== "resolvido").length,
        detalhe: "problemas reportados sem solução",
        destino: "/manutencoes/checklists",
      },
      {
        chave: "vistorias",
        rotulo: "Vistorias",
        total: (reportesVistoria ?? []).filter((r) => r.status !== "resolvido").length,
        detalhe: "problemas reportados sem solução",
        destino: "/manutencoes/vistorias",
      },
      {
        chave: "qrcode",
        rotulo: "QR Code",
        total: (respostasQr ?? []).filter((r) => r.status !== "resolvida").length,
        detalhe: "registros recebidos sem tratativa",
        destino: "/manutencoes/qrcode",
      },
      {
        chave: "tarefas",
        rotulo: "Lista de Tarefas",
        // Tarefa sem nenhuma execução registrada ainda espera alguém.
        total: (tarefas ?? []).filter(
          (t) => !(execucoes ?? []).some((e) => e.tarefaId === t.id),
        ).length,
        detalhe: "sem execução registrada",
        destino: "/manutencoes/tarefas",
      },
    ].filter((linha) => linha.total > 0);
  }, [
    ordens,
    statusOS,
    vencimentos,
    manutencoes,
    reportesChecklist,
    reportesVistoria,
    respostasQr,
    tarefas,
    execucoes,
    ehGerente,
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
              Itens de todas as funções que aguardam resposta ou verificação.
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
