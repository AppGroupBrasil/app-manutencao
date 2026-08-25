import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ArrowRight, Loader2, Trash2, UserPlus, Users } from "lucide-react";

const TIPOS = [
  { valor: "auxiliar", rotulo: "Auxiliar" },
  { valor: "zelador", rotulo: "Zelador" },
  { valor: "porteiro", rotulo: "Porteiro" },
  { valor: "supervisor", rotulo: "Supervisor" },
  { valor: "gerente", rotulo: "Gerente" },
] as const;

/**
 * Seção de cadastro de funcionários, dentro da O.S.
 *
 * Só o essencial: nome, função e contato. Acesso ao sistema, permissões e
 * vínculo com outras unidades continuam na tela de Funcionários — aqui a
 * pessoa nasce como ficha, que é o que basta para entrar numa equipe e
 * responder por uma ordem. Sem isto, quem está abrindo a O.S. e descobre que o
 * funcionário não está cadastrado perde tudo o que digitou para ir cadastrar.
 *
 * O formulário fica aberto o tempo todo, e não atrás de um botão "Novo": quem
 * chega aqui vem cadastrar, e quase nunca uma pessoa só — depois de gravar, os
 * campos se limpam e o teclado volta para o nome do próximo.
 */
export function CadastroRapidoFuncionario({
  condominioId,
  onMudou,
  onIrParaEquipe,
}: {
  condominioId: number;
  onMudou?: () => void;
  /**
   * Leva à etapa seguinte, que é o motivo de a pessoa estar aqui.
   *
   * Sem isto o cadastro termina sem dizer para onde ir, e quem acabou de
   * registrar cinco nomes fecha a tela sem saber que a equipe se monta noutra.
   */
  onIrParaEquipe?: () => void;
}) {
  const utils = trpc.useUtils();

  const { data: pessoas, isLoading } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
  );

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("auxiliar");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  /** Telefone e e-mail não fazem falta para a pessoa entrar numa equipe. */
  const [mostrarContato, setMostrarContato] = useState(false);
  /**
   * Para devolver o teclado ao nome depois de gravar.
   *
   * Quem cadastra pelo botão perdia o foco para ele: o campo ficava limpo e
   * aparentemente pronto, mas digitar não escrevia nada — e a impressão é a de
   * que a tela travou.
   */
  const campoNome = useRef<HTMLInputElement>(null);

  const recarregar = async () => {
    await Promise.all([
      utils.funcionario.list.invalidate(),
      utils.ordensServico.listarCandidatos.invalidate(),
    ]);
    onMudou?.();
  };

  const criar = trpc.funcionario.create.useMutation({
    onSuccess: async (_res, enviado) => {
      setNome("");
      setTelefone("");
      setEmail("");
      setTipo("auxiliar");
      // `mostrarContato` fica como está: quem abriu o contato para uma pessoa
      // costuma preenchê-lo para as seguintes, e recolher a cada gravação
      // obrigaria a reabrir dez vezes.
      campoNome.current?.focus();
      await recarregar();
      // Com o nome dentro: cadastrando cinco pessoas seguidas, "Funcionário
      // cadastrado" cinco vezes não diz qual delas entrou.
      toast.success(`${enviado.nome} cadastrado`);
    },
    onError: (e) => toast.error(e.message || "Não foi possível cadastrar"),
  });

  const excluir = trpc.funcionario.delete.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Funcionário removido");
    },
    onError: (e) => toast.error(e.message || "Não foi possível remover"),
  });

  const cadastrar = () =>
    criar.mutate({
      condominioId,
      nome: nome.trim(),
      tipoFuncionario: tipo as (typeof TIPOS)[number]["valor"],
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
    });

  const podeCadastrar = nome.trim().length >= 2 && !criar.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho numerado: são duas etapas, e esta é a primeira. Sem o
          número, quem cadastra a pessoa acha que já terminou — e vai procurar
          o funcionário na lista de equipes da ordem. */}
      <div className="rounded-lg bg-slate-800 text-white px-3 py-2.5 flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold shrink-0">
          1
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">Cadastre os funcionários</p>
          <p className="text-xs text-white/70 leading-snug mt-0.5">
            Cada pessoa cadastrada aqui aparece na tela da equipe para ser marcada.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="fn-nome">Nome</Label>
          <Input
            id="fn-nome"
            ref={campoNome}
            placeholder="Nome de quem executa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            // Enter cadastra: o formulário tem um campo obrigatório só, e
            // obrigar a mão a sair do teclado a cada nome é o que faz quem
            // tem dez pessoas para registrar desistir na terceira.
            onKeyDown={(e) => {
              if (e.key === "Enter" && podeCadastrar) cadastrar();
            }}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fn-funcao">Função</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger id="fn-funcao">
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

        {/* Contato fica recolhido: não é preciso para a pessoa entrar numa
            equipe, e dois campos vazios a mais na tela fazem parecer que são. */}
        {mostrarContato ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="fn-tel">Telefone</Label>
              <Input id="fn-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fn-email">E-mail</Label>
              <Input
                id="fn-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
            onClick={() => setMostrarContato(true)}
          >
            Telefone e e-mail (opcional)
          </button>
        )}

        <Button className="w-full" disabled={!podeCadastrar} onClick={cadastrar}>
          {criar.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Cadastrar funcionário
        </Button>
      </div>

      <div className="space-y-1.5 pt-1 border-t">
        <p className="text-sm font-medium text-slate-700 pt-3">
          Cadastrados ({pessoas?.length ?? 0})
        </p>

        {(pessoas?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhum ainda. O primeiro nome que você cadastrar aparece aqui.
          </p>
        ) : (
          <div className="divide-y border rounded-md max-h-56 overflow-y-auto">
            {pessoas!.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">{p.nome}</p>
                  {p.cargo && <p className="text-[11px] text-slate-500 truncate">{p.cargo}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`Remover ${p.nome} do cadastro?`)) {
                      excluir.mutate({ id: p.id });
                    }
                  }}
                  aria-label={`Remover ${p.nome}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* A porta para a etapa 2, e só depois de existir alguém para marcar:
          oferecer a equipe com a lista vazia é mandar a pessoa para uma tela
          onde não há o que fazer. */}
      {onIrParaEquipe && (pessoas?.length ?? 0) > 0 && (
        <Button variant="outline" className="w-full" onClick={onIrParaEquipe}>
          <Users className="w-4 h-4" /> Montar a equipe com estes funcionários
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}

      <p className="text-xs text-slate-500">
        Acesso ao sistema e permissões continuam na tela de Funcionários. Aqui a pessoa nasce
        como ficha, para entrar na equipe e responder por uma ordem.
      </p>
    </div>
  );
}

export default CadastroRapidoFuncionario;
