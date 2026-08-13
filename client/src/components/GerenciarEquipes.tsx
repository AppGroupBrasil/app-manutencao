import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { useVocabulario } from "@/hooks/useVocabulario";
import { ArrowLeft, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";

/**
 * Cadastro de equipes de uma unidade: criar, remover e montar o time.
 *
 * Vive fora da página porque é usado em dois lugares — a tela de Equipes e a
 * engrenagem ao lado de "Equipe designada", na abertura da O.S. Quem está
 * abrindo a ordem e percebe que a equipe não existe resolve ali mesmo, sem
 * perder o que já digitou.
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

  const { data: equipes, isLoading } = trpc.equipes.list.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
  );
  const { data: funcionarios } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: condominioId > 0 },
  );

  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [equipeAberta, setEquipeAberta] = useState<{ id: number; nome: string } | null>(null);

  const recarregar = async () => {
    await utils.equipes.list.invalidate();
    onMudou?.();
  };

  const criar = trpc.equipes.create.useMutation({
    onSuccess: async () => {
      setCriando(false);
      setNome("");
      setDescricao("");
      await recarregar();
      toast.success("Equipe criada");
    },
    onError: (e) => toast.error(e.message || "Não foi possível criar a equipe"),
  });

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

  // Dentro de uma equipe: a lista de fora sai da frente para não confundir.
  if (equipeAberta) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEquipeAberta(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-slate-800">{equipeAberta.nome}</span>
        </div>

        <MembrosDaEquipe
          equipeId={equipeAberta.id}
          funcionarios={funcionarios ?? []}
          onMudou={recarregar}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(equipes?.length ?? 0) === 0 ? (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-slate-600 font-medium mt-2">Nenhuma equipe ainda.</p>
          <p className="text-xs text-slate-500">
            A equipe agrupa funcionários por frente de trabalho e recebe a O.S. designada.
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
                <p className="text-[11px] text-slate-500">
                  {Number(equipe.totalMembros)} membro(s)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEquipeAberta({ id: equipe.id, nome: equipe.nome })}
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> Membros
              </Button>
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

      {criando ? (
        <div className="border rounded-md p-3 space-y-2">
          <div>
            <Label>Nome</Label>
            <Input
              placeholder="Ex: Elétrica"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex: manutenção elétrica e iluminação"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={nome.trim().length < 2 || criar.isPending}
              onClick={() =>
                criar.mutate({
                  condominioId,
                  nome: nome.trim(),
                  descricao: descricao.trim() || undefined,
                })
              }
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar
            </Button>
            <Button variant="outline" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setCriando(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova equipe desta {v.unidade.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

/** Membros da equipe: quem entra, quem sai e quem é o supervisor avisado. */
function MembrosDaEquipe({
  equipeId,
  funcionarios,
  onMudou,
}: {
  equipeId: number;
  funcionarios: { id: number; nome: string; tipoFuncionario?: string | null }[];
  onMudou: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: membros, isLoading } = trpc.equipes.membros.useQuery({ equipeId });

  const recarregar = async () => {
    await utils.equipes.membros.invalidate({ equipeId });
    onMudou();
  };

  const adicionar = trpc.equipes.addMembros.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Não foi possível adicionar"),
  });
  const remover = trpc.equipes.removeMembro.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Não foi possível remover"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const jaNaEquipe = new Set((membros ?? []).map((m) => m.funcionarioId));
  const disponiveis = funcionarios.filter((f) => !jaNaEquipe.has(f.id));
  const temSupervisor = (membros ?? []).some((m) => m.tipoFuncionario === "supervisor");

  return (
    <div className="space-y-3">
      {!temSupervisor && (membros?.length ?? 0) > 0 && (
        <p className="text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded-lg px-3 py-2">
          Nenhum supervisor nesta equipe: o aviso da O.S. designada vai para todos os membros.
        </p>
      )}

      <div className="divide-y border rounded-md">
        {(membros ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 px-3 py-3">Nenhum membro ainda.</p>
        ) : (
          membros!.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm">{m.nome}</span>
              {m.tipoFuncionario === "supervisor" && (
                <Badge className="bg-indigo-100 text-indigo-700 text-[11px]">supervisor</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => remover.mutate({ equipeId, funcionarioId: m.funcionarioId })}
                aria-label={`Remover ${m.nome} da equipe`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {disponiveis.length > 0 ? (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Adicionar à equipe</p>
          <div className="divide-y border rounded-md max-h-52 overflow-y-auto">
            {disponiveis.map((f) => (
              <button
                key={f.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                disabled={adicionar.isPending}
                onClick={() => adicionar.mutate({ equipeId, funcionarioIds: [f.id] })}
              >
                <UserPlus className="w-4 h-4 text-slate-400" />
                <span className="flex-1">{f.nome}</span>
                {f.tipoFuncionario === "supervisor" && (
                  <span className="text-[11px] text-indigo-600">supervisor</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Todos os funcionários desta unidade já estão nesta equipe.
        </p>
      )}
    </div>
  );
}

export default GerenciarEquipes;
