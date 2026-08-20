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

/** Os quatro passos, na ordem em que a pergunta aparece. */
const PASSOS = ["unidades", "equipe", "pessoas", "ordem"] as const;
type Passo = (typeof PASSOS)[number];

const TITULO: Record<Passo, string> = {
  unidades: "Onde o serviço vai ser feito",
  equipe: "Quem fica com o serviço",
  pessoas: "Quem responde pela ordem",
  ordem: "O que precisa ser feito",
};

/**
 * Abertura de O.S. passo a passo.
 *
 * O formulário completo pergunta tudo de uma vez, e quem abre a primeira ordem
 * não sabe por onde começar — nem que precisa de equipe e responsável antes de
 * chegar ao fim. Aqui cada tela faz uma pergunta só, na ordem em que ela
 * aparece na cabeça de quem está pedindo o serviço: onde, quem, com quem, o quê.
 *
 * Marcar mais de uma unidade abre uma ordem em cada uma — mesmo serviço, mesma
 * equipe, protocolos separados, que é como o gerente pede "trocar as lâmpadas
 * em todas as unidades" sem repetir o cadastro quinze vezes.
 */
export function AberturaGuiada({
  condominioId,
  unidades,
  ehGestor,
  onCriou,
  onCancelar,
}: {
  /** Unidade de onde a tela foi aberta: é a que já vem marcada. */
  condominioId: number;
  /** Unidades que a pessoa alcança. Uma só: o passo 1 não aparece. */
  unidades: { id: number; nome: string }[];
  ehGestor: boolean;
  onCriou: () => void | Promise<void>;
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
  const [modalEquipes, setModalEquipes] = useState(false);
  const [modalFuncionarios, setModalFuncionarios] = useState(false);

  /** O que foi escolhido da última vez, se houver. Lido uma vez só. */
  const [ultima] = useState(() => lerUltimaAbertura());
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");

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

  const criar = trpc.ordensServico.create.useMutation();
  const addResponsavel = trpc.ordensServico.addResponsavel.useMutation();

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

  const avancar = () => {
    /**
     * Equipe de uma pessoa só: ela é a responsável, e perguntar isso seria
     * pedir para confirmar o óbvio. O passo continua alcançável pelo "Voltar".
     */
    if (passo === "equipe" && (membrosDaEquipe?.length ?? 0) === 1) {
      const unico = membrosDaEquipe![0].funcionarioId;
      setResponsaveis([unico]);
      setPrincipal(unico);
      setPasso("ordem");
      return;
    }

    setPasso(roteiro[Math.min(indice + 1, roteiro.length - 1)]);
  };
  /** No primeiro passo, "voltar" é desistir — não há para onde recuar. */
  const voltar = () => (primeiroPasso ? onCancelar() : setPasso(roteiro[indice - 1]));

  const salvando = criar.isPending || addResponsavel.isPending;

  async function finalizar() {
    if (titulo.trim().length < 3) return toast.error("Descreva o serviço em poucas palavras");
    if (!prazo) return toast.error("Informe a data máxima de finalização");
    // Ids inválidos não chegam ao servidor: a unidade zero vem de uma sessão
    // sem organização e só produziria um erro sem sentido para quem pediu.
    const alvos = marcadas.filter((id) => id > 0);
    if (alvos.length === 0) return toast.error(`Marque ao menos uma ${v.unidade.toLowerCase()}`);

    const protocolos: string[] = [];
    const falharam: string[] = [];

    for (const unidade of alvos) {
      const nomeDaUnidade = unidades.find((u) => u.id === unidade)?.nome ?? "";

      try {
        // A equipe só vai onde ela atende; nas demais a ordem nasce sem equipe,
        // e o aviso do passo anterior já disse isso.
        const designar = equipeEscolhida?.unidades?.includes(unidade)
          ? equipeEscolhida.id
          : undefined;

        const nova = await criar.mutateAsync({
          condominioId: unidade,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          prazoLimite: prazo,
          equipeId: designar,
          observacoes: observacoes.trim() || undefined,
        });

        protocolos.push(nova.protocolo);

        // Fora do `try` da criação: a ordem já existe, e falhar em vincular
        // alguém não pode ser contado como "não foi possível abrir".
        try {
          // Cada ordem recebe os responsáveis daquela unidade: pôr todos em
          // todas encheria a ordem de gente que não trabalha lá.
          for (const id of responsaveis) {
            const pessoa = candidatos.find((p) => p.id === id);
            if (!pessoa || (alvos.length > 1 && pessoa.condominioId !== unidade)) continue;

            await addResponsavel.mutateAsync({
              ordemServicoId: nova.id,
              nome: pessoa.nome,
              cargo: pessoa.cargo ?? undefined,
              email: pessoa.email ?? undefined,
              telefone: pessoa.telefone ?? undefined,
              funcionarioId: pessoa.id,
              principal: id === principal,
            });
          }
        } catch (erro) {
          console.error("[os] falha ao vincular responsáveis", nova.protocolo, erro);
          toast.error(
            `A ordem ${nova.protocolo} foi aberta, mas os responsáveis não entraram. Marque no detalhe dela.`,
          );
        }
      } catch (erro) {
        // Uma unidade que falha não pode levar o lote junto: o que já foi
        // aberto existe, e quem pediu precisa saber o que ficou de fora.
        console.error("[os] falha ao abrir ordem da unidade", unidade, erro);
        falharam.push(nomeDaUnidade || String(unidade));
      }
    }

    if (protocolos.length > 0) {
      // Guardado só agora, com a ordem já criada: é o que o "Igual à última"
      // vai repetir da próxima vez.
      localStorage.setItem(
        ULTIMA_ABERTURA_KEY,
        JSON.stringify({ unidades: alvos, equipeId, responsaveis, principal }),
      );

      toast.success(
        protocolos.length === 1
          ? `Ordem ${protocolos[0]} criada`
          : `${protocolos.length} ordens criadas: ${protocolos.join(", ")}`,
      );
    }

    if (falharam.length > 0) {
      toast.error(`Não foi possível abrir em: ${falharam.join(", ")}. Tente de novo por lá.`);
    }

    if (protocolos.length > 0) await onCriou();
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
            setMarcadas(validas.length > 0 ? validas : [condominioId]);
            setEquipeId(ultima.equipeId);
            setTocouNaEquipe(true);
            setResponsaveis(ultima.responsaveis);
            setPrincipal(ultima.principal);
            setPasso("ordem");
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
            Marque quem responde por esta ordem. A estrela indica o responsável principal.
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

      {passo === "ordem" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="g-titulo">O que precisa ser feito</Label>
            <Input
              id="g-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Trocar lâmpadas do pátio"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Detalhes (opcional)</Label>
            <Textarea
              id="g-desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que está acontecendo, onde exatamente, o que já foi tentado..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-prazo">Data máxima para finalizar</Label>

            {/* Atalhos antes do calendário: digitar data em celular é o passo
                onde mais gente desiste, e "daqui a uma semana" é o que a
                pessoa tem na cabeça — não o dia 27. */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { rotulo: "Amanhã", dias: 1 },
                { rotulo: "Em 7 dias", dias: 7 },
                { rotulo: "Em 15 dias", dias: 15 },
                { rotulo: "Em 30 dias", dias: 30 },
              ].map((atalho) => {
                const valor = emDias(atalho.dias);
                return (
                  <button
                    key={atalho.dias}
                    type="button"
                    onClick={() => setPrazo(valor)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      prazo === valor
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {atalho.rotulo}
                  </button>
                );
              })}
            </div>

            <Input
              id="g-prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-obs">Observações (opcional)</Label>
            <Input
              id="g-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Acesso, horário, contato no local..."
            />
          </div>

          {/* O que vai ser criado, em uma frase: é a última chance de perceber
              que a equipe ficou de fora ou que são quinze ordens, não uma. */}
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-0.5">
            <p className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {marcadas.length === 1
                ? `1 ordem em ${unidades.find((u) => u.id === marcadas[0])?.nome ?? "esta unidade"}`
                : `${marcadas.length} ordens, uma em cada ${v.unidade.toLowerCase()} marcada`}
            </p>
            <p className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {equipeEscolhida ? equipeEscolhida.nome : "Sem equipe designada"}
            </p>
            <p className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {responsaveis.length === 0
                ? "Sem responsável marcado"
                : `${responsaveis.length} responsável(is)`}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={voltar} disabled={salvando}>
          <ArrowLeft className="w-4 h-4" />
          {passo === PASSOS[0] || (passo === "equipe" && !temEscolhaDeUnidade)
            ? "Cancelar"
            : "Voltar"}
        </Button>

        {passo === "ordem" ? (
          <Button
            className="flex-1"
            disabled={salvando || titulo.trim().length < 3 || !prazo}
            onClick={() => void finalizar().catch((e) => toast.error(e.message || "Não foi possível criar"))}
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {marcadas.length > 1 ? `Criar ${marcadas.length} ordens` : "Criar ordem"}
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={passo === "unidades" && marcadas.length === 0}
            onClick={avancar}
          >
            Continuar
          </Button>
        )}
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
