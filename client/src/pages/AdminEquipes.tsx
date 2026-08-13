import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useVocabulario } from "@/hooks/useVocabulario";
import { ArrowLeft, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

/**
 * Equipes de serviço da unidade.
 *
 * É o cadastro que sustenta a designação na O.S.: sem equipe montada, o campo
 * "equipe designada" não tem o que oferecer. O supervisor do time é quem recebe
 * o aviso, então a tela mostra quem tem esse papel em cada equipe.
 */
export default function AdminEquipes() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const v = useVocabulario();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;

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

  const recarregar = () => utils.equipes.list.invalidate();

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

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [carregandoUser, user, setLocation]);

  if (carregandoUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Equipes de Serviço</h1>
            <p className="text-xs text-slate-500">
              {organizacaoAtiva ? organizacaoAtiva.nome : `Sem ${v.unidade.toLowerCase()} vinculada`}
            </p>
          </div>
          <Button size="sm" onClick={() => setCriando(true)} disabled={condominioId === 0}>
            <Plus className="w-4 h-4 mr-2" /> Nova equipe
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (equipes?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Users className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="text-slate-600 font-medium mt-3">Nenhuma equipe cadastrada.</p>
              <p className="text-sm text-slate-500">
                A equipe agrupa funcionários por frente de trabalho e recebe a O.S. designada.
              </p>
            </CardContent>
          </Card>
        ) : (
          equipes!.map((equipe) => (
            <Card key={equipe.id}>
              <CardContent className="py-3 flex flex-wrap items-center gap-2">
                <div className="mr-auto min-w-[200px]">
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: equipe.cor ?? "#3b82f6" }}
                    />
                    {equipe.nome}
                  </p>
                  {equipe.descricao && (
                    <p className="text-xs text-slate-500">{equipe.descricao}</p>
                  )}
                  <Badge variant="outline" className="mt-1 text-[11px]">
                    {Number(equipe.totalMembros)} membro(s)
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEquipeAberta({ id: equipe.id, nome: equipe.nome })}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Membros
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
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <Button
              className="w-full"
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
              Criar equipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!equipeAberta} onOpenChange={(aberto) => !aberto && setEquipeAberta(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{equipeAberta?.nome}</DialogTitle>
          </DialogHeader>
          {equipeAberta && (
            <MembrosDaEquipe
              equipeId={equipeAberta.id}
              funcionarios={funcionarios ?? []}
              onMudou={recarregar}
            />
          )}
        </DialogContent>
      </Dialog>
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

      {disponiveis.length > 0 && (
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
      )}
    </div>
  );
}
