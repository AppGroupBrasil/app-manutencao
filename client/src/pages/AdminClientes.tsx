import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SEGMENTOS_VALIDOS } from "@shared/modules/registry";
import { ArrowLeft, Building2, KeyRound, Loader2, Plus, Users } from "lucide-react";

const ROTULO_SEGMENTO: Record<string, string> = {
  generico: "Genérico",
  condominio: "Condomínio",
  metalurgia: "Metalurgia",
  oficina: "Oficina",
  academia: "Academia",
  facilities: "Facilities",
  educacional: "Rede educacional",
};

const FORM_VAZIO = {
  segmento: "facilities",
  unidades: "",
  gestorNome: "",
  gestorEmail: "",
  gestorTelefone: "",
  senhaProvisoria: "",
};

/**
 * Abertura de cliente — só a conta da plataforma chega aqui.
 *
 * Cliente é um gestor-chefe mais as unidades dele. O segmento decide o pacote
 * de funções que nasce ligado; o resto se ajusta depois, dentro de cada
 * unidade.
 */
export default function AdminClientes() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: clientes, isLoading } = trpc.plataforma.listarClientes.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const abrir = trpc.plataforma.abrirCliente.useMutation({
    onSuccess: async (res) => {
      setAberto(false);
      setForm(FORM_VAZIO);
      await utils.plataforma.listarClientes.invalidate();
      toast.success(
        `Cliente aberto: ${res.unidades.length} unidade(s) para ${res.gestor.nome}`,
      );
      if (res.semModulos.length > 0) {
        toast.error(`Sem pacote de módulos: ${res.semModulos.join(", ")}`);
      }
    },
    onError: (e) => toast.error(e.message || "Erro ao abrir o cliente"),
  });

  const unidades = form.unidades
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const podeSalvar =
    unidades.length > 0 &&
    form.gestorNome.trim().length >= 2 &&
    /.+@.+\..+/.test(form.gestorEmail) &&
    form.senhaProvisoria.length >= 6;

  if (carregandoUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Clientes</h1>
            <p className="text-xs text-slate-500">
              {clientes?.length ?? 0} cliente(s) na plataforma
            </p>
          </div>
          <Button size="sm" onClick={() => setAberto(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo cliente
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (clientes?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Building2 className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="font-semibold text-slate-700 mt-3">Nenhum cliente ainda</p>
              <p className="text-sm text-slate-500">
                Abrir um cliente cria o gestor-chefe e as unidades dele de uma vez.
              </p>
            </CardContent>
          </Card>
        ) : (
          clientes!.map((c) => (
            <Card key={c.gestorId}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800">{c.gestorNome}</h3>
                    <p className="text-xs text-slate-500">{c.gestorEmail}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {ROTULO_SEGMENTO[c.segmento ?? ""] ?? c.segmento} ·{" "}
                      {c.unidades.length} unidade(s)
                    </p>
                  </div>
                  {c.senhaProvisoria && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                      <KeyRound className="w-3 h-3" /> senha provisória
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.unidades.map((u) => (
                    <span
                      key={u.id}
                      className="text-[11px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5"
                    >
                      {u.nome}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>
              Cria o gestor-chefe e as unidades dele. Ele manda na rede dele e não enxerga
              nenhum outro cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Segmento</Label>
              <Select
                value={form.segmento}
                onValueChange={(v) => setForm({ ...form, segmento: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTOS_VALIDOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ROTULO_SEGMENTO[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Define quais funções já nascem ligadas para este cliente.
              </p>
            </div>

            <div>
              <Label>Unidades — uma por linha</Label>
              <Textarea
                rows={4}
                placeholder={"Matriz\nFilial Centro\nFilial Norte"}
                value={form.unidades}
                onChange={(e) => setForm({ ...form, unidades: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                {unidades.length} unidade(s) serão criadas.
              </p>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <span className="text-sm font-medium inline-flex items-center gap-2">
                <Users className="w-4 h-4" /> Gestor-chefe
              </span>
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.gestorNome}
                  onChange={(e) => setForm({ ...form, gestorNome: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.gestorEmail}
                  onChange={(e) => setForm({ ...form, gestorEmail: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.gestorTelefone}
                  onChange={(e) => setForm({ ...form, gestorTelefone: e.target.value })}
                />
              </div>
              <div>
                <Label>Senha provisória</Label>
                <Input
                  value={form.senhaProvisoria}
                  onChange={(e) => setForm({ ...form, senhaProvisoria: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Combine por telefone. O sistema obriga a troca no primeiro acesso.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!podeSalvar || abrir.isPending}
              onClick={() =>
                abrir.mutate({
                  segmento: form.segmento as (typeof SEGMENTOS_VALIDOS)[number],
                  unidades,
                  gestor: {
                    nome: form.gestorNome.trim(),
                    email: form.gestorEmail.trim(),
                    senhaProvisoria: form.senhaProvisoria,
                    telefone: form.gestorTelefone.trim() || undefined,
                  },
                })
              }
            >
              {abrir.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Abrir cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
