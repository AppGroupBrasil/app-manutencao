import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useVocabulario } from "@/hooks/useVocabulario";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  ArrowLeft,
  Crown,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";

type Papel = "chefe" | "gestor";

type Gestor = {
  id: number;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  bloqueado: boolean | null;
  senhaProvisoria: boolean;
  ultimoAcesso: Date | string | null;
  unidades: { id: number; nome: string; papel: string; ativo: boolean }[];
  /** Dono da organização ou gestor-chefe. */
  master?: boolean;
  /** Dono da organização: fica fixo no topo e não pode ser bloqueado. */
  dono?: boolean;
};

export default function AdminGestores() {
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();
  // "Gerente" aqui, "Síndico" em condomínio: o termo vem do cliente.
  const v = useVocabulario();

  const { data: gestores, isLoading } = trpc.gestores.listar.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery();
  // Gestor de unidade enxerga a lista, mas não administra ninguém.
  const { data: podeGerenciar } = trpc.gestores.podeGerenciar.useQuery();

  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Gestor | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [papel, setPapel] = useState<Papel>("gestor");
  const [unidadesIds, setUnidadesIds] = useState<number[]>([]);

  async function recarregar() {
    await utils.gestores.listar.invalidate();
  }

  const criar = trpc.gestores.criar.useMutation({
    onSuccess: async (res) => {
      toast.success(`Gestor criado — senha inicial ${res.senhaProvisoria}, troca obrigatória no 1º acesso`);
      await recarregar();
      fechar();
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizar = trpc.gestores.atualizar.useMutation({
    onSuccess: async () => {
      await recarregar();
    },
    onError: (e) => toast.error(e.message),
  });

  const definirUnidades = trpc.gestores.definirUnidades.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const resetarSenha = trpc.gestores.resetarSenha.useMutation({
    onSuccess: async (res) => {
      toast.success(`Senha redefinida para ${res.senhaProvisoria}`);
      await recarregar();
    },
    onError: (e) => toast.error(e.message),
  });

  const remover = trpc.gestores.remover.useMutation({
    onSuccess: async (res) => {
      toast.success(res.contaExcluida ? "Gestor excluído" : "Vínculo removido — a conta tem outras unidades");
      await recarregar();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = (gestores ?? []) as Gestor[];
    const visiveis = !termo
      ? lista
      : lista.filter(
          (g) =>
            (g.nome ?? "").toLowerCase().includes(termo) ||
            (g.email ?? "").toLowerCase().includes(termo) ||
            g.unidades.some((u) => u.nome.toLowerCase().includes(termo)),
        );

    // O topo da hierarquia fica em primeiro mesmo com a busca ativa; o servidor
    // já devolve nessa ordem, aqui é só garantia depois do filtro.
    return [...visiveis].sort((a, b) => {
      if (!!a.dono !== !!b.dono) return a.dono ? -1 : 1;
      if (!!a.master !== !!b.master) return a.master ? -1 : 1;
      return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
    });
  }, [gestores, busca]);

  function abrirCriacao() {
    setNome("");
    setEmail("");
    setTelefone("");
    setPapel("gestor");
    setUnidadesIds([]);
    setCriando(true);
  }

  function abrirEdicao(g: Gestor) {
    setNome(g.nome ?? "");
    setEmail(g.email ?? "");
    setTelefone(g.telefone ?? "");
    setPapel((g.unidades[0]?.papel as Papel) ?? "gestor");
    setUnidadesIds(g.unidades.map((u) => u.id));
    setEditando(g);
  }

  function fechar() {
    setCriando(false);
    setEditando(null);
  }

  function alternarUnidade(id: number) {
    setUnidadesIds((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  async function salvar() {
    if (!nome.trim()) return toast.error("Informe o nome");
    if (unidadesIds.length === 0) return toast.error("Selecione ao menos uma unidade");

    if (editando) {
      await atualizar.mutateAsync({ id: editando.id, nome: nome.trim(), telefone: telefone.trim() });
      await definirUnidades.mutateAsync({ id: editando.id, papel, organizacoesIds: unidadesIds });
      toast.success("Gestor atualizado");
      await recarregar();
      fechar();
      return;
    }

    if (!email.trim()) return toast.error("Informe o e-mail");
    criar.mutate({
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim() || undefined,
      papel,
      organizacoesIds: unidadesIds,
    });
  }

  const salvando = criar.isPending || atualizar.isPending || definirUnidades.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 mr-auto">
            <UserCog className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold">Gestores</h1>
          </div>
          {podeGerenciar && (
            <Button onClick={abrirCriacao}>
              <Plus className="w-4 h-4 mr-1" /> Novo
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou unidade"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <UserCog className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {gestores?.length ? "Nenhum gestor com esse filtro." : "Nenhum gestor cadastrado."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtrados.map((g) => (
              <Card key={g.id} className={g.dono ? "border-indigo-300 bg-indigo-50/40" : undefined}>
                <CardContent className="py-3 flex flex-wrap items-start gap-2">
                  <div className="mr-auto min-w-[200px]">
                    <p className="font-medium text-slate-800 flex items-center gap-2">
                      {g.nome ?? "(sem nome)"}
                      {g.dono && (
                        <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white">
                          <Crown className="w-3 h-3 mr-1" /> {v.gerente}
                        </Badge>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      {g.email && <span>{g.email}</span>}
                      {g.telefone && <span>{g.telefone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.unidades.map((u) => (
                        <Badge
                          key={u.id}
                          variant="outline"
                          className={u.papel === "chefe" ? "border-indigo-300 text-indigo-700" : ""}
                        >
                          {u.nome}
                          {u.papel === "chefe" ? " · chefe" : ""}
                        </Badge>
                      ))}
                      {g.senhaProvisoria && (
                        <Badge className="bg-amber-100 text-amber-800">senha provisória</Badge>
                      )}
                      {g.bloqueado && <Badge className="bg-red-100 text-red-800">bloqueado</Badge>}
                    </div>
                  </div>

                  {podeGerenciar && (
                    <>
                  <Button variant="ghost" size="sm" title="Editar" onClick={() => abrirEdicao(g)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Redefinir senha"
                    disabled={resetarSenha.isPending}
                    onClick={() => {
                      if (confirm(`Redefinir a senha de ${g.nome ?? g.email}?`)) resetarSenha.mutate({ id: g.id });
                    }}
                  >
                    <KeyRound className="w-4 h-4" />
                  </Button>
                  {/* O master não se bloqueia nem se remove: sem ele ninguém
                      mais administra a organização. O servidor recusa também. */}
                  {!g.dono && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={g.bloqueado ? "Desbloquear" : "Bloquear"}
                        disabled={atualizar.isPending}
                        onClick={() => atualizar.mutate({ id: g.id, bloqueado: !g.bloqueado })}
                      >
                        {g.bloqueado ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        title="Excluir"
                        disabled={remover.isPending}
                        onClick={() => {
                          if (confirm(`Remover ${g.nome ?? g.email} das suas unidades?`)) remover.mutate({ id: g.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={criando || !!editando} onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar gestor" : "Novo gestor"}</DialogTitle>
            <DialogDescription>
              {editando
                ? editando.email ?? ""
                : "A conta nasce com senha padrão e troca obrigatória no primeiro acesso."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-nome">Nome</Label>
              <Input id="g-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-email">E-mail</Label>
                <Input
                  id="g-email"
                  type="email"
                  value={email}
                  disabled={!!editando}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-tel">Telefone</Label>
                <Input id="g-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={papel} onValueChange={(v) => setPapel(v as Papel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor da unidade</SelectItem>
                  <SelectItem value="chefe">Gestor-chefe (várias unidades)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unidades</Label>
              <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
                {(organizacoes ?? []).map((o) => (
                  <label key={o.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={unidadesIds.includes(o.id)}
                      onCheckedChange={() => alternarUnidade(o.id)}
                    />
                    {o.nome}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">{unidadesIds.length} selecionada(s)</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
