import { useRevelar } from "@/hooks/useRevelar";

/** Bloco que aparece com um fade ao entrar na tela. */
export function Revelar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { referencia, classe } = useRevelar<HTMLDivElement>();
  return (
    <div ref={referencia} className={`${classe} ${className}`}>
      {children}
    </div>
  );
}

export default Revelar;
