import { useEffect } from "react";
import { useLocation } from "wouter";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useVocabulario } from "@/hooks/useVocabulario";
import { useNovidades } from "@/hooks/useNovidades";
import { useTotaisManutencao } from "@/hooks/useTotaisManutencao";
import { useUnidadesSelecionadas } from "@/hooks/useUnidadesSelecionadas";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CardQuadrado } from "@/components/CardQuadrado";
import { SeletorUnidades } from "@/components/SeletorUnidades";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle, ArrowLeft, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, Columns3, ListChecks, Loader2, QrCode, Wrench } from "lucide-react";

/** As funções que este hub reúne — a mesma lista do cartão no painel. */
const MODULOS_DO_HUB = [
  "calendario",
  "ordens-servico",
  "agenda-vencimentos",
  "checklists",
  "tarefas-agendadas",
  "vistorias",
  "quadro-atividades",
  "qrcode",
  "manutencoes",
  "ocorrencias",
];

/**
 * Hub de Manutenções: só os quadrados das funções, nada abaixo deles.
 *
 * Cada função nova entra como mais um quadrado aqui — é o lugar único de
 * entrada para o que vem do Manutenção X.
 *
 * Quadrado e consulta andam juntos: módulo desligado não aparece e também não
 * é consultado, senão a tela dispararia chamadas que o servidor recusa.
 */
