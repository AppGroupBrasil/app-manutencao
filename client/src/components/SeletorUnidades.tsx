import { Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVocabulario } from "@/hooks/useVocabulario";

/**
 * O que o seletor precisa saber. `useUnidadesSelecionadas` devolve isto pronto;
 * a lista de O.S. monta o seu, porque lá a marcação filtra o que já veio do
 * servidor em vez de mudar a consulta.
 */
export interface SelecaoDeUnidades {
  unidades: { id: number; nome: string }[];
  /** Ids marcados. Nunca vazio: sem nenhuma, não há o que mostrar. */
  marcadas: number[];
  todasMarcadas: boolean;
  /** Mais de uma unidade no alcance — abaixo disso o seletor não aparece. */
  temEscolha: boolean;
  /** Texto do botão: o nome quando é uma, a contagem quando são várias. */
  resumo: string;
  alternar: (id: number) => void;
  alternarTodas: () => void;
}

/**
 * Lista de unidades com marcação, "Todas" no topo.
 *
 * A seleção vem por propriedade, e não de uma chamada do hook aqui dentro: cada
 * chamada tem o próprio estado, e duas cópias divergiriam — a tela somando três
 * unidades enquanto o botão mostra uma.
 */
export function SeletorUnidades({
  selecao,
  className,
}: {
  selecao: SelecaoDeUnidades;
  className?: string;
}) {
  const v = useVocabulario();
  const { unidades, marcadas, todasMarcadas, temEscolha, resumo, alternar, alternarTodas } = selecao;

  // Uma unidade só: não há o que escolher, e um botão que abre uma lista de um
  // item é só um clique a mais para ler o nome que já está na tela.
  if (!temEscolha) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 justify-between gap-2 text-xs font-normal ${className ?? ""}`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{resumo}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <div className="max-h-80 overflow-y-auto p-1">
          {/* No topo, antes de qualquer nome: é o estado em que a maioria fica,
              e ter de marcar quinze caixas para ver a rede não é escolha. */}
          <button
            type="button"
            onClick={alternarTodas}
            className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
          >
            <Checkbox checked={todasMarcadas} className="pointer-events-none" />
            <span className="font-medium">Todas as {v.unidade.toLowerCase()}s</span>
            <span className="ml-auto text-xs text-slate-400">{unidades.length}</span>
          </button>

          <div className="my-1 h-px bg-slate-100" />

          {unidades.map((u) => {
            const marcada = marcadas.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => alternar(u.id)}
                className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
              >
                <Checkbox checked={marcada} className="pointer-events-none" />
                <span className="truncate">{u.nome}</span>
              </button>
            );
          })}
        </div>

        {/* Desmarcar tudo deixaria a tela sem nada para mostrar; a última
            marcada fica, e dizer isso evita o clique que não responde. */}
        <p className="border-t px-3 py-2 text-[11px] leading-tight text-slate-500">
          Marque quantas quiser. Ao menos uma fica sempre marcada.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export default SeletorUnidades;
