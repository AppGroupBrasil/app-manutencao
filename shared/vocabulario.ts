/**
 * Palavras que mudam de negócio para negócio.
 *
 * O sistema nasceu para uma rede educacional, onde "unidade" é uma creche e
 * "setor" é o berçário. Numa metalúrgica seriam "planta" e "célula"; numa
 * administradora, "obra" e "pavimento". Em vez de reescrever tela, cada
 * organização sobrescreve estes termos em `condominios.labels`, com a chave
 * `vocab.<termo>` — o resto do texto continua igual.
 *
 * A lista é curta de propósito: só os substantivos que aparecem em título,
 * rótulo de campo e nome de função. Traduzir frase inteira por cliente vira
 * manutenção sem fim.
 */
export const VOCABULARIO_PADRAO = {
  unidade: "Unidade",
  unidades: "Unidades",
  setor: "Setor",
  local: "Local",
  gestor: "Gestor",
  /** Quem responde por todas as unidades do cliente: programa e encerra. */
  gerente: "Gerente",
  funcionario: "Funcionário",
  funcionarios: "Funcionários",
  equipe: "Equipe",
  ocorrencia: "Ocorrência",
  ocorrencias: "Ocorrências",
  vistoria: "Vistoria",
  vistorias: "Vistorias",
  checklist: "Checklist",
  checklists: "Checklists",
  manutencao: "Manutenção",
  manutencoes: "Manutenções",
  ordemServico: "Ordem de Serviço",
  ordensServico: "Ordens de Serviço",
  tarefa: "Tarefa",
  tarefas: "Lista de Tarefas",
  atividade: "Atividade",
  atividades: "Quadro de Atividades",
} as const;

export type TermoVocabulario = keyof typeof VOCABULARIO_PADRAO;

/**
 * Ponto de partida de cada segmento.
 *
 * Só os substantivos que mudam de nome no dia a dia do cliente. O que não
 * estiver aqui fica no padrão, e a plataforma pode ajustar qualquer termo na
 * abertura do cliente — isto é sugestão, não regra.
 */
export const VOCABULARIO_POR_SEGMENTO: Record<string, Partial<Record<TermoVocabulario, string>>> = {
  condominio: {
    unidade: "Condomínio",
    unidades: "Condomínios",
    setor: "Bloco",
    gestor: "Síndico",
    gerente: "Administradora",
  },
  metalurgia: {
    unidade: "Planta",
    unidades: "Plantas",
    setor: "Célula",
    gestor: "Coordenador",
    gerente: "Gerente industrial",
  },
  oficina: {
    unidade: "Oficina",
    unidades: "Oficinas",
    setor: "Box",
    gestor: "Encarregado",
  },
  academia: {
    unidade: "Academia",
    unidades: "Academias",
    setor: "Sala",
    gestor: "Coordenador",
  },
  facilities: {
    unidade: "Site",
    unidades: "Sites",
    setor: "Área",
    gestor: "Supervisor",
    gerente: "Gerente de contrato",
  },
  educacional: {
    unidade: "Unidade",
    unidades: "Unidades",
    setor: "Setor",
  },
};

/**
 * Labels (`vocab.*`) sugeridos para um segmento, prontos para gravar.
 *
 * Devolve só o que difere do padrão: gravar o dicionário inteiro faria toda
 * mudança futura no texto padrão parar de chegar nos clientes já abertos.
 */
export function labelsDoSegmento(segmento?: string | null): Record<string, string> {
  const preset = (segmento && VOCABULARIO_POR_SEGMENTO[segmento]) || {};
  const labels: Record<string, string> = {};

  for (const [termo, valor] of Object.entries(preset)) {
    if (valor && valor !== VOCABULARIO_PADRAO[termo as TermoVocabulario]) {
      labels[`${PREFIXO_VOCABULARIO}${termo}`] = valor;
    }
  }

  return labels;
}

export type Vocabulario = Record<TermoVocabulario, string>;

/** Prefixo das chaves em `condominios.labels`. */
export const PREFIXO_VOCABULARIO = "vocab.";

/**
 * Aplica a sobrescrita da organização sobre o padrão.
 *
 * Chave desconhecida é ignorada: `labels` também guarda sobrescrita de menu e
 * de tradução, que não têm nada a ver com esta lista.
 */
export function resolverVocabulario(
  labels?: Record<string, string> | null,
): Vocabulario {
  const resolvido = { ...VOCABULARIO_PADRAO } as Vocabulario;
  if (!labels) return resolvido;

  for (const [chave, valor] of Object.entries(labels)) {
    if (!chave.startsWith(PREFIXO_VOCABULARIO)) continue;
    const termo = chave.slice(PREFIXO_VOCABULARIO.length) as TermoVocabulario;
    if (termo in resolvido && typeof valor === "string" && valor.trim()) {
      resolvido[termo] = valor.trim();
    }
  }

  return resolvido;
}
