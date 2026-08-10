import { useMemo } from "react";
import { useBootstrap } from "./useBootstrap";
import { resolverVocabulario, type Vocabulario } from "@shared/vocabulario";

/**
 * Palavras do cliente ativo.
 *
 * Uma rede educacional chama de "unidade" e "setor"; uma metalúrgica, de
 * "planta" e "célula". Cada organização sobrescreve os termos em
 * `condominios.labels` (`vocab.unidade`, `vocab.setor`…) e as telas leem daqui,
 * em vez de trazerem o vocabulário de um cliente escrito no meio do JSX.
 *
 * Vale para gestor e para funcionário: o `bootstrap` atende as duas sessões.
 */
export function useVocabulario(): Vocabulario {
  const { labels } = useBootstrap();
  return useMemo(() => resolverVocabulario(labels), [labels]);
}
