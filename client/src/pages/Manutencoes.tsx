import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  CalendarDays,
  FileDown,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

// O header `x-condominio-id` é lido em main.tsx: rotas que recebem só `id`
// (timeline, imagens, update) resolvem o tenant por ele, não pelo input.
const TENANT_ATIVO_KEY = "condominio_ativo";

const STATUS = ["pendente", "acao_necessaria", "realizada", "finalizada", "reaberta", "rascunho"] as const;
const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
const TIPOS = ["corretiva", "preventiva", "emergencial", "programada"] as const;

type Status = (typeof STATUS)[number];
type Prioridade = (typeof PRIORIDADES)[number];
type Tipo = (typeof TIPOS)[number];

const ROTULO_STATUS: Record<Status, string> = {
  pendente: "Pendente",
  acao_necessaria: "Requer ação",
  realizada: "Realizada",
  finalizada: "Finalizada",
  reaberta: "Reaberta",
  rascunho: "Rascunho",
};

const COR_STATUS: Record<Status, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-200",
  acao_necessaria: "bg-red-100 text-red-800 border-red-200",
  realizada: "bg-blue-100 text-blue-800 border-blue-200",
  finalizada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reaberta: "bg-purple-100 text-purple-800 border-purple-200",
  rascunho: "bg-slate-100 text-slate-700 border-slate-200",
};

const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const COR_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "bg-slate-100 text-slate-700",
  media: "bg-sky-100 text-sky-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-600 text-white",
};

const ROTULO_TIPO: Record<Tipo, string> = {
  corretiva: "Corretiva",
  preventiva: "Preventiva",
  emergencial: "Emergencial",
  programada: "Programada",
};

