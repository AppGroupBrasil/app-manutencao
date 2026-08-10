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

/** Segmento de mercado do tenant. Define o pacote de módulos padrão. */
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
  /** Segmentos que recebem este módulo habilitado por padrão. */
  segmentos?: Segmento[];
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

const TODOS_SEGMENTOS: Segmento[] = [...SEGMENTOS_VALIDOS];

/** Núcleo operacional: serve a qualquer segmento. */
const OPERACIONAL_BASE: Segmento[] = TODOS_SEGMENTOS;

/**
 * Todos menos rede educacional. O módulo continua existindo e disponível para
 * condomínio — só não entra no pacote padrão de escola/creche, que trabalha
 * comunicação e revista por fora do sistema.
 */
const EXCETO_EDUCACIONAL: Segmento[] = TODOS_SEGMENTOS.filter((s) => s !== 'educacional');

export const MODULOS: readonly ModuloManifest[] = [
  // ==================== COMUNICAÇÃO ====================
  {
    id: 'avisos',
    nome: 'Avisos',
    categoria: 'comunicacao',
    descricao: 'Publicar avisos e comunicados',
    segmentos: EXCETO_EDUCACIONAL,
  },
  {
    id: 'comunicados',
    nome: 'Comunicados',
    categoria: 'comunicacao',
    descricao: 'Enviar comunicados oficiais',
    segmentos: ['condominio', 'facilities'],
  },
  {
    id: 'notificacoes',
    nome: 'Notificações',
    categoria: 'comunicacao',
    descricao: 'Sistema de notificações',
    segmentos: EXCETO_EDUCACIONAL,
  },
  {
    id: 'notificar-morador',
    nome: 'Notificar Morador',
    categoria: 'comunicacao',
    descricao: 'Notificar moradores individualmente',
    segmentos: ['condominio'],
  },

  // ==================== AGENDA ====================
  {
    id: 'eventos',
    nome: 'Eventos',
    categoria: 'agenda',
    descricao: 'Gestão de eventos',
    segmentos: ['condominio', 'academia'],
  },
  {
    id: 'agenda-vencimentos',
    nome: 'Agenda de Vencimentos',
    categoria: 'agenda',
    descricao: 'Controle de vencimentos',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'reservas',
    nome: 'Reservas',
    categoria: 'agenda',
    descricao: 'Reserva de áreas comuns',
    segmentos: ['condominio', 'academia'],
  },

  // ==================== OPERACIONAL ====================
  {
    id: 'vistorias',
    nome: 'Vistorias',
    categoria: 'operacional',
    descricao: 'Registro de vistorias',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'manutencoes',
    nome: 'Manutenções',
    categoria: 'operacional',
    descricao: 'Controle de manutenções',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'ocorrencias',
    nome: 'Ocorrências',
    categoria: 'operacional',
    descricao: 'Registro de ocorrências',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'checklists',
    nome: 'Checklists',
    categoria: 'operacional',
    descricao: 'Listas de verificação',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'antes-depois',
    nome: 'Antes e Depois',
    categoria: 'operacional',
    descricao: 'Registro de melhorias',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'ordens-servico',
    nome: 'Ordens de Serviço',
    categoria: 'operacional',
    descricao: 'Gestão de ordens de serviço',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'timeline',
    nome: 'Timeline',
    categoria: 'operacional',
    descricao: 'Registro de eventos e atualizações',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'tarefas-agendadas',
    nome: 'Lista de Tarefas',
    categoria: 'operacional',
    descricao: 'Tarefas atribuídas à equipe, com recorrência e execução',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'quadro-atividades',
    nome: 'Quadro de Atividades',
    categoria: 'operacional',
    descricao: 'Quadro visual da equipe, com as atividades por rotina e responsável',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'qrcode',
    nome: 'QR Code',
    categoria: 'operacional',
    descricao: 'Pontos com QR Code e registros enviados por quem escaneia',
    segmentos: OPERACIONAL_BASE,
  },
  {
    id: 'leitura-medidores',
    nome: 'Leitura de Medidores',
    categoria: 'operacional',
    descricao: 'Registro de leituras de água, gás e energia',
    segmentos: ['condominio', 'metalurgia', 'facilities'],
  },
  {
    id: 'controle-pragas',
    nome: 'Controle de Pragas',
    categoria: 'operacional',
    descricao: 'Registros de dedetização e controle de pragas',
    // Fora do pacote da ASA por decisão do cliente, apesar da exigência
    // sanitária em creche/escola: eles controlam dedetização por fora.
    segmentos: ['condominio', 'facilities'],
  },
  {
    id: 'jardinagem',
    nome: 'Jardinagem',
    categoria: 'operacional',
    descricao: 'Serviços de jardinagem e áreas verdes',
    segmentos: ['condominio', 'facilities'],
  },

  // ==================== INTERATIVO ====================
  {
    id: 'votacoes',
    nome: 'Votações',
    categoria: 'interativo',
    descricao: 'Sistema de votações',
    segmentos: ['condominio'],
  },
  {
    id: 'classificados',
    nome: 'Classificados',
    categoria: 'interativo',
    descricao: 'Classificados dos moradores',
    segmentos: ['condominio'],
  },
  {
    id: 'achados-perdidos',
    nome: 'Achados e Perdidos',
    categoria: 'interativo',
    descricao: 'Itens perdidos e encontrados',
    segmentos: ['condominio', 'academia'],
  },
  {
    id: 'caronas',
    nome: 'Caronas',
    categoria: 'interativo',
    descricao: 'Sistema de caronas',
    segmentos: ['condominio'],
  },

  // ==================== DOCUMENTAÇÃO ====================
  {
    id: 'regras',
    nome: 'Regras e Normas',
    categoria: 'documentacao',
    descricao: 'Regras internas',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'dicas-seguranca',
    nome: 'Dicas de Segurança',
    categoria: 'documentacao',
    descricao: 'Dicas de segurança',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'links-uteis',
    nome: 'Links Úteis',
    categoria: 'documentacao',
    descricao: 'Links importantes',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'telefones-uteis',
    nome: 'Telefones Úteis',
    categoria: 'documentacao',
    descricao: 'Telefones de emergência',
    segmentos: TODOS_SEGMENTOS,
  },

  // ==================== MÍDIA ====================
  {
    id: 'galeria',
    nome: 'Galeria de Fotos',
    categoria: 'midia',
    descricao: 'Galeria de fotos',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'realizacoes',
    nome: 'Realizações',
    categoria: 'midia',
    descricao: 'Realizações da gestão',
    segmentos: ['condominio'],
  },
  {
    id: 'melhorias',
    nome: 'Melhorias',
    categoria: 'midia',
    descricao: 'Melhorias realizadas',
    segmentos: ['condominio', 'facilities'],
  },
  {
    id: 'aquisicoes',
    nome: 'Aquisições',
    categoria: 'midia',
    descricao: 'Novas aquisições',
    segmentos: ['condominio', 'facilities'],
  },

  // ==================== PUBLICIDADE ====================
  {
    id: 'publicidade',
    nome: 'Publicidade',
    categoria: 'publicidade',
    descricao: 'Gestão de anunciantes',
    segmentos: ['condominio'],
  },

  // ==================== PROJETOS ====================
  {
    id: 'revistas',
    nome: 'Meus Projetos',
    categoria: 'projetos',
    descricao: 'Apps, revistas e relatórios',
    segmentos: EXCETO_EDUCACIONAL,
  },

  // ==================== GESTÃO ====================
  {
    id: 'moradores',
    nome: 'Moradores',
    categoria: 'gestao',
    descricao: 'Gestão de moradores',
    segmentos: ['condominio'],
  },
  {
    id: 'funcionarios',
    nome: 'Funcionários',
    categoria: 'gestao',
    descricao: 'Gestão de funcionários',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'vagas',
    nome: 'Vagas de Estacionamento',
    categoria: 'gestao',
    descricao: 'Gestão de vagas',
    segmentos: ['condominio'],
  },
  {
    id: 'equipe',
    nome: 'Equipe de Gestão',
    categoria: 'gestao',
    descricao: 'Membros da equipe',
    segmentos: TODOS_SEGMENTOS,
  },

  // ==================== RELATÓRIOS ====================
  {
    id: 'painel-controlo',
    nome: 'Painel de Controlo',
    categoria: 'relatorios',
    descricao: 'Estatísticas e gráficos',
    segmentos: TODOS_SEGMENTOS,
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    categoria: 'relatorios',
    descricao: 'Relatórios detalhados',
    segmentos: TODOS_SEGMENTOS,
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

/** Catálogo visível para um tenant (esconde módulos restritos de terceiros). */
export function catalogoDoTenant(tenantId: number): ModuloManifest[] {
  return MODULOS.filter((m) => tenantPodeVerModulo(m, tenantId));
}

/** IDs de módulos ligados por padrão ao criar um tenant de dado segmento. */
export function modulosPadraoDoSegmento(segmento: Segmento): string[] {
  return MODULOS.filter(
    (m) => !isModuloRestrito(m) && (m.segmentos ?? []).includes(segmento),
  ).map((m) => m.id);
}

/** Todos os IDs conhecidos — usado em migrations e seeds. */
export const TODOS_MODULO_IDS: string[] = MODULOS.map((m) => m.id);
