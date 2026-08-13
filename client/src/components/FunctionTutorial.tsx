import { useState } from "react";
import {
  GraduationCap,
  Route,
  ListChecks,
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  Zap,
  ClipboardList,
  CalendarClock,
  Image,
  Camera,
  BookOpen,
  FileText,
  Share2,
  Building2,
  UsersRound,
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  Eye,
  Edit,
  MapPin,
  Clock,
  Bell,
  Star,
  Layers,
  Grid3X3,
  Play,
  Layout,
} from "lucide-react";
import { TourGuide, type TourStep } from "./TourGuide";
import { ChecklistTutorial, type ChecklistItem } from "./ChecklistTutorial";

// ============================================================
// DEFINIÇÃO DOS TUTORIAIS POR FUNÇÃO
// ============================================================

type FunctionTutorialId =
  | "vistorias"
  | "manutencoes"
  | "ocorrencias"
  | "checklists"
  | "funcoes-completas"
  | "funcoes-rapidas"
  | "ordens-servico"
  | "agenda-vencimentos"
  | "galeria"
  | "timeline"
  | "historico"
  | "cadastro"
  | "equipe"
  | "compartilhamentos"
  | "relatorios"
  | "antes-depois"
  | "indice-funcoes";

interface TutorialConfig {
  id: FunctionTutorialId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tourSteps: TourStep[];
  checklistItems: ChecklistItem[];
}

// ---- VISTORIAS ----
const vistoriasTutorial: TutorialConfig = {
  id: "vistorias",
  title: "Tutorial: Vistorias",
  subtitle: "Aprenda a criar e gerenciar vistorias completas",
  icon: <ClipboardCheck className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-vistorias"]',
      title: "Página de Vistorias",
      description:
        "Esta é a central de vistorias. Aqui você visualiza todas as vistorias registradas, com estatísticas em tempo real e acesso rápido às ações.",
      position: "bottom",
      icon: <ClipboardCheck className="w-5 h-5" />,
    },
    {
      target: '[data-tour="btn-nova-vistoria"]',
      title: "Criar Nova Vistoria",
      description:
        'Clique em "Nova Vistoria" para registrar uma nova inspeção. Preencha o local, descrição, adicione fotos e defina a prioridade.',
      position: "bottom",
      icon: <Plus className="w-5 h-5" />,
    },
    {
      target: '[data-tour="stats-cards"]',
      title: "Estatísticas Rápidas",
      description:
        "Acompanhe os números em tempo real: total de vistorias, pendentes, em andamento e concluídas. Clique para filtrar por status.",
      position: "bottom",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="filtros"]',
      title: "Filtros e Busca",
      description:
        "Use os filtros para encontrar vistorias específicas. Filtre por status, prioridade, responsável ou busque por palavra-chave.",
      position: "bottom",
      icon: <Search className="w-5 h-5" />,
    },
    {
      target: '[data-tour="lista-itens"]',
      title: "Lista de Vistorias",
      description:
        "Cada cartão mostra o resumo da vistoria com status, data, responsável e ações. Clique para ver detalhes, editar, gerar PDF ou compartilhar.",
      position: "top",
      icon: <Eye className="w-5 h-5" />,
    },
    {
      target: '[data-tour="btn-relatorio"]',
      title: "Gerar Relatório",
      description:
        "Gere relatórios profissionais em PDF das suas vistorias. Ideal para enviar a clientes ou manter registros documentados.",
      position: "bottom",
      icon: <FileText className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "v1",
      title: "Cadastre um local de manutenção",
      description:
        "Antes de criar vistorias, cadastre os locais/máquinas/itens que serão vistoriados. Vá em Cadastros → Cadastro de Locais.",
      icon: <Building2 className="w-4 h-4" />,
      actionLabel: "Ir para Cadastros",
    },
    {
      id: "v2",
      title: "Crie sua primeira vistoria",
      description:
        'Clique no botão "Nova Vistoria". Preencha o título, selecione o local, descreva o que foi inspecionado e adicione fotos.',
      icon: <Plus className="w-4 h-4" />,
      scrollTarget: '[data-tour="btn-nova-vistoria"]',
    },
    {
      id: "v3",
      title: "Adicione fotos à vistoria",
      description:
        "No formulário da vistoria, use o campo de imagens para tirar fotos ou selecionar do dispositivo. Fotos documentam o estado real.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "v4",
      title: "Defina prioridade e status",
      description:
        "Classifique a vistoria como Baixa, Média, Alta ou Urgente. Altere o status conforme o andamento: Pendente → Em Andamento → Concluída.",
      icon: <Star className="w-4 h-4" />,
    },
    {
      id: "v5",
      title: "Gere um relatório PDF",
      description:
        'Clique no botão "Relatório" para gerar um PDF profissional da vistoria, com fotos e todos os dados registrados.',
      icon: <FileText className="w-4 h-4" />,
      scrollTarget: '[data-tour="btn-relatorio"]',
    },
    {
      id: "v6",
      title: "Compartilhe com a equipe",
      description:
        "Use o botão de compartilhar em cada vistoria para enviar via link, QR Code ou diretamente no app personalizado.",
      icon: <Share2 className="w-4 h-4" />,
    },
  ],
};