function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** `<input type="date">` exige yyyy-MM-dd; o servidor devolve ISO. */
function paraInputDate(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

export default function Manutencoes() {
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();

  const { data: usuario, isLoading: carregandoUsuario } = trpc.auth.me.useQuery();
  const { data: organizacoes, isLoading: carregandoOrgs } = trpc.condominio.list.useQuery(undefined, {
    enabled: !!usuario,
  });

  const [orgId, setOrgId] = useState<number | null>(() => {
    const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
    return Number.isFinite(salvo) && salvo > 0 ? salvo : null;
  });
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Status | "todos">("todos");
  const [novaAberta, setNovaAberta] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  useEffect(() => {
    if (!carregandoUsuario && !usuario) setLocation("/login");
  }, [carregandoUsuario, usuario, setLocation]);

  // Primeira visita ou organização salva que não pertence mais ao usuário.
  useEffect(() => {
    if (!organizacoes?.length) return;
    const valida = orgId && organizacoes.some((o) => o.id === orgId);
    if (!valida) trocarOrganizacao(organizacoes[0].id);
    else localStorage.setItem(TENANT_ATIVO_KEY, String(orgId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizacoes]);

  function trocarOrganizacao(id: number) {
    localStorage.setItem(TENANT_ATIVO_KEY, String(id));
    setOrgId(id);
    setDetalheId(null);
    // O tenant vai no header: as respostas em cache são de outra organização.
    utils.manutencao.invalidate();
  }

  const habilitado = !!orgId && !!usuario;

  const { data: lista, isLoading: carregandoLista } = trpc.manutencao.list.useQuery(
    { condominioId: orgId ?? 0 },
    { enabled: habilitado },
  );
  const { data: stats } = trpc.manutencao.getStats.useQuery(
    { condominioId: orgId ?? 0 },
    { enabled: habilitado },
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lista ?? []).filter((m) => {
      if (filtroStatus !== "todos" && m.status !== filtroStatus) return false;
      if (!termo) return true;
      return (
        m.titulo.toLowerCase().includes(termo) ||
        m.protocolo.toLowerCase().includes(termo) ||
        (m.localizacao ?? "").toLowerCase().includes(termo) ||
        (m.responsavelNome ?? "").toLowerCase().includes(termo)
      );
    });
  }, [lista, busca, filtroStatus]);

  const organizacaoAtiva = organizacoes?.find((o) => o.id === orgId) ?? null;

  if (carregandoUsuario || carregandoOrgs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!organizacoes?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-slate-700 font-medium">Nenhuma organização vinculada a este acesso.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/admin")}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 mr-auto">
            <Wrench className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold">Manutenções</h1>
          </div>
          <Select value={orgId ? String(orgId) : undefined} onValueChange={(v) => trocarOrganizacao(Number(v))}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              {organizacoes.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setNovaAberta(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <CardNumero rotulo="Total" valor={stats?.total ?? 0} />
          <CardNumero rotulo="Pendentes" valor={stats?.pendentes ?? 0} cor="text-amber-600" />
          <CardNumero rotulo="Requer ação" valor={stats?.requerAcao ?? 0} cor="text-red-600" />
          <CardNumero rotulo="Realizadas" valor={stats?.realizadas ?? 0} cor="text-blue-600" />
          <CardNumero rotulo="Finalizadas" valor={stats?.finalizadas ?? 0} cor="text-emerald-600" />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por protocolo, título, local ou responsável"
              className="pl-9"
            />
          </div>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as Status | "todos")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULO_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {carregandoLista ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {lista?.length ? "Nenhuma manutenção com esse filtro." : "Nenhuma manutenção registrada ainda."}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {organizacaoAtiva ? organizacaoAtiva.nome : ""}
              </p>
              <Button className="mt-4" onClick={() => setNovaAberta(true)}>
                <Plus className="w-4 h-4 mr-1" /> Registrar manutenção
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtradas.map((m) => (
              <Card
                key={m.id}
                className="cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => setDetalheId(m.id)}
              >
                <CardContent className="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-mono text-xs text-slate-500">#{m.protocolo}</span>
                  <span className="font-medium text-slate-800 mr-auto">{m.titulo}</span>
                  <Badge variant="outline" className={COR_STATUS[m.status as Status]}>
                    {ROTULO_STATUS[m.status as Status] ?? m.status}
                  </Badge>
                  <Badge className={COR_PRIORIDADE[(m.prioridade ?? "media") as Prioridade]}>
                    {ROTULO_PRIORIDADE[(m.prioridade ?? "media") as Prioridade]}
                  </Badge>
                  <div className="w-full flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{ROTULO_TIPO[(m.tipo ?? "corretiva") as Tipo]}</span>
                    {m.localizacao && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {m.localizacao}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> aberta em {formatarData(m.createdAt)}
                    </span>
                    {m.responsavelNome && <span>resp. {m.responsavelNome}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {orgId && (
        <DialogNova
          aberta={novaAberta}
          condominioId={orgId}
          onFechar={() => setNovaAberta(false)}
          onCriada={(id) => {
            setNovaAberta(false);
            setDetalheId(id);
          }}
        />
      )}

      {detalheId && orgId && (
        <DialogDetalhe
          id={detalheId}
          condominioId={orgId}
          onFechar={() => setDetalheId(null)}
        />
      )}
    </div>
  );
}

function CardNumero({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className={`text-2xl font-bold ${cor ?? "text-slate-800"}`}>{valor}</p>
        <p className="text-xs text-slate-500">{rotulo}</p>
      </CardContent>
    </Card>
  );
}

interface DialogNovaProps {
  aberta: boolean;
  condominioId: number;
  onFechar: () => void;
  onCriada: (id: number) => void;
}

function DialogNova({ aberta, condominioId, onFechar, onCriada }: DialogNovaProps) {
  const utils = trpc.useContext();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [tipo, setTipo] = useState<Tipo>("corretiva");
  const [status, setStatus] = useState<Status>("pendente");
  const [dataAgendada, setDataAgendada] = useState("");
  // As fotos vão para o storage antes de a manutenção existir; só depois de
  // criada dá para vinculá-las, porque `addImagem` exige o id.
  const [fotos, setFotos] = useState<{ url: string; fase: "antes" | "depois" }[]>([]);
  const [enviandoGaleria, setEnviandoGaleria] = useState(false);
  const inputAntes = useRef<HTMLInputElement>(null);
  const inputDepois = useRef<HTMLInputElement>(null);

  const enviarImagemGaleria = trpc.upload.image.useMutation();
  const addImagemGaleria = trpc.manutencao.addImagem.useMutation();

  const criar = trpc.manutencao.create.useMutation({
    onSuccess: async (res) => {
      for (const foto of fotos) {
        await addImagemGaleria
          .mutateAsync({ manutencaoId: res.id, url: foto.url, fase: foto.fase })
          .catch(() => toast.error("Uma das fotos não pôde ser vinculada"));
      }
      toast.success(`Manutenção criada — protocolo ${res.protocolo}`);
      await Promise.allSettled([
        utils.manutencao.list.invalidate(),
        utils.manutencao.getStats.invalidate(),
      ]);
      limpar();
      onCriada(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  function limpar() {
    setTitulo("");
    setDescricao("");
    setLocalizacao("");
    setResponsavelNome("");
    setPrioridade("media");
    setTipo("corretiva");
    setStatus("pendente");
    setDataAgendada("");
    setFotos([]);
  }

  async function selecionarFotos(arquivos: FileList | null, fase: "antes" | "depois") {
    if (!arquivos || arquivos.length === 0) return;
    setEnviandoGaleria(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagemGaleria.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "manutencoes",
        });
        setFotos((atual) => [...atual, { url, fase }]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviandoGaleria(false);
    }
  }

  function submeter() {
    if (!titulo.trim()) return toast.error("Informe o título");
    criar.mutate({
      condominioId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      localizacao: localizacao.trim() || undefined,
      responsavelNome: responsavelNome.trim() || undefined,
      prioridade,
      tipo,
      status,
      dataAgendada: dataAgendada || undefined,
    });
  }

  return (
    <Dialog open={aberta} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova manutenção</DialogTitle>
          <DialogDescription>O protocolo é gerado automaticamente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Troca da bomba d'água" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="local">Local</Label>
              <Input id="local" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input id="responsavel" value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{ROTULO_PRIORIDADE[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{ROTULO_TIPO[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{ROTULO_STATUS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agendada">Data agendada</Label>
              <Input id="agendada" type="date" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
            </div>
          </div>

          {/* Galeria de antes e depois */}
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium text-slate-700">Galeria de fotos</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { fase: "antes" as const, rotulo: "Antes", campo: inputAntes },
                { fase: "depois" as const, rotulo: "Depois", campo: inputDepois },
              ]).map((lado) => {
                const doLado = fotos.filter((f) => f.fase === lado.fase);
                return (
                  <div key={lado.fase} className="border rounded-md p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600">{lado.rotulo}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={enviandoGaleria}
                        onClick={() => lado.campo.current?.click()}
                      >
                        {enviandoGaleria ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <input
                        ref={lado.campo}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => {
                          void selecionarFotos(e.target.files, lado.fase);
                          e.target.value = "";
                        }}
                      />
                    </div>
                    {doLado.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhuma foto.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {doLado.map((foto) => (
                          <div key={foto.url} className="relative">
                            <img src={foto.url} alt="" className="w-14 h-14 object-cover rounded border" />
                            <button
                              type="button"
                              className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                              onClick={() => setFotos((atual) => atual.filter((f) => f.url !== foto.url))}
                              aria-label="Remover foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={submeter} disabled={criar.isPending}>
            {criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DialogDetalheProps {
  id: number;
  condominioId: number;
  onFechar: () => void;
}

function DialogDetalhe({ id, condominioId, onFechar }: DialogDetalheProps) {
  const utils = trpc.useContext();
  const inputFoto = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [faseFoto, setFaseFoto] = useState<"antes" | "depois">("antes");

  const { data: item, isLoading } = trpc.manutencao.getById.useQuery({ id });
  const { data: timeline } = trpc.manutencao.getTimeline.useQuery({ manutencaoId: id });
  const { data: imagens } = trpc.manutencao.getImagens.useQuery({ manutencaoId: id });

  const [rascunho, setRascunho] = useState<{
    titulo: string;
    descricao: string;
    observacoes: string;
    localizacao: string;
    responsavelNome: string;
    fornecedor: string;
    status: Status;
    prioridade: Prioridade;
    tipo: Tipo;
    dataAgendada: string;
    dataRealizada: string;
  } | null>(null);

  useEffect(() => {
    if (!item) return;
    setRascunho({
      titulo: item.titulo ?? "",
      descricao: item.descricao ?? "",
      observacoes: item.observacoes ?? "",
      localizacao: item.localizacao ?? "",
      responsavelNome: item.responsavelNome ?? "",
      fornecedor: item.fornecedor ?? "",
      status: (item.status ?? "pendente") as Status,
      prioridade: (item.prioridade ?? "media") as Prioridade,
      tipo: (item.tipo ?? "corretiva") as Tipo,
      dataAgendada: paraInputDate(item.dataAgendada),
      dataRealizada: paraInputDate(item.dataRealizada),
    });
  }, [item]);

  async function recarregar() {
    await Promise.allSettled([
      utils.manutencao.getById.invalidate({ id }),
      utils.manutencao.getTimeline.invalidate({ manutencaoId: id }),
      utils.manutencao.getImagens.invalidate({ manutencaoId: id }),
      utils.manutencao.list.invalidate(),
      utils.manutencao.getStats.invalidate(),
    ]);
  }

  const atualizar = trpc.manutencao.update.useMutation({
    onSuccess: async () => {
      toast.success("Manutenção atualizada");
      await recarregar();
    },
    onError: (e) => toast.error(e.message),
  });

  const remover = trpc.manutencao.delete.useMutation({
    onSuccess: async () => {
      toast.success("Manutenção excluída");
      await recarregar();
      onFechar();
    },
    onError: (e) => toast.error(e.message),
  });

  const enviarImagem = trpc.upload.image.useMutation();
  const addImagem = trpc.manutencao.addImagem.useMutation();
  const removeImagem = trpc.manutencao.removeImagem.useMutation();
  const gerarPdf = trpc.manutencao.generatePdf.useMutation({
    onSuccess: (res) => {
      const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `manutencao-${item?.protocolo ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(e.message),
  });

  async function selecionarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const base64 = await lerArquivoBase64(arquivo);
      const { url } = await enviarImagem.mutateAsync({
        fileName: arquivo.name,
        fileType: arquivo.type,
        fileData: base64,
        folder: "manutencoes",
      });
      await addImagem.mutateAsync({ manutencaoId: id, url, fase: faseFoto });
      toast.success("Foto anexada");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar a foto");
    } finally {
      setEnviandoFoto(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  function salvar() {
    if (!rascunho) return;
    if (!rascunho.titulo.trim()) return toast.error("O título não pode ficar vazio");
    atualizar.mutate({
      id,
      titulo: rascunho.titulo.trim(),
      descricao: rascunho.descricao,
      observacoes: rascunho.observacoes,
      localizacao: rascunho.localizacao,
      responsavelNome: rascunho.responsavelNome,
      fornecedor: rascunho.fornecedor,
      status: rascunho.status,
      prioridade: rascunho.prioridade,
      tipo: rascunho.tipo,
      dataAgendada: rascunho.dataAgendada,
      dataRealizada: rascunho.dataRealizada,
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        {isLoading || !item || !rascunho ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-500">#{item.protocolo}</span>
                {item.titulo}
              </DialogTitle>
              <DialogDescription>
                Aberta em {formatarDataHora(item.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {STATUS.filter((s) => s !== rascunho.status).slice(0, 4).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    disabled={atualizar.isPending}
                    onClick={() => atualizar.mutate({ id, status: s })}
                  >
                    Marcar como {ROTULO_STATUS[s].toLowerCase()}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Título</Label>
                  <Input value={rascunho.titulo} onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Descrição</Label>
                  <Textarea rows={3} value={rascunho.descricao} onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={rascunho.observacoes} onChange={(e) => setRascunho({ ...rascunho, observacoes: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={rascunho.status} onValueChange={(v) => setRascunho({ ...rascunho, status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => <SelectItem key={s} value={s}>{ROTULO_STATUS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select value={rascunho.prioridade} onValueChange={(v) => setRascunho({ ...rascunho, prioridade: v as Prioridade })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{ROTULO_PRIORIDADE[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={rascunho.tipo} onValueChange={(v) => setRascunho({ ...rascunho, tipo: v as Tipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{ROTULO_TIPO[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Local</Label>
                  <Input value={rascunho.localizacao} onChange={(e) => setRascunho({ ...rascunho, localizacao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Input value={rascunho.responsavelNome} onChange={(e) => setRascunho({ ...rascunho, responsavelNome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fornecedor</Label>
                  <Input value={rascunho.fornecedor} onChange={(e) => setRascunho({ ...rascunho, fornecedor: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data agendada</Label>
                  <Input type="date" value={rascunho.dataAgendada} onChange={(e) => setRascunho({ ...rascunho, dataAgendada: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data realizada</Label>
                  <Input type="date" value={rascunho.dataRealizada} onChange={(e) => setRascunho({ ...rascunho, dataRealizada: e.target.value })} />
                </div>
              </div>

              {/* Galeria separada em antes e depois, igual à da criação. */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Fotos</Label>
                  <div className="flex items-center gap-2">
                    <Select value={faseFoto} onValueChange={(v) => setFaseFoto(v as "antes" | "depois")}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="antes">Antes</SelectItem>
                        <SelectItem value="depois">Depois</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" disabled={enviandoFoto} onClick={() => inputFoto.current?.click()}>
                      {enviandoFoto ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1" />}
                      Anexar
                    </Button>
                  </div>
                  <input
                    ref={inputFoto}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => selecionarFoto(e.target.files?.[0])}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(["antes", "depois"] as const).map((fase) => {
                    const doLado = (imagens ?? []).filter((img) => (img.fase ?? "antes") === fase);
                    return (
                      <div key={fase} className="border rounded-md p-2">
                        <p className="text-xs font-medium text-slate-600 mb-1 capitalize">{fase}</p>
                        {doLado.length === 0 ? (
                          <p className="text-xs text-slate-400">Nenhuma foto.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {doLado.map((img) => (
                              <div key={img.id} className="relative group">
                                <img src={img.url} alt={img.legenda ?? ""} className="w-full h-20 object-cover rounded border" />
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 bg-white/90 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={async () => {
                                    await removeImagem.mutateAsync({ id: img.id });
                                    await recarregar();
                                  }}
                                >
                                  <X className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Histórico</Label>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {timeline?.length ? (
                    timeline.map((ev) => (
                      <div key={ev.id} className="text-sm border-l-2 border-slate-200 pl-3 py-0.5">
                        <p className="text-slate-700">{ev.descricao}</p>
                        <p className="text-xs text-slate-400">
                          {formatarDataHora(ev.createdAt)}
                          {ev.userNome ? ` · ${ev.userNome}` : ""}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sem eventos.</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 mr-auto"
                disabled={remover.isPending}
                onClick={() => {
                  if (confirm(`Excluir a manutenção #${item.protocolo}? Fotos e histórico vão junto.`)) {
                    remover.mutate({ id });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
              <Button variant="outline" onClick={() => recarregar()}>
                <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
              </Button>
              <Button variant="outline" disabled={gerarPdf.isPending} onClick={() => gerarPdf.mutate({ id })}>
                {gerarPdf.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
                PDF
              </Button>
              <Button onClick={salvar} disabled={atualizar.isPending}>
                {atualizar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Salvar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
