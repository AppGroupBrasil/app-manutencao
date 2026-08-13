import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import WhatsAppButton from "./components/WhatsAppButton";
import { trpc } from "@/lib/trpc";

// Lightweight pages – loaded eagerly (Home, Login, public routes)
import Home from "./pages/Home";

// Portal pages (promoted from /funcionario/*)
const FuncionarioLogin = lazy(() => import("./pages/FuncionarioLogin"));
const SindicoLogin = lazy(() => import("./pages/SindicoLogin"));
const DefinirSenha = lazy(() => import("./pages/DefinirSenha"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminModulos = lazy(() => import("./pages/AdminModulos"));
const Manutencoes = lazy(() => import("./pages/Manutencoes"));
const AdminManutencoes = lazy(() => import("./pages/AdminManutencoes"));
const OrdensServico = lazy(() => import("./pages/OrdensServico"));
const AgendaVencimentos = lazy(() => import("./pages/AgendaVencimentos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Checklists = lazy(() => import("./pages/Checklists"));
const ListaTarefas = lazy(() => import("./pages/ListaTarefas"));
const Vistorias = lazy(() => import("./pages/Vistorias"));
const QuadroAtividades = lazy(() => import("./pages/QuadroAtividades"));
const QrCodes = lazy(() => import("./pages/QrCodes"));
const Ocorrencias = lazy(() => import("./pages/Ocorrencias"));
const QrCodePublico = lazy(() => import("./pages/QrCodePublico"));
const AdminOrganizacoes = lazy(() => import("./pages/AdminOrganizacoes"));
const AdminClientes = lazy(() => import("./pages/AdminClientes"));
const OrdemServicoPublica = lazy(() => import("./pages/OrdemServicoPublica"));
const RegistroPublico = lazy(() => import("./pages/RegistroPublico"));
const AdminFuncionarios = lazy(() => import("./pages/AdminFuncionarios"));
const AdminGestores = lazy(() => import("./pages/AdminGestores"));
const AdminEquipes = lazy(() => import("./pages/AdminEquipes"));
const FuncionarioDashboard = lazy(() => import("./pages/FuncionarioDashboard"));
const FuncionarioRecuperarSenha = lazy(() => import("./pages/FuncionarioRecuperarSenha"));
const FuncionarioRedefinirSenha = lazy(() => import("./pages/FuncionarioRedefinirSenha"));

// Public/shared pages — lazy loaded
const ItemCompartilhadoPage = lazy(() => import("./pages/ItemCompartilhadoPage").then(m => ({ default: m.ItemCompartilhadoPage })));
const Contrato = lazy(() => import("./pages/Contrato"));
const Apresentacao = lazy(() => import("./pages/Apresentacao"));
const CadastroMorador = lazy(() => import("./pages/CadastroMorador"));
const AssembleiaPublica = lazy(() => import("./pages/AssembleiaPublica"));
const NotificacaoPublicaPage = lazy(() => import("./pages/NotificacaoPublicaPage"));
const LandingRelatorio = lazy(() => import("./pages/LandingRelatorio"));
const MoradorLogin = lazy(() => import("./pages/MoradorLogin"));
const MoradorDashboard = lazy(() => import("./pages/MoradorDashboard"));
const MoradorRecuperarSenha = lazy(() => import("./pages/MoradorRecuperarSenha"));
const MoradorRedefinirSenha = lazy(() => import("./pages/MoradorRedefinirSenha"));
const MembroLogin = lazy(() => import("./pages/MembroLogin"));
const MembroEsqueciSenha = lazy(() => import("./pages/MembroEsqueciSenha"));
const MembroRedefinirSenha = lazy(() => import("./pages/MembroRedefinirSenha"));
const CompartilhadoPage = lazy(() => import("./pages/CompartilhadoPage"));
const TimelineVisualizarPage = lazy(() => import("./pages/TimelineVisualizarPage"));
const PublicoView = lazy(() => import("./pages/PublicoView"));
const FuncaoPublicaFormPage = lazy(() => import("./pages/FuncaoPublicaFormPage"));
const TermosDeUsoPage = lazy(() => import("./pages/TermosDeUsoPage"));
const PoliticaPrivacidadePage = lazy(() => import("./pages/PoliticaPrivacidadePage"));

// Loading fallback for lazy components
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );
}

/**
 * Manda a conta trocar a senha de implantação antes de qualquer tela.
 * O bloqueio real é do servidor (`SENHA_PROVISORIA`); aqui é só evitar que o
 * usuário caia num painel que responderia erro em toda chamada.
 */
function ExigeSenhaDefinida({ children }: { children: React.ReactNode }) {
  const { data: usuario, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) return <PageLoader />;
  if (usuario?.senhaProvisoria) return <Redirect to="/definir-senha" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* ===== SISTEMA PRINCIPAL (Portal) ===== */}
      <Route path="/" component={Home} />
      <Route path="/login" component={FuncionarioLogin} />
      <Route path="/admin/login" component={SindicoLogin} />
      <Route path="/sindico/login" component={SindicoLogin} />
      <Route path="/definir-senha" component={DefinirSenha} />
      <Route path="/admin">
        <ExigeSenhaDefinida><AdminDashboard /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/dashboard">
        <ExigeSenhaDefinida><AdminDashboard /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/modulos">
        <ExigeSenhaDefinida><AdminModulos /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/clientes">
        <ExigeSenhaDefinida><AdminClientes /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/organizacoes">
        <ExigeSenhaDefinida><AdminOrganizacoes /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/funcionarios">
        <ExigeSenhaDefinida><AdminFuncionarios /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/gestores">
        <ExigeSenhaDefinida><AdminGestores /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/equipes">
        <ExigeSenhaDefinida><AdminEquipes /></ExigeSenhaDefinida>
      </Route>
      <Route path="/admin/manutencoes">
        <ExigeSenhaDefinida><AdminManutencoes /></ExigeSenhaDefinida>
      </Route>
      <Route path="/manutencoes/ordens-servico">
        <ExigeSenhaDefinida><OrdensServico /></ExigeSenhaDefinida>
      </Route>
      {/* Destino do QR Code impresso: abre a O.S. já na tela de edição. */}
      <Route path="/manutencoes/ordens-servico/:id">
        {(params) => (
          <ExigeSenhaDefinida><OrdensServico osInicial={Number(params.id)} /></ExigeSenhaDefinida>
        )}
      </Route>
      <Route path="/manutencoes/vencimentos">
        <ExigeSenhaDefinida><AgendaVencimentos /></ExigeSenhaDefinida>
      </Route>
      {/* Calendário único: tudo que tem data, de todas as funções. */}
      <Route path="/manutencoes/calendario">
        <ExigeSenhaDefinida><Calendario /></ExigeSenhaDefinida>
      </Route>
      <Route path="/manutencoes/checklists">
        <ExigeSenhaDefinida><Checklists /></ExigeSenhaDefinida>
      </Route>
      <Route path="/manutencoes/tarefas">
        <ExigeSenhaDefinida><ListaTarefas /></ExigeSenhaDefinida>
      </Route>
      <Route path="/manutencoes/vistorias">
        <ExigeSenhaDefinida><Vistorias /></ExigeSenhaDefinida>
      </Route>
      {/* Formulário aberto pelo QR impresso: público, sem login. */}
      {/* Leitura pública pelo QR: O.S. e as quatro funções rápidas. */}
      <Route path="/registro/:tipo/:token">
        {(params) => <RegistroPublico tipo={params.tipo} token={params.token} />}
      </Route>
      <Route path="/os/:token">{(params) => <OrdemServicoPublica token={params.token} />}</Route>
      <Route path="/qr/:token">
        {(params) => <QrCodePublico token={params.token} />}
      </Route>
      <Route path="/manutencoes/qrcode">
        <ExigeSenhaDefinida><QrCodes /></ExigeSenhaDefinida>
      </Route>
      <Route path="/ocorrencias">
        <ExigeSenhaDefinida><Ocorrencias /></ExigeSenhaDefinida>
      </Route>
      <Route path="/manutencoes/quadro">
        <ExigeSenhaDefinida><QuadroAtividades /></ExigeSenhaDefinida>
      </Route>
      <Route path="/manutencoes">
        <ExigeSenhaDefinida><Manutencoes /></ExigeSenhaDefinida>
      </Route>
      <Route path="/recuperar-senha" component={FuncionarioRecuperarSenha} />
      <Route path="/redefinir-senha/:token" component={FuncionarioRedefinirSenha} />
      <Route path="/dashboard" component={FuncionarioDashboard} />
      <Route path="/dashboard/:section" component={FuncionarioDashboard} />
      <Route path="/termos" component={TermosDeUsoPage} />
      <Route path="/privacidade" component={PoliticaPrivacidadePage} />

      {/* ===== ROTAS PÚBLICAS ===== */}
      <Route path="/contrato" component={Contrato} />
      <Route path="/apresentacao" component={Apresentacao} />
      <Route path="/relatorio" component={LandingRelatorio} />

      {/* Itens compartilhados */}
      <Route path="/compartilhado/:tipo/:token" component={ItemCompartilhadoPage} />
      <Route path="/compartilhado/:token" component={CompartilhadoPage} />
      <Route path="/timeline/:token">{(params) => <TimelineVisualizarPage token={params.token} />}</Route>

      {/* Cadastro público */}
      <Route path="/cadastro/:token" component={CadastroMorador} />

      {/* Assembleia pública */}
      <Route path="/assembleia/:id" component={AssembleiaPublica} />

      {/* QR Code público */}
      <Route path="/publico/:tipo/:id" component={PublicoView} />

      {/* Função pública de manutenção */}
      <Route path="/manutencao/:token" component={FuncaoPublicaFormPage} />

      {/* Notificação pública */}
      <Route path="/notificacao/:token" component={NotificacaoPublicaPage} />

      {/* Portal do Morador */}
      <Route path="/morador/login" component={MoradorLogin} />
      <Route path="/morador/recuperar-senha" component={MoradorRecuperarSenha} />
      <Route path="/morador/redefinir-senha/:token" component={MoradorRedefinirSenha} />
      <Route path="/morador" component={MoradorDashboard} />

      {/* Portal do Membro da Equipe */}
      <Route path="/equipe/login" component={MembroLogin} />
      <Route path="/equipe/esqueci-senha" component={MembroEsqueciSenha} />
      <Route path="/equipe/redefinir-senha" component={MembroRedefinirSenha} />

      {/* Compatibilidade: redirecionar rotas antigas /funcionario/* */}
      <Route path="/funcionario/login"><Redirect to="/login" /></Route>
      <Route path="/funcionario/dashboard"><Redirect to="/dashboard" /></Route>
      <Route path="/funcionario/:section">{(params) => <Redirect to={`/${params.section}`} />}</Route>

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
          <WhatsAppButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
