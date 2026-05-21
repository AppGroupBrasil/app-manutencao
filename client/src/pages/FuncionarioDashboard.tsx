import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { CoreModulesPanel } from "@/components/funcionario/CoreModulesPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { 
  Building2, 
  LogOut, 
  ClipboardCheck, 
  Wrench, 
  AlertTriangle, 
  Search,
  Loader2,
  User,
  Smartphone,
  ArrowLeft,
  ChevronRight
} from "lucide-react";

// Mapeamento de funções para ícones e rotas
const FUNCOES_CONFIG: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  description: string;
  route: string;
  color: string;
}> = {
  checklists: {
    icon: ClipboardCheck,
    label: "Checklists",
    description: "Verificações e tarefas diárias",
    route: "/dashboard/checklists",
    color: "from-emerald-500 to-green-600",
  },
  manutencoes: {
    icon: Wrench,
    label: "Manutenções",
    description: "Registrar e acompanhar manutenções",
    route: "/dashboard/manutencoes",
    color: "from-blue-500 to-indigo-600",
  },
  ocorrencias: {
    icon: AlertTriangle,
    label: "Ocorrências",
    description: "Reportar problemas e incidentes",
    route: "/dashboard/ocorrencias",
    color: "from-orange-500 to-red-600",
  },
  vistorias: {
    icon: Search,
    label: "Vistorias",
    description: "Inspeções e verificações",
    route: "/dashboard/vistorias",
    color: "from-purple-500 to-violet-600",
  },
};

// Tipos de funcionário com labels amigáveis
const TIPOS_FUNCIONARIO: Record<string, string> = {
  auxiliar: "Auxiliar",
  porteiro: "Funcionário",
  zelador: "Funcionário",
  supervisor: "Supervisor de Rota",
  gerente: "Gerente",
  sindico_externo: "Supervisor Externo",
};

// Hierarquias que desbloqueiam TODAS as funções automaticamente
const HIERARQUIAS_ADMIN = new Set(["admin_master", "gestor"]);

const LABEL_HIERARQUIA: Record<string, string> = {
  admin_master: "Administrador Master",
  gestor: "Gestor",
};

function getTipoLabel(funcionario: {
  hierarquia?: string | null;
  tipoFuncionario?: string | null;
  cargo?: string | null;
}) {
  if (funcionario.hierarquia && LABEL_HIERARQUIA[funcionario.hierarquia]) {
    return LABEL_HIERARQUIA[funcionario.hierarquia];
  }

  if (funcionario.tipoFuncionario) {
    return TIPOS_FUNCIONARIO[funcionario.tipoFuncionario] || funcionario.tipoFuncionario;
  }

  return funcionario.cargo || "Funcionário";
}

function getIntroText(viewMode: "condominios" | "apps" | "funcoes", activeDescription?: string) {
  if (activeDescription) return activeDescription;
  if (viewMode === "condominios") return "Selecione a organização que deseja acessar";
  if (viewMode === "apps") return "Selecione o app que deseja utilizar";
  return "Selecione uma das funções abaixo para começar";
}

