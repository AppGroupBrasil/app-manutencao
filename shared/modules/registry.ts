/**
 * Registry central de módulos do sistema.
 *
 * Fonte única de verdade sobre QUAIS módulos existem e QUEM pode vê-los.
 * Usado pelo servidor (enforcement) e pelo client (menu/catálogo).
 *
 * Regras:
 * - Módulo `publico` entra no catálogo de todos os tenants (mas só funciona
 *   se estiver habilitado em `condominio_funcoes`).
 * - Módulo `restrito` só aparece — e só pode ser habilitado — para os tenants
 *   listados em `tenants`. Os demais clientes não sabem que ele existe.
 * - Nunca use `if (condominioId === X)` dentro de um módulo compartilhado.
 *   Ou o comportamento é configuração, ou é um módulo restrito daqui.
 */

export type ModuloCategoria =
  | 'comunicacao'
  | 'agenda'
  | 'operacional'
  | 'interativo'
  | 'documentacao'
  | 'midia'
  | 'publicidade'
  | 'projetos'
  | 'gestao'
  | 'relatorios';

/**
 * Segmento de mercado do tenant.
 *
 * Não decide mais quais módulos o cliente recebe — isso é igual para todo mundo
 * (`modulosPadrao`). O que muda por segmento é o vocabulário: a mesma tela fala
 * "unidade" numa rede de creches e "planta" numa metalúrgica.
 */
export type Segmento =
  | 'generico'
  | 'condominio'
  | 'metalurgia'
  | 'oficina'
  | 'academia'
  | 'facilities'
  /** Rede de unidades educacionais/socioassistenciais sob um gestor-chefe. */
  | 'educacional';

export type ModuloVisibilidade = 'publico' | 'restrito';

export interface ModuloManifest {
  id: string;
  nome: string;
  categoria: ModuloCategoria;
  descricao: string;
  /** `restrito` = invisível para tenants fora de `tenants`. Default: publico. */
  visibilidade?: ModuloVisibilidade;
  /** Tenants autorizados. Obrigatório quando `visibilidade: 'restrito'`. */
  tenants?: number[];
  /**
   * Entra ligado no pacote de quem abre a conta. Default: true.
   *
   * `false` é a especialidade que existe e serve, mas não vale para todo
   * mundo — o cliente liga em `/admin/modulos` quando precisar.
   */
  padrao?: boolean;
  /**
   * Herança do sistema de condomínio de onde este código veio.
   *
   * Não aparece no catálogo nem em pacote nenhum: são funções de portaria,
   * revista e convivência, que não têm o que fazer num sistema de manutenção.
   * Ficam no repositório enquanto não houver certeza de que ninguém quer.
   */
  legado?: boolean;
}

/** Lista fechada, para validar entrada e montar seletor sem repetir os nomes. */
export const SEGMENTOS_VALIDOS = [
  'generico',
  'condominio',
  'metalurgia',
  'oficina',
  'academia',
  'facilities',
  'educacional',
] as const;

