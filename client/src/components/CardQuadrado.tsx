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
  novidade = false,
  onClick,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor?: number | string;
  descricao: string;
  /**
   * Entrou registro nesta função desde a última vez que a pessoa a abriu.
   *
   * Pisca em amarelo e marca "novo": o total sozinho não diz se mudou, e quem
   * olha o hub de manhã precisa saber onde chegou coisa sem abrir uma por uma.
   */
  novidade?: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      /**
       * `py-0 gap-0`: o Card traz 24px de folga em cima e embaixo, que somavam
       * aos 16px do conteúdo dentro de um quadrado do tamanho da coluna. No
       * celular sobravam menos de 50px para ícone, título, número e descrição.
       *
       * `min-h-fit`: quando ainda assim não couber — fonte grande, título de
       * duas linhas — o cartão cresce. Antes ele mantinha o quadrado e o texto
       * subia por cima do ícone.
       */
      className={`aspect-square min-h-fit py-0 gap-0 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all ${
        novidade ? "animate-novidade" : ""
      }`}
    >
      {/* Escalas menores no celular: é onde a coluna tem ~130px e onde o
          conteúdo estourava o quadrado. A partir de `sm` volta ao tamanho de
          antes. */}
      <CardContent className="h-full p-3 sm:p-4 flex flex-col gap-1">
        {/* `shrink-0` em cada bloco: o flex encolhe filho por filho quando o
            conteúdo passa da altura, e é isso que fazia ícone e palavra
            ocuparem o mesmo lugar. Aqui nada encolhe — o cartão é que cede. */}
        <div className="flex items-start justify-between gap-2 shrink-0">
          <span className="shrink-0">{icone}</span>
          {novidade && (
            <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
              novo
            </span>
          )}
        </div>
        <p className="text-sm sm:text-base font-semibold text-slate-800 leading-tight line-clamp-2 shrink-0">
          {titulo}
        </p>
        {valor !== undefined && (
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-auto shrink-0 leading-none">
            {valor}
          </p>
        )}
        <p
          className={`text-[11px] sm:text-xs text-slate-500 line-clamp-2 shrink-0 ${
            valor === undefined ? "mt-auto" : ""
          }`}
        >
          {descricao}
        </p>
      </CardContent>
    </Card>
  );
}

export default CardQuadrado;
