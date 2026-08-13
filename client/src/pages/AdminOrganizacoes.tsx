import { useMemo, useState } from "react";
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
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Ban, Building2, Loader2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";

type Organizacao = {
  id: number;
  nome: string;
  codigo?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  segmento?: string | null;
  tipoUnidade?: string | null;
  /** Preenchido quando a unidade está suspensa. */
  bloqueadaEm?: Date | string | null;
};

type Formulario = {
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
};

const VAZIO: Formulario = { nome: "", endereco: "", cidade: "", estado: "", cep: "" };

export default function AdminOrganizacoes() {
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Organizacao | null>(null);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<Formulario>(VAZIO);

  // O servidor devolve só o que a hierarquia alcança: o gestor-chefe recebe as
  // 15 unidades, o gestor de unidade recebe a dele.
  const { data: organizacoes, isLoading } = trpc.condominio.list.useQuery();
  // Criar e excluir organização é do gestor-chefe/dono, não do gestor de unidade.
  const { data: podeGerenciar } = trpc.gestores.podeGerenciar.useQuery();

  const criar = trpc.condominio.create.useMutation({
    onSuccess: async () => {
      toast.success("Organização criada");
      await utils.condominio.list.invalidate();
      fechar();
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizar = trpc.condominio.update.useMutation({
    onSuccess: async () => {
      toast.success("Organização atualizada");
      await utils.condominio.list.invalidate();
      fechar();
    },
    onError: (e) => toast.error(e.message),
  });

  const bloquear = trpc.condominio.bloquear.useMutation({
    onSuccess: async (res) => {
      await utils.condominio.list.invalidate();
      toast.success(res.bloqueada ? "Unidade suspensa" : "Unidade liberada");
    },
    onError: (e) => toast.error(e.message || "Não foi possível alterar"),
  });

  const remover = trpc.condominio.remove.useMutation({
    onSuccess: async () => {
      toast.success("Organização excluída");
      await utils.condominio.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = (organizacoes ?? []) as Organizacao[];
    if (!termo) return lista;
    return lista.filter(
      (o) =>
        o.nome.toLowerCase().includes(termo) ||
        (o.codigo ?? "").toLowerCase().includes(termo) ||
        (o.cidade ?? "").toLowerCase().includes(termo) ||
        (o.endereco ?? "").toLowerCase().includes(termo),
    );
  }, [organizacoes, busca]);

  function abrirCriacao() {
    setForm(VAZIO);
    setCriando(true);
  }

  function abrirEdicao(o: Organizacao) {
    setForm({
      nome: o.nome ?? "",
      endereco: o.endereco ?? "",
      cidade: o.cidade ?? "",
      estado: o.estado ?? "",
      cep: o.cep ?? "",
    });
    setEditando(o);
  }

  function fechar() {
    setCriando(false);
    setEditando(null);
    setForm(VAZIO);
  }

  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    const dados = {
      nome: form.nome.trim(),
      endereco: form.endereco.trim() || undefined,
      cidade: form.cidade.trim() || undefined,
      estado: form.estado.trim() || undefined,
      cep: form.cep.trim() || undefined,
    };
    if (editando) atualizar.mutate({ id: editando.id, ...dados });
    else criar.mutate(dados);
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
            <Building2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold">Organizações</h1>
          </div>
          {podeGerenciar && (
            <Button onClick={abrirCriacao}>
              <Plus className="w-4 h-4 mr-1" /> Nova
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
            placeholder="Buscar por nome, código, cidade ou endereço"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {organizacoes?.length ? "Nenhuma organização com esse filtro." : "Nenhuma organização cadastrada."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtradas.map((o) => (
              <Card key={o.id}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <div className="mr-auto">
                      <p className="font-medium text-slate-800">{o.nome}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        {o.codigo && <span className="font-mono">{o.codigo}</span>}
                        {o.endereco && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {o.endereco}
                          </span>
                        )}
                        {o.cidade && <span>{o.cidade}{o.estado ? `/${o.estado}` : ""}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {o.tipoUnidade && (
                          <Badge variant="outline" className="text-xs">
                            {o.tipoUnidade}
                          </Badge>
                        )}
                        {/* Suspensa: ninguém que trabalha nela entra. */}
                        {o.bloqueadaEm && (
                          <Badge className="bg-red-100 text-red-700 text-xs">
                            suspensa
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(o)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={o.bloqueadaEm ? "Liberar unidade" : "Suspender unidade"}
                      className={`${o.bloqueadaEm ? "text-emerald-700" : "text-amber-700"} ${podeGerenciar ? "" : "hidden"}`}
                      disabled={bloquear.isPending}
                      onClick={() => {
                        const bloqueada = !o.bloqueadaEm;
                        if (
                          !bloqueada ||
                          confirm(
                            `Suspender "${o.nome}"?

Ninguém que trabalha nela entra: gestor e equipe. Os dados ficam guardados.`,
                          )
                        ) {
                          bloquear.mutate({ id: o.id, bloqueada });
                        }
                      }}
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-red-600 hover:text-red-700 ${podeGerenciar ? "" : "hidden"}`}
                      disabled={remover.isPending}
                      onClick={() => {
                        if (confirm(`Excluir "${o.nome}"? A ação não pode ser desfeita.`)) {
                          remover.mutate({ id: o.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={criando || !!editando} onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar organização" : "Nova organização"}</DialogTitle>
            <DialogDescription>
              {editando ? editando.nome : "Os módulos padrão do segmento são criados junto."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estado">UF</Label>
                <Input id="estado" maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
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