// ---- MANUTENÇÕES ----
const manutencoesTutorial: TutorialConfig = {
  id: "manutencoes",
  title: "Tutorial: Manutenções",
  subtitle: "Controle manutenções preventivas e corretivas",
  icon: <Wrench className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-manutencoes"]',
      title: "Central de Manutenções",
      description:
        "Gerencie todas as manutenções em um só lugar. Manutenções preventivas, corretivas e preditivas com controle completo de custos e prazos.",
      position: "bottom",
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      target: '[data-tour="btn-nova-manutencao"]',
      title: "Registrar Nova Manutenção",
      description:
        'Clique em "Nova Manutenção" para registrar. Informe o tipo (preventiva/corretiva), local, descrição detalhada, custo estimado e prazo.',
      position: "bottom",
      icon: <Plus className="w-5 h-5" />,
    },
    {
      target: '[data-tour="stats-cards"]',
      title: "Painel de Estatísticas",
      description:
        "Veja o resumo: total de manutenções, custos acumulados, pendentes e em andamento. Use para acompanhar a saúde da operação.",
      position: "bottom",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="filtros"]',
      title: "Filtros Avançados",
      description:
        "Filtre por tipo de manutenção, status, prioridade, responsável ou período. Encontre rapidamente o que precisa.",
      position: "bottom",
      icon: <Filter className="w-5 h-5" />,
    },
    {
      target: '[data-tour="lista-itens"]',
      title: "Registros de Manutenção",
      description:
        "Cada cartão mostra: título, local, responsável, custo, tempo estimado e status. Clique para ver detalhes completos.",
      position: "top",
      icon: <Eye className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "m1",
      title: "Cadastre os locais/equipamentos",
      description:
        "Registre os locais, máquinas ou itens que recebem manutenção. Isso facilita o acompanhamento histórico de cada ativo.",
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: "m2",
      title: "Crie uma manutenção preventiva",
      description:
        'Clique em "Nova Manutenção", selecione o tipo "Preventiva" e defina a periodicidade. Previna problemas antes de acontecerem.',
      icon: <Plus className="w-4 h-4" />,
      scrollTarget: '[data-tour="btn-nova-manutencao"]',
    },
    {
      id: "m3",
      title: "Registre custos e materiais",
      description:
        "Inclua o custo estimado e real da manutenção, materiais utilizados e horas de trabalho para controle financeiro.",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "m4",
      title: "Atualize o status da manutenção",
      description:
        "Altere o status conforme avança: Pendente → Em Andamento → Concluída. A timeline registra cada alteração automaticamente.",
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: "m5",
      title: "Adicione fotos do antes e depois",
      description:
        "Documente com fotos o estado anterior e posterior à manutenção. Isso comprova a execução e qualidade do serviço.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "m6",
      title: "Gere o relatório da manutenção",
      description:
        "Exporte relatórios em PDF com todas as informações, fotos e custos da manutenção para documentação profissional.",
      icon: <Download className="w-4 h-4" />,
    },
  ],
};

