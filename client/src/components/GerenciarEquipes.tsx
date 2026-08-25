import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useVocabulario } from "@/hooks/useVocabulario";
import { ComoFuncionaEquipes } from "@/components/ComoFuncionaEquipes";
import { ArrowLeft, Building2, HelpCircle, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";

/** Funções da ficha rápida: supervisor é quem recebe o aviso da O.S. */
const TIPOS = [
  { valor: "auxiliar", rotulo: "Auxiliar" },
  { valor: "zelador", rotulo: "Zelador" },
  { valor: "porteiro", rotulo: "Porteiro" },
  { valor: "supervisor", rotulo: "Supervisor" },
  { valor: "gerente", rotulo: "Gerente" },
] as const;

/** Conferência de formato, para o erro sair em português e no campo certo. */
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Unidades que a equipe atende.
 *
 * A mesma equipe cobre uma unidade ou a rede inteira — "Facilities" atende as
 * quinze. Some quando o cliente só tem uma: não há escolha a fazer.
 *
 * Nasce recolhida numa linha de resumo. O cadastro da equipe é nome e quem
 * participa; quinze caixinhas abertas entre um e outro faziam a tela parecer
 * um questionário, e a resposta certa já vem marcada de qualquer forma.
 */
function UnidadesAtendidas({
  marcadas,
  padrao,
  onMudar,
}: {
  marcadas: number[];
  /** Unidade de onde a tela foi aberta: é a que sobra ao desmarcar todas. */
  padrao: number;
  onMudar: (unidades: number[]) => void;
}) {
  const v = useVocabulario();
  const { data: organizacoes } = trpc.condominio.list.useQuery();
  const [aberto, setAberto] = useState(false);

  if ((organizacoes?.length ?? 0) < 2) return null;

  const todas = (organizacoes ?? []).map((o) => o.id);
  const estaoTodas = marcadas.length === todas.length;

  if (!aberto) {
    return (
      <div
        className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${
          // Nenhuma marcada é o único estado que impede de salvar, e recolhido
          // ele passaria por informação comum até o erro aparecer no botão.
          marcadas.length === 0 ? "border-amber-300 bg-amber-50" : "bg-slate-50"
        }`}
      >
        <span
          className={`text-xs min-w-0 truncate ${
            marcadas.length === 0 ? "text-amber-900" : "text-slate-600"
          }`}
        >
          {marcadas.length === 0 ? (
            <>
              Marque ao menos uma <strong className="font-medium">{v.unidade.toLowerCase()}</strong>
            </>
          ) : (
            <>
              Atende{" "}
              <strong className="font-medium text-slate-800">
                {estaoTodas
                  ? `todas as ${todas.length} ${v.unidade.toLowerCase()}s`
                  : `${marcadas.length} de ${todas.length} ${v.unidade.toLowerCase()}s`}
              </strong>
            </>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-slate-500 shrink-0"
          onClick={() => setAberto(true)}
        >
          Alterar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>
        {v.unidade}s atendidas ({marcadas.length})
      </Label>

      <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
        {/* "Todas" é a primeira linha da lista, com a mesma caixinha das
            demais: o botãozinho no canto passava despercebido, e quem quer a
            rede inteira marcava as quinze uma a uma. Desmarcando, sobra a
            unidade de onde a tela foi aberta — sem ela a equipe sumiria da
            O.S. que está sendo escrita. */}
        <button
          type="button"
          onClick={() => onMudar(estaoTodas ? [padrao] : todas)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
        >
          <Checkbox checked={estaoTodas} className="pointer-events-none" />
          <span>Todas as {v.unidade.toLowerCase()}s ({todas.length})</span>
        </button>

        {(organizacoes ?? []).map((o) => {
          const marcada = marcadas.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() =>
                onMudar(marcada ? marcadas.filter((id) => id !== o.id) : [...marcadas, o.id])
              }
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <Checkbox checked={marcada} className="pointer-events-none" />
              <span className="truncate">{o.nome}</span>
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-slate-500"
        onClick={() => setAberto(false)}
      >
        Pronto
      </Button>
    </div>
  );
}

type Passo =
  | { tela: "lista" }
  /** O tutorial, mostrado no lugar da lista até a pessoa fechar. */
  | { tela: "ajuda" }
  /** Equipe da casa: nova quando não vem `equipe`, edição quando vem. */
  | { tela: "interna"; equipe?: { id: number; nome: string } }
  | { tela: "externa" };

/**
 * Cadastro de equipes de uma unidade, do jeito que a pergunta aparece.
 *
 * Antes eram três passos soltos: criar a equipe, abrir "Membros" e descobrir a
 * lista vazia porque os funcionários ainda não existiam — e o caminho para
 * cadastrá-los estava em outra tela. Quem chegava aqui pela O.S. se perdia.
 *
 * Agora a escolha vem primeiro ("de casa" ou "de fora") e cada caminho pede,
 * numa tela só, tudo o que a equipe precisa para receber a ordem: nome, quem
 * participa — com a ficha do funcionário criada ali mesmo — e o contato de quem
 * é de fora.
 */
export function GerenciarEquipes({
  condominioId,
  onMudou,
  iniciarNovaEquipe = false,
}: {
  condominioId: number;
  /** Chamado a cada alteração, para quem exibe a lista se atualizar. */
  onMudou?: () => void;
  /**
   * Abre já no formulário da equipe nova, pulando a lista.
   *
   * Para quem chegou de um botão que prometeu montar a equipe: cair na lista
   * e ter de achar "Nova equipe" é a promessa entregue pela metade. Lido uma
   * vez só, na montagem — o diálogo desmonta ao fechar, então reabrir pela
   * lista continua abrindo a lista.
   */
  iniciarNovaEquipe?: boolean;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();

  const [passo, setPasso] = useState<Passo>(
    iniciarNovaEquipe ? { tela: "interna" } : { tela: "lista" },
  );

  const { data: equipes, isLoading } = trpc.equipes.list.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
  );

  const recarregar = async () => {
    await utils.equipes.list.invalidate();
    onMudou?.();
  };

  const excluir = trpc.equipes.delete.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Equipe removida");
    },
    onError: (e) => toast.error(e.message || "Não foi possível remover"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const voltar = () => setPasso({ tela: "lista" });
  const concluir = async () => {
    await recarregar();
    voltar();
  };

  if (passo.tela === "interna") {
    return (
      <EquipeInterna
        condominioId={condominioId}
        equipe={passo.equipe}
        onVoltar={voltar}
        onPronto={concluir}
      />
    );
  }

  if (passo.tela === "externa") {
    return (
      <NovaEquipeExterna condominioId={condominioId} onVoltar={voltar} onPronto={concluir} />
    );
  }

  if (passo.tela === "ajuda") {
    return <ComoFuncionaEquipes onFechar={voltar} />;
  }

  return (
    <div className="space-y-3">
      {/* O caminho todo em miniatura, para quem chegou aqui sem saber o que a
          tela espera. Fica no topo porque é onde a dúvida aparece. */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setPasso({ tela: "ajuda" })}
      >
        <HelpCircle className="w-4 h-4" /> Como funciona
      </Button>

      {(equipes?.length ?? 0) === 0 ? (
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-slate-600 font-medium mt-2">Nenhuma equipe ainda.</p>
          <p className="text-xs text-slate-500">
            A equipe recebe o aviso da O.S. e responde pelo serviço.
          </p>
        </div>
      ) : (
        <div className="divide-y border rounded-md">
          {equipes!.map((equipe) => (
            <div key={equipe.id} className="flex items-center gap-2 px-3 py-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: equipe.cor ?? "#3b82f6" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{equipe.nome}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {/* Em quantas unidades ela atende é o que separa a equipe da
                      casa da equipe de rede. */}
                  {Number(equipe.totalUnidades ?? 1) > 1
                    ? `${Number(equipe.totalUnidades)} ${v.unidade.toLowerCase()}s · `
                    : ""}
                  {equipe.externa
                    ? `Externa · ${equipe.email ?? "sem e-mail"}`
                    : `${Number(equipe.totalMembros)} funcionário(s)`}
                </p>
              </div>
              {equipe.externa ? (
                <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200">
                  externa
                </Badge>
              ) : (
                // Acrescentar alguém ao time depois é operação de todo dia, e
                // sair da O.S. para isso era o caminho antigo.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPasso({ tela: "interna", equipe })}
                >
                  <UserPlus className="w-4 h-4" /> Editar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`Remover a equipe "${equipe.nome}"?`)) {
                    excluir.mutate({ id: equipe.id });
                  }
                }}
                aria-label={`Remover equipe ${equipe.nome}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Os dois caminhos, lado a lado: é a primeira pergunta de quem vai
          designar o serviço — time da casa ou empresa contratada. */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          // `whitespace-normal`: o botão não quebra linha por padrão, e a
          // descrição saía por cima da do botão vizinho.
          className="h-auto py-3 px-3 flex-col items-start gap-1 whitespace-normal text-left"
          onClick={() => setPasso({ tela: "interna" })}
        >
          <span className="flex items-center gap-2 font-medium">
            <Users className="w-4 h-4" /> Nova equipe
          </span>
          <span className="text-xs text-slate-500 font-normal text-left leading-snug w-full">
            Funcionários da casa, nas {v.unidade.toLowerCase()}s que ela atende
          </span>
        </Button>

        <Button
          variant="outline"
          // `whitespace-normal`: o botão não quebra linha por padrão, e a
          // descrição saía por cima da do botão vizinho.
          className="h-auto py-3 px-3 flex-col items-start gap-1 whitespace-normal text-left"
          onClick={() => setPasso({ tela: "externa" })}
        >
          <span className="flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4" /> Nova equipe externa
          </span>
          <span className="text-xs text-slate-500 font-normal text-left leading-snug w-full">
            Empresa contratada, avisada por e-mail
          </span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Equipe da casa: nome e quem participa, na mesma tela.
 *
 * A ficha do funcionário nasce aqui quando falta gente — era o ponto em que o
 * fluxo travava, com a lista de membros vazia e nenhum caminho à vista.
 */
function EquipeInterna({
  condominioId,
  equipe,
  onVoltar,
  onPronto,
}: {
  condominioId: number;
  /** Presente: está editando o time de uma equipe que já existe. */
  equipe?: { id: number; nome: string };
  onVoltar: () => void;
  onPronto: () => Promise<void>;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();

  const [nome, setNome] = useState(equipe?.nome ?? "");
  /** `null` enquanto ninguém mexeu: vale quem já está gravado na equipe. */
  const [marcados, setMarcados] = useState<number[] | null>(equipe ? null : []);
  /** Mesma ideia para as unidades atendidas. */
  const [unidades, setUnidades] = useState<number[] | null>(equipe ? null : [condominioId]);
  /**
   * Equipe nova nasce atendendo todas.
   *
   * Deixar só a unidade da tela marcada era um risco silencioso: a equipe
   * sumia das ordens das outras, e quem montou o time não descobria — ia
   * procurar o funcionário na O.S. e ele não estava lá. Desmarcar é decisão
   * consciente; marcar as quinze, uma a uma, ninguém faz.
   */
  const { data: todasAsUnidades } = trpc.condominio.list.useQuery();
  /**
   * Semeia uma vez, e não a cada resposta da consulta.
   *
   * O React Query refaz a busca ao voltar para a aba: sem esta trava, quem
   * tivesse desmarcado unidades e trocado de janela voltaria com todas
   * marcadas de novo, desfazendo a escolha sem avisar.
   */
  const jaSemeou = useRef(false);
  useEffect(() => {
    if (equipe || jaSemeou.current || !todasAsUnidades || todasAsUnidades.length < 2) return;

    jaSemeou.current = true;
    setUnidades(todasAsUnidades.map((o) => o.id));
  }, [equipe, todasAsUnidades]);
  const [cadastrando, setCadastrando] = useState(false);

  const { data: unidadesGravadas } = trpc.equipes.unidades.useQuery(
    { equipeId: equipe?.id ?? 0 },
    { enabled: !!equipe },
  );
  const unidadesMarcadas = unidades ?? unidadesGravadas ?? [];

  // Quem pode entrar no time sai de todas as unidades atendidas: a equipe de
  // rede monta o grupo com gente de várias, e olhar só a unidade da O.S.
  // esconderia metade das pessoas.
  const { data: pessoas } = trpc.funcionario.list.useQuery(
    { condominioId: unidadesMarcadas[0] ?? condominioId, unidades: unidadesMarcadas },
    { enabled: (unidadesMarcadas[0] ?? condominioId) > 0 },
  );
  const { data: membrosAtuais } = trpc.equipes.membros.useQuery(
    { equipeId: equipe?.id ?? 0 },
    { enabled: !!equipe },
  );

  const gravados = (membrosAtuais ?? []).map((m) => m.funcionarioId);
  const escolhidos = marcados ?? gravados;
  /**
   * Editando, a marcação só vale depois que o time atual chegou.
   *
   * Marcar antes disso montaria uma lista sem quem já está na equipe, e salvar
   * tiraria o time inteiro para pôr um só — o gestor não veria nada acontecer
   * até a próxima abertura da tela.
   */
  const carregandoTime = !!equipe && (!membrosAtuais || !unidadesGravadas);

  const criarEquipe = trpc.equipes.create.useMutation();
  const atualizarEquipe = trpc.equipes.update.useMutation();
  const addMembros = trpc.equipes.addMembros.useMutation();
  const removerMembro = trpc.equipes.removeMembro.useMutation();

  const salvar = async () => {
    const limpo = nome.trim();
    if (limpo.length < 2) return toast.error("Informe o nome da equipe");

    if (unidadesMarcadas.length === 0) {
      return toast.error(`Marque ao menos uma ${v.unidade.toLowerCase()}`);
    }
    if (!pessoas) return toast.error("Aguarde carregar os funcionários.");

    /**
     * Só quem é das unidades que a equipe atende — mais quem já está no time.
     *
     * O filtro existe porque marcar alguém e depois desmarcar a unidade dele
     * deixava o id na lista, e o servidor recusava o vínculo com um erro que
     * não falava de unidade nenhuma.
     *
     * Quem já é membro passa mesmo sem aparecer na lista: `funcionario.list`
     * recorta por quem cadastrou, e sem esta ressalva salvar tiraria da equipe
     * justamente quem o gestor nunca chegou a ver.
     */
    const validos = escolhidos.filter(
      (id) => gravados.includes(id) || pessoas.some((p) => p.id === id),
    );

    if (equipe) {
      await atualizarEquipe.mutateAsync({
        id: equipe.id,
        nome: limpo,
        unidades: unidadesMarcadas,
      });

      const entrar = validos.filter((id) => !gravados.includes(id));
      const sair = gravados.filter((id) => !validos.includes(id));

      if (entrar.length > 0) {
        await addMembros.mutateAsync({ equipeId: equipe.id, funcionarioIds: entrar });
      }
      for (const funcionarioId of sair) {
        await removerMembro.mutateAsync({ equipeId: equipe.id, funcionarioId });
      }

      await utils.equipes.membros.invalidate({ equipeId: equipe.id });
      toast.success(`Equipe "${limpo}" atualizada`);
      await onPronto();
      return;
    }

    const criada = await criarEquipe.mutateAsync({
      condominioId,
      nome: limpo,
      unidades: unidadesMarcadas,
    });
    if (validos.length > 0) {
      await addMembros.mutateAsync({ equipeId: criada.id, funcionarioIds: validos });
    }

    toast.success(
      validos.length > 0
        ? `Equipe "${limpo}" criada com ${validos.length} funcionário(s)`
        : `Equipe "${limpo}" criada`,
    );
    await onPronto();
  };

  const salvando =
    criarEquipe.isPending ||
    atualizarEquipe.isPending ||
    addMembros.isPending ||
    removerMembro.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-slate-800">
          {equipe ? equipe.nome : "Nova equipe"}
        </span>
      </div>

      {/* O par do cabeçalho da tela de funcionários: são duas etapas, e esta é
          a segunda. Quem chegou aqui direto entende, pelo número, que existe
          uma antes — e que é lá que as pessoas nascem. */}
      <div className="rounded-lg bg-slate-800 text-white px-3 py-2.5 flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold shrink-0">
          2
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">Monte a equipe</p>
          <p className="text-xs text-white/70 leading-snug mt-0.5">
            Dê um nome e marque quem participa. A equipe designada na O.S. recebe o aviso.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eq-nome">Nome da equipe</Label>
        <Input
          id="eq-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Elétrica"
          autoFocus
        />
      </div>

      {/* Enquanto o que está gravado não chega, marcar montaria uma lista sem
          as unidades atuais — e salvar tiraria a equipe de todas elas. */}
      {!carregandoTime && (
        <UnidadesAtendidas
          marcadas={unidadesMarcadas}
          padrao={condominioId}
          onMudar={setUnidades}
        />
      )}

      {/* Segundo bloco, separado do primeiro: um nomeia a equipe, o outro
          escolhe quem entra nela. Emendados, o botão "Cadastrar funcionário"
          parecia parte do cadastro da equipe. */}
      <div className="pt-4 border-t space-y-1.5">
        <Label>Quem participa desta equipe ({escolhidos.length})</Label>

        {carregandoTime ? (
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando quem já está na equipe…
          </p>
        ) : (pessoas?.length ?? 0) === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-4 text-center">
            <UserPlus className="w-7 h-7 text-slate-300 mx-auto" strokeWidth={1.5} />
            <p className="text-xs text-slate-600 font-medium mt-1.5">
              Nenhum funcionário cadastrado ainda.
            </p>
            <p className="text-xs text-slate-500">
              Cadastre o primeiro abaixo — ele aparece aqui na hora, para ser marcado.
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5 max-h-52 overflow-y-auto">
            {pessoas!.map((p) => {
              const marcado = escolhidos.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setMarcados(
                      marcado
                        ? escolhidos.filter((id) => id !== p.id)
                        : [...escolhidos, p.id],
                    )
                  }
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                >
                  <Checkbox checked={marcado} className="pointer-events-none" />
                  <span className="truncate flex-1">{p.nome}</span>
                  {p.tipoFuncionario === "supervisor" && (
                    <span className="text-[11px] text-indigo-600">supervisor</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {cadastrando ? (
          <FichaRapida
            // A ficha nasce na unidade de onde a tela foi aberta — a menos que
            // ela nem esteja entre as atendidas, e aí na primeira marcada.
            condominioId={
              unidadesMarcadas.includes(condominioId)
                ? condominioId
                : (unidadesMarcadas[0] ?? condominioId)
            }
            onCancelar={() => setCadastrando(false)}
            onCriado={async (id) => {
              await utils.funcionario.list.invalidate();
              await utils.ordensServico.listarCandidatos.invalidate();
              // Quem acabou de ser cadastrado já entra marcado: foi para esta
              // equipe que ele foi criado.
              setMarcados([...escolhidos, id]);
              setCadastrando(false);
            }}
          />
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setCadastrando(true)}>
            <UserPlus className="w-4 h-4" /> Cadastrar funcionário
          </Button>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1"
          disabled={nome.trim().length < 2 || salvando || carregandoTime}
          onClick={() => void salvar().catch((e) => toast.error(e.message || "Não foi possível salvar"))}
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Salvar equipe
        </Button>
        <Button variant="outline" onClick={onVoltar} disabled={salvando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Empresa de fora: nome e contato de quem recebe a ordem. */
function NovaEquipeExterna({
  condominioId,
  onVoltar,
  onPronto,
}: {
  condominioId: number;
  onVoltar: () => void;
  onPronto: () => Promise<void>;
}) {
  const v = useVocabulario();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [unidades, setUnidades] = useState<number[]>([condominioId]);
  /** Empresa contratada também nasce atendendo todas, pelo mesmo motivo. */
  const { data: todasAsUnidades } = trpc.condominio.list.useQuery();
  const jaSemeou = useRef(false);
  useEffect(() => {
    if (jaSemeou.current || !todasAsUnidades || todasAsUnidades.length < 2) return;

    jaSemeou.current = true;
    setUnidades(todasAsUnidades.map((o) => o.id));
  }, [todasAsUnidades]);

  const criar = trpc.equipes.create.useMutation();

  const salvar = async () => {
    const limpo = nome.trim();
    if (limpo.length < 2) return toast.error("Informe o nome da empresa");
    if (!email.trim()) return toast.error("Informe o e-mail: é para onde vai o aviso da O.S.");
    // O servidor recusa e-mail torto com a mensagem do validador, em inglês.
    // A conferência aqui é o que devolve isso em português, no campo certo.
    if (!EMAIL_VALIDO.test(email.trim())) return toast.error("E-mail inválido");
    if (unidades.length === 0) {
      return toast.error(`Marque ao menos uma ${v.unidade.toLowerCase()}`);
    }

    await criar.mutateAsync({
      condominioId,
      nome: limpo,
      externa: true,
      email: email.trim(),
      whatsapp: whatsapp.trim() || undefined,
      unidades,
    });

    toast.success(`Equipe externa "${limpo}" cadastrada`);
    await onPronto();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-slate-800">Nova equipe externa</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ex-nome">Nome da empresa</Label>
        <Input
          id="ex-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Refrigeração Silva"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ex-email">E-mail</Label>
        <Input
          id="ex-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contato@empresa.com.br"
        />
        <p className="text-xs text-slate-500">
          É para cá que vai o aviso quando a O.S. for designada a esta empresa.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ex-zap">WhatsApp (opcional)</Label>
        <Input
          id="ex-zap"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>

      {/* A empresa contratada também atende mais de uma unidade: é comum o
          mesmo prestador cobrir a rede inteira. */}
      <UnidadesAtendidas marcadas={unidades} padrao={condominioId} onMudar={setUnidades} />

      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1"
          disabled={nome.trim().length < 2 || !email.trim() || criar.isPending}
          onClick={() => void salvar().catch((e) => toast.error(e.message || "Não foi possível salvar"))}
        >
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Salvar empresa
        </Button>
        <Button variant="outline" onClick={onVoltar} disabled={criar.isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * Ficha mínima do funcionário, dentro do cadastro da equipe.
 *
 * Nome, função e contato: acesso ao sistema e permissões continuam na tela de
 * Funcionários. Aqui a pessoa nasce só para poder entrar no time e responder
 * pela ordem.
 */
function FichaRapida({
  condominioId,
  onCriado,
  onCancelar,
}: {
  condominioId: number;
  onCriado: (id: number) => Promise<void> | void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("auxiliar");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const criar = trpc.funcionario.create.useMutation({
    onSuccess: async (res) => {
      toast.success("Funcionário cadastrado");
      await onCriado(res.id);
    },
    onError: (e) => toast.error(e.message || "Não foi possível cadastrar"),
  });

  return (
    // Fundo e título próprios: é um cadastro dentro do outro, e sem essa
    // separação o gestor não sabia o que estava preenchendo.
    <div className="border rounded-md p-3 space-y-2 bg-slate-50 mt-2">
      <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
        <UserPlus className="w-4 h-4 text-slate-500" /> Novo funcionário
      </p>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome de quem executa" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>Função</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.valor} value={t.valor}>
                {t.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          Supervisor é quem recebe o aviso quando a equipe é designada.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          size="sm"
          disabled={nome.trim().length < 2 || criar.isPending}
          onClick={() =>
            criar.mutate({
              condominioId,
              nome: nome.trim(),
              tipoFuncionario: tipo as (typeof TIPOS)[number]["valor"],
              telefone: telefone.trim() || undefined,
              email: email.trim() || undefined,
            })
          }
        >
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Cadastrar e marcar
        </Button>
        <Button variant="outline" size="sm" onClick={onCancelar} disabled={criar.isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default GerenciarEquipes;
