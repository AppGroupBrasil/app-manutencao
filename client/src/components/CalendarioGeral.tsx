import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { SITUACAO_PRAZO, etapaDoFluxo } from "@/lib/coresRegistro";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Seta,
  Loader2,
} from "lucide-react";

/** Item como o servidor devolve; a cor é decidida aqui. */
type ItemCalendario = {
  chave: string;
  fonte: string;
  rotuloFonte: string;
  id: number;
  protocolo: string | null;
  titulo: string;
  data: string;
  concluido: boolean;
  detalhe: string | null;
  rota: string;
  /** Só na O.S. do fluxo: etapa, prazo combinado e se a data já foi marcada. */
  etapa?: string | null;
  prazoLimite?: string | null;
  programada?: boolean;
};

type Situacao = "vencido" | "proximo" | "em_dia" | "concluido";


const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Amarelo é "está chegando". Sete dias é o horizonte de quem executa; o
 * vencimento de contrato avisa antes disso por e-mail, na própria Agenda.
 */
const DIAS_AMARELO = 7;

/**
 * A cor sai do vocabulário do sistema: a mesma que a etiqueta de prazo usa nas
 * outras telas. `forte` marca o dia no calendário, `suave` tinge a linha do
 * chamado sem atrapalhar a leitura.
 */
const CORES: Record<Situacao, { ponto: string; texto: string; fundo: string; suave: string; borda: string; rotulo: string }> =
  Object.fromEntries(
    (["vencido", "proximo", "em_dia", "concluido"] as Situacao[]).map((s) => {
      const tom = SITUACAO_PRAZO[s];
      return [s, { ponto: tom.forte, texto: tom.texto, fundo: tom.fundo, suave: tom.suave, borda: tom.borda, rotulo: tom.rotulo }];
    }),
  ) as Record<Situacao, { ponto: string; texto: string; fundo: string; suave: string; borda: string; rotulo: string }>;

