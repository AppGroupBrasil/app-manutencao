import { useCallback, useEffect, useState } from "react";

/**
 * "Entrou coisa nova nesta função desde a última vez que você abriu ela?"
 *
 * A conta é pelo total: cada função já devolve quantos registros tem, e guardar
 * aqui o total do momento em que a pessoa abriu a tela responde a pergunta sem
 * endpoint novo nem coluna de "lido" no banco — que exigiria uma linha por
 * usuário, por função e por unidade.
 *
 * Fica por unidade porque o mesmo gerente cuida de várias: abrir as O.S. de São
 * José não pode apagar o aviso de que chegou ordem no Centro.
 *
 * Limite conhecido: apagar um registro e criar outro mantém o total, e nesse
 * caso não pisca. É o preço de não guardar estado no servidor.
 */
const CHAVE = "novidades-vistas";

type Vistos = Record<string, number>;

function ler(chave: string): Vistos {
  if (typeof window === "undefined") return {};
  try {
    const bruto = window.localStorage.getItem(chave);
    const dados: unknown = bruto ? JSON.parse(bruto) : {};
    return dados && typeof dados === "object" ? (dados as Vistos) : {};
  } catch {
    // Storage cheio, desligado ou com lixo dentro: o alerta não vale um erro
    // na tela — sem histórico, nada pisca.
    return {};
  }
}

function gravar(chave: string, vistos: Vistos): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(vistos));
  } catch {
    /* idem: gravar o "já vi" nunca pode derrubar a tela */
  }
}

export function useNovidades(condominioId: number) {
  const chave = `${CHAVE}:${condominioId}`;
  const [vistos, setVistos] = useState<Vistos>(() => ler(chave));

  // Trocar de unidade troca o histórico inteiro.
  useEffect(() => setVistos(ler(chave)), [chave]);

  /**
   * Nunca aberta ainda conta como novidade: é o caso mais comum de "tem O.S.
   * esperando e ninguém olhou". O aviso some no primeiro toque no cartão.
   */
  const temNovidade = useCallback(
    (funcao: string, total?: number | null): boolean => {
      if (typeof total !== "number" || total <= 0) return false;
      return total > (vistos[funcao] ?? 0);
    },
    [vistos],
  );

  const marcarVisto = useCallback(
    (funcao: string, total?: number | null): void => {
      if (typeof total !== "number") return;
      setVistos((atual) => {
        if (atual[funcao] === total) return atual;
        const novo = { ...atual, [funcao]: total };
        gravar(chave, novo);
        return novo;
      });
    },
    [chave],
  );

  /**
   * Registro excluído derruba o total abaixo do que já foi visto. Sem acertar a
   * marca, o próximo registro criado entraria calado — o total voltaria a um
   * número que a pessoa "já tinha visto".
   */
  const sincronizarQuedas = useCallback(
    (totais: Record<string, number | null | undefined>): void => {
      setVistos((atual) => {
        let mudou = false;
        const novo = { ...atual };
        for (const [funcao, total] of Object.entries(totais)) {
          if (typeof total !== "number") continue;
          if (novo[funcao] !== undefined && total < novo[funcao]) {
            novo[funcao] = total;
            mudou = true;
          }
        }
        if (!mudou) return atual;
        gravar(chave, novo);
        return novo;
      });
    },
    [chave],
  );

  return { temNovidade, marcarVisto, sincronizarQuedas };
}

export default useNovidades;
