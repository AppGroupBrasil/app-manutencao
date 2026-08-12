import { useSearch } from "wouter";

/**
 * Termo de busca vindo do endereço (`?busca=OS-260810-0042`).
 *
 * É como o Calendário abre a função: em vez de largar a pessoa numa lista de
 * duzentos registros, a tela já entra filtrada pelo protocolo daquele item.
 * Vale como valor inicial do campo — depois disso quem manda é quem digita.
 */
export function useBuscaInicial(): string {
  const search = useSearch();
  return new URLSearchParams(search).get("busca") ?? "";
}

export default useBuscaInicial;
