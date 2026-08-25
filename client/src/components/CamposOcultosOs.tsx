import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CAMPOS_OCULTAVEIS_OS } from "@shared/camposOcultaveisOs";
import { Eye, EyeOff, Loader2, SlidersHorizontal } from "lucide-react";

/**
 * Quais blocos da O.S. este cliente não vê, e o modo de escolher.
 *
 * Existe para o produto parar de ser negociado campo a campo: em vez de apagar
 * no código o que um cliente não usa — o que o tira de todos os outros —, o
 * gestor esconde o que quiser e a escolha fica gravada por cliente, valendo em
 * todas as unidades dele.
 */
export type ControleCamposOcultos = {
  /** Este bloco está escondido para este cliente? */
  oculto: (id: string) => boolean;
  /**
   * O bloco deve ser desenhado?
   *
   * No modo de escolha nada some: quem está escolhendo precisa enxergar o que
   * desligou para poder voltar atrás.
   */
  visivel: (id: string) => boolean;
  editando: boolean;
  setEditando: (valor: boolean) => void;
  alternar: (id: string) => void;
  salvando: boolean;
  quantosOcultos: number;
};

/**
 * O controlador, criado uma vez pela tela que desenha o formulário.
 *
 * Sem contexto de propósito: o provedor teria de ficar num componente acima
 * deste, e a tela da O.S. é um componente só — o hook chamado ao lado do
 * provedor não enxergaria o valor. Passar o controle por prop é mais verboso e
 * não tem essa armadilha.
 */
export function useCamposOcultosOs(
  condominioId: number,
  /** Só quem gerencia escolhe: o servidor recusa a gravação do funcionário. */
  podeEditar: boolean,
): ControleCamposOcultos {
  const utils = trpc.useUtils();
  const [editando, setEditando] = useState(false);

  const { data } = trpc.ordensServico.camposOcultos.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
  );

  const salvar = trpc.ordensServico.setCamposOcultos.useMutation({
    onSuccess: async (res) => {
      await utils.ordensServico.camposOcultos.invalidate();
      // Dizer em quantas unidades valeu responde a dúvida seguinte, que é
      // sempre "preciso repetir isso nas outras?".
      if (res.unidades > 1) toast.success(`Aplicado nas ${res.unidades} unidades`);
    },
    onError: (e) => toast.error(e.message || "Não foi possível salvar"),
  });

  const ocultos = data ?? [];
  const oculto = (id: string) => ocultos.includes(id);

  return {
    oculto,
    visivel: (id) => !oculto(id) || editando,
    editando: editando && podeEditar,
    setEditando,
    salvando: salvar.isPending,
    quantosOcultos: ocultos.length,
    alternar: (id) =>
      salvar.mutate({
        condominioId,
        campos: oculto(id) ? ocultos.filter((atual) => atual !== id) : [...ocultos, id],
      }),
  };
}

/**
 * Envolve um bloco do formulário: some quando escondido, ganha o olho no modo
 * de escolha.
 *
 * Fora do modo de escolha e sem estar escondido, não desenha nada em volta —
 * é o mesmo bloco de sempre, sem uma casca a mais no HTML.
 */
export function BlocoDaOs({
  id,
  ctl,
  children,
}: {
  id: string;
  ctl: ControleCamposOcultos;
  children: React.ReactNode;
}) {
  const escondido = ctl.oculto(id);

  if (escondido && !ctl.editando) return null;
  if (!ctl.editando) return <>{children}</>;

  const campo = CAMPOS_OCULTAVEIS_OS.find((c) => c.id === id);

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-2 ${
        escondido ? "border-slate-200 bg-slate-50" : "border-indigo-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-medium text-slate-500 truncate">
          {campo?.rotulo ?? id}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 shrink-0 ${
            escondido ? "text-slate-500" : "text-indigo-600 hover:bg-indigo-50"
          }`}
          disabled={ctl.salvando}
          onClick={() => ctl.alternar(id)}
          aria-label={escondido ? `Mostrar ${campo?.rotulo ?? id}` : `Ocultar ${campo?.rotulo ?? id}`}
        >
          {ctl.salvando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : escondido ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span className="text-xs">{escondido ? "Oculto" : "Ocultar"}</span>
        </Button>
      </div>

      {/* O bloco escondido continua à vista aqui, apagado e sem aceitar
          clique: some da ordem, mas quem escolhe precisa ver o que desligou. */}
      <div className={escondido ? "opacity-40 pointer-events-none select-none" : ""}>
        {children}
      </div>
    </div>
  );
}

/**
 * O botão que liga e desliga o modo de escolha, e a faixa que explica o modo.
 *
 * Fica no topo do formulário, e só para quem gerencia.
 */
export function BarraOcultarFuncoes({ ctl }: { ctl: ControleCamposOcultos }) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={ctl.editando ? "default" : "outline"}
        size="sm"
        className="w-full"
        onClick={() => ctl.setEditando(!ctl.editando)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {ctl.editando
          ? "Concluir"
          : ctl.quantosOcultos > 0
            ? `Ocultar funções (${ctl.quantosOcultos} ocultas)`
            : "Ocultar funções da ordem de serviço"}
      </Button>

      {ctl.editando && (
        <p className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
          Toque no olho de cada bloco para tirá-lo da ordem de serviço. Vale para todas as
          unidades e pode ser desfeito aqui mesmo. Título, {"unidade"} e prazo não saem: sem
          eles a ordem não pode ser criada.
        </p>
      )}
    </div>
  );
}
