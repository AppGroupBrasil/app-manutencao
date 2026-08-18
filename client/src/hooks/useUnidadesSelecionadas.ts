import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useVocabulario } from "@/hooks/useVocabulario";

/** Unidade que viaja em `x-condominio-id` e resolve o tenant de cada chamada. */
const CHAVE_ATIVA = "condominio_ativo";
/** Unidades marcadas no seletor, para o painel somar mais de uma. */
const CHAVE_MARCADAS = "condominios_marcados";

/**
 * Storage sempre entre try/catch.
 *
 * Navegador em janela privada ou com cookies bloqueados lança ao ler e ao
 * gravar; sem a proteção, a exceção sobe no meio do render e derruba a tela
 * inteira em vez de apenas esquecer a marcação.
 */
function lerMarcadas(): number[] {
  try {
    const bruto = localStorage.getItem(CHAVE_MARCADAS);
    if (!bruto) return [];
    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.filter((id): id is number => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
}

function lerAtiva(): number {
  try {
    return Number(localStorage.getItem(CHAVE_ATIVA)) || 0;
  } catch {
    return 0;
  }
}

function gravar(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* sem storage a escolha vale só para esta visita */
  }
}

/**
 * Unidades que a tela está mostrando — uma, três ou todas.
 *
 * O gerente da rede não olha uma unidade por vez: ele compara duas, fecha o mês
 * de três, ou quer o total das quinze. Antes disso o painel só sabia trocar a
 * unidade ativa, e ver duas significava trocar, anotar, trocar de novo.
 *
 * A marcação fica no navegador porque é preferência de quem está olhando, não
 * dado do cliente — e some no logout junto com a unidade ativa, senão a próxima
 * pessoa a entrar neste navegador herda a seleção.
 *
 * `principal` continua sendo uma só: é ela que vai no cabeçalho da requisição e
 * decide de qual unidade são os cadastros (status, equipes) quando a tela
 * precisa de um. Somar é coisa da consulta, não da identidade.
 */
export function useUnidadesSelecionadas() {
  const utils = trpc.useUtils();
  const v = useVocabulario();
  const { data: unidades } = trpc.condominio.list.useQuery();

  const [marcadas, setMarcadas] = useState<number[]>(lerMarcadas);

  const idsExistentes = useMemo(() => (unidades ?? []).map((u) => u.id), [unidades]);

  /**
   * Marcação válida: só ids que ainda existem para esta conta.
   *
   * Sem isto, a unidade que saiu do alcance (gestor removido do vínculo, conta
   * trocada no mesmo navegador) continuaria pesando na soma e o servidor
   * simplesmente a descartaria — a tela mostraria um total que ninguém explica.
   * Nada marcado é a rede inteira: quem responde por várias quer o conjunto.
   */
  const validas = useMemo(() => {
    if (idsExistentes.length === 0) return [];
    const dentro = marcadas.filter((id) => idsExistentes.includes(id));
    return dentro.length > 0 ? dentro : idsExistentes;
  }, [marcadas, idsExistentes]);

  /**
   * Unidade do cabeçalho: a que já estava ativa, quando continua marcada.
   *
   * Trocar por outra a cada marcação faria os cadastros da tela (status da
   * O.S., equipes) pularem de unidade sem ninguém pedir.
   */
  const principal = useMemo(() => {
    const ativa = lerAtiva();
    if (ativa && validas.includes(ativa)) return ativa;
    return validas[0] ?? 0;
  }, [validas]);

  // O que está guardado precisa acompanhar o que a tela usa: é daqui que as
  // outras telas leem a unidade ativa, e o cabeçalho sai deste valor.
  useEffect(() => {
    if (principal > 0) gravar(CHAVE_ATIVA, String(principal));
  }, [principal]);

  useEffect(() => {
    if (validas.length > 0) gravar(CHAVE_MARCADAS, JSON.stringify(validas));
  }, [validas]);

  const todasMarcadas = idsExistentes.length > 0 && validas.length === idsExistentes.length;

  /** Tudo em cache é da seleção anterior — o tenant vai no cabeçalho. */
  const aplicar = useCallback(
    async (novas: number[]) => {
      setMarcadas(novas);
      await utils.invalidate();
    },
    [utils],
  );

  /** Marca ou desmarca uma unidade. A última marcada não sai: zero unidades
   * não é uma tela, é uma tela vazia. */
  const alternar = useCallback(
    (id: number) => {
      const dentro = validas.includes(id);
      if (dentro && validas.length === 1) return;
      void aplicar(dentro ? validas.filter((x) => x !== id) : [...validas, id]);
    },
    [validas, aplicar],
  );

  /** "Todas" no topo: marca a rede inteira ou volta para a unidade ativa. */
  const alternarTodas = useCallback(() => {
    void aplicar(todasMarcadas ? [principal] : idsExistentes);
  }, [todasMarcadas, principal, idsExistentes, aplicar]);

  const nomePrincipal = (unidades ?? []).find((u) => u.id === principal)?.nome ?? "";

  /** Texto do botão: o nome quando é uma, a contagem quando são várias. */
  const resumo = useMemo(() => {
    if (idsExistentes.length === 0) return `Sem ${v.unidade.toLowerCase()}`;
    if (validas.length === 1) return nomePrincipal;
    if (todasMarcadas) return `Todas as ${v.unidade.toLowerCase()}s (${validas.length})`;
    return `${validas.length} ${v.unidade.toLowerCase()}s`;
  }, [idsExistentes.length, validas.length, todasMarcadas, nomePrincipal, v]);

  return {
    /** Todas as unidades que a conta alcança, para desenhar a lista. */
    unidades: unidades ?? [],
    /** Ids marcados — é o que vai no campo `unidades` das consultas. */
    marcadas: validas,
    todasMarcadas,
    principal,
    nomePrincipal,
    /** Mais de uma unidade no alcance: sem isso o seletor não faz sentido. */
    temEscolha: idsExistentes.length > 1,
    resumo,
    alternar,
    alternarTodas,
  };
}

export default useUnidadesSelecionadas;