// ---- OCORRÊNCIAS ----
const ocorrenciasTutorial: TutorialConfig = {
  id: "ocorrencias",
  title: "Tutorial: Ocorrências",
  subtitle: "Registre e acompanhe incidentes e ocorrências",
  icon: <AlertTriangle className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-ocorrencias"]',
      title: "Central de Ocorrências",
      description:
        "Registre e acompanhe todos os incidentes. Desde problemas simples até ocorrências urgentes com rastreabilidade completa.",
      position: "bottom",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      target: '[data-tour="btn-nova-ocorrencia"]',
      title: "Registrar Ocorrência",
      description:
        'Clique em "Nova Ocorrência" para registrar um incidente. Descreva o problema, local, prioridade e adicione fotos.',
      position: "bottom",
      icon: <Plus className="w-5 h-5" />,
    },
    {
      target: '[data-tour="stats-cards"]',
      title: "Resumo das Ocorrências",
      description:
        "Acompanhe quantas ocorrências estão abertas, em andamento e resolvidas. Identifique padrões e áreas problemáticas.",
      position: "bottom",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="lista-itens"]',
      title: "Histórico de Ocorrências",
      description:
        "Todas as ocorrências ficam registradas com data, responsável e status. Clique para ver detalhes e acompanhar a resolução.",
      position: "top",
      icon: <Eye className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "o1",
      title: "Registre uma ocorrência",
      description:
        "Clique em Nova Ocorrência. Informe o local exato, descreva o problema com detalhes e classifique a urgência.",
      icon: <Plus className="w-4 h-4" />,
      scrollTarget: '[data-tour="btn-nova-ocorrencia"]',
    },
    {
      id: "o2",
      title: "Fotografe o problema",
      description:
        "Adicione fotos que mostrem claramente a ocorrência. Isso ajuda na avaliação e na definição da solução adequada.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "o3",
      title: "Defina a prioridade correta",
      description:
        "Urgente: risco à segurança. Alta: impacta operação. Média: precisa resolver em breve. Baixa: pode esperar.",
      icon: <Star className="w-4 h-4" />,
    },
    {
      id: "o4",
      title: "Atribua a um responsável",
      description:
        "Selecione o membro da equipe que ficará responsável pela resolução. Ele receberá uma notificação automática.",
      icon: <UsersRound className="w-4 h-4" />,
    },
    {
      id: "o5",
      title: "Acompanhe a resolução",
      description:
        "Altere o status conforme a ocorrência é tratada. Adicione comentários, fotos de progresso e documente a solução.",
      icon: <Clock className="w-4 h-4" />,
    },
  ],
};

// ---- CHECKLISTS ----
const checklistsTutorial: TutorialConfig = {
  id: "checklists",
  title: "Tutorial: Checklists",
  subtitle: "Crie e gerencie listas de verificação",
  icon: <ListChecks className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-checklists"]',
      title: "Central de Checklists",
      description:
        "Crie listas de verificação personalizadas para padronizar inspeções, verificações de segurança e rotinas de manutenção.",
      position: "bottom",
      icon: <ListChecks className="w-5 h-5" />,
    },
    {
      target: '[data-tour="btn-novo-checklist"]',
      title: "Criar Novo Checklist",
      description:
        'Clique em "Novo Checklist" para criar uma lista. Adicione os itens a verificar, categorize e defina se é obrigatório.',
      position: "bottom",
      icon: <Plus className="w-5 h-5" />,
    },
    {
      target: '[data-tour="stats-cards"]',
      title: "Progresso dos Checklists",
      description:
        "Veja o progresso geral: quantos checklists estão completos, em andamento e pendentes. Cada um mostra sua barra de progresso.",
      position: "bottom",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="lista-itens"]',
      title: "Seus Checklists",
      description:
        "Lista de todos os checklists com barra de progresso. Clique para abrir, marcar itens como verificados e adicionar observações.",
      position: "top",
      icon: <Eye className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "c1",
      title: "Crie um checklist",
      description:
        "Clique em Novo Checklist. Dê um título descritivo (ex: 'Verificação Mensal de Elevadores') e selecione o local.",
      icon: <Plus className="w-4 h-4" />,
      scrollTarget: '[data-tour="btn-novo-checklist"]',
    },
    {
      id: "c2",
      title: "Adicione os itens de verificação",
      description:
        "Liste cada ponto que precisa ser verificado. Ex: 'Conferir iluminação', 'Verificar extintores', 'Testar alarme'.",
      icon: <ListChecks className="w-4 h-4" />,
    },
    {
      id: "c3",
      title: "Execute o checklist",
      description:
        "Abra o checklist e marque cada item conforme verifica. Adicione fotos ou observações quando necessário.",
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      id: "c4",
      title: "Acompanhe o progresso",
      description:
        "A barra de progresso mostra quantos itens já foram verificados. O checklist fica 'Concluído' quando todos são marcados.",
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ],
};

