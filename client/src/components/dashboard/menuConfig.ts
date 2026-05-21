import {
  LayoutDashboard,
  Building2,
  UsersRound,
  Share2,
  Eye,
  Wrench,
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Clock,
  History,
  CalendarClock,
  Zap,
  Megaphone,
  MessageSquare,
  Calendar,
  Vote,
  Image,
  Award,
  TrendingUp,
  Package,
  BarChart3,
  Sparkles,
  Download,
  Shield,
  Users,
  Sliders,
  DollarSign,
  FolderOpen,
  BookOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  funcaoId?: string;
  path?: string;
}

export interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  items: MenuItem[];
  isSpecial?: boolean;
  adminOnly?: boolean;
}

export const menuSections: MenuSection[] = [
  {
    id: "visao-geral",
    label: "menu.overview",
    icon: LayoutDashboard,
    path: "overview",
    items: [],
  },
  {
    id: "meus-projetos",
    label: "menu.myProjects",
    icon: FolderOpen,
    path: "revistas",
    items: [],
    isSpecial: true,
  },
  {
    id: "cadastro",
    label: "menu.maintenanceManagement",
    icon: Building2,
    items: [
      { id: "condominio", label: "menu.maintenanceRegistration", icon: Building2 },
      { id: "equipe", label: "menu.teamManagement", icon: UsersRound, funcaoId: "equipe" },
      { id: "compartilhamentos", label: "menu.sharing", icon: Share2 },
    ],
  },
  {
    id: "manutencao",
    label: "menu.maintenance",
    icon: Wrench,
    items: [
      { id: "vistorias", label: "menu.inspections", icon: Eye, funcaoId: "vistorias" },
      { id: "manutencoes", label: "menu.maintenance", icon: Wrench, funcaoId: "manutencoes" },
      { id: "ocorrencias", label: "menu.occurrences", icon: AlertTriangle, funcaoId: "ocorrencias" },
      { id: "checklists", label: "menu.checklists", icon: ClipboardCheck, funcaoId: "checklists" },
      { id: "ordens-servico", label: "menu.allServiceOrders", icon: ClipboardList, funcaoId: "ordens-servico" },
      { id: "ordens-servico-config", label: "menu.configuration", icon: Settings, funcaoId: "ordens-servico" },
    ],
  },
  {
    id: "timeline-historico",
    label: "menu.timeline",
    icon: Clock,
    items: [
      { id: "timeline-unificada", label: "menu.timeline", icon: Clock },
      { id: "historico-geral-page", label: "menu.historyGeneral", icon: History },
      { id: "agenda-vencimentos-page", label: "menu.dueDatesAgenda", icon: CalendarClock },
    ],
  },
  {
    id: "funcoes",
    label: "menu.functions",
    icon: Zap,
    items: [
      { id: "funcoes-completas", label: "menu.functionsComplete", icon: Building2 },
      { id: "funcoes-rapidas-page", label: "menu.quickFunctions", icon: Zap },
      { id: "funcoes-personalizadas", label: "Funções Personalizadas", icon: ClipboardList },
      { id: "indice-funcoes", label: "menu.functionsIndex", icon: BookOpen },
    ],
  },
  {
    id: "comunicacao",
    label: "menu.communication",
    icon: Megaphone,
    items: [
      { id: "votacoes", label: "menu.votes", icon: Vote, funcaoId: "votacoes" },
    ],
  },
  {
    id: "galeria-midia",
    label: "menu.galleryMedia",
    icon: Image,
    items: [
      { id: "galeria", label: "menu.photoGallery", icon: Image, funcaoId: "galeria" },
      { id: "realizacoes", label: "menu.achievements", icon: Award, funcaoId: "realizacoes" },
      { id: "melhorias", label: "menu.improvements", icon: TrendingUp, funcaoId: "melhorias" },
      { id: "aquisicoes", label: "menu.acquisitions", icon: Package, funcaoId: "aquisicoes" },
    ],
  },
  {
    id: "relatorios",
    label: "menu.reports",
    icon: BarChart3,
    path: "relatorios",
    items: [],
  },
  {
    id: "configuracoes",
    label: "menu.customization",
    icon: Sparkles,
    items: [
      { id: "personalizar-layout", label: "menu.layoutCustomization", icon: Sparkles, path: "/dashboard/personalizar-layout" },
      { id: "backup", label: "menu.cloudBackup", icon: Download, path: "/dashboard/backup" },
      { id: "exportar-nuvem", label: "menu.cloudExport", icon: Download, path: "/dashboard/exportar-nuvem" },
    ],
  },
];

export const adminMenuItems: MenuItem[] = [
  { id: "admin-usuarios", label: "menu.adminUsers", icon: Users, path: "/admin/usuarios" },
  { id: "admin-funcoes", label: "menu.adminFunctions", icon: Sliders, path: "/admin/funcoes" },
  { id: "admin-logs", label: "menu.auditLogs", icon: History, path: "/admin/logs" },
  { id: "admin-financeiro", label: "menu.financialConfig", icon: DollarSign, path: "/admin/financeiro" },
];

/**
 * Filter menu sections based on enabled functions and member permissions
 */
export function filterMenuSections(
  sections: MenuSection[],
  funcoesHabilitadas: string[] | undefined,
  condominioId: number | undefined,
  membroLogado: { permissoes: string[]; acessoTotal: boolean } | null | undefined,
): MenuSection[] {
  if (!condominioId || !funcoesHabilitadas) return sections;

  const permissoesMembro = membroLogado?.permissoes || [];
  const temAcessoTotal = membroLogado?.acessoTotal || false;
  const isMembro = !!membroLogado;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.funcaoId) return true;
        if (item.funcaoId.includes("-rapida") || item.funcaoId.includes("-rapido")) return true;
        if (item.funcaoId === "historico") return true;

        if (isMembro) {
          if (temAcessoTotal) return funcoesHabilitadas.includes(item.funcaoId);
          const moduloPermissao = item.funcaoId.replace("-completa", "").replace("-completo", "");
          return permissoesMembro.includes(moduloPermissao) && funcoesHabilitadas.includes(item.funcaoId);
        }

        return funcoesHabilitadas.includes(item.funcaoId);
      }),
    }))
    .filter((section) => section.path || section.items.length > 0);
}
