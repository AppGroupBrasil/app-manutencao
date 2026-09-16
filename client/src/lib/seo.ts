import { useEffect } from "react";

/**
 * Título e descrição da página aberta.
 *
 * O site é de página única: sem isto, toda página pública (preços, cadastro,
 * apresentação) chega ao Google com o mesmo título do `index.html` e elas
 * competem entre si no resultado. O robô do Google executa o JavaScript, então
 * o que é escrito aqui é o que ele lê.
 *
 * Só mexe na aba do navegador e nas etiquetas do `<head>`; nada aparece na
 * tela. Ao sair da página, o padrão do `index.html` volta.
 */
const TITULO_PADRAO = "App Manutenção — Gestão de manutenção para empresas e condomínios";
const DESCRICAO_PADRAO =
  "Sistema de gestão de manutenção para empresas e condomínios: ordens de serviço, vistorias, checklists, agenda de vencimentos, QR Code por local e portal do funcionário. Teste grátis por 7 dias.";
const SITE = "https://appmanutencao.com.br";

function etiqueta(seletor: string, criar: () => HTMLElement): HTMLElement {
  const existente = document.head.querySelector(seletor);
  if (existente) return existente as HTMLElement;
  const nova = criar();
  document.head.appendChild(nova);
  return nova;
}

export function useSeo(titulo: string, descricao: string, caminho?: string) {
  useEffect(() => {
    const anteriorTitulo = document.title;
    const meta = etiqueta('meta[name="description"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      return m;
    });
    const canonico = etiqueta('link[rel="canonical"]', () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    const anteriorDescricao = meta.getAttribute("content") || DESCRICAO_PADRAO;
    const anteriorCanonico = canonico.getAttribute("href") || `${SITE}/`;

    document.title = `${titulo} — App Manutenção`;
    meta.setAttribute("content", descricao);
    if (caminho) canonico.setAttribute("href", `${SITE}${caminho}`);

    return () => {
      document.title = anteriorTitulo || TITULO_PADRAO;
      meta.setAttribute("content", anteriorDescricao);
      canonico.setAttribute("href", anteriorCanonico);
    };
  }, [titulo, descricao, caminho]);
}