// ---- FUNÇÕES COMPLETAS ----
const funcoesCompletasTutorial: TutorialConfig = {
  id: "funcoes-completas",
  title: "Tutorial: Funções Completas",
  subtitle: "Visão unificada de vistorias, manutenções e ocorrências",
  icon: <Building2 className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-funcoes-completas"]',
      title: "Funções Completas",
      description:
        "Esta é a visão unificada de todas as funções do sistema. Veja vistorias, manutenções, ocorrências e checklists em um só lugar.",
      position: "bottom",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="botoes-tipo"]',
      title: "Navegação por Tipo",
      description:
        "Use estes botões para acessar rapidamente cada tipo de função: Vistoria, Manutenção, Ocorrência, Checklist ou Antes/Depois.",
      position: "bottom",
      icon: <Grid3X3 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="stats-cards"]',
      title: "Estatísticas Gerais",
      description:
        "Veja o total de registros de cada tipo. Estes números atualizam em tempo real conforme você cria novos registros.",
      position: "bottom",
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "fc1",
      title: "Entenda as Funções Completas",
      description:
        "Esta página reúne todos os registros (vistorias, manutenções, ocorrências, checklists) em uma única visualização consolidada.",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: "fc2",
      title: "Navegue entre os tipos",
      description:
        "Use os botões coloridos no topo para filtrar por tipo ou acesse diretamente a página dedicada de cada função.",
      icon: <Grid3X3 className="w-4 h-4" />,
      scrollTarget: '[data-tour="botoes-tipo"]',
    },
    {
      id: "fc3",
      title: "Busque registros específicos",
      description:
        "Use a barra de busca para encontrar qualquer registro por título, descrição ou número de protocolo.",
      icon: <Search className="w-4 h-4" />,
    },
  ],
};

// ---- FUNÇÕES RÁPIDAS ----
const funcoesRapidasTutorial: TutorialConfig = {
  id: "funcoes-rapidas",
  title: "Tutorial: Funções Rápidas",
  subtitle: "Registre informações em segundos",
  icon: <Zap className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-funcoes-rapidas"]',
      title: "Funções Rápidas",
      description:
        "Registre vistorias, manutenções e ocorrências em poucos cliques. Ideal para o dia a dia quando você precisa de agilidade.",
      position: "bottom",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      target: '[data-tour="botoes-rapidos"]',
      title: "Botões de Ação Rápida",
      description:
        "Escolha o tipo de registro que deseja criar. Cada botão abre um formulário simplificado para preenchimento rápido.",
      position: "bottom",
      icon: <Play className="w-5 h-5" />,
    },
    {
      target: '[data-tour="lista-itens"]',
      title: "Últimos Registros Rápidos",
      description:
        "Veja os registros rápidos recentes. Você pode editá-los posteriormente para adicionar mais detalhes se necessário.",
      position: "top",
      icon: <Eye className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "fr1",
      title: "Escolha o tipo de registro",
      description:
        "Toque em um dos botões laranja (Vistoria, Manutenção, Ocorrência, Antes/Depois ou Checklist) para iniciar.",
      icon: <Zap className="w-4 h-4" />,
      scrollTarget: '[data-tour="botoes-rapidos"]',
    },
    {
      id: "fr2",
      title: "Preencha os dados essenciais",
      description:
        "O formulário rápido pede apenas o essencial: local, descrição curta e foto. Você pode completar os detalhes depois.",
      icon: <Edit className="w-4 h-4" />,
    },
    {
      id: "fr3",
      title: "Tire uma foto rápida",
      description:
        "Adicione uma foto diretamente da câmera. É a forma mais rápida de documentar uma situação no campo.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "fr4",
      title: "Revise os registros criados",
      description:
        "Seus registros rápidos aparecem na lista abaixo. Clique para ver detalhes ou editar para adicionar mais informações.",
      icon: <Eye className="w-4 h-4" />,
    },
  ],
};