/** Dia em `AAAA-MM-DD` como o brasileiro lê. */
function formatarDia(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

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

function situacaoDe(item: ItemCalendario, hoje: string): Situacao {
  if (item.concluido) return "concluido";
  const dias = diasEntre(hoje, item.data);
  if (dias < 0) return "vencido";
  if (dias <= DIAS_AMARELO) return "proximo";
  return "em_dia";
}

/** A cor do dia é a do item mais urgente que cai nele. */
function situacaoDoDia(lista: ItemCalendario[], hoje: string): Situacao {
  const ordem: Situacao[] = ["vencido", "proximo", "em_dia", "concluido"];
  const presentes = new Set(lista.map((i) => situacaoDe(i, hoje)));
  return ordem.find((s) => presentes.has(s)) ?? "concluido";
}

function textoDoPrazo(item: ItemCalendario, hoje: string): string {
  if (item.concluido) return "já resolvido";
  const dias = diasEntre(hoje, item.data);
  if (dias < 0) return `${Math.abs(dias)} dia(s) em atraso`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `faltam ${dias} dia(s)`;
}

/**
 * Calendário único de tudo que tem data marcada.
 *
 * Os itens vêm de todas as funções — vencimentos, checklists, vistorias,
 * manutenções, tarefas e atividades — e cada um é um atalho: o toque leva à
 * tela da função, já filtrada pelo protocolo daquele registro.
 *
 * `compacto` é a versão do painel: mês e legenda, sem os filtros por função.
 */
export function CalendarioGeral({
  condominioId,
  compacto = false,
  fontesVisiveis,
}: {
  condominioId: number;
  compacto?: boolean;
  /** Sem isto, mostra tudo. A página usa para filtrar por função. */
  fontesVisiveis?: string[];
}) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const hoje = chaveDoDia(new Date());
  // Programar a data é do gerente; para os outros o item é só atalho.
  const { data: podeGerenciar } = trpc.gestores.podeGerenciar.useQuery();
  const [reprogramando, setReprogramando] = useState<ItemCalendario | null>(null);
  const [novaData, setNovaData] = useState("");
  const [equipe, setEquipe] = useState<number[]>([]);

  // A equipe da unidade só é carregada quando o gerente abre o reprogramar:
  // é o passo em que ele distribui a agenda e escolhe quem faz.
  const { data: candidatos } = trpc.ordensServico.listarCandidatos.useQuery(
    { condominioId },
    { enabled: reprogramando !== null && !!podeGerenciar },
  );
  const [mesVisivel, setMesVisivel] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(hoje);

  // A grade sempre cobre seis semanas: o calendário não muda de altura ao
  // trocar de mês, e os dias vizinhos também aparecem marcados.
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

  const { data: itens, isLoading } = trpc.calendario.listar.useQuery(
    { condominioId, de, ate },
    { enabled: condominioId > 0 },
  );

  const visiveis = useMemo(() => {
    const lista = itens ?? [];
    if (!fontesVisiveis) return lista;
    return lista.filter((i) => fontesVisiveis.includes(i.fonte));
  }, [itens, fontesVisiveis]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemCalendario[]>();
    for (const item of visiveis) {
      const lista = mapa.get(item.data) ?? [];
      lista.push(item);
      mapa.set(item.data, lista);
    }
    return mapa;
  }, [visiveis]);

  const contagem = useMemo(() => {
    const total = { vencido: 0, proximo: 0, em_dia: 0, concluido: 0 };
    for (const item of visiveis) total[situacaoDe(item, hoje)] += 1;
    return total;
  }, [visiveis, hoje]);

  const itensDoDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];

  const trocarMes = (passo: number) => {
    setMesVisivel((atual) => new Date(atual.getFullYear(), atual.getMonth() + passo, 1));
    setDiaSelecionado(null);
  };

  const irPara = (item: ItemCalendario) => setLocation(item.rota);

  // Redistribuir é a razão de o gerente abrir o calendário: ele muda a data sem
  // sair da tela, uma O.S. depois da outra.
  const podeReprogramar = (item: ItemCalendario) =>
    !!podeGerenciar && item.fonte === "os" && !!item.etapa && item.etapa !== "finalizada";

  const programar = trpc.ordensServico.programar.useMutation({
    onSuccess: async () => {
      setReprogramando(null);
      setEquipe([]);
      await Promise.all([
        utils.calendario.listar.invalidate(),
        utils.ordensServico.list.invalidate(),
      ]);
      toast.success("Serviço programado");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className={compacto ? "border-blue-200" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 leading-tight">Calendário</p>
              <p className="text-xs text-slate-500 truncate">
                todos os vencimentos, de todas as funções
              </p>
            </div>
          </div>
          {compacto && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setLocation("/manutencoes/calendario")}
            >
              Abrir <Seta className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Contagem por cor: o resumo do mês antes de olhar dia por dia. */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(["vencido", "proximo", "em_dia"] as Situacao[]).map((s) => (
            <div
              key={s}
              className="rounded-lg px-2 py-1.5 text-center"
              style={{ backgroundColor: CORES[s].fundo }}
            >
              <p className="text-lg font-bold leading-none" style={{ color: CORES[s].texto }}>
                {contagem[s]}
              </p>
              <p className="text-[11px]" style={{ color: CORES[s].texto }}>
                {CORES[s].rotulo}
              </p>
            </div>
          ))}
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
              const cor = lista.length > 0 ? CORES[situacaoDoDia(lista, hoje)] : null;

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
                  {cor && (
                    <span
                      className="text-[10px] font-semibold px-1.5 rounded-full text-white"
                      style={{ backgroundColor: cor.ponto }}
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
                style={{ backgroundColor: CORES[s].ponto }}
              />
              {CORES[s].rotulo}
              {s === "proximo" ? ` (até ${DIAS_AMARELO} dias)` : ""}
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
              {itensDoDia.length === 0 ? " · nada marcado" : ` · ${itensDoDia.length} item(ns)`}
            </p>

            <ul className="space-y-2">
              {itensDoDia.map((item) => {
                const cor = CORES[situacaoDe(item, hoje)];
                return (
                  <li key={item.chave}>
                    {/* O fundo da linha é a situação do prazo: dá para varrer o
                        dia com o olho, sem ler cada etiqueta. */}
                    <button
                      type="button"
                      onClick={() => irPara(item)}
                      className="w-full text-left border rounded-lg px-3 py-2 hover:shadow-sm transition-all"
                      style={{ backgroundColor: cor.suave, borderColor: cor.borda }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {item.titulo}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                          style={{ color: cor.texto, backgroundColor: cor.fundo }}
                        >
                          {textoDoPrazo(item, hoje)}
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-600">{item.rotuloFonte}</span>
                        {item.protocolo ? <span className="font-mono">{item.protocolo}</span> : null}
                        {item.etapa ? (
                          <span className="truncate">· {etapaDoFluxo(item.etapa).curto}</span>
                        ) : null}
                        {item.detalhe ? <span className="truncate">· {item.detalhe}</span> : null}
                        <Seta className="w-3.5 h-3.5 ml-auto shrink-0 text-slate-400" />
                      </span>

                      {/* O dia mostrado é o prazo quando ninguém programou: dizer
                          isso evita o gerente achar que já está agendado. */}
                      {item.fonte === "os" && item.programada === false && (
                        <span className="block text-[11px] text-amber-700 mt-0.5">
                          esta é a data máxima — o serviço ainda não foi programado
                        </span>
                      )}
                    </button>

                    {podeReprogramar(item) && (
                      <button
                        type="button"
                        className="mt-1 ml-1 text-xs text-blue-700 hover:underline inline-flex items-center gap-1"
                        onClick={() => {
                          setReprogramando(item);
                          setNovaData(item.programada ? item.data : "");
                        }}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        {item.programada ? "Reprogramar" : "Programar data"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Reprogramar sem abrir a O.S.: é o passo de redistribuir a agenda. */}
        <Dialog
          open={reprogramando !== null}
          onOpenChange={(aberto) => !aberto && setReprogramando(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                {reprogramando?.programada ? "Reprogramar" : "Programar"} o serviço
              </DialogTitle>
              <DialogDescription>
                {reprogramando?.titulo}
                {reprogramando?.prazoLimite
                  ? ` · prazo máximo ${formatarDia(reprogramando.prazoLimite)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Sem `max`: passar do prazo é decisão do gerente, e o campo não
                  pode impedir o que o aviso abaixo diz que é permitido. */}
              <Input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
              {/* Passar do prazo é decisão do gerente, mas ele precisa ver. */}
              {reprogramando?.prazoLimite &&
                novaData &&
                novaData > reprogramando.prazoLimite && (
                  <p className="text-xs text-red-600">
                    Esta data passa do prazo máximo combinado com o gestor.
                  </p>
                )}
              {/* Designar a equipe aqui mesmo: o gerente distribui a agenda de
                  uma vez, sem abrir cada ordem. Quem já está na O.S. continua. */}
              {(candidatos?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">
                    Quem vai fazer o serviço
                  </p>
                  <div className="max-h-36 overflow-y-auto divide-y border rounded-md">
                    {candidatos!.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={equipe.includes(c.id)}
                          onChange={() =>
                            setEquipe((atual) =>
                              atual.includes(c.id)
                                ? atual.filter((id) => id !== c.id)
                                : [...atual, c.id],
                            )
                          }
                        />
                        <span className="flex-1">{c.nome}</span>
                        <span className="text-[11px] text-slate-400">{c.cargo ?? ""}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deixe sem marcar para manter a equipe que já está na ordem.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!novaData || programar.isPending}
                onClick={() =>
                  reprogramando &&
                  programar.mutate({
                    id: reprogramando.id,
                    dataProgramada: novaData,
                    responsaveisIds: equipe.length ? equipe : undefined,
                  })
                }
              >
                {programar.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4 mr-2" />
                )}
                {equipe.length ? "Salvar data e equipe" : "Salvar data"}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-slate-500 hover:text-slate-700"
                onClick={() => reprogramando && irPara(reprogramando)}
              >
                Abrir a O.S. (fotos, descrição e histórico)
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default CalendarioGeral;
