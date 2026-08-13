/**
 * Cor dos registros: uma paleta só para todo o sistema.
 *
 * Antes, cada tela escolhia a sua: a prioridade "alta" era laranja na Lista de
 * Tarefas, cinza na Manutenção e sem cor nenhuma no painel do funcionário. Quem
 * usa o sistema aprende a cor uma vez e ela precisa significar o mesmo em
 * qualquer lugar — por isso o mapa vive aqui, e não dentro das páginas.
 *
 * São sete tons e nada além disso. Cada tom tem quatro valores: `fundo` para a
 * etiqueta, `forte` para o botão escolhido, `suave` para tingir uma linha
 * inteira sem apagar o texto, e `texto`/`borda` para o contorno. Limitar a
 * paleta é o que evita o carnaval — a cor destaca porque é escassa.
 */

export interface Tom {
  /** Cor do texto sobre `fundo` ou `suave`. */
  texto: string;
  /** Preenchimento da etiqueta e do botão em repouso. */
  fundo: string;
  /** Fundo bem claro, para tingir a linha ou o cartão inteiro. */
  suave: string;
  /** Preenchimento do botão escolhido, com texto branco. */
  forte: string;
  borda: string;
}

const TONS = {
  verde: { texto: "#166534", fundo: "#dcfce7", suave: "#f0fdf4", forte: "#16a34a", borda: "#86efac" },
  azul: { texto: "#1e40af", fundo: "#dbeafe", suave: "#eff6ff", forte: "#2563eb", borda: "#93c5fd" },
  ambar: { texto: "#92400e", fundo: "#fef3c7", suave: "#fffbeb", forte: "#d97706", borda: "#fcd34d" },
  laranja: { texto: "#9a3412", fundo: "#ffedd5", suave: "#fff7ed", forte: "#ea580c", borda: "#fdba74" },
  vermelho: { texto: "#991b1b", fundo: "#fee2e2", suave: "#fef2f2", forte: "#dc2626", borda: "#fca5a5" },
  roxo: { texto: "#5b21b6", fundo: "#ede9fe", suave: "#f5f3ff", forte: "#7c3aed", borda: "#c4b5fd" },
  cinza: { texto: "#475569", fundo: "#f1f5f9", suave: "#f8fafc", forte: "#64748b", borda: "#cbd5e1" },
  /** Reservado para "anexar foto/arquivo": ação, não situação. */
  ciano: { texto: "#0369a1", fundo: "#e0f2fe", suave: "#f0f9ff", forte: "#0284c7", borda: "#7dd3fc" },
} satisfies Record<string, Tom>;

export const TOM_ANEXO: Tom = TONS.ciano;

export interface Rotulado extends Tom {
  rotulo: string;
}

/**
 * Situação dos registros de manutenção, vistoria, checklist e ocorrência.
 *
 * As quatro primeiras são as que a tela oferece. `acao_necessaria` e `rascunho`
 * ficam aqui só para os registros antigos continuarem coloridos e nomeados —
 * ninguém escolhe mais essas duas.
 */
export const STATUS_REGISTRO: Record<string, Rotulado> = {
  pendente: { rotulo: "Pendente", ...TONS.ambar },
  realizada: { rotulo: "Realizada", ...TONS.azul },
  finalizada: { rotulo: "Finalizada", ...TONS.verde },
  reaberta: { rotulo: "Reaberta", ...TONS.roxo },
  acao_necessaria: { rotulo: "Requer ação", ...TONS.vermelho },
  rascunho: { rotulo: "Rascunho", ...TONS.cinza },
};

/** O que a tela deixa escolher, na ordem em que o serviço acontece. */
export const STATUS_ESCOLHA = ["pendente", "realizada", "finalizada", "reaberta"] as const;
export type StatusRegistro = (typeof STATUS_ESCOLHA)[number];

/** Prioridade: do verde tranquilo ao vermelho que não espera. */
export const PRIORIDADE_REGISTRO: Record<string, Rotulado> = {
  baixa: { rotulo: "Baixa", ...TONS.verde },
  media: { rotulo: "Média", ...TONS.azul },
  alta: { rotulo: "Alta", ...TONS.laranja },
  urgente: { rotulo: "Urgente", ...TONS.vermelho },
};

export const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type PrioridadeRegistro = (typeof PRIORIDADES)[number];

/** Situação de prazo — a mesma leitura do calendário. */
export const SITUACAO_PRAZO: Record<string, Rotulado> = {
  vencido: { rotulo: "Passou do prazo", ...TONS.vermelho },
  proximo: { rotulo: "Está chegando", ...TONS.ambar },
  em_dia: { rotulo: "Dentro do prazo", ...TONS.verde },
  concluido: { rotulo: "Já resolvido", ...TONS.cinza },
};

/**
 * Fase da foto. A cor no seletor é o recado de que existe mais de uma: em
 * "Antes" ele fica âmbar; ao trocar para "Depois", fica verde. Sem isso as
 * pessoas anexavam tudo em "Antes" sem perceber que havia "Depois".
 */
export const FASE_FOTO: Record<string, Rotulado> = {
  antes: { rotulo: "Antes", ...TONS.ambar },
  durante: { rotulo: "Durante", ...TONS.azul },
  depois: { rotulo: "Depois", ...TONS.verde },
};

/** Tom de um valor desconhecido: cinza, nunca sem cor. */
export function tomDe(mapa: Record<string, Rotulado>, chave?: string | null): Rotulado {
  if (chave && mapa[chave]) return mapa[chave];
  return { rotulo: chave ?? "—", ...TONS.cinza };
}

/** Etiqueta: fundo claro, texto escuro, contorno da mesma família. */
export function estiloEtiqueta(tom: Tom) {
  return { color: tom.texto, backgroundColor: tom.fundo, borderColor: tom.borda };
}

/** Botão de opção: forte quando escolhido, claro quando não. */
export function estiloOpcao(tom: Tom, escolhido: boolean) {
  return escolhido
    ? { color: "#fff", backgroundColor: tom.forte, borderColor: tom.forte }
    : { color: tom.texto, backgroundColor: tom.fundo, borderColor: tom.borda };
}

/** Linha ou cartão tingido: fundo quase branco, borda visível. */
export function estiloLinha(tom: Tom) {
  return { backgroundColor: tom.suave, borderColor: tom.borda };
}
