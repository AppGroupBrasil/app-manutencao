import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import WhatsAppButton from "./components/WhatsAppButton";

// Lightweight pages – loaded eagerly (Home, Login, public routes)
import Home from "./pages/Home";

// Portal pages (promoted from /funcionario/*)
const FuncionarioLogin = lazy(() => import("./pages/FuncionarioLogin"));
const SindicoLogin = lazy(() => import("./pages/SindicoLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FuncionarioDashboard = lazy(() => import("./pages/FuncionarioDashboard"));
const FuncionarioRecuperarSenha = lazy(() => import("./pages/FuncionarioRecuperarSenha"));
const FuncionarioRedefinirSenha = lazy(() => import("./pages/FuncionarioRedefinirSenha"));

// Public/shared pages — lazy loaded
const MagazineViewer = lazy(() => import("./pages/MagazineViewer"));
const Templates = lazy(() => import("./pages/Templates"));
const TransitionEffects = lazy(() => import("./pages/TransitionEffects"));
const Votar = lazy(() => import("./pages/Votar"));
const ItemCompartilhadoPage = lazy(() => import("./pages/ItemCompartilhadoPage").then(m => ({ default: m.ItemCompartilhadoPage })));
const Contrato = lazy(() => import("./pages/Contrato"));
const Apresentacao = lazy(() => import("./pages/Apresentacao"));
const CadastroMorador = lazy(() => import("./pages/CadastroMorador"));
const AssembleiaPublica = lazy(() => import("./pages/AssembleiaPublica"));
const NotificacaoPublicaPage = lazy(() => import("./pages/NotificacaoPublicaPage"));
const LandingApp = lazy(() => import("./pages/LandingApp"));
const LandingRevista = lazy(() => import("./pages/LandingRevista"));
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
const AppViewer = lazy(() => import("./pages/AppViewer"));
const AppView = lazy(() => import("./pages/AppView"));
const PublicoView = lazy(() => import("./pages/PublicoView"));
const ItemRevistaPublico = lazy(() => import("./pages/ItemRevistaPublico"));
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

function Router() {
  return (
    <Switch>
      {/* ===== SISTEMA PRINCIPAL (Portal) ===== */}
      <Route path="/" component={Home} />
      <Route path="/login" component={FuncionarioLogin} />
      <Route path="/admin/login" component={SindicoLogin} />
      <Route path="/sindico/login" component={SindicoLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/recuperar-senha" component={FuncionarioRecuperarSenha} />
      <Route path="/redefinir-senha/:token" component={FuncionarioRedefinirSenha} />
      <Route path="/dashboard" component={FuncionarioDashboard} />
      <Route path="/dashboard/:section" component={FuncionarioDashboard} />
      <Route path="/termos" component={TermosDeUsoPage} />
      <Route path="/privacidade" component={PoliticaPrivacidadePage} />

      {/* ===== ROTAS PÚBLICAS ===== */}
      <Route path="/templates" component={Templates} />
      <Route path="/contrato" component={Contrato} />
      <Route path="/apresentacao" component={Apresentacao} />
      <Route path="/transicoes" component={TransitionEffects} />
      <Route path="/app" component={LandingApp} />
      <Route path="/revista" component={LandingRevista} />
      <Route path="/relatorio" component={LandingRelatorio} />
      <Route path="/revista/:shareLink/item/:tipo/:itemId" component={ItemRevistaPublico} />
      <Route path="/revista/:shareLink" component={MagazineViewer} />
      <Route path="/app/:shareLink" component={AppViewer} />
      <Route path="/meuapp/:id" component={AppView} />

      {/* Votação */}
      <Route path="/votar/:id" component={Votar} />

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
