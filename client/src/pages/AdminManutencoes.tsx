import { useEffect } from "react";
import { useLocation } from "wouter";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useVocabulario } from "@/hooks/useVocabulario";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CardQuadrado } from "@/components/CardQuadrado";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, Columns3, ListChecks, Loader2, QrCode, Wrench } from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

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

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;

  // O cartão aparece enquanto o bootstrap não responde (`temModulo` é
  // permissivo de propósito), mas a consulta espera: disparar antes devolveria
  // 403 de módulo desligado em toda visita à tela.
  const ativa = (modulo: string) =>
    !!organizacaoAtiva && !modulosIndefinidos && temModulo(modulo);

  const { data: ordens } = trpc.ordensServico.list.useQuery(
    { condominioId, limit: 1 },
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

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

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
          <div>
            <h1 className="text-lg font-bold">Manutenções</h1>
            <p className="text-xs text-slate-500">
              {organizacaoAtiva ? organizacaoAtiva.nome : "Sem organização vinculada"}
            </p>
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
              descricao="tudo com data, de todas as funções"
              onClick={() => setLocation("/manutencoes/calendario")}
            />
          )}
          {temModulo("ordens-servico") && (
            <CardQuadrado
              icone={<ClipboardList className="w-6 h-6 text-sky-500" />}
              titulo={v.ordensServico}
              valor={ordens?.total ?? "—"}
              descricao="abertura, execução e conclusão"
              onClick={() => setLocation("/manutencoes/ordens-servico")}
            />
          )}
          {temModulo("agenda-vencimentos") && (
            <CardQuadrado
              icone={<CalendarClock className="w-6 h-6 text-amber-500" />}
              titulo="Agenda de Vencimentos"
              valor={statsVencimentos?.total ?? "—"}
              descricao={
                statsVencimentos
                  ? `${statsVencimentos.vencidos} vencidos · ${statsVencimentos.proximos} próximos`
                  : "contratos, serviços e manutenções"
              }
              onClick={() => setLocation("/manutencoes/vencimentos")}
            />
          )}
          {temModulo("checklists") && (
            <CardQuadrado
              icone={<ClipboardCheck className="w-6 h-6 text-emerald-500" />}
              titulo={v.checklists}
              valor={checklists?.length ?? "—"}
              descricao="itens, antes e depois, problemas"
              onClick={() => setLocation("/manutencoes/checklists")}
            />
          )}
          {temModulo("tarefas-agendadas") && (
            <CardQuadrado
              icone={<ListChecks className="w-6 h-6 text-violet-500" />}
              titulo={v.tarefas}
              valor={tarefas?.length ?? "—"}
              descricao="atribuição, recorrência e execução"
              onClick={() => setLocation("/manutencoes/tarefas")}
            />
          )}
          {temModulo("vistorias") && (
            <CardQuadrado
              icone={<ClipboardCheck className="w-6 h-6 text-rose-500" />}
              titulo={v.vistorias}
              valor={vistorias?.length ?? "—"}
              descricao="itens, conformidade e problemas"
              onClick={() => setLocation("/manutencoes/vistorias")}
            />
          )}
          {temModulo("quadro-atividades") && (
            <CardQuadrado
              icone={<Columns3 className="w-6 h-6 text-indigo-500" />}
              titulo={v.atividades}
              valor={atividades?.length ?? "—"}
              descricao="a fazer, em andamento, revisão, concluído"
              onClick={() => setLocation("/manutencoes/quadro")}
            />
          )}
          {temModulo("qrcode") && (
            <CardQuadrado
              icone={<QrCode className="w-6 h-6 text-slate-700" />}
              titulo="QR Code"
              valor={qrcodes?.length ?? "—"}
              descricao="pontos com registro por leitura"
              onClick={() => setLocation("/manutencoes/qrcode")}
            />
          )}
          {temModulo("manutencoes") && (
            <CardQuadrado
              icone={<Wrench className="w-6 h-6 text-orange-500" />}
              titulo={`Registro de ${v.manutencoes}`}
              valor={manutencoes?.total ?? "—"}
              descricao="registros já existentes no sistema"
              onClick={() => setLocation("/manutencoes")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
