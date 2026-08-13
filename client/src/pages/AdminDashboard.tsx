import { useLocation } from "wouter";
import { useEffect } from "react";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useVocabulario } from "@/hooks/useVocabulario";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CardQuadrado } from "@/components/CardQuadrado";
import { PainelPendencias } from "@/components/PainelPendencias";
import { CalendarioGeral } from "@/components/CalendarioGeral";
import { NotificationBell } from "@/components/NotificationBell";
import { Loader2, LogOut, Building2, Users, UsersRound, UserCog, Wrench, Briefcase, SlidersHorizontal } from "lucide-react";
import { toast } from "@/components/ui/sonner";

/**
 * Funções que o hub de Manutenções reúne. Com todas desligadas o quadrado do
 * hub levaria a uma tela vazia, então ele some junto.
 */
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

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();
  const { temModulo, modulosIndefinidos } = useBootstrap();
  const v = useVocabulario();

  /** `users.role` é papel interno; na tela vale o nome do cargo do cliente. */
  const CARGO: Record<string, string> = {
    sindico: v.gerente,
    admin: "Administrador",
    master: "Plataforma",
    morador: "Morador",
    user: "Usuário",
  };
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: condominios } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  // Conta da plataforma: a única que abre cliente novo.
  const ehPlataforma = (user as { hierarquia?: string } | undefined)?.hierarquia === "admin_master";

  // A hierarquia já vem resolvida do servidor: `condominio.list` devolve as 15
  // unidades para o gestor-chefe e só a dele para o gestor de unidade.
  const salvo = Number(localStorage.getItem("condominio_ativo"));
  const organizacaoAtiva =
    condominios?.find((c) => c.id === salvo) ?? condominios?.[0] ?? null;
  const escopo = (condominios?.length ?? 0) > 1 ? "todas" : "unidade";

  // Não existe visão somada das unidades: o número é o da organização ativa.
  const { data: manutencoes } = trpc.manutencao.getStats.useQuery(
    { condominioId: organizacaoAtiva?.id ?? 0 },
    { enabled: !!organizacaoAtiva && !modulosIndefinidos && temModulo("manutencoes") },
  );
  const { data: funcionarios } = trpc.funcionario.list.useQuery(
    { condominioId: organizacaoAtiva?.id ?? 0 },
    { enabled: !!organizacaoAtiva && !modulosIndefinidos && temModulo("funcionarios") },
  );
  const { data: gestores } = trpc.gestores.listar.useQuery(undefined, { enabled: !!user });
  // Ligar e desligar função é do dono da organização ou do gestor-chefe. Sem
  // este cartão a tela só era alcançável digitando o endereço — o que no
  // aplicativo, sem barra de endereço, significava não existir.
  const { data: podeConfigurarModulos } = trpc.funcoesCondominio.podeConfigurar.useQuery(
    undefined,
    { enabled: !!user },
  );

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      localStorage.removeItem("app_session_token");
      await utils.auth.me.invalidate();
      setLocation("/login");
    },
  });

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
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Painel Administrativo</h1>
            <p className="text-xs text-slate-500">{user.name} · {CARGO[user.role] ?? user.role}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Os avisos que o sistema grava — O.S. aberta, equipe designada —
                caíam numa caixa que nenhuma tela mostrava. Só saía e-mail. */}
            {temModulo("notificacoes") && <NotificationBell />}
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Olá, {user.name?.split(" ")[0] || "Admin"}
          </h2>
          <p className="text-sm text-slate-500">
            {escopo === "todas"
              ? `${condominios?.length ?? 0} organizações sob sua gestão`
              : organizacaoAtiva
                ? organizacaoAtiva.nome
                : "Sem organização vinculada"}
          </p>
        </div>

        {/* Em destaque, antes de tudo: o que vence e quando. Cada dia leva à
            função de onde o item veio. */}
        {temModulo("calendario") && (
          <CalendarioGeral condominioId={organizacaoAtiva?.id ?? 0} compacto />
        )}

        {/* Atalho único para o que espera resposta, de todas as funções. */}
        {temModulo("painel-pendencias") && (
          <PainelPendencias condominioId={organizacaoAtiva?.id ?? 0} />
        )}

        {/* Quadrados, dois por linha: o mesmo desenho vale no celular. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Só a conta da plataforma abre cliente; gestor de cliente nem vê. */}
          {ehPlataforma && (
            <CardQuadrado
              icone={<Briefcase className="w-6 h-6 text-violet-500" />}
              titulo="Clientes"
              descricao="abrir cliente com gestor-chefe e unidades"
              onClick={() => setLocation("/admin/clientes")}
            />
          )}
          <CardQuadrado
            icone={<Building2 className="w-6 h-6 text-blue-500" />}
            titulo="Organizações"
            valor={condominios?.length ?? "—"}
            descricao="cadastradas · abrir, editar, excluir"
            onClick={() => setLocation("/admin/organizacoes")}
          />
          <CardQuadrado
            icone={<UserCog className="w-6 h-6 text-indigo-500" />}
            titulo="Gestores"
            valor={gestores?.length ?? "—"}
            descricao="responsáveis pelas unidades"
            onClick={() => setLocation("/admin/gestores")}
          />
          {podeConfigurarModulos && (
            <CardQuadrado
              icone={<SlidersHorizontal className="w-6 h-6 text-slate-600" />}
              titulo="Funções"
              descricao="escolher o que cada organização usa"
              onClick={() => setLocation("/admin/modulos")}
            />
          )}
          {temModulo("funcionarios") && (
            <CardQuadrado
              icone={<Users className="w-6 h-6 text-emerald-500" />}
              titulo="Funcionários"
              valor={funcionarios?.length ?? "—"}
              descricao={organizacaoAtiva ? `em ${organizacaoAtiva.nome}` : "cadastrados"}
              onClick={() => setLocation("/admin/funcionarios")}
            />
          )}
          {temModulo("equipes") && (
            <CardQuadrado
              icone={<UsersRound className="w-6 h-6 text-teal-500" />}
              titulo="Equipes"
              descricao="times que recebem a O.S. designada"
              onClick={() => setLocation("/admin/equipes")}
            />
          )}
          {MODULOS_DO_HUB.some(temModulo) && (
            <CardQuadrado
              icone={<Wrench className="w-6 h-6 text-orange-500" />}
              titulo="Manutenções"
              valor={manutencoes?.total ?? "—"}
              descricao={
                manutencoes
                  ? `${manutencoes.pendentes} pendentes · ${manutencoes.requerAcao} requerem ação`
                  : "ordens de serviço, vencimentos e mais"
              }
              onClick={() => setLocation("/admin/manutencoes")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
