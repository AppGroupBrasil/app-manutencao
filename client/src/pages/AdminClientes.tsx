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
import {
  VOCABULARIO_PADRAO,
  VOCABULARIO_POR_SEGMENTO,
  PREFIXO_VOCABULARIO,
  type TermoVocabulario,
} from "@shared/vocabulario";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarClock,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";

/** Data curta, do jeito que se lê no Brasil. */
function dia(valor?: Date | string | null): string {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

/** Dias inteiros que faltam para o fim do teste; zero quando venceu. */
function diasDeTeste(trialAte?: Date | string | null): number | null {
  if (!trialAte) return null;
  const fim = new Date(trialAte);
  if (Number.isNaN(fim.getTime())) return null;
  return Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 86_400_000));
}

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

  const [verExcluidos, setVerExcluidos] = useState(false);
  const [editando, setEditando] = useState<{
    gestorId: number;
    nome: string;
    email: string;
    telefone: string;
  } | null>(null);

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: clientes, isLoading } = trpc.plataforma.listarClientes.useQuery(
    { incluirExcluidos: verExcluidos },
    { enabled: !!user, retry: false },
  );

  const recarregar = () => utils.plataforma.listarClientes.invalidate();

  const editar = trpc.plataforma.editarCliente.useMutation({
    onSuccess: async () => {
      setEditando(null);
      await recarregar();
      toast.success("Cadastro atualizado");
    },
    onError: (e) => toast.error(e.message || "Não foi possível salvar"),
  });

  const bloquear = trpc.plataforma.bloquearCliente.useMutation({
    onSuccess: async (res) => {
      await recarregar();
      toast.success(res.bloqueado ? "Cliente bloqueado" : "Cliente liberado");
    },
    onError: (e) => toast.error(e.message || "Não foi possível alterar"),
  });

  const definirTeste = trpc.plataforma.definirTeste.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Prazo atualizado");
    },
    onError: (e) => toast.error(e.message || "Não foi possível alterar o prazo"),
  });

  const excluir = trpc.plataforma.excluirCliente.useMutation({
    onSuccess: async (res) => {
      await recarregar();
      toast.success(res.excluido ? "Cliente excluído" : "Cliente restaurado");
    },
    onError: (e) => toast.error(e.message || "Não foi possível excluir"),
  });

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  // Vocabulário do cliente: em branco significa "usa o padrão".
  const [vocabulario, setVocabulario] = useState<Partial<Record<TermoVocabulario, string>>>({});

  const abrir = trpc.plataforma.abrirCliente.useMutation({
    onSuccess: async (res) => {
      setAberto(false);
      setForm(FORM_VAZIO);
      setVocabulario({});
      await utils.plataforma.listarClientes.invalidate();
      toast.success(
        `Cliente aberto: ${res.unidades.length} unidade(s) para ${res.gestor.nome}`,
      );
      if (res.semModulos.length > 0) {
        toast.error(`Preparo incompleto em: ${res.semModulos.join(", ")}`);
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500"
              onClick={() => setVerExcluidos((v) => !v)}
            >
              {verExcluidos ? "Esconder excluídos" : "Ver excluídos"}
            </Button>
            <Button size="sm" onClick={() => setAberto(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo cliente
            </Button>
          </div>
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

                {/* O que a plataforma olha para decidir cobrar ou ligar. */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                  <div>
                    <p className="text-slate-400">Cadastro</p>
                    <p className="text-slate-700">{dia(c.criadoEm)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Último acesso</p>
                    <p className="text-slate-700">{dia(c.ultimoAcesso)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Acessos (7 dias)</p>
                    <p className="text-slate-700">{c.acessos7}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Acessos (30 dias)</p>
                    <p className="text-slate-700">{c.acessos30}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                  {(() => {
                    const dias = diasDeTeste(c.trialAte);
                    if (c.excluidoEm) {
                      return (
                        <span className="text-[11px] bg-slate-200 text-slate-700 rounded-full px-2 py-0.5">
                          excluído em {dia(c.excluidoEm)}
                        </span>
                      );
                    }
                    if (c.bloqueado) {
                      return (
                        <span className="text-[11px] bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                          bloqueado
                        </span>
                      );
                    }
                    if (dias === null) {
                      return (
                        <span className="text-[11px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                          sem prazo
                        </span>
                      );
                    }
                    return (
                      <span
                        className={`text-[11px] rounded-full px-2 py-0.5 ${
                          dias === 0
                            ? "bg-red-100 text-red-700"
                            : dias <= 2
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {dias === 0 ? "teste vencido" : `teste: ${dias} dia(s)`}
                      </span>
                    );
                  })()}

                  <div className="ml-auto flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Editar cadastro"
                      onClick={() =>
                        setEditando({
                          gestorId: c.gestorId,
                          nome: c.gestorNome ?? "",
                          email: c.gestorEmail ?? "",
                          telefone: c.gestorTelefone ?? "",
                        })
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    {/* Libera de vez: tira o prazo e o cliente vira pagante. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Liberar sem prazo (cliente pagante)"
                      disabled={definirTeste.isPending || !c.trialAte}
                      onClick={() => definirTeste.mutate({ gestorId: c.gestorId, dias: null })}
                    >
                      <CalendarClock className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className={c.bloqueado ? "text-emerald-700" : "text-amber-700"}
                      title={c.bloqueado ? "Liberar acesso" : "Bloquear acesso"}
                      disabled={bloquear.isPending}
                      onClick={() =>
                        bloquear.mutate({ gestorId: c.gestorId, bloqueado: !c.bloqueado })
                      }
                    >
                      <Ban className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title={c.excluidoEm ? "Restaurar cliente" : "Excluir cliente"}
                      disabled={excluir.isPending}
                      onClick={() => {
                        if (c.excluidoEm) {
                          excluir.mutate({ gestorId: c.gestorId, restaurar: true });
                          return;
                        }
                        if (
                          confirm(
                            `Excluir ${c.gestorNome}?\n\nEle perde o acesso e some desta lista. Os dados ficam guardados e dá para restaurar.`,
                          )
                        ) {
                          excluir.mutate({ gestorId: c.gestorId });
                        }
                      }}
                    >
                      {c.excluidoEm ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={!!editando} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Nome, e-mail e telefone do gestor. O e-mail é o login dele.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editando.email}
                  onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editando.telefone}
                  onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={editar.isPending || editando.nome.trim().length < 2}
                onClick={() =>
                  editar.mutate({
                    gestorId: editando.gestorId,
                    nome: editando.nome.trim(),
                    email: editando.email.trim() || undefined,
                    telefone: editando.telefone.trim() || null,
                  })
                }
              >
                {editar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                onValueChange={(v) => {
                  setForm({ ...form, segmento: v });
                  // Sugere as palavras do segmento; tudo continua editável.
                  setVocabulario(VOCABULARIO_POR_SEGMENTO[v] ?? {});
                }}
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
                Define o vocabulário sugerido. As funções são as mesmas para todo
                cliente novo e cada unidade ajusta as dela depois.
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

            {/* Vocabulário: o que muda de negócio para negócio. Em branco, o
                cliente fica com o termo padrão. */}
            <details className="border rounded-lg p-3">
              <summary className="text-sm font-medium cursor-pointer">
                Vocabulário do cliente (opcional)
              </summary>
              <p className="text-xs text-slate-500 mt-2">
                Renomeia os termos nas telas deste cliente. Vem preenchido pelo
                segmento escolhido — troque o que não combinar com o cliente.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {(Object.keys(VOCABULARIO_PADRAO) as TermoVocabulario[]).map((termo) => (
                  <div key={termo}>
                    <Label className="text-[11px] text-slate-500">
                      {VOCABULARIO_PADRAO[termo]}
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder={VOCABULARIO_PADRAO[termo]}
                      value={vocabulario[termo] ?? ""}
                      onChange={(e) =>
                        setVocabulario((atual) => ({ ...atual, [termo]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </details>

            <Button
              className="w-full"
              disabled={!podeSalvar || abrir.isPending}
              onClick={() => {
                const labels: Record<string, string> = {};
                for (const [termo, valor] of Object.entries(vocabulario)) {
                  if (valor?.trim()) labels[`${PREFIXO_VOCABULARIO}${termo}`] = valor.trim();
                }

                abrir.mutate({
                  segmento: form.segmento as (typeof SEGMENTOS_VALIDOS)[number],
                  unidades,
                  gestor: {
                    nome: form.gestorNome.trim(),
                    email: form.gestorEmail.trim(),
                    senhaProvisoria: form.senhaProvisoria,
                    telefone: form.gestorTelefone.trim() || undefined,
                  },
                  labels: Object.keys(labels).length > 0 ? labels : undefined,
                });
              }}
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
