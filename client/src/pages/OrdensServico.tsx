import { useEffect, useMemo, useState } from "react";
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
import { OsDetalhe } from "@/components/OsDetalhe";
import {
  ArrowLeft,
  Calendar,
  Hash,
  Loader2,
  MapPin,
  Plus,
  Search,
  Share2,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TENANT_ATIVO_KEY = "condominio_ativo";
const POR_PAGINA = 15;

/** Mesma leitura do Manutenção X: data e hora curtas, em pt-BR. */
function formatarDataHora(valor?: string | Date | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Badge colorida pelo próprio cadastro do tenant (status e prioridade têm cor). */
function Etiqueta({ texto, cor }: { texto?: string | null; cor?: string | null }) {
  if (!texto) return null;
  const base = cor || "#6B7280";
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
      style={{ color: base, borderColor: `${base}55`, backgroundColor: `${base}14` }}
    >
      {texto}
    </span>
  );
}

const FORM_VAZIO = {
  titulo: "",
  descricao: "",
  categoriaId: "",
  prioridadeId: "",
  statusId: "",
  setorId: "",
  endereco: "",
};

export default function OrdensServico({ osInicial }: { osInicial?: number }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;
  const habilitado = !!organizacaoAtiva;

  // O Manutenção X carrega a lista inteira e filtra/pagina no cliente. Manter
  // isso preserva o comportamento das abas e do gráfico, que somam tudo.
  const { data: lista, isLoading: carregandoLista } = trpc.ordensServico.list.useQuery(
    { condominioId, limit: 500 },
    { enabled: habilitado },
  );
  const { data: statusList } = trpc.ordensServico.getStatus.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: prioridades } = trpc.ordensServico.getPrioridades.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: categorias } = trpc.ordensServico.getCategorias.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: candidatos } = trpc.ordensServico.listarCandidatos.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<number | "todos">("todos");
  const [pagina, setPagina] = useState(1);
  const [modalNova, setModalNova] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [responsaveisNova, setResponsaveisNova] = useState<number[]>([]);
  // Vindo do QR Code, a O.S. já abre; depois disso o estado é do usuário.
  const [detalheId, setDetalheId] = useState<number | null>(
    Number.isFinite(osInicial) && osInicial ? osInicial : null,
  );

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [carregandoUser, user, setLocation]);

  const invalidar = async () => {
    await Promise.all([
      utils.ordensServico.list.invalidate(),
      detalheId !== null ? utils.ordensServico.getById.invalidate({ id: detalheId }) : null,
    ]);
  };

  const addResponsavel = trpc.ordensServico.addResponsavel.useMutation();

  const criar = trpc.ordensServico.create.useMutation({
    onSuccess: async (res) => {
      // Responsáveis são registros filhos: entram depois que a O.S. existe.
      for (const funcionarioId of responsaveisNova) {
        const pessoa = candidatos?.find((c) => c.id === funcionarioId);
        if (!pessoa) continue;
        await addResponsavel
          .mutateAsync({
            ordemServicoId: res.id,
            nome: pessoa.nome,
            cargo: pessoa.cargo ?? undefined,
            email: pessoa.email ?? undefined,
            telefone: pessoa.telefone ?? undefined,
            funcionarioId: pessoa.id,
          })
          .catch(() => toast.error(`Não foi possível vincular ${pessoa.nome}`));
      }
      setModalNova(false);
      setForm(FORM_VAZIO);
      setResponsaveisNova([]);
      await invalidar();
      toast.success(`O.S. ${res.protocolo} criada`);
    },
    onError: (e) => toast.error(e.message || "Erro ao criar a O.S."),
  });

  const setAutoNotificar = trpc.ordensServico.setAutoNotificar.useMutation({
    onSuccess: () => utils.condominio.list.invalidate(),
    onError: (e) => toast.error(e.message || "Erro ao salvar a configuração"),
  });

  const setNotificarEmail = trpc.ordensServico.setNotificarEmail.useMutation({
    onSuccess: () => utils.ordensServico.listarCandidatos.invalidate({ condominioId }),
    onError: (e) => toast.error(e.message || "Erro ao salvar a preferência"),
  });

  const atualizar = trpc.ordensServico.update.useMutation({
    onSuccess: invalidar,
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  const excluir = trpc.ordensServico.delete.useMutation({
    onSuccess: async () => {
      setDetalheId(null);
      await invalidar();
      toast.success("O.S. excluída");
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir a O.S."),
  });

  const ordens = lista?.items ?? [];

  const compartilharWhatsApp = (os: (typeof ordens)[number]) => {
    const mensagem = [
      "*Ordem de Serviço*",
      `*Protocolo:* ${os.protocolo}`,
      `*Título:* ${os.titulo}`,
      os.categoria?.nome ? `*Categoria:* ${os.categoria.nome}` : "",
      os.prioridade?.nome ? `*Prioridade:* ${os.prioridade.nome}` : "",
      os.status?.nome ? `*Status:* ${os.status.nome}` : "",
      `*Local:* ${os.endereco || "N/A"}`,
      `*Abertura:* ${formatarDataHora(os.createdAt)}`,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  const compartilhar = async (os: (typeof ordens)[number]) => {
    const texto = `${os.protocolo} — ${os.titulo}`;
    if (navigator.share) {
      await navigator.share({ title: "Ordem de Serviço", text: texto }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(texto);
    toast.success("Copiado para a área de transferência");
  };

  const filtradas = useMemo(() => {
    return ordens.filter((os) => {
      if (filtroStatus !== "todos" && os.statusId !== filtroStatus) return false;
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      const texto = [
        os.titulo,
        os.descricao,
        os.protocolo,
        os.endereco,
        os.categoria?.nome,
        os.prioridade?.nome,
        os.status?.nome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return termo.split(/\s+/).every((t) => texto.includes(t));
    });
  }, [ordens, filtroStatus, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroStatus]);

  const osDetalhe = ordens.find((os) => os.id === detalheId);
  const tituloDetalhe = osDetalhe
    ? `${osDetalhe.protocolo} — ${osDetalhe.titulo}`
    : "Ordem de Serviço";

  const dadosGrafico = useMemo(
    () =>
      (statusList ?? []).map((s) => ({
        status: s.nome,
        total: ordens.filter((os) => os.statusId === s.id).length,
      })),
    [statusList, ordens],
  );

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/manutencoes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Ordens de Serviço</h1>
            <p className="text-xs text-slate-500">
              {lista?.total ?? 0} ordens registradas
              {organizacaoAtiva ? ` · ${organizacaoAtiva.nome}` : ""}
            </p>
          </div>
          <Button size="sm" onClick={() => setModalNova(true)} disabled={!habilitado}>
            <Plus className="w-4 h-4 mr-2" /> Nova O.S.
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9 pr-9"
            placeholder="Buscar por título, protocolo, local, categoria, prioridade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors ${
              filtroStatus === "todos"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => setFiltroStatus("todos")}
          >
            Todas
          </button>
          {(statusList ?? []).map((s) => {
            const ativo = filtroStatus === s.id;
            return (
              <button
                key={s.id}
                className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors"
                style={
                  ativo
                    ? { background: s.cor ?? "#334155", color: "#fff", borderColor: s.cor ?? "#334155" }
                    : { color: s.cor ?? "#475569", borderColor: `${s.cor ?? "#94a3b8"}55` }
                }
                onClick={() => setFiltroStatus(s.id)}
              >
                {s.nome}
              </button>
            );
          })}
        </div>

        {carregandoLista ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Wrench className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="font-semibold text-slate-700 mt-3">Nenhuma ordem de serviço</p>
              <p className="text-sm text-slate-500">
                {busca ? "Nenhum resultado para a busca atual." : "Crie sua primeira ordem de serviço."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visiveis.map((os) => (
              <Card key={os.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-mono">#{os.id}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        <Hash className="w-3 h-3" /> {os.protocolo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Etiqueta texto={os.prioridade?.nome} cor={os.prioridade?.cor} />
                      <Etiqueta texto={os.status?.nome} cor={os.status?.cor} />
                    </div>
                  </div>

                  {os.responsavelPrincipalNome && (
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-medium">Responsável:</span> {os.responsavelPrincipalNome}
                    </p>
                  )}

                  <h4 className="font-semibold text-slate-800 mt-2">{os.titulo}</h4>
                  {os.descricao && (
                    <p className="text-sm text-slate-600 line-clamp-2">{os.descricao}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {os.endereco || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatarDataHora(os.createdAt)}
                    </span>
                    {os.categoria?.nome && <span>{os.categoria.nome}</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Status:</span>
                      <Select
                        value={os.statusId ? String(os.statusId) : ""}
                        onValueChange={(v) =>
                          atualizar.mutate({ id: os.id, statusId: Number(v) })
                        }
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder="Definir" />
                        </SelectTrigger>
                        <SelectContent>
                          {(statusList ?? []).map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setDetalheId(os.id)}>
                      Abrir O.S.
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => compartilharWhatsApp(os)}>
                      WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => compartilhar(os)}
                      aria-label="Compartilhar"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Excluir a O.S. ${os.protocolo} — "${os.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
                          excluir.mutate({ id: os.id });
                        }
                      }}
                      aria-label={`Excluir O.S. ${os.protocolo}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  {filtradas.length} ordens · página {paginaAtual} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Resumo por Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>

      {/* Nova O.S. */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Manutenção do elevador"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                placeholder="Descreva o problema detalhadamente..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.categoriaId}
                  onValueChange={(v) => setForm({ ...form, categoriaId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categorias ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridadeId}
                  onValueChange={(v) => setForm({ ...form, prioridadeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(prioridades ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status inicial</Label>
                <Select
                  value={form.statusId}
                  onValueChange={(v) => setForm({ ...form, statusId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Primeiro status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(statusList ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local</Label>
                <Input
                  placeholder="Ex: Bloco A - 3º andar"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </div>
            </div>

            {/* Responsáveis */}
            <div className="border rounded-lg p-3 space-y-2">
              <span className="text-sm font-medium">Responsáveis pela O.S.</span>
              <p className="text-xs text-slate-500">
                Marque uma ou mais pessoas da equipe desta unidade.
              </p>
              {(candidatos?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma pessoa cadastrada nesta unidade.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y border rounded-md">
                  {candidatos!.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={responsaveisNova.includes(c.id)}
                        onChange={() =>
                          setResponsaveisNova((atual) =>
                            atual.includes(c.id)
                              ? atual.filter((id) => id !== c.id)
                              : [...atual, c.id],
                          )
                        }
                      />
                      <span className="flex-1">{c.nome}</span>
                      <span className="text-[11px] text-slate-400">{c.cargo ?? ""}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Avisos de abertura */}
            <div className="border rounded-lg p-3 space-y-2">
              <span className="text-sm font-medium">Avisos ao abrir a O.S.</span>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!organizacaoAtiva?.osAutoNotificar}
                  disabled={!habilitado || setAutoNotificar.isPending}
                  onChange={(e) =>
                    setAutoNotificar.mutate({ condominioId, ativo: e.target.checked })
                  }
                />
                <span>
                  <strong>Envio automático para funcionários</strong> — ao criar a O.S., a equipe
                  desta unidade recebe notificação no aplicativo.
                </span>
              </label>

              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Notificação por e-mail: marque quem recebe. Fica salvo até desmarcar.
                </p>
                {(candidatos?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum funcionário cadastrado.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto divide-y border rounded-md">
                    {candidatos!.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={c.notificarOsEmail}
                          disabled={!c.email}
                          onChange={(e) =>
                            setNotificarEmail.mutate({
                              funcionarioId: c.id,
                              ativo: e.target.checked,
                            })
                          }
                        />
                        <span className="flex-1">
                          {c.nome}
                          {c.email ? "" : " (sem e-mail)"}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={criar.isPending || form.titulo.trim().length < 3 || !habilitado}
              onClick={() =>
                criar.mutate({
                  condominioId,
                  titulo: form.titulo.trim(),
                  descricao: form.descricao.trim() || undefined,
                  categoriaId: form.categoriaId ? Number(form.categoriaId) : undefined,
                  prioridadeId: form.prioridadeId ? Number(form.prioridadeId) : undefined,
                  statusId: form.statusId ? Number(form.statusId) : undefined,
                  endereco: form.endereco.trim() || undefined,
                })
              }
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Ordem de Serviço
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhe da O.S. */}
      <Dialog open={detalheId !== null} onOpenChange={(aberto) => !aberto && setDetalheId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tituloDetalhe}</DialogTitle>
          </DialogHeader>
          {detalheId !== null && (
            <OsDetalhe ordemServicoId={detalheId} condominioId={condominioId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
