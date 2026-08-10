import { useEffect, useRef, useState } from "react";

/**
 * Revela o bloco quando ele entra na tela.
 *
 * Existe para dar ritmo à página inicial sem trazer de volta uma biblioteca de
 * animação — o `framer-motion` custava mais de 100 kB no pacote e a página só
 * precisa de um fade com deslocamento. Respeita quem pediu menos movimento no
 * sistema operacional.
 */
export function useRevelar<T extends HTMLElement = HTMLDivElement>() {
  const referencia = useRef<T | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const alvo = referencia.current;
    if (!alvo) return;

    const prefereMenosMovimento = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (prefereMenosMovimento || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setVisivel(true);
        observador.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  const classe = `transition-all duration-700 ease-out ${
    visivel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
  }`;

  return { referencia, classe };
}
