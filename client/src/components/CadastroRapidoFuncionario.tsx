import { useState } from "react";
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
import { useVocabulario } from "@/hooks/useVocabulario";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

const TIPOS = [
  { valor: "auxiliar", rotulo: "Auxiliar" },
  { valor: "zelador", rotulo: "Zelador" },
  { valor: "porteiro", rotulo: "Porteiro" },
  { valor: "supervisor", rotulo: "Supervisor" },
  { valor: "gerente", rotulo: "Gerente" },
] as const;

/**
 * Ficha rápida de quem executa o serviço, sem sair da O.S.
 *
 * Só o essencial: nome, função e contato. Acesso ao sistema, permissões e
 * vínculo com outras unidades continuam na tela de Funcionários — aqui a
 * pessoa nasce como ficha, que é o que basta para ser responsável por uma
 * ordem. Sem isto, quem está abrindo a O.S. e descobre que o funcionário não
 * está cadastrado perde tudo o que digitou para ir cadastrar.
 */
export function CadastroRapidoFuncionario({
  condominioId,
  onMudou,
}: {
  condominioId: number;
  onMudou?: () => void;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();

  const { data: pessoas, isLoading } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
  );

  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("auxiliar");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const recarregar = async () => {
    await Promise.all([
      utils.funcionario.list.invalidate(),
      utils.ordensServico.listarCandidatos.invalidate(),
    ]);
    onMudou?.();
  };

  const criar = trpc.funcionario.create.useMutation({
    onSuccess: async () => {
      setCriando(false);
      setNome("");
      setTelefone("");
      setEmail("");
      setTipo("auxiliar");
      await recarregar();
      toast.success("Funcionário cadastrado");
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(pessoas?.length ?? 0) === 0 ? (
        <div className="text-center py-8">
          <UserPlus className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-slate-600 font-medium mt-2">
            Nenhum funcionário nesta {v.unidade.toLowerCase()}.
          </p>
        </div>
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
                  if (confirm(`Remover ${p.nome} desta ${v.unidade.toLowerCase()}?`)) {
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

      {criando ? (
        <div className="border rounded-md p-3 space-y-2">
          <div>
            <Label>Nome</Label>
            <Input
              placeholder="Nome de quem executa"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div>
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
            <p className="text-xs text-slate-500 mt-1">
              Supervisor é quem recebe o aviso quando a equipe é designada.
            </p>
          </div>
          <div>
            <Label>Telefone (opcional)</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div>
            <Label>E-mail (opcional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
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
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Cadastrar
            </Button>
            <Button variant="outline" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Acesso ao sistema e permissões continuam na tela de Funcionários. Aqui a pessoa
            nasce como ficha, para poder ser responsável por uma ordem.
          </p>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setCriando(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo funcionário desta {v.unidade.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

export default CadastroRapidoFuncionario;