// ---- ORDENS DE SERVIÇO ----
const ordensServicoTutorial: TutorialConfig = {
  id: "ordens-servico",
  title: "Tutorial: Ordens de Serviço",
  subtitle: "Gerencie OS desde a abertura até a conclusão",
  icon: <ClipboardList className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-os"]',
      title: "Ordens de Serviço",
      description:
        "Gerencie todas as Ordens de Serviço (OS) da sua organização. Desde a abertura até a conclusão com rastreabilidade completa.",
      position: "bottom",
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      target: '[data-dialog-trigger="create-os"]',
      title: "Abrir Nova OS",
      description:
        'Clique em "Nova Ordem de Serviço" para criar uma OS. Preencha o tipo, prioridade, descrição e atribua a um responsável.',
      position: "bottom",
      icon: <Plus className="w-5 h-5" />,
    },
    {
      target: '[data-tour="lista-itens"]',
      title: "Lista de Ordens de Serviço",
      description:
        "Todas as OS aparecem aqui com seu status atual (colorido), prioridade, responsável e data. Clique para ver detalhes.",
      position: "top",
      icon: <Eye className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "os1",
      title: "Crie uma Ordem de Serviço",
      description:
        "Clique em 'Nova Ordem de Serviço'. Dê um título claro, descreva o serviço necessário e selecione o tipo e prioridade.",
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: "os2",
      title: "Classifique a OS corretamente",
      description:
        "Defina o tipo (corretiva, preventiva, preditiva), a prioridade (baixa a urgente) e o status inicial.",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: "os3",
      title: "Atribua um responsável",
      description:
        "Selecione o membro da equipe que executará o serviço. Ele será notificado automaticamente.",
      icon: <UsersRound className="w-4 h-4" />,
    },
    {
      id: "os4",
      title: "Acompanhe o andamento",
      description:
        "Altere o andamento conforme o serviço avança: Aguardando início → Em execução → Finalizada parcialmente ou totalmente. Cancelada é para a ordem aberta por engano.",
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: "os5",
      title: "Documente com fotos e anexos",
      description:
        "Adicione fotos, documentos e comprovantes à OS para ter um registro completo do serviço executado.",
      icon: <Camera className="w-4 h-4" />,
    },
  ],
};

// ---- AGENDA DE VENCIMENTOS ----
const agendaVencimentosTutorial: TutorialConfig = {
  id: "agenda-vencimentos",
  title: "Tutorial: Agenda de Vencimentos",
  subtitle: "Controle prazos, contratos e vencimentos",
  icon: <CalendarClock className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-agenda"]',
      title: "Agenda de Vencimentos",
      description:
        "Controle todos os prazos, contratos e vencimentos da sua operação. Nunca mais perca um prazo importante.",
      position: "bottom",
      icon: <CalendarClock className="w-5 h-5" />,
    },
    {
      target: '[data-tour="stats-cards"]',
      title: "Resumo de Vencimentos",
      description:
        "Veja de relance: total de itens, ativos, vencidos e próximos de vencer. Itens vencidos ficam destacados em vermelho.",
      position: "bottom",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      target: '[data-tour="tabs-agenda"]',
      title: "Abas de Navegação",
      description:
        "Navegue entre Dashboard, Calendário, Contratos, Serviços e Manutenções programadas. Cada aba organiza um tipo de vencimento.",
      position: "bottom",
      icon: <Layout className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "av1",
      title: "Cadastre um contrato",
      description:
        "Registre contratos com fornecedores, data de vencimento e valor. O sistema alertará quando estiver próximo de vencer.",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "av2",
      title: "Agende manutenções preventivas",
      description:
        "Cadastre manutenções com periodicidade (mensal, trimestral, anual). Receba lembretes automáticos na data definida.",
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: "av3",
      title: "Configure alertas",
      description:
        "Use o botão de Alertas (sino) para definir com quantos dias de antecedência deseja ser notificado sobre vencimentos.",
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: "av4",
      title: "Use o calendário visual",
      description:
        "Na aba Calendário, veja todos os vencimentos organizados visualmente. Clique em uma data para ver os detalhes.",
      icon: <CalendarClock className="w-4 h-4" />,
    },
    {
      id: "av5",
      title: "Exporte para Excel",
      description:
        "Use o botão Exportar Excel para gerar uma planilha com todos os vencimentos e compartilhar com a equipe.",
      icon: <Download className="w-4 h-4" />,
    },
  ],
};

// ---- GALERIA ----
const galeriaTutorial: TutorialConfig = {
  id: "galeria",
  title: "Tutorial: Galeria e Mídia",
  subtitle: "Documente com fotos e organize registros visuais",
  icon: <Image className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-galeria"]',
      title: "Galeria de Fotos",
      description:
        "Organize todas as fotos da operação: registros de vistoria, antes/depois de manutenções, realizações e melhorias.",
      position: "bottom",
      icon: <Image className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "g1",
      title: "Adicione fotos à galeria",
      description:
        "Faça upload de fotos diretamente da câmera ou selecione do dispositivo. Organize por categorias e adicione descrições.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "g2",
      title: "Registre realizações",
      description:
        "Documente melhorias realizadas, obras concluídas e conquistas da equipe. Ideal para mostrar evolução ao longo do tempo.",
      icon: <Star className="w-4 h-4" />,
    },
    {
      id: "g3",
      title: "Faça registros Antes/Depois",
      description:
        "Compare o estado anterior e posterior de uma manutenção. Fotos lado a lado comprovam a qualidade do serviço.",
      icon: <Image className="w-4 h-4" />,
    },
  ],
};