export const MODULOS: readonly ModuloManifest[] = [
  // ==================== COMUNICAÇÃO ====================
  {
    id: 'avisos',
    nome: 'Avisos',
    categoria: 'comunicacao',
    descricao: 'Publicar avisos e comunicados',
    legado: true,
  },
  {
    id: 'comunicados',
    nome: 'Comunicados',
    categoria: 'comunicacao',
    descricao: 'Enviar comunicados oficiais',
    legado: true,
  },
  {
    id: 'notificacoes',
    nome: 'Notificações',
    categoria: 'comunicacao',
    descricao: 'Sistema de notificações',
  },
  {
    id: 'notificar-morador',
    nome: 'Notificar Morador',
    categoria: 'comunicacao',
    descricao: 'Notificar moradores individualmente',
    legado: true,
  },

  // ==================== AGENDA ====================
  {
    id: 'eventos',
    nome: 'Eventos',
    categoria: 'agenda',
    descricao: 'Gestão de eventos',
    legado: true,
  },
  {
    id: 'agenda-vencimentos',
    nome: 'Agenda de Vencimentos',
    categoria: 'agenda',
    descricao: 'Controle de vencimentos',
  },
  {
    id: 'calendario',
    nome: 'Calendário',
    categoria: 'agenda',
    descricao: 'Tudo o que tem data, reunido em um mês só',
  },
  {
    id: 'reservas',
    nome: 'Reservas',
    categoria: 'agenda',
    descricao: 'Reserva de áreas comuns',
    legado: true,
  },

  // ==================== OPERACIONAL ====================
  {
    id: 'vistorias',
    nome: 'Vistorias',
    categoria: 'operacional',
    descricao: 'Registro de vistorias',
  },
  {
    id: 'manutencoes',
    nome: 'Manutenções',
    categoria: 'operacional',
    descricao: 'Controle de manutenções',
  },
  {
    id: 'ocorrencias',
    nome: 'Ocorrências',
    categoria: 'operacional',
    descricao: 'Registro de ocorrências',
  },
  {
    id: 'checklists',
    nome: 'Checklists',
    categoria: 'operacional',
    descricao: 'Listas de verificação',
  },
  {
    id: 'antes-depois',
    nome: 'Antes e Depois',
    categoria: 'operacional',
    descricao: 'Registro de melhorias',
    // não é função própria: é fase de foto na O.S. e tipo de registro rápido.
    legado: true,
  },
  {
    id: 'ordens-servico',
    nome: 'Ordens de Serviço',
    categoria: 'operacional',
    descricao: 'Gestão de ordens de serviço',
  },
  {
    id: 'timeline',
    nome: 'Timeline',
    categoria: 'operacional',
    descricao: 'Registro de eventos e atualizações',
    // Só a leitura pública por link está pronta; falta a tela de
    // gestão no painel. Fica no catálogo, desligado.
    padrao: false,
  },
  {
    id: 'tarefas-agendadas',
    nome: 'Lista de Tarefas',
    categoria: 'operacional',
    descricao: 'Tarefas atribuídas à equipe, com recorrência e execução',
  },
  {
    id: 'quadro-atividades',
    nome: 'Quadro de Atividades',
    categoria: 'operacional',
    descricao: 'Quadro visual da equipe, com as atividades por rotina e responsável',
  },
  {
    id: 'qrcode',
    nome: 'QR Code',
    categoria: 'operacional',
    descricao: 'Pontos com QR Code e registros enviados por quem escaneia',
  },
  {
    id: 'leitura-medidores',
    nome: 'Leitura de Medidores',
    categoria: 'operacional',
    descricao: 'Registro de leituras de água, gás e energia',
    // router existe, mas nem registrado no appRouter; nenhuma tela.
    legado: true,
    padrao: false,
  },
  {
    id: 'controle-pragas',
    nome: 'Controle de Pragas',
    categoria: 'operacional',
    descricao: 'Registros de dedetização e controle de pragas',
    // router existe, mas nem registrado no appRouter; nenhuma tela.
    legado: true,
    padrao: false,
  },
  {
    id: 'jardinagem',
    nome: 'Jardinagem',
    categoria: 'operacional',
    descricao: 'Serviços de jardinagem e áreas verdes',
    // router existe, mas nem registrado no appRouter; nenhuma tela.
    legado: true,
    padrao: false,
  },

  // ==================== INTERATIVO ====================
  {
    id: 'votacoes',
    nome: 'Votações',
    categoria: 'interativo',
    descricao: 'Sistema de votações',
    legado: true,
  },
  {
    id: 'classificados',
    nome: 'Classificados',
    categoria: 'interativo',
    descricao: 'Classificados dos moradores',
    legado: true,
  },
  {
    id: 'achados-perdidos',
    nome: 'Achados e Perdidos',
    categoria: 'interativo',
    descricao: 'Itens perdidos e encontrados',
    legado: true,
  },
  {
    id: 'caronas',
    nome: 'Caronas',
    categoria: 'interativo',
    descricao: 'Sistema de caronas',
    legado: true,
  },

  // ==================== DOCUMENTAÇÃO ====================
  {
    id: 'regras',
    nome: 'Regras e Normas',
    categoria: 'documentacao',
    descricao: 'Regras internas',
    legado: true,
  },
  {
    id: 'dicas-seguranca',
    nome: 'Dicas de Segurança',
    categoria: 'documentacao',
    descricao: 'Dicas de segurança',
    legado: true,
  },
  {
    id: 'links-uteis',
    nome: 'Links Úteis',
    categoria: 'documentacao',
    descricao: 'Links importantes',
    legado: true,
  },
  {
    id: 'telefones-uteis',
    nome: 'Telefones Úteis',
    categoria: 'documentacao',
    descricao: 'Telefones de emergência',
    legado: true,
  },

  // ==================== MÍDIA ====================
  {
    id: 'galeria',
    nome: 'Galeria de Fotos',
    categoria: 'midia',
    descricao: 'Galeria de fotos',
    legado: true,
  },
  {
    id: 'realizacoes',
    nome: 'Realizações',
    categoria: 'midia',
    descricao: 'Realizações da gestão',
    legado: true,
  },
  {
    id: 'melhorias',
    nome: 'Melhorias',
    categoria: 'midia',
    descricao: 'Melhorias realizadas',
    legado: true,
  },
  {
    id: 'aquisicoes',
    nome: 'Aquisições',
    categoria: 'midia',
    descricao: 'Novas aquisições',
    legado: true,
  },

  // ==================== PUBLICIDADE ====================
  {
    id: 'publicidade',
    nome: 'Publicidade',
    categoria: 'publicidade',
    descricao: 'Gestão de anunciantes',
    legado: true,
  },

  // ==================== PROJETOS ====================
  {
    id: 'revistas',
    nome: 'Meus Projetos',
    categoria: 'projetos',
    descricao: 'Apps, revistas e relatórios',
    legado: true,
  },

  // ==================== GESTÃO ====================
  {
    id: 'moradores',
    nome: 'Moradores',
    categoria: 'gestao',
    descricao: 'Gestão de moradores',
    legado: true,
  },
  {
    id: 'funcionarios',
    nome: 'Funcionários',
    categoria: 'gestao',
    descricao: 'Gestão de funcionários',
  },
  {
    id: 'vagas',
    nome: 'Vagas de Estacionamento',
    categoria: 'gestao',
    descricao: 'Gestão de vagas',
    legado: true,
  },
  {
    id: 'equipe',
    nome: 'Equipe de Gestão',
    categoria: 'gestao',
    descricao: 'Membros da equipe',
    legado: true,
  },
  {
    id: 'equipes',
    nome: 'Equipes de Serviço',
    categoria: 'gestao',
    descricao: 'Times de funcionários que recebem a O.S. designada',
  },

  // ==================== RELATÓRIOS ====================
  {
    id: 'painel-controlo',
    nome: 'Painel de Controlo',
    categoria: 'relatorios',
    descricao: 'Estatísticas e gráficos',
    // o componente de gráficos existe e não é usado em tela nenhuma.
    legado: true,
  },
  {
    id: 'painel-pendencias',
    nome: 'Chamados em Aberto',
    categoria: 'relatorios',
    descricao: 'Faixa com o que espera resposta, de todas as funções',
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    categoria: 'relatorios',
    descricao: 'Relatórios detalhados',
    // não há tela de relatório no painel; /relatorio é página de venda.
    legado: true,
  },

  // ==================== MÓDULOS EXCLUSIVOS DE CLIENTE ====================
  // Adicione aqui módulos feitos sob medida. Use `visibilidade: 'restrito'` e
  // liste os tenants autorizados — os demais clientes não veem o módulo nem no
  // catálogo de configuração.
  //
  // Exemplo:
  // {
  //   id: 'checagem-detalhada',
  //   nome: 'Checagem Detalhada',
  //   categoria: 'operacional',
  //   descricao: 'Checagem com observação e edição de imagem',
  //   visibilidade: 'restrito',
  //   tenants: [7],
  // },
] as const;

