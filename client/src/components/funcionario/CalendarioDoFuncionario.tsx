import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITUACAO_PRAZO } from "@/lib/coresRegistro";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/**
 * A agenda de quem executa, no portal.
 *
 * O funcionário entrava, escolhia a unidade e só então descobria se havia
 * serviço para ele naquele dia — e, quem atende várias, repetia isso unidade
 * por unidade. Aqui o mês já abre com as ordens que o procuram em todas elas:
 * o servidor decide quais são (equipe dele ou responsável) e de quais unidades,
 * pelo alcance da sessão, nunca pelo que a tela pedir.
 *
 * É o mesmo desenho do calendário do gestor, sem o que é dele: reprogramar
 * data, designar equipe e as funções administrativas do cliente.
 */

type ItemDaAgenda = {
  chave: string;
  id: number;
  protocolo: string | null;
  titulo: string;
  data: string;
  concluido: boolean;
  detalhe: string | null;
  rota: string;
  programada?: boolean;
  unidade?: string | null;
};

type Situacao = "vencido" | "proximo" | "em_dia" | "concluido";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Sete dias é o horizonte de quem executa — o mesmo do calendário do gestor. */
const DIAS_AMARELO = 7;

/** `AAAA-MM-DD` no fuso de quem olha a tela. */
function chaveDoDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function diasEntre(de: string, ate: string): number {
  const a = new Date(`${de}T12:00:00`).getTime();
  const b = new Date(`${ate}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function situacaoDe(item: ItemDaAgenda, hoje: string): Situacao {
  if (item.concluido) return "concluido";
  const dias = diasEntre(hoje, item.data);
  if (dias < 0) return "vencido";
  if (dias <= DIAS_AMARELO) return "proximo";
  return "em_dia";
}

/** A cor do dia é a do serviço mais urgente que cai nele. */
function situacaoDoDia(lista: ItemDaAgenda[], hoje: string): Situacao {
  const ordem: Situacao[] = ["vencido", "proximo", "em_dia", "concluido"];
  const presentes = new Set(lista.map((i) => situacaoDe(i, hoje)));
  return ordem.find((s) => presentes.has(s)) ?? "concluido";
}

function textoDoPrazo(item: ItemDaAgenda, hoje: string): string {
  if (item.concluido) return "já resolvido";
  const dias = diasEntre(hoje, item.data);
  if (dias < 0) return `${Math.abs(dias)} dia(s) em atraso`;
  if (dias === 0) return "é hoje";
  if (dias === 1) return "é amanhã";
  return `faltam ${dias} dia(s)`;
}

export function CalendarioDoFuncionario({ condominioId }: { condominioId: number }) {
  const [, setLocation] = useLocation();
  const hoje = chaveDoDia(new Date());
  const [mesVisivel, setMesVisivel] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });
  // Abre no dia de hoje: o portal existe para responder "o que é meu hoje?".
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(hoje);

  // Seis semanas fixas: a altura não muda ao trocar de mês e os dias vizinhos
  // também aparecem marcados.
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

  const de = chaveDoDia(celulas[0]);
  const ate = chaveDoDia(celulas[41]);

  /**
   * `todasUnidades` é o pedido "a minha rede inteira"; quem entra na soma sai
   * da sessão do funcionário, no servidor.
   */
  const { data: itens, isLoading, isError } = trpc.calendario.listar.useQuery(
    { condominioId, de, ate, todasUnidades: true },
    { enabled: condominioId > 0, retry: false },
  );

  const agenda = (itens ?? []) as ItemDaAgenda[];

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemDaAgenda[]>();
    for (const item of agenda) {
      const lista = mapa.get(item.data) ?? [];
      lista.push(item);
      mapa.set(item.data, lista);
    }
    return mapa;
  }, [agenda]);

  const doDiaDeHoje = porDia.get(hoje) ?? [];
  const itensDoDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];

  const trocarMes = (passo: number) => {
    setMesVisivel((atual) => new Date(atual.getFullYear(), atual.getMonth() + passo, 1));
    setDiaSelecionado(null);
  };

  // Módulo desligado para o cliente ou função não liberada para a pessoa: o
  // portal segue sem a agenda, em vez de mostrar um cartão com erro.
  if (isError) return null;

  return (
    <Card className="border-blue-200 bg-white/80 backdrop-blur-sm mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 leading-tight">Minha agenda</p>
            <p className="text-xs text-slate-500">
              {isLoading
                ? "carregando os serviços…"
                : doDiaDeHoje.length === 0
                  ? "nada marcado para hoje · toque num dia para ver os serviços"
                  : `${doDiaDeHoje.length} serviço(s) para hoje, de todas as suas unidades`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
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

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
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
              const tom = lista.length > 0 ? SITUACAO_PRAZO[situacaoDoDia(lista, hoje)] : null;

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
                  } ${chave === hoje ? "ring-1 ring-blue-400" : ""}`}
                >
                  <span>{data.getDate()}</span>
                  {tom && (
                    <span
                      className="text-[10px] font-semibold px-1.5 rounded-full text-white"
                      style={{ backgroundColor: tom.forte }}
                    >
                      {lista.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legenda: quem não conhece a cor não entende o calendário. */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t text-[11px] text-slate-500">
          {(["vencido", "proximo", "em_dia", "concluido"] as Situacao[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SITUACAO_PRAZO[s].forte }}
              />
              {SITUACAO_PRAZO[s].rotulo}
            </span>
          ))}
        </div>

        {diaSelecionado && (
          <div className="mt-3 border-t pt-3">
            <p className="text-xs font-medium text-slate-600 mb-2">
              {new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {itensDoDia.length === 0
                ? " · nenhum serviço seu"
                : ` · ${itensDoDia.length} serviço(s)`}
            </p>

            <ul className="space-y-2">
              {itensDoDia.map((item) => {
                const tom = SITUACAO_PRAZO[situacaoDe(item, hoje)];
                return (
                  <li key={item.chave}>
                    {/* O toque abre a ordem na aba do portal — a tela do gestor
                        devolveria "sessão expirada" para quem entra por aqui. */}
                    <button
                      type="button"
                      onClick={() => setLocation(item.rota)}
                      className="w-full text-left border rounded-lg px-3 py-2 hover:shadow-sm transition-all"
                      style={{ backgroundColor: tom.suave, borderColor: tom.borda }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {item.titulo}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                          style={{ color: tom.texto, backgroundColor: tom.fundo }}
                        >
                          {textoDoPrazo(item, hoje)}
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        {item.protocolo ? <span className="font-mono">{item.protocolo}</span> : null}
                        {/* Onde é o serviço: com as unidades somadas, dois
                            chamados iguais ficariam indistinguíveis. */}
                        {item.unidade ? (
                          <span className="font-medium text-slate-600 truncate">{item.unidade}</span>
                        ) : null}
                        {item.detalhe ? <span className="truncate">· {item.detalhe}</span> : null}
                        <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-slate-400" />
                      </span>

                      {/* Sem data programada, o dia mostrado é o prazo máximo:
                          dizer isso evita tratar o combinado como agendado. */}
                      {item.programada === false && (
                        <span className="block text-[11px] text-amber-700 mt-0.5">
                          esta é a data máxima — o serviço ainda não foi programado
                        </span>
                      )}
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

export default CalendarioDoFuncionario;
