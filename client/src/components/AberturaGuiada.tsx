import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { GerenciarEquipes } from "@/components/GerenciarEquipes";
import { CadastroRapidoFuncionario } from "@/components/CadastroRapidoFuncionario";
import { useVocabulario } from "@/hooks/useVocabulario";
import { ArrowLeft, Building2, Check, Loader2, Star, UserPlus, Users } from "lucide-react";

/** O que foi escolhido na última abertura, para repetir sem refazer o caminho. */
const ULTIMA_ABERTURA_KEY = "os_ultima_abertura";

type UltimaAbertura = {
  unidades: number[];
  equipeId: number | null;
  responsaveis: number[];
  principal: number | null;
};

function lerUltimaAbertura(): UltimaAbertura | null {
  try {
    const bruto = localStorage.getItem(ULTIMA_ABERTURA_KEY);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as UltimaAbertura;
    return Array.isArray(dados.unidades) && dados.unidades.length > 0 ? dados : null;
  } catch {
    // Dado corrompido no navegador não pode derrubar a abertura da ordem.
    return null;
  }
}

/**
 * Data de daqui a N dias, no fuso de quem está usando.
 *
 * `toISOString` devolve UTC: no Brasil, das 21h em diante ele já está no dia
 * seguinte, e "amanhã" viraria depois de amanhã sem ninguém entender por quê.
 */
function emDias(dias: number): string {
  const dia = new Date();
  dia.setDate(dia.getDate() + dias);
  const mes = String(dia.getMonth() + 1).padStart(2, "0");
  const diaDoMes = String(dia.getDate()).padStart(2, "0");
  return `${dia.getFullYear()}-${mes}-${diaDoMes}`;
}

/** Os passos, na ordem em que a pergunta aparece. */
const PASSOS = ["unidades", "equipe", "pessoas"] as const;
type Passo = (typeof PASSOS)[number];

const TITULO: Record<Passo, string> = {
  unidades: "Onde o serviço vai ser feito",
  equipe: "Quem fica com o serviço",
  pessoas: "Quem responde pela ordem",
};

/** O que os passos decidem e o formulário recebe pronto. */
export type EscolhaGuiada = {
  unidades: number[];
  equipeId: number | null;
  /**
   * Onde a equipe escolhida pode mesmo ser designada.
   *
   * Vai junto porque só os passos sabem disso: no lote, a ordem das unidades
   * que ela não atende precisa nascer sem equipe, em vez de ser recusada pelo
   * servidor no meio da cópia.
   */
  unidadesComEquipe: number[];
  responsaveis: number[];
  principal: number | null;
};

/**
 * As três perguntas que vêm antes do formulário: onde, com quem, por conta de
 * quem.
 *
 * O formulário completo pergunta tudo de uma vez, e quem abre a primeira ordem
 * não sabe por onde começar — nem que precisa de equipe e responsável. Aqui
 * cada tela faz uma pergunta só e, no fim, entrega o formulário já preenchido:
 * ninguém digita duas vezes, e todos os campos continuam disponíveis.
 *
 * Marcar mais de uma unidade abre uma ordem em cada uma — mesmo serviço, mesma
 * equipe, protocolos separados, que é como o gerente pede "trocar as lâmpadas
 * em todas as unidades" sem repetir o cadastro quinze vezes.
 */
