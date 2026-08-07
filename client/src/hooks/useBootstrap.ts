import { useCallback, useEffect, useMemo } from "react";
import i18n from "@/i18n";
import { trpc } from "@/lib/trpc";

/**
 * Estado inicial da organização logada: módulos liberados, marca e vocabulário.
 *
 * É a fonte de verdade do client sobre o que existe para este cliente. O
 * servidor bloqueia de qualquer jeito (moduloProcedure), mas é isto que evita
 * renderizar um menu que levaria a um FORBIDDEN.
 */
export function useBootstrap() {
  const query = trpc.system.bootstrap.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const data = query.data;

  const modulos = useMemo(
    () => new Set(data?.modulosHabilitados ?? []),
    [data?.modulosHabilitados],
  );

  // Aplica a sobrescrita de vocabulário do tenant sobre o idioma corrente.
  // Ex.: { "menu.inspections": "Inspeções de Solda" } para uma metalúrgica.
  useEffect(() => {
    const labels = data?.labels;
    if (!labels || Object.keys(labels).length === 0) return;

    const aplicar = (lng: string) => {
      const aninhado: Record<string, unknown> = {};
      for (const [chave, valor] of Object.entries(labels)) {
        const partes = chave.split(".");
        let alvo = aninhado;
        partes.forEach((parte, i) => {
          if (i === partes.length - 1) alvo[parte] = valor;
          else alvo = (alvo[parte] ??= {}) as Record<string, unknown>;
        });
      }
      i18n.addResourceBundle(lng, "translation", aninhado, true, true);
    };

    aplicar(i18n.language);
    i18n.on("languageChanged", aplicar);
    return () => {
      i18n.off("languageChanged", aplicar);
    };
  }, [data?.labels]);

  /**
   * Enquanto não há resposta confiável do servidor não escondemos nada: o
   * bloqueio real é no tRPC (`moduloProcedure`). Esconder por falha de rede
   * deixaria a tela vazia sem motivo.
   */
  const indefinido = query.isLoading || query.isError || !data?.tenant;

  const temModulo = useCallback(
    (id: string) => indefinido || modulos.has(id),
    [indefinido, modulos],
  );

  const filtrarModulos = useCallback(
    <T,>(itens: T[], getId: (item: T) => string | undefined) =>
      itens.filter((item) => {
        const id = getId(item);
        return !id || temModulo(id);
      }),
    [temModulo],
  );

  return {
    tenant: data?.tenant ?? null,
    tenantsDisponiveis: data?.tenantsDisponiveis ?? [],
    modulosHabilitados: data?.modulosHabilitados ?? [],
    catalogo: data?.catalogo ?? [],
    labels: data?.labels ?? {},
    /** true quando o servidor ainda não disse quais módulos valem. */
    modulosIndefinidos: indefinido,
    temModulo,
    filtrarModulos,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
