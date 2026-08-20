import { useState } from "react";
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
import { ArrowLeft, Building2, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";

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

type Passo =
  | { tela: "lista" }
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
}: {
  condominioId: number;
  /** Chamado a cada alteração, para quem exibe a lista se atualizar. */
  onMudou?: () => void;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();

  const [passo, setPasso] = useState<Passo>({ tela: "lista" });

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

  return (
    <div className="space-y-3">
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
                  <UserPlus className="w-4 h-4" /> Membros
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
          className="h-auto py-3 flex-col items-start"
          onClick={() => setPasso({ tela: "interna" })}
        >
          <span className="flex items-center gap-2 font-medium">
            <Users className="w-4 h-4" /> Nova equipe desta {v.unidade.toLowerCase()}
          </span>
          <span className="text-xs text-slate-500 font-normal text-left">
            Funcionários da casa, com supervisor avisado
          </span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-3 flex-col items-start"
          onClick={() => setPasso({ tela: "externa" })}
        >
          <span className="flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4" /> Nova equipe externa
          </span>
          <span className="text-xs text-slate-500 font-normal text-left">
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
  const [cadastrando, setCadastrando] = useState(false);

  const { data: pessoas } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
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
  const carregandoTime = !!equipe && !membrosAtuais;

  const criarEquipe = trpc.equipes.create.useMutation();
  const atualizarEquipe = trpc.equipes.update.useMutation();
  const addMembros = trpc.equipes.addMembros.useMutation();
  const removerMembro = trpc.equipes.removeMembro.useMutation();

  const salvar = async () => {
    const limpo = nome.trim();
    if (limpo.length < 2) return toast.error("Informe o nome da equipe");

    if (equipe) {
      if (limpo !== equipe.nome) {
        await atualizarEquipe.mutateAsync({ id: equipe.id, nome: limpo });
      }

      const entrar = escolhidos.filter((id) => !gravados.includes(id));
      const sair = gravados.filter((id) => !escolhidos.includes(id));

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

    const criada = await criarEquipe.mutateAsync({ condominioId, nome: limpo });
    if (escolhidos.length > 0) {
      await addMembros.mutateAsync({ equipeId: criada.id, funcionarioIds: escolhidos });
    }

    toast.success(
      escolhidos.length > 0
        ? `Equipe "${limpo}" criada com ${escolhidos.length} funcionário(s)`
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-slate-800">
          {equipe ? equipe.nome : `Nova equipe desta ${v.unidade.toLowerCase()}`}
        </span>
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

      <div className="space-y-1.5">
        <Label>Quem participa desta equipe ({escolhidos.length})</Label>

        {carregandoTime ? (
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando quem já está na equipe…
          </p>
        ) : (pessoas?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhum funcionário nesta {v.unidade.toLowerCase()} ainda — cadastre o primeiro abaixo.
          </p>
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
            condominioId={condominioId}
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
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const criar = trpc.equipes.create.useMutation();

  const salvar = async () => {
    const limpo = nome.trim();
    if (limpo.length < 2) return toast.error("Informe o nome da empresa");
    if (!email.trim()) return toast.error("Informe o e-mail: é para onde vai o aviso da O.S.");
    // O servidor recusa e-mail torto com a mensagem do validador, em inglês.
    // A conferência aqui é o que devolve isso em português, no campo certo.
    if (!EMAIL_VALIDO.test(email.trim())) return toast.error("E-mail inválido");

    await criar.mutateAsync({
      condominioId,
      nome: limpo,
      externa: true,
      email: email.trim(),
      whatsapp: whatsapp.trim() || undefined,
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
    <div className="border rounded-md p-3 space-y-2">
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