const MODULOS_POR_ID = new Map(MODULOS.map((m) => [m.id, m]));

export function getModulo(id: string): ModuloManifest | undefined {
  return MODULOS_POR_ID.get(id);
}

export function isModuloRestrito(m: ModuloManifest): boolean {
  return m.visibilidade === 'restrito';
}

/**
 * O tenant tem permissão de *enxergar* este módulo?
 * Independe de estar habilitado — responde apenas "existe para este cliente?".
 */
export function tenantPodeVerModulo(modulo: ModuloManifest, tenantId: number): boolean {
  if (!isModuloRestrito(modulo)) return true;
  return (modulo.tenants ?? []).includes(tenantId);
}

/**
 * Catálogo visível para um tenant.
 *
 * Esconde módulo restrito de terceiros e o legado de condomínio — o cliente não
 * escolhe entre 43 itens, escolhe entre os que fazem sentido para manutenção.
 */
export function catalogoDoTenant(tenantId: number): ModuloManifest[] {
  return MODULOS.filter((m) => !m.legado && tenantPodeVerModulo(m, tenantId));
}

/**
 * IDs que entram ligados quando um cliente novo é criado.
 *
 * É um pacote só, igual para todo segmento: quem abre a conta encontra o
 * sistema de manutenção inteiro e desliga o que não quiser. Antes cada segmento
 * tinha a sua lista, e a diferença entre elas nunca foi decidida por ninguém —
 * era herança de quando o produto era um sistema de condomínio.
 */
export function modulosPadrao(): string[] {
  return MODULOS.filter(
    (m) => !isModuloRestrito(m) && !m.legado && m.padrao !== false,
  ).map((m) => m.id);
}

/** Todos os IDs conhecidos — usado em migrations e seeds. */
export const TODOS_MODULO_IDS: string[] = MODULOS.map((m) => m.id);