// ---- TIMELINE ----
const timelineTutorial: TutorialConfig = {
  id: "timeline",
  title: "Tutorial: Timeline",
  subtitle: "Acompanhe todas as atividades em tempo real",
  icon: <Clock className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-timeline"]',
      title: "Timeline Unificada",
      description:
        "Veja todas as atividades do sistema em ordem cronológica. Vistorias, manutenções, ocorrências e mudanças de status.",
      position: "bottom",
      icon: <Clock className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "t1",
      title: "Entenda a Timeline",
      description:
        "A timeline mostra automaticamente cada ação realizada no sistema: criação de registros, alterações de status, comentários e fotos.",
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: "t2",
      title: "Filtre por tipo de atividade",
      description:
        "Use os filtros para ver apenas vistorias, manutenções ou ocorrências. Combine filtros para buscas específicas.",
      icon: <Filter className="w-4 h-4" />,
    },
    {
      id: "t3",
      title: "Acompanhe em tempo real",
      description:
        "A timeline atualiza automaticamente. É perfeita para gestão remota — veja o que a equipe faz de qualquer lugar.",
      icon: <Eye className="w-4 h-4" />,
    },
  ],
};

// ---- HISTÓRICO ----
const historicoTutorial: TutorialConfig = {
  id: "historico",
  title: "Tutorial: Histórico das Funções",
  subtitle: "Consulte o histórico completo de atividades",
  icon: <BookOpen className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-historico"]',
      title: "Histórico das Funções",
      description:
        "Consulte o histórico completo de todas as atividades por período, tipo e responsável. Ideal para auditorias e relatórios.",
      position: "bottom",
      icon: <BookOpen className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "h1",
      title: "Consulte registros anteriores",
      description:
        "Use o Histórico das Funções para buscar registros antigos. Filtre por data, tipo ou responsável para encontrar o que precisa.",
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: "h2",
      title: "Exporte dados do histórico",
      description:
        "Gere relatórios PDF ou planilhas do histórico filtrado para apresentações, auditorias ou documentação.",
      icon: <Download className="w-4 h-4" />,
    },
  ],
};

// ---- CADASTRO ----
const cadastroTutorial: TutorialConfig = {
  id: "cadastro",
  title: "Tutorial: Cadastro de Locais",
  subtitle: "Registre locais, máquinas e itens para manutenção",
  icon: <Building2 className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-cadastro"]',
      title: "Cadastro de Locais",
      description:
        "Cadastre todos os locais, máquinas e itens que receberão manutenção. Este é o primeiro passo para usar o sistema.",
      position: "bottom",
      icon: <Building2 className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "cd1",
      title: "Crie o primeiro local",
      description:
        "Clique no botão para criar um novo local. Dê um nome, endereço e adicione a logo ou foto do local.",
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: "cd2",
      title: "Configure áreas/setores",
      description:
        "Dentro de cada local, crie áreas ou setores (ex: Andar 1, Sala de Máquinas, Estacionamento) para organizar melhor.",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: "cd3",
      title: "Registre máquinas e equipamentos",
      description:
        "Cadastre cada máquina ou equipamento com modelo, marca, número de série e foto para controle individual.",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: "cd4",
      title: "Adicione a localização no mapa",
      description:
        "Configure a localização GPS do local no mapa para facilitar o acesso e a navegação da equipe em campo.",
      icon: <MapPin className="w-4 h-4" />,
    },
  ],
};

// ---- EQUIPE ----
const equipeTutorial: TutorialConfig = {
  id: "equipe",
  title: "Tutorial: Gestão de Equipe",
  subtitle: "Cadastre e gerencie membros da sua equipe",
  icon: <UsersRound className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-equipe"]',
      title: "Gestão de Equipe",
      description:
        "Adicione e gerencie os membros da sua equipe. Defina permissões, funções e controle quem acessa o quê no sistema.",
      position: "bottom",
      icon: <UsersRound className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "eq1",
      title: "Adicione membros da equipe",
      description:
        "Cadastre funcionários, técnicos e gestores. Informe nome, email, telefone e função no time.",
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: "eq2",
      title: "Defina permissões",
      description:
        "Configure o que cada membro pode fazer: ver registros, criar, editar, excluir. Controle o acesso por função.",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: "eq3",
      title: "Compartilhe o acesso",
      description:
        "Envie o link de acesso ao membro para que ele entre via Portal da Equipe com suas credenciais próprias.",
      icon: <Share2 className="w-4 h-4" />,
    },
  ],
};