export default function FuncionarioDashboard() {
  const [, setLocation] = useLocation();
  const [isSectionRoute, routeParams] = useRoute<{ section: string }>("/dashboard/:section");
  const [funcoesHabilitadas, setFuncoesHabilitadas] = useState<string[]>([]);
  const [selectedCondominio, setSelectedCondominio] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"condominios" | "apps" | "funcoes">("condominios");

  // Verificar sessão do funcionário
  const { data: funcionario, isLoading } = trpc.funcionario.me.useQuery(undefined, {
    retry: false,
  });

  const logoutMutation = trpc.funcionario.logout.useMutation({
    onSuccess: () => {
      toast.success("Sessão encerrada. Até logo!");
      setLocation("/login");
    },
  });

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!isLoading && !funcionario) {
      setLocation("/login");
    }
  }, [isLoading, funcionario, setLocation]);

  // Determinar modo de visualização inicial
  useEffect(() => {
    if (funcionario) {
      const temMultiplosCondominios = (funcionario.condominiosVinculados?.length || 0) > 1;
      const temApps = (funcionario.appsVinculados?.length || 0) > 0;
      
      if (temMultiplosCondominios) {
        setViewMode("condominios");
      } else if (temApps) {
        setViewMode("apps");
        if (funcionario.condominiosVinculados?.length === 1) {
          setSelectedCondominio(funcionario.condominiosVinculados[0].id);
        }
      } else {
        setViewMode("funcoes");
        if (funcionario.condominioId) {
          setSelectedCondominio(funcionario.condominioId);
        }
      }
    }
  }, [funcionario]);

  // Atualizar funções habilitadas (admin_master/gestor tem TODAS)
  useEffect(() => {
    if (funcionario) {
      if (funcionario.hierarquia && HIERARQUIAS_ADMIN.has(funcionario.hierarquia)) {
        // Admin/gestor: libera todas as funções
        setFuncoesHabilitadas(Object.keys(FUNCOES_CONFIG));
      } else if (funcionario.funcoes) {
        const habilitadas = funcionario.funcoes
          .filter(f => f.habilitada)
          .map(f => f.funcaoKey);
        setFuncoesHabilitadas(habilitadas);
      }
    }
  }, [funcionario]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!funcionario) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleNavigate = (route: string) => {
    setLocation(route);
  };

  const handleSelectCondominio = (condominioId: number) => {
    setSelectedCondominio(condominioId);
    // Se tem apps vinculados, mostrar apps, senão mostrar funções
    if (funcionario.appsVinculados?.length) {
      setViewMode("apps");
    } else {
      setViewMode("funcoes");
    }
  };

  const handleSelectApp = (shareLink: string) => {
    // Redirecionar para o app
    setLocation(`/app/${shareLink}`);
  };

  const handleBack = () => {
    if (activeSection) {
      setLocation("/dashboard");
      return;
    }

    if (viewMode === "funcoes" || viewMode === "apps") {
      if (funcionario.condominiosVinculados && funcionario.condominiosVinculados.length > 1) {
        setViewMode("condominios");
        setSelectedCondominio(null);
      }
    }
  };

  // Filtrar apenas funções habilitadas
  const funcoesDisponiveis = Object.entries(FUNCOES_CONFIG).filter(
    ([key]) => funcoesHabilitadas.includes(key)
  );

  // Filtrar apps da organização selecionado
  const appsDoCondominio = funcionario.appsVinculados?.filter(
    app => !selectedCondominio || app.condominioId === selectedCondominio
  ) || [];

  // Obter nome da organização selecionado
  const condominioSelecionado = funcionario.condominiosVinculados?.find(c => c.id === selectedCondominio);
  const activeSection = isSectionRoute ? routeParams.section : null;
  const activeSectionConfig = activeSection ? FUNCOES_CONFIG[activeSection] : null;
  const activeCondominioId = selectedCondominio || funcionario.condominioId || funcionario.condominiosVinculados?.[0]?.id || null;
  const tipoLabel = getTipoLabel(funcionario);
  const profileFirstName = funcionario.nome.split(" ")[0];
  const showBackButton = Boolean(activeSection) || ((viewMode === "apps" || viewMode === "funcoes") && (funcionario.condominiosVinculados?.length || 0) > 1);
  const introText = getIntroText(viewMode, activeSectionConfig?.description);
  let profileAvatar = (
    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
      <User className="w-4 h-4 text-slate-600" />
    </div>
  );

  if (funcionario.fotoUrl) {
    profileAvatar = (
      <img 
        src={funcionario.fotoUrl} 
        alt={funcionario.nome}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }

  let sectionContent = null;

  if (activeSection) {
    if (activeSectionConfig && activeCondominioId) {
      sectionContent = (
        <CoreModulesPanel
          section={activeSection as "checklists" | "manutencoes" | "ocorrencias" | "vistorias"}
          condominioId={activeCondominioId}
        />
      );
    } else if (activeSectionConfig) {
      sectionContent = (
        <Card className="bg-white/80 backdrop-blur-sm border-0">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Selecione uma organização</h3>
            <p className="text-slate-500 max-w-md mx-auto">Este módulo precisa de um condomínio ativo para carregar os registros.</p>
          </CardContent>
        </Card>
      );
    } else {
      sectionContent = (
        <Card className="bg-white/80 backdrop-blur-sm border-0">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Função removida do portal</h3>
            <p className="text-slate-500 max-w-md mx-auto">Os cards sem implementação real foram descartados desta nova versão do dashboard.</p>
          </CardContent>
        </Card>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="mr-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-800">Portal do Funcionário</h1>
                <p className="text-xs text-slate-500">
                  {condominioSelecionado ? condominioSelecionado.nome : "Sistema de Gestão"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Perfil do funcionário */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                {profileAvatar}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-700">{funcionario.nome}</p>
                  <p className="text-xs text-slate-500">{tipoLabel}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-slate-600 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Saudação */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            Olá, {profileFirstName}!
          </h2>
          <p className="text-slate-600 mt-1">{introText}</p>
        </div>

        {activeSection ? sectionContent : (
          <>

        {/* Seleção de Condomínios */}
        {viewMode === "condominios" && funcionario.condominiosVinculados && funcionario.condominiosVinculados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {funcionario.condominiosVinculados.map((cond) => (
              <Card 
                key={cond.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden"
                onClick={() => handleSelectCondominio(cond.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {cond.logoUrl ? (
                      <img 
                        src={cond.logoUrl} 
                        alt={cond.nome || "Condomínio"}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {cond.nome}
                      </h3>
                      <p className="text-sm text-slate-500">Clique para acessar</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Seleção de Apps */}
        {viewMode === "apps" && appsDoCondominio.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appsDoCondominio.map((app) => (
              <Card 
                key={app.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden"
                onClick={() => app.shareLink && handleSelectApp(app.shareLink)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {app.logoUrl ? (
                      <img 
                        src={app.logoUrl} 
                        alt={app.nome || "App"}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                        <Smartphone className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {app.nome}
                      </h3>
                      <p className="text-sm text-slate-500">Clique para abrir o app</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Botão para ver funções tradicionais */}
            {funcoesDisponiveis.length > 0 && (
              <Card 
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm overflow-hidden"
                onClick={() => setViewMode("funcoes")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                      <ClipboardCheck className="w-8 h-8 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                        Outras Funções
                      </h3>
                      <p className="text-sm text-slate-500">Checklists, manutenções, etc.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Grid de Funções */}
        {viewMode === "funcoes" && (
          <>
            {funcoesDisponiveis.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {funcoesDisponiveis.map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Card 
                      key={key}
                      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden"
                      onClick={() => handleNavigate(config.route)}
                    >
                      <CardHeader className="pb-2">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                          {config.label}
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                          {config.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center text-sm text-blue-600 font-medium">
                          Acessar
                          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Nenhuma função disponível
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    O administrador ainda não habilitou funções para o seu acesso. 
                    Entre em contacto com o gestor ou administrador da organização.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

          </>
        )}

        {/* Mensagem quando não há condomínios nem apps */}
        {!activeSection && viewMode === "condominios" && (!funcionario.condominiosVinculados || funcionario.condominiosVinculados.length === 0) && (
          <Card className="bg-white/80 backdrop-blur-sm border-0">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Nenhuma organização vinculado
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Você ainda não foi vinculado a nenhuma organização. 
                Entre em contacto com o administrador.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Informações do Funcionário */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500 text-center">
            {tipoLabel} • 
            {funcionario.condominiosVinculados && funcionario.condominiosVinculados.length > 0 
              ? ` ${funcionario.condominiosVinculados.length} condomínio(s)` 
              : ` Condomínio ID: ${funcionario.condominioId}`
            }
            {funcionario.appsVinculados && funcionario.appsVinculados.length > 0 && ` • ${funcionario.appsVinculados.length} app(s)`}
          </p>
        </div>
      </main>
    </div>
  );
}