export function AberturaGuiada({
  condominioId,
  unidades,
  ehGestor,
  onConcluir,
  onCancelar,
}: {
  /** Unidade de onde a tela foi aberta: é a que já vem marcada. */
  condominioId: number;
  /** Unidades que a pessoa alcança. Uma só: o passo 1 não aparece. */
  unidades: { id: number; nome: string }[];
  ehGestor: boolean;
  /** Entrega o que foi escolhido para o formulário completo abrir preenchido. */
  onConcluir: (escolha: EscolhaGuiada) => void;
  onCancelar: () => void;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();

  const temEscolhaDeUnidade = unidades.length > 1;
  const [passo, setPasso] = useState<Passo>(
    temEscolhaDeUnidade ? "unidades" : ehGestor ? "equipe" : "pessoas",
  );

  const [marcadas, setMarcadas] = useState<number[]>([condominioId]);
  const [equipeId, setEquipeId] = useState<number | null>(null);
  /** Depois que a pessoa escolhe, a sugestão automática não volta a mandar. */
  const [tocouNaEquipe, setTocouNaEquipe] = useState(false);
  const [responsaveis, setResponsaveis] = useState<number[]>([]);
  const [principal, setPrincipal] = useState<number | null>(null);
  /** Depois que a pessoa mexe na lista, a sugestão automática não volta. */
  const [tocouNosResponsaveis, setTocouNosResponsaveis] = useState(false);
  const [modalEquipes, setModalEquipes] = useState(false);
  const [modalFuncionarios, setModalFuncionarios] = useState(false);

  /** O que foi escolhido da última vez, se houver. Lido uma vez só. */
  const [ultima] = useState(() => lerUltimaAbertura());

  const primeira = marcadas[0] ?? condominioId;

  const { data: equipes } = trpc.equipes.list.useQuery(
    { condominioId: primeira, unidades: marcadas },
    { enabled: primeira > 0 },
  );
  const { data: pessoas } = trpc.funcionario.list.useQuery(
    { condominioId: primeira, unidades: marcadas },
    { enabled: primeira > 0 },
  );
  /**
   * Quem está na equipe escolhida.
   *
   * Serve a duas coisas: pular o passo dos responsáveis quando a equipe tem uma
   * pessoa só, e completar a lista de escolha — `funcionario.list` recorta por
   * quem cadastrou, e um membro cadastrado por outro gestor não apareceria.
   */
  const { data: membrosDaEquipe } = trpc.equipes.membros.useQuery(
    { equipeId: equipeId ?? 0 },
    { enabled: !!equipeId },
  );

  /** A lista de escolha do passo 3: os funcionários e os membros da equipe. */
  const candidatos = useMemo(() => {
    const porId = new Map<number, { id: number; nome: string; cargo?: string | null; email?: string | null; telefone?: string | null; condominioId?: number | null }>();
    for (const p of pessoas ?? []) porId.set(p.id, p);
    for (const m of membrosDaEquipe ?? []) {
      if (!porId.has(m.funcionarioId)) {
        porId.set(m.funcionarioId, {
          id: m.funcionarioId,
          nome: m.nome,
          cargo: m.cargo,
          telefone: m.telefone,
        });
      }
    }
    return [...porId.values()];
  }, [pessoas, membrosDaEquipe]);


  const equipeEscolhida = (equipes ?? []).find((e) => e.id === equipeId) ?? null;

  /**
   * Uma equipe só na lista: já vem marcada.
   *
   * Perguntar "qual das uma?" é um passo que só existe para ser confirmado, e
   * quem abre a ordem não deveria precisar entender a pergunta para responder
   * o óbvio. Continua trocável — só evita o clique.
   */
  const equipeUnica = (equipes ?? []).length === 1 ? equipes![0] : null;
  useEffect(() => {
    // Em efeito, e não no meio do render: mexer no estado durante o desenho é
    // o tipo de atalho que funciona hoje e vira laço infinito no dia em que
    // alguém acrescentar uma condição aqui.
    if (equipeUnica && equipeId === null && !tocouNaEquipe) setEquipeId(equipeUnica.id);
  }, [equipeUnica, equipeId, tocouNaEquipe]);

  /**
   * Equipe de uma pessoa só: ela já chega marcada no passo dos responsáveis.
   *
   * O passo continua existindo — pular do 2 para o 4 deixava quem está seguindo
   * a contagem sem entender o que perdeu. Aqui ele só confirma e segue.
   */
  useEffect(() => {
    if (tocouNosResponsaveis || responsaveis.length > 0) return;
    if ((membrosDaEquipe?.length ?? 0) !== 1) return;

    const unico = membrosDaEquipe![0].funcionarioId;
    setResponsaveis([unico]);
    setPrincipal(unico);
  }, [membrosDaEquipe, responsaveis.length, tocouNosResponsaveis]);

  /**
   * Unidades marcadas que a equipe escolhida não atende.
   *
   * A ordem dessas unidades nasce sem equipe — melhor dizer antes do que
   * descobrir depois, procurando por que só metade foi designada.
   */
  const semEquipe = useMemo(() => {
    if (!equipeEscolhida) return [];
    const atendidas = equipeEscolhida.unidades ?? [];
    return marcadas.filter((id) => !atendidas.includes(id));
  }, [equipeEscolhida, marcadas]);

  /**
   * Os passos que esta pessoa vê.
   *
   * Sem escolha de unidade, o primeiro não existe. E designar equipe é decisão
   * de quem responde pela unidade: o servidor recusa o funcionário, então
   * oferecer o passo a ele seria montar a ordem inteira para ela morrer no
   * fim, com uma mensagem sobre permissão que ninguém pediu.
   */
  const roteiro = useMemo(
    () =>
      PASSOS.filter(
        (p) => (p !== "unidades" || temEscolhaDeUnidade) && (p !== "equipe" || ehGestor),
      ),
    [temEscolhaDeUnidade, ehGestor],
  );

  const indice = roteiro.indexOf(passo);
  const primeiroPasso = indice === 0;

  const avancar = () => setPasso(roteiro[Math.min(indice + 1, roteiro.length - 1)]);
  /** No primeiro passo, "voltar" é desistir — não há para onde recuar. */
  const voltar = () => (primeiroPasso ? onCancelar() : setPasso(roteiro[indice - 1]));

  /**
   * Entrega o que foi escolhido ao formulário completo.
   *
   * A criação não acontece aqui: o formulário é que abre preenchido, com
   * todos os campos à mão. Guardar a escolha agora é o que faz o "Igual à
   * última" funcionar na próxima abertura.
   */
  function concluir() {
    // Ids inválidos não seguem adiante: a unidade zero vem de uma sessão sem
    // organização e só produziria um erro sem sentido para quem pediu.
    const alvos = marcadas.filter((id) => id > 0);
    if (alvos.length === 0) {
      return toast.error(`Marque ao menos uma ${v.unidade.toLowerCase()}`);
    }

    const escolha: EscolhaGuiada = {
      unidades: alvos,
      equipeId,
      unidadesComEquipe: alvos.filter((id) => equipeEscolhida?.unidades?.includes(id)),
      responsaveis,
      principal,
    };

    localStorage.setItem(ULTIMA_ABERTURA_KEY, JSON.stringify(escolha));
    onConcluir(escolha);
  }

  return (
    <div className="space-y-4">
      {/* Barra de progresso: quantos passos existem e onde ele está. */}
      <div className="flex gap-1.5">
        {roteiro.map((p, i) => (
          <span
            key={p}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i <= indice ? "bg-slate-800" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <div>
        <p className="text-sm text-slate-500">
          Passo {indice + 1} de {roteiro.length}
        </p>
        <h3 className="text-lg font-semibold text-slate-800">{TITULO[passo]}</h3>
      </div>

      {/* O caminho curto de quem abre a mesma ordem toda semana: repete onde,
          com quem e por conta de quem, e vai direto ao que precisa ser feito. */}
      {primeiroPasso && ultima && (
        <button
          type="button"
          onClick={() => {
            // Só o que ainda existe: unidade fechada ou fora do alcance de hoje
            // faria a criação falhar num passo que a pessoa nem viu.
            const validas = ultima.unidades.filter((id) => unidades.some((u) => u.id === id));
            const alvos = validas.length > 0 ? validas : [condominioId];

            setMarcadas(alvos);
            setEquipeId(ultima.equipeId);
            setTocouNaEquipe(true);
            setResponsaveis(ultima.responsaveis);
            setPrincipal(ultima.principal);
            // Direto ao formulário: os três passos já estão respondidos. Onde
            // a equipe atende é decidido lá, quando a lista dela carregar.
            onConcluir({ ...ultima, unidades: alvos, unidadesComEquipe: alvos });
          }}
          className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-left text-sm hover:bg-slate-100"
        >
          <span className="font-medium text-slate-800">Igual à última ordem</span>
          <span className="block text-xs text-slate-500">
            Mesma {v.unidade.toLowerCase()}, mesma equipe e mesmo responsável — só falta dizer o
            serviço
          </span>
        </button>
      )}

      {passo === "unidades" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Marque onde este serviço precisa ser feito. Marcando mais de uma, abrimos uma ordem
            em cada — mesmo serviço, protocolos separados.
          </p>

          <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() =>
                setMarcadas(
                  marcadas.length === unidades.length ? [condominioId] : unidades.map((u) => u.id),
                )
              }
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
            >
              <Checkbox
                checked={marcadas.length === unidades.length}
                className="pointer-events-none"
              />
              <span>
                Todas as {v.unidade.toLowerCase()}s ({unidades.length})
              </span>
            </button>

            {unidades.map((u) => {
              const marcada = marcadas.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    setMarcadas(
                      marcada ? marcadas.filter((id) => id !== u.id) : [...marcadas, u.id],
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Checkbox checked={marcada} className="pointer-events-none" />
                  <span className="truncate">{u.nome}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {passo === "equipe" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Escolha a equipe que vai executar, ou crie uma agora. Ela recebe o aviso da ordem.
          </p>

          {(equipes?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhuma equipe atende {marcadas.length > 1 ? "estas unidades" : "esta unidade"} ainda.
            </p>
          ) : (
            <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setTocouNaEquipe(true);
                  setEquipeId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-3 text-left text-sm hover:bg-slate-50"
              >
                <Checkbox checked={equipeId === null} className="pointer-events-none" />
                <span className="text-slate-600">Designar depois</span>
              </button>

              {equipes!.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setTocouNaEquipe(true);
                    setEquipeId(e.id);
                    // Trocar a equipe é redefinir quem faz o serviço: os
                    // responsáveis da equipe anterior não podem ficar de
                    // carona, sobretudo os que entraram sozinhos no atalho.
                    if (e.id !== equipeId) {
                      setResponsaveis([]);
                      setPrincipal(null);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-3 text-left text-sm hover:bg-slate-50"
                >
                  <Checkbox checked={equipeId === e.id} className="pointer-events-none" />
                  <span className="truncate flex-1">{e.nome}</span>
                  <span className="text-[11px] text-slate-400">
                    {e.externa ? "externa" : `${Number(e.totalMembros)} pessoa(s)`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {semEquipe.length > 0 && (
            <p className="text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded-md px-2 py-1.5">
              Esta equipe não atende {semEquipe.length} das {v.unidade.toLowerCase()}s marcadas — a
              ordem delas nasce sem equipe designada.
            </p>
          )}

          {ehGestor && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setModalEquipes(true)}>
              <Users className="w-4 h-4" /> Criar equipe
            </Button>
          )}
        </div>
      )}

      {passo === "pessoas" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            {(membrosDaEquipe?.length ?? 0) === 1 && !tocouNosResponsaveis
              ? "A equipe tem uma pessoa, e ela já está marcada. Pode continuar ou incluir mais alguém."
              : "Marque quem responde por esta ordem. A estrela indica o responsável principal."}
          </p>

          {candidatos.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhum funcionário cadastrado ainda — cadastre o primeiro abaixo.
            </p>
          ) : (
            <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
              {candidatos.map((p) => {
                const marcado = responsaveis.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <button
                      type="button"
                      className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => {
                        setTocouNosResponsaveis(true);
                        const novos = marcado
                          ? responsaveis.filter((id) => id !== p.id)
                          : [...responsaveis, p.id];
                        setResponsaveis(novos);
                        // O primeiro marcado vira o principal, e desmarcá-lo
                        // devolve a estrela a quem sobrou.
                        if (!marcado && principal === null) setPrincipal(p.id);
                        if (marcado && principal === p.id) setPrincipal(novos[0] ?? null);
                      }}
                    >
                      <Checkbox checked={marcado} className="pointer-events-none" />
                      <span className="truncate flex-1">{p.nome}</span>
                    </button>

                    {marcado && (
                      <button
                        type="button"
                        onClick={() => setPrincipal(p.id)}
                        aria-label={`Marcar ${p.nome} como principal`}
                        title="Responsável principal"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            principal === p.id
                              ? "text-amber-500 fill-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {ehGestor && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setModalFuncionarios(true)}
            >
              <UserPlus className="w-4 h-4" /> Cadastrar funcionário
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={voltar}>
          <ArrowLeft className="w-4 h-4" />
          {primeiroPasso ? "Cancelar" : "Voltar"}
        </Button>

        {/* No último passo, "continuar" leva ao formulário já preenchido — não
            cria a ordem. Quem cria é o botão de lá, com todos os campos. */}
        <Button
          className="flex-1"
          disabled={passo === "unidades" && marcadas.length === 0}
          onClick={indice === roteiro.length - 1 ? concluir : avancar}
        >
          {indice === roteiro.length - 1 ? (
            <>
              <Check className="w-4 h-4" /> Continuar para o formulário completo
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </div>

      {/* Cadastros abertos por cima do passo, sem perder o que já foi marcado. */}
      <Dialog open={modalEquipes} onOpenChange={setModalEquipes}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Equipes</DialogTitle>
          </DialogHeader>
          <GerenciarEquipes
            condominioId={primeira}
            onMudou={() => utils.equipes.list.invalidate()}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalFuncionarios} onOpenChange={setModalFuncionarios}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Funcionários</DialogTitle>
          </DialogHeader>
          <CadastroRapidoFuncionario
            condominioId={primeira}
            onMudou={() => {
              void utils.funcionario.list.invalidate();
              void utils.ordensServico.listarCandidatos.invalidate();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AberturaGuiada;
