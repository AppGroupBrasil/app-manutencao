import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Loader2, Pencil, Plus, Search, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { PermissoesFuncionario } from "@/components/PermissoesFuncionario";

const TENANT_ATIVO_KEY = "condominio_ativo";

const TIPOS = ["auxiliar", "zelador", "porteiro", "supervisor", "gerente", "sindico_externo"] as const;
type TipoFuncionario = (typeof TIPOS)[number];

const ROTULO_TIPO: Record<TipoFuncionario, string> = {
  auxiliar: "Auxiliar",
  zelador: "Zelador",
  porteiro: "Funcionário",
  supervisor: "Supervisor",
  gerente: "Gerente",
  sindico_externo: "Gestor externo",
};

type Funcionario = {
  id: number;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean | null;
  tipoFuncionario?: string | null;
  loginEmail?: string | null;
  loginUsuario?: string | null;
  loginAtivo?: boolean | null;
};

type Formulario = {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  tipoFuncionario: TipoFuncionario;
  loginEmail: string;
  senha: string;
  loginAtivo: boolean;
};

const VAZIO: Formulario = {
  nome: "",
  cargo: "",
  telefone: "",
  email: "",
  tipoFuncionario: "auxiliar",
  loginEmail: "",
  senha: "",
  loginAtivo: false,
};

export default function AdminFuncionarios() {
  const [permissoesDe, setPermissoesDe] = useState<{ id: number; nome: string } | null>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();

  const { data: organizacoes } = trpc.condominio.list.useQuery();
  const [orgId, setOrgId] = useState<number | null>(() => {
    const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
    return Number.isFinite(salvo) && salvo > 0 ? salvo : null;
  });

  useEffect(() => {
    if (!organizacoes?.length) return;
    if (!orgId || !organizacoes.some((o) => o.id === orgId)) {
      const primeiro = organizacoes[0].id;
      localStorage.setItem(TENANT_ATIVO_KEY, String(primeiro));
      setOrgId(primeiro);
    }
  }, [organizacoes, orgId]);

  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [form, setForm] = useState<Formulario>(VAZIO);

  const { data: lista, isLoading } = trpc.funcionario.list.useQuery(
    { condominioId: orgId ?? 0 },
    { enabled: !!orgId },
  );

  async function recarregar() {
    await utils.funcionario.list.invalidate();
  }

  const criar = trpc.funcionario.create.useMutation({
    onSuccess: async () => {
      toast.success("Funcionário cadastrado");
      await recarregar();
      fechar();
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizar = trpc.funcionario.update.useMutation({
    onSuccess: async () => {
      toast.success("Funcionário atualizado");
      await recarregar();
      fechar();
    },
    onError: (e) => toast.error(e.message),
  });

  const remover = trpc.funcionario.delete.useMutation({
    onSuccess: async () => {
      toast.success("Funcionário excluído");
      await recarregar();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const itens = (lista ?? []) as Funcionario[];
    if (!termo) return itens;
    return itens.filter(
      (f) =>
        f.nome.toLowerCase().includes(termo) ||
        (f.cargo ?? "").toLowerCase().includes(termo) ||
        (f.email ?? "").toLowerCase().includes(termo),
    );
  }, [lista, busca]);

  function trocarOrganizacao(id: number) {
    localStorage.setItem(TENANT_ATIVO_KEY, String(id));
    setOrgId(id);
  }

  function abrirCriacao() {
    setForm(VAZIO);
    setCriando(true);
  }

  function abrirEdicao(f: Funcionario) {
    setForm({
      nome: f.nome ?? "",
      cargo: f.cargo ?? "",
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      tipoFuncionario: (f.tipoFuncionario as TipoFuncionario) ?? "auxiliar",
      loginEmail: f.loginEmail ?? f.email ?? "",
      senha: "",
      loginAtivo: !!f.loginAtivo,
    });
    setEditando(f);
  }

  function fechar() {
    setCriando(false);
    setEditando(null);
    setForm(VAZIO);
  }

  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!orgId) return toast.error("Selecione a organização");

    if (editando) {
      atualizar.mutate({
        id: editando.id,
        nome: form.nome.trim(),
        cargo: form.cargo.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
        tipoFuncionario: form.tipoFuncionario,
        loginEmail: form.loginEmail.trim() || undefined,
        // Campo em branco não mexe na senha atual.
        senha: form.senha.trim() || undefined,
        loginAtivo: form.loginAtivo,
      });
      return;
    }

    criar.mutate({
      condominioId: orgId,
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      email: form.email.trim() || undefined,
      tipoFuncionario: form.tipoFuncionario,
    });
  }

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 mr-auto">
            <Users className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold">Funcionários</h1>
          </div>
          <Select value={orgId ? String(orgId) : undefined} onValueChange={(v) => trocarOrganizacao(Number(v))}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              {(organizacoes ?? []).map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={abrirCriacao}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cargo ou e-mail"
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
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {lista?.length ? "Nenhum funcionário com esse filtro." : "Nenhum funcionário nesta organização."}
              </p>
              <Button className="mt-4" onClick={abrirCriacao}>
                <Plus className="w-4 h-4 mr-1" /> Cadastrar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtrados.map((f) => (
              <Card key={f.id}>
                <CardContent className="py-3 flex items-start gap-2">
                  <div className="mr-auto">
                    <p className="font-medium text-slate-800">{f.nome}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      {f.cargo && <span>{f.cargo}</span>}
                      {f.email && <span>{f.email}</span>}
                      {f.telefone && <span>{f.telefone}</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {ROTULO_TIPO[(f.tipoFuncionario as TipoFuncionario) ?? "auxiliar"]}
                      </Badge>
                      {f.loginAtivo ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">acesso ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-500">sem acesso</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Permissões"
                    aria-label={`Permissões de ${f.nome}`}
                    onClick={() => setPermissoesDe({ id: f.id, nome: f.nome })}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => abrirEdicao(f)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={remover.isPending}
                    onClick={() => {
                      if (confirm(`Excluir ${f.nome}?`)) remover.mutate({ id: f.id });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {permissoesDe && (
        <PermissoesFuncionario
          funcionarioId={permissoesDe.id}
          nome={permissoesDe.nome}
          onFechar={() => setPermissoesDe(null)}
        />
      )}

      <Dialog open={criando || !!editando} onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
            <DialogDescription>
              {editando ? editando.nome : "O acesso ao portal é configurado depois de criar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-nome">Nome</Label>
              <Input id="f-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-cargo">Cargo</Label>
                <Input id="f-cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipoFuncionario}
                  onValueChange={(v) => setForm({ ...form, tipoFuncionario: v as TipoFuncionario })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t} value={t}>{ROTULO_TIPO[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-email">E-mail</Label>
                <Input id="f-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-tel">Telefone</Label>
                <Input id="f-tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>

            {editando && (
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-medium text-slate-700">Acesso ao portal</p>
                <div className="space-y-1.5">
                  <Label htmlFor="f-login">E-mail de login</Label>
                  <Input id="f-login" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-senha">Nova senha</Label>
                  <Input
                    id="f-senha"
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder="deixe em branco para manter"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.loginAtivo}
                    onChange={(e) => setForm({ ...form, loginAtivo: e.target.checked })}
                  />
                  Acesso ativo
                </label>
              </div>
            )}
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