// ---- COMPARTILHAMENTOS ----
const compartilhamentosTutorial: TutorialConfig = {
  id: "compartilhamentos",
  title: "Tutorial: Compartilhamento",
  subtitle: "Compartilhe via QR Code, Link, App e Web",
  icon: <Share2 className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-compartilhamentos"]',
      title: "Central de Compartilhamento",
      description:
        "Compartilhe o sistema com clientes e funcionários de 4 formas: QR Code, Link, App Personalizado e Web.",
      position: "bottom",
      icon: <Share2 className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "sh1",
      title: "Gere um QR Code de acesso",
      description:
        "Crie um QR Code que dá acesso direto ao app. Imprima e cole em locais visíveis para acesso fácil.",
      icon: <Grid3X3 className="w-4 h-4" />,
    },
    {
      id: "sh2",
      title: "Compartilhe por link",
      description:
        "Gere um link de acesso para enviar por WhatsApp, email ou mensagem. O destinatário acessa pelo navegador.",
      icon: <Share2 className="w-4 h-4" />,
    },
    {
      id: "sh3",
      title: "Crie um App personalizado",
      description:
        "Vá em 'Meus Projetos' e crie um app com sua marca. Defina quais funções ficam disponíveis para o usuário final.",
      icon: <Layout className="w-4 h-4" />,
    },
  ],
};

// ---- RELATÓRIOS ----
const relatoriosTutorial: TutorialConfig = {
  id: "relatorios",
  title: "Tutorial: Relatórios",
  subtitle: "Gere relatórios profissionais em PDF",
  icon: <FileText className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-relatorios"]',
      title: "Central de Relatórios",
      description:
        "Gere relatórios profissionais em PDF com a sua marca. Inclua gráficos, fotos e dados detalhados de cada operação.",
      position: "bottom",
      icon: <FileText className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "r1",
      title: "Crie um relatório personalizado",
      description:
        "Use o construtor de relatórios para montar layouts personalizados com a identidade visual da sua empresa.",
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: "r2",
      title: "Adicione gráficos e estatísticas",
      description:
        "Insira gráficos de evolução, comparativos e estatísticas para dar uma visão profissional dos dados.",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "r3",
      title: "Exporte e compartilhe",
      description:
        "Baixe o relatório em PDF de alta qualidade. Envie por email, WhatsApp ou imprima para apresentações.",
      icon: <Download className="w-4 h-4" />,
    },
  ],
};

// ---- ANTES E DEPOIS ----
const antesDepoisTutorial: TutorialConfig = {
  id: "antes-depois",
  title: "Tutorial: Antes e Depois",
  subtitle: "Documente transformações com comparativo visual",
  icon: <Image className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-antes-depois"]',
      title: "Registros Antes e Depois",
      description:
        "Compare o estado anterior e posterior de manutenções e melhorias. Comprove visualmente o trabalho realizado.",
      position: "bottom",
      icon: <Image className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "ad1",
      title: "Fotografe o estado ANTES",
      description:
        "Antes de iniciar qualquer serviço, registre o estado atual com fotos claras de diferentes ângulos.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "ad2",
      title: "Fotografe o resultado DEPOIS",
      description:
        "Após concluir o serviço, tire fotos dos mesmos ângulos para mostrar a transformação realizada.",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "ad3",
      title: "Compare lado a lado",
      description:
        "O sistema exibe as fotos antes e depois lado a lado para comparação visual imediata. Ideal para relatórios.",
      icon: <Image className="w-4 h-4" />,
    },
  ],
};

