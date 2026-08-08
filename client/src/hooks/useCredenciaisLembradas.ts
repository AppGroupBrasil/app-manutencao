import { useCallback, useState } from "react";

type Credenciais = { identificador: string; senha: string };

const vazio: Credenciais = { identificador: "", senha: "" };

/**
 * Guarda usuário/senha no localStorage quando o usuário marca "lembrar".
 * Só use em dispositivos pessoais: o navegador não protege esse conteúdo.
 */
export function useCredenciaisLembradas(chave: string) {
  const [salvas] = useState<Credenciais>(() => ler(chave));
  const [lembrar, setLembrar] = useState(() => Boolean(ler(chave).identificador));

  const persistir = useCallback(
    (credenciais: Credenciais) => {
      if (!lembrar) return limpar(chave);
      try {
        localStorage.setItem(chave, JSON.stringify(credenciais));
      } catch {
        /* storage cheio ou bloqueado: seguir sem lembrar */
      }
    },
    [chave, lembrar],
  );

  const alternarLembrar = useCallback(
    (ativo: boolean) => {
      setLembrar(ativo);
      if (!ativo) limpar(chave);
    },
    [chave],
  );

  return { salvas, lembrar, alternarLembrar, persistir };
}

function ler(chave: string): Credenciais {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return vazio;
    const dados = JSON.parse(bruto) as Partial<Credenciais>;
    return {
      identificador: typeof dados.identificador === "string" ? dados.identificador : "",
      senha: typeof dados.senha === "string" ? dados.senha : "",
    };
  } catch {
    return vazio;
  }
}

function limpar(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* ignore */
  }
}
