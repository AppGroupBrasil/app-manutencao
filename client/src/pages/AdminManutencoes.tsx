import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CardQuadrado } from "@/components/CardQuadrado";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, CalendarClock, ClipboardCheck, ClipboardList, Columns3, ListChecks, Loader2, QrCode, Wrench } from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

/**
 * Hub de Manutenções: só os quadrados das funções, nada abaixo deles.
 *
 * Cada função nova entra como mais um quadrado aqui — é o lugar único de
 * entrada para o que vem do Manutenção X.
 */
export default function AdminManutencoes() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;

  const { data: ordens } = trpc.ordensServico.list.useQuery(
    { condominioId, limit: 1 },
    { enabled: !!organizacaoAtiva },
  );
  const { data: statsVencimentos } = trpc.vencimentos.stats.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
  );
  const { data: manutencoes } = trpc.manutencao.getStats.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
  );
  const { data: checklists } = trpc.checklist.list.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
  );
  const { data: tarefas } = trpc.tarefasAgendadas.listar.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
  );
  const { data: vistorias } = trpc.vistoria.list.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
  );
  const { data: atividades } = trpc.quadroAtividades.listar.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
  );
  const { data: qrcodes } = trpc.qrcode.listar.useQuery(
    { condominioId },
    { enabled: !!organizacaoAtiva },
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <CardQuadrado
            icone={<ClipboardList className="w-6 h-6 text-sky-500" />}
            titulo="Ordens de Serviço"
            valor={ordens?.total ?? "—"}
            descricao="abertura, execução e conclusão"
            onClick={() => setLocation("/manutencoes/ordens-servico")}
          />
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
          <CardQuadrado
            icone={<ClipboardCheck className="w-6 h-6 text-emerald-500" />}
            titulo="Checklists"
            valor={checklists?.length ?? "—"}
            descricao="itens, antes e depois, problemas"
            onClick={() => setLocation("/manutencoes/checklists")}
          />
          <CardQuadrado
            icone={<ListChecks className="w-6 h-6 text-violet-500" />}
            titulo="Lista de Tarefas"
            valor={tarefas?.length ?? "—"}
            descricao="atribuição, recorrência e execução"
            onClick={() => setLocation("/manutencoes/tarefas")}
          />
          <CardQuadrado
            icone={<ClipboardCheck className="w-6 h-6 text-rose-500" />}
            titulo="Vistorias"
            valor={vistorias?.length ?? "—"}
            descricao="itens, conformidade e problemas"
            onClick={() => setLocation("/manutencoes/vistorias")}
          />
          <CardQuadrado
            icone={<Columns3 className="w-6 h-6 text-indigo-500" />}
            titulo="Quadro de Atividades"
            valor={atividades?.length ?? "—"}
            descricao="a fazer, em andamento, revisão, concluído"
            onClick={() => setLocation("/manutencoes/quadro")}
          />
          <CardQuadrado
            icone={<QrCode className="w-6 h-6 text-slate-700" />}
            titulo="QR Code"
            valor={qrcodes?.length ?? "—"}
            descricao="pontos com registro por leitura"
            onClick={() => setLocation("/manutencoes/qrcode")}
          />
          <CardQuadrado
            icone={<Wrench className="w-6 h-6 text-orange-500" />}
            titulo="Registro de Manutenções"
            valor={manutencoes?.total ?? "—"}
            descricao="registros já existentes no sistema"
            onClick={() => setLocation("/manutencoes")}
          />
        </div>
      </main>
    </div>
  );
}