export default function AdminManutencoes() {
  const [, setLocation] = useLocation();
  // Os nomes das funções vêm do vocabulário do cliente, não escritos aqui.
  const v = useVocabulario();
  const { temModulo, modulosIndefinidos } = useBootstrap();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  // As unidades marcadas no painel valem aqui: os quadrados contam o mesmo
  // conjunto que o painel somou, senão o mesmo número muda de tela para tela.
  const selecao = useUnidadesSelecionadas();
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === selecao.principal) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;

  const { totais, statsVencimentos } = useTotaisManutencao(condominioId, selecao.marcadas);
  const somandoUnidades = selecao.marcadas.length > 1;

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  const { temNovidade, marcarVisto, sincronizarQuedas } = useNovidades(
    condominioId,
    selecao.marcadas,
  );

  useEffect(() => {
    sincronizarQuedas(totais);
  }, [totais, sincronizarQuedas]);

  /** Abrir a função conta como "eu vi": o amarelo apaga a partir daqui. */
  const abrir = (modulo: keyof typeof totais, rota: string) => {
    marcarVisto(modulo, totais[modulo]);
    setLocation(rota);
  };

  const valorDe = (modulo: keyof typeof totais) => totais[modulo] ?? "—";

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">Manutenções</h1>
            {/* Com mais de uma unidade, o seletor no lugar do nome: é daqui que
                se muda o que os quadrados estão contando. */}
            {selecao.temEscolha ? (
              <SeletorUnidades selecao={selecao} className="mt-0.5 max-w-[240px]" />
            ) : (
              <p className="text-xs text-slate-500">
                {organizacaoAtiva ? organizacaoAtiva.nome : "Sem organização vinculada"}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Todas as funções desligadas: sem isto a tela fica em branco e
            parece defeito. O caminho é a tela de módulos. */}
        {!modulosIndefinidos && !MODULOS_DO_HUB.some(temModulo) && (
          <p className="text-sm text-slate-600 text-center py-12">
            Nenhuma função de manutenção está ligada para esta organização.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Primeiro quadrado: é a visão que responde "o que vence quando". */}
          {temModulo("calendario") && (
            <CardQuadrado
              icone={<CalendarDays className="w-6 h-6 text-blue-600" />}
              titulo="Calendário"
              valor={valorDe("calendario")}
              descricao="com data neste mês, de todas as funções"
              novidade={temNovidade("calendario", totais.calendario)}
              onClick={() => abrir("calendario", "/manutencoes/calendario")}
            />
          )}
          {temModulo("ordens-servico") && (
            <CardQuadrado
              icone={<ClipboardList className="w-6 h-6 text-sky-500" />}
              titulo={v.ordensServico}
              valor={valorDe("ordens-servico")}
              descricao={
                somandoUnidades
                  ? `abertura e execução · ${selecao.marcadas.length} unidades`
                  : "abertura, execução e conclusão"
              }
              novidade={temNovidade("ordens-servico", totais["ordens-servico"])}
              onClick={() => abrir("ordens-servico", "/manutencoes/ordens-servico")}
            />
          )}
          {temModulo("agenda-vencimentos") && (
            <CardQuadrado
              icone={<CalendarClock className="w-6 h-6 text-amber-500" />}
              titulo="Agenda de Vencimentos"
              valor={valorDe("agenda-vencimentos")}
              descricao={
                statsVencimentos
                  ? `${statsVencimentos.vencidos} vencidos · ${statsVencimentos.proximos} próximos`
                  : "contratos, serviços e manutenções"
              }
              novidade={temNovidade("agenda-vencimentos", totais["agenda-vencimentos"])}
              onClick={() => abrir("agenda-vencimentos", "/manutencoes/vencimentos")}
            />
          )}
          {temModulo("checklists") && (
            <CardQuadrado
              icone={<ClipboardCheck className="w-6 h-6 text-emerald-500" />}
              titulo={v.checklists}
              valor={valorDe("checklists")}
              descricao="itens, antes e depois, problemas"
              novidade={temNovidade("checklists", totais.checklists)}
              onClick={() => abrir("checklists", "/manutencoes/checklists")}
            />
          )}
          {temModulo("tarefas-agendadas") && (
            <CardQuadrado
              icone={<ListChecks className="w-6 h-6 text-violet-500" />}
              titulo={v.tarefas}
              valor={valorDe("tarefas-agendadas")}
              descricao="atribuição, recorrência e execução"
              novidade={temNovidade("tarefas-agendadas", totais["tarefas-agendadas"])}
              onClick={() => abrir("tarefas-agendadas", "/manutencoes/tarefas")}
            />
          )}
          {temModulo("vistorias") && (
            <CardQuadrado
              icone={<ClipboardCheck className="w-6 h-6 text-rose-500" />}
              titulo={v.vistorias}
              valor={valorDe("vistorias")}
              descricao="itens, conformidade e problemas"
              novidade={temNovidade("vistorias", totais.vistorias)}
              onClick={() => abrir("vistorias", "/manutencoes/vistorias")}
            />
          )}
          {temModulo("quadro-atividades") && (
            <CardQuadrado
              icone={<Columns3 className="w-6 h-6 text-indigo-500" />}
              titulo={v.atividades}
              valor={valorDe("quadro-atividades")}
              descricao="a fazer, em andamento, revisão, concluído"
              novidade={temNovidade("quadro-atividades", totais["quadro-atividades"])}
              onClick={() => abrir("quadro-atividades", "/manutencoes/quadro")}
            />
          )}
          {temModulo("qrcode") && (
            <CardQuadrado
              icone={<QrCode className="w-6 h-6 text-slate-700" />}
              titulo="QR Code"
              valor={valorDe("qrcode")}
              descricao="pontos com registro por leitura"
              novidade={temNovidade("qrcode", totais.qrcode)}
              onClick={() => abrir("qrcode", "/manutencoes/qrcode")}
            />
          )}
          {temModulo("ocorrencias") && (
            <CardQuadrado
              icone={<AlertTriangle className="w-6 h-6 text-red-500" />}
              titulo="Ocorrências"
              valor={valorDe("ocorrencias")}
              descricao="incidentes com foto e prioridade"
              novidade={temNovidade("ocorrencias", totais.ocorrencias)}
              onClick={() => abrir("ocorrencias", "/ocorrencias")}
            />
          )}
          {temModulo("manutencoes") && (
            <CardQuadrado
              icone={<Wrench className="w-6 h-6 text-orange-500" />}
              titulo={`Registro de ${v.manutencoes}`}
              valor={valorDe("manutencoes")}
              descricao="registros já existentes no sistema"
              novidade={temNovidade("manutencoes", totais.manutencoes)}
              onClick={() => abrir("manutencoes", "/manutencoes")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
