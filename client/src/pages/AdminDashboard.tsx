import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useVocabulario } from "@/hooks/useVocabulario";
import { useNovidades } from "@/hooks/useNovidades";
import { useTotaisManutencao } from "@/hooks/useTotaisManutencao";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CardQuadrado } from "@/components/CardQuadrado";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PainelPendencias } from "@/components/PainelPendencias";
import { CalendarioGeral } from "@/components/CalendarioGeral";
import { NotificationBell } from "@/components/NotificationBell";
import { Loader2, LogOut, Building2, Users, UsersRound, UserCog, Wrench, Briefcase, SlidersHorizontal } from "lucide-react";
import { toast } from "@/components/ui/sonner";

/** Dias inteiros que faltam para o fim do teste. Zero quando venceu. */
function diasDeTeste(trialAte?: Date | string | null): number | null {
  if (!trialAte) return null;
  const fim = new Date(trialAte);
  if (Number.isNaN(fim.getTime())) return null;
  return Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 86_400_000));
}

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
  /**
   * Unidade ativa: fica no navegador e viaja em `x-condominio-id`.
   *
   * Em estado, e não lido direto do `localStorage` a cada render, porque a
   * troca precisa redesenhar a tela. Ela ficou invisível quando o seletor saiu
   * do painel: quem tinha escolhido uma unidade continuava vendo o calendário e
   * os números dela, sem nada dizendo qual era — e recarregar não mudava, já
   * que atualizar a página não apaga o que está guardado no navegador.
   */
  const [unidadeAtiva, setUnidadeAtiva] = useState<number>(
    () => Number(localStorage.getItem("condominio_ativo")) || 0,
  );
  const organizacaoAtiva =
    condominios?.find((c) => c.id === unidadeAtiva) ?? condominios?.[0] ?? null;
  const escopo = (condominios?.length ?? 0) > 1 ? "todas" : "unidade";

  // Guardado apontando para unidade que não existe mais (ou de outra conta):
  // acerta para a que a tela está mostrando, senão o cabeçalho das chamadas
  // continua pedindo a antiga.
  useEffect(() => {
    if (organizacaoAtiva && organizacaoAtiva.id !== unidadeAtiva) {
      localStorage.setItem("condominio_ativo", String(organizacaoAtiva.id));
      setUnidadeAtiva(organizacaoAtiva.id);
    }
  }, [organizacaoAtiva, unidadeAtiva]);

  const trocarUnidade = async (id: number) => {
    localStorage.setItem("condominio_ativo", String(id));
    setUnidadeAtiva(id);
    // Tudo em cache é da unidade anterior — o tenant vai no cabeçalho.
    await utils.invalidate();
  };

  /**
   * Números do hub de Manutenções, para o cartão que leva até ele.
   *
   * O mesmo hook do hub: o cartão mostrava só o total do registro de
   * manutenções, como se O.S., vencimentos e checklists não contassem, e o
   * gerente comparava dois números diferentes para a mesma coisa.
   */
  const { totais, somaRegistros } = useTotaisManutencao(organizacaoAtiva?.id ?? 0);
  const { temNovidade } = useNovidades(organizacaoAtiva?.id ?? 0);
  /** Alguma função com registro que ninguém abriu ainda: o cartão pisca. */
  const novidadeNoHub = (Object.keys(totais) as (keyof typeof totais)[]).some((funcao) =>
    temNovidade(funcao, totais[funcao]),
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
      // A unidade escolhida sai com a sessão: sem isto ela continua valendo
      // para quem entrar depois neste navegador.
      localStorage.removeItem("condominio_ativo");
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
              ? `${condominios?.length ?? 0} ${v.unidade.toLowerCase()}s sob sua gestão`
              : organizacaoAtiva
                ? organizacaoAtiva.nome
                : "Sem organização vinculada"}
          </p>

          {/* Quem cuida de mais de uma precisa ver qual está aberta e trocar
              daqui: calendário, pendências e contadores seguem esta escolha, e
              sem o seletor ela virava um nome inexplicável na tela. */}
          {escopo === "todas" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Vendo {v.unidade.toLowerCase()}:
              </span>
              <Select
                value={organizacaoAtiva ? String(organizacaoAtiva.id) : undefined}
                onValueChange={(valor) => trocarUnidade(Number(valor))}
              >
                <SelectTrigger className="h-8 w-[240px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(condominios ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Teste grátis: quem se cadastrou sozinho precisa saber quanto falta
            antes de descobrir no bloqueio. Cliente aberto pela plataforma não
            tem prazo e não vê faixa nenhuma. */}
        {(() => {
          const dias = diasDeTeste((user as { trialAte?: string | null }).trialAte);
          if (dias === null) return null;

          return dias > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <strong>Teste grátis:</strong> {dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}.
              Depois disso o sistema continua abrindo, mas para de aceitar novos registros.
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <strong>Seu teste terminou.</strong> Seus dados continuam aqui e podem ser
              consultados; para voltar a registrar, fale com a gente pelo botão do WhatsApp.
            </div>
          );
        })()}

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
              titulo="Configurações"
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
              // Soma de todas as funções do hub — é o que o cartão promete ao
              // dizer "ordens de serviço, vencimentos e mais".
              valor={somaRegistros}
              descricao="registros em ordens de serviço, vencimentos e demais funções"
              novidade={novidadeNoHub}
              onClick={() => setLocation("/admin/manutencoes")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
