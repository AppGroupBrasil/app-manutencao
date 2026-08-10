import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { rotuloStatus } from "@/components/RegistroVencimento";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export type ItemCalendario = {
  id: number;
  titulo: string;
  tipo: string;
  dataVencimento: string | Date;
  diasRestantes: number;
  registroStatus?: string | null;
};

/** AAAA-MM-DD no fuso local — `toISOString` jogaria o dia para trás à noite. */
function chaveDoDia(valor: string | Date): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * Calendário mensal dos vencimentos de contratos, serviços e manutenções.
 *
 * Cada dia com registro é clicável e abre a lista daquele dia; cada item leva
 * ao registro de execução, onde entram fotos de antes e depois, descrição e a
 * situação (concluída, fora do prazo, antecipada, reagendada).
 */
export function CalendarioManutencoes({
  itens,
  rotuloTipo,
  onAbrirItem,
}: {
  itens: ItemCalendario[];
  rotuloTipo: (tipo: string) => string;
  onAbrirItem: (item: ItemCalendario) => void;
}) {
  const hoje = new Date();
  const [mesVisivel, setMesVisivel] = useState(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  );
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemCalendario[]>();
    for (const item of itens) {
      const chave = chaveDoDia(item.dataVencimento);
      if (!chave) continue;
      const lista = mapa.get(chave) ?? [];
      lista.push(item);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [itens]);

  // A grade começa no domingo da semana do dia 1 e cobre seis semanas: assim o
  // calendário não muda de altura ao trocar de mês.
  const celulas = useMemo(() => {
    const primeiro = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(primeiro.getDate() - primeiro.getDay());

    return Array.from({ length: 42 }, (_, i) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + i);
      return data;
    });
  }, [mesVisivel]);

  const chaveHoje = chaveDoDia(hoje);
  const itensDoDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];

  const trocarMes = (passo: number) => {
    setMesVisivel(
      (atual) => new Date(atual.getFullYear(), atual.getMonth() + passo, 1),
    );
    setDiaSelecionado(null);
  };

  /** Cor do dia: a situação registrada manda; sem registro, vale o prazo. */
  const corDoDia = (lista: ItemCalendario[]) => {
    const status = lista.find((i) => i.registroStatus)?.registroStatus;
    const info = rotuloStatus(status);
    if (info) return info.cor;
    if (lista.some((i) => i.diasRestantes < 0)) return "#c62828";
    if (lista.some((i) => i.diasRestantes <= 30)) return "#e65100";
    return "#2e7d32";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={() => trocarMes(-1)} aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold capitalize">
            {mesVisivel.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => trocarMes(1)} aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS_SEMANA.map((dia) => (
            <span key={dia} className="text-[11px] text-slate-400 py-1">
              {dia}
            </span>
          ))}

          {celulas.map((data) => {
            const chave = chaveDoDia(data);
            const lista = porDia.get(chave) ?? [];
            const doMes = data.getMonth() === mesVisivel.getMonth();
            const selecionado = diaSelecionado === chave;

            return (
              <button
                key={chave}
                type="button"
                disabled={lista.length === 0}
                onClick={() => setDiaSelecionado(selecionado ? null : chave)}
                className={`aspect-square rounded-md border text-xs flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  selecionado ? "border-slate-800 bg-slate-50" : "border-transparent"
                } ${doMes ? "text-slate-700" : "text-slate-300"} ${
                  lista.length > 0 ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                } ${chave === chaveHoje ? "ring-1 ring-blue-400" : ""}`}
              >
                <span>{data.getDate()}</span>
                {lista.length > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 rounded-full"
                    style={{ color: "#fff", backgroundColor: corDoDia(lista) }}
                  >
                    {lista.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {diaSelecionado && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-medium text-slate-600 mb-2">
              {new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
            <ul className="space-y-2">
              {itensDoDia.map((item) => {
                const status = rotuloStatus(item.registroStatus);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirItem(item)}
                      className="w-full text-left border rounded-lg px-3 py-2 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {item.titulo}
                        </span>
                        {status ? (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ color: status.cor, backgroundColor: status.fundo }}
                          >
                            {status.rotulo}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            sem registro
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {rotuloTipo(item.tipo)}
                        {item.diasRestantes < 0
                          ? ` · ${Math.abs(item.diasRestantes)} dia(s) em atraso`
                          : ` · faltam ${item.diasRestantes} dia(s)`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CalendarioManutencoes;
