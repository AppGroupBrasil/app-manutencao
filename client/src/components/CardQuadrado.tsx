import { Card, CardContent } from "@/components/ui/card";

/**
 * Card quadrado: dois por linha em qualquer largura, do celular ao desktop.
 *
 * Vive aqui e não dentro de uma página porque o painel e o hub de Manutenções
 * precisam do mesmo desenho — quadrado com ícone em cima, rótulo, e o número
 * ou a descrição encostados na base.
 */
export function CardQuadrado({
  icone,
  titulo,
  valor,
  descricao,
  onClick,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor?: number | string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="aspect-square cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
    >
      <CardContent className="h-full p-4 flex flex-col">
        {/* `shrink-0`: sem isto o SVG é achatado pelo flex quando o texto do
            cartão cresce, e o ícone vira um risco de um pixel. */}
        <span className="shrink-0">{icone}</span>
        <p className="font-semibold text-slate-800 mt-2 leading-tight">{titulo}</p>
        {valor !== undefined && (
          <p className="text-3xl font-bold text-slate-900 mt-auto">{valor}</p>
        )}
        <p
          className={`text-xs text-slate-500 line-clamp-2 ${
            valor === undefined ? "mt-auto" : "mt-1"
          }`}
        >
          {descricao}
        </p>
      </CardContent>
    </Card>
  );
}

export default CardQuadrado;