// ---- ÍNDICE DE FUNÇÕES ----
const indiceFuncoesTutorial: TutorialConfig = {
  id: "indice-funcoes",
  title: "Tutorial: Índice de Funções",
  subtitle: "Catálogo completo de todos os recursos do sistema",
  icon: <BookOpen className="w-5 h-5" />,
  tourSteps: [
    {
      target: '[data-tour="header-indice"]',
      title: "Todas as Funções",
      description:
        "Este é o catálogo completo com todas as funções disponíveis no sistema. Cada cartão mostra uma função diferente.",
      position: "bottom",
      icon: <BookOpen className="w-5 h-5" />,
    },
  ],
  checklistItems: [
    {
      id: "if1",
      title: "Explore as funções disponíveis",
      description:
        "Navegue pelos cartões para conhecer cada função. Cada uma tem um número (#), nome, descrição e ícone colorido.",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "if2",
      title: "Acesse uma função diretamente",
      description:
        "Clique em qualquer cartão para ser levado diretamente à página dessa função e começar a usar.",
      icon: <Play className="w-4 h-4" />,
    },
    {
      id: "if3",
      title: "Use a busca por número ou nome",
      description:
        "Busque por número (#) ou nome da função para encontrar rapidamente o que procura.",
      icon: <Search className="w-4 h-4" />,
    },
  ],
};

// ============================================================
// MAPEAMENTO DE TUTORIAIS
// ============================================================

export const TUTORIALS: Record<FunctionTutorialId, TutorialConfig> = {
  vistorias: vistoriasTutorial,
  manutencoes: manutencoesTutorial,
  ocorrencias: ocorrenciasTutorial,
  checklists: checklistsTutorial,
  "funcoes-completas": funcoesCompletasTutorial,
  "funcoes-rapidas": funcoesRapidasTutorial,
  "ordens-servico": ordensServicoTutorial,
  "agenda-vencimentos": agendaVencimentosTutorial,
  galeria: galeriaTutorial,
  timeline: timelineTutorial,
  historico: historicoTutorial,
  cadastro: cadastroTutorial,
  equipe: equipeTutorial,
  compartilhamentos: compartilhamentosTutorial,
  relatorios: relatoriosTutorial,
  "antes-depois": antesDepoisTutorial,
  "indice-funcoes": indiceFuncoesTutorial,
};

// ============================================================
// COMPONENTE PRINCIPAL: BOTÃO + SISTEMA DE TUTORIAL
// ============================================================

interface FunctionTutorialButtonProps {
  tutorialId: FunctionTutorialId;
  className?: string;
  /** Compact mode just shows icon */
  compact?: boolean;
  /** Variant shorthand: "compact" sets compact=true */
  variant?: "default" | "compact";
}

export function FunctionTutorialButton({
  tutorialId,
  className = "",
  compact = false,
  variant,
}: FunctionTutorialButtonProps) {
  const isCompact = compact || variant === "compact";
  const [mode, setMode] = useState<"closed" | "choose" | "tour" | "checklist">("closed");
  const tutorial = TUTORIALS[tutorialId];

  if (!tutorial) return null;

  return (
    <>
      {/* Botão Tutorial */}
      <button
        onClick={() => setMode("choose")}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
          bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
          text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40
          transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
          ${isCompact ? "px-3 py-2" : ""} ${className}`}
      >
        <GraduationCap className="w-4 h-4" />
        {!isCompact && <span>Tutorial</span>}
      </button>

      {/* Modal de escolha */}
      {mode === "choose" && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[9998]"
            onClick={() => setMode("closed")}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    {tutorial.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">{tutorial.title}</h3>
                    <p className="text-white/80 text-xs">{tutorial.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-sm text-slate-600 text-center mb-4">
                  Como prefere aprender sobre esta função?
                </p>

                {/* Opção 1: Tour Guiado */}
                <button
                  onClick={() => setMode("tour")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-orange-300 hover:bg-orange-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Route className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">
                      🗺️ Tour Guiado
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vou destacar cada elemento na tela e explicar passo a passo como funciona
                    </p>
                  </div>
                </button>

                {/* Opção 2: Checklist */}
                <button
                  onClick={() => setMode("checklist")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-orange-300 hover:bg-orange-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">
                      ✅ Checklist Interativo
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lista de tarefas para aprender no seu ritmo, marcando cada passo que completar
                    </p>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="px-5 pb-4 flex justify-center">
                <button
                  onClick={() => setMode("closed")}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tour Guiado */}
      <TourGuide
        steps={tutorial.tourSteps}
        isOpen={mode === "tour"}
        onClose={() => setMode("closed")}
        onComplete={() => setMode("closed")}
        tourId={tutorial.id}
      />

      {/* Checklist Tutorial */}
      <ChecklistTutorial
        items={tutorial.checklistItems}
        isOpen={mode === "checklist"}
        onClose={() => setMode("closed")}
        title={tutorial.title}
        subtitle={tutorial.subtitle}
        tutorialId={tutorial.id}
        headerIcon={tutorial.icon}
      />
    </>
  );
}
