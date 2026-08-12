import { useEffect, useMemo, useRef, useState } from "react";
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
import { BotaoCompartilhar } from "@/components/CompartilharWhatsapp";
import { RegistroVencimento, rotuloStatus } from "@/components/RegistroVencimento";
import { CalendarioManutencoes } from "@/components/CalendarioManutencoes";
import { useBuscaInicial } from "@/hooks/useBuscaInicial";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  ImagePlus,
  List,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Settings2,
  Share2,
  Trash2,
  X,
} from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";
const MAX_AVISOS = 3;

type Aviso = {
  id: string;
  tipo: "dias_antes" | "data_especifica";
  valor: number;
  dataEspecifica?: string;
  descricao?: string;
  imagens?: string[];
};

const TIPOS_BASE = [
  { valor: "contrato", rotulo: "Contrato" },
  { valor: "servico", rotulo: "Serviço" },
  { valor: "manutencao", rotulo: "Manutenção" },
];


type SituacaoVisual = "em_dia" | "proximo" | "vencido";

/** Mesma régua do Manutenção X: vencido, próximo até 30 dias, o resto em dia. */
const SITUACAO: Record<SituacaoVisual, { texto: string; cor: string; fundo: string }> = {
  em_dia: { texto: "Em dia", cor: "#2e7d32", fundo: "#e8f5e9" },
  proximo: { texto: "Próximo ao vencimento", cor: "#e65100", fundo: "#fff3e0" },
  vencido: { texto: "Vencido", cor: "#c62828", fundo: "#ffebee" },
};

function situacaoDe(diasRestantes: number): SituacaoVisual {
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 30) return "proximo";
  return "em_dia";
}

function formatarData(valor?: string | Date | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
}

/** `<input type="date">` quer AAAA-MM-DD — montado com as partes locais, não
 *  com `toISOString`, que converte para UTC e pode voltar um dia. */
function paraCampoData(valor?: string | Date | null) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

const gerarId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FORM_VAZIO = {
  titulo: "",
  tipo: "contrato",
  descricao: "",
  dataVencimento: "",
  ultimaRealizacao: "",
  proximaRealizacao: "",
  fornecedor: "",
  responsavel: "",
  emails: [] as string[],
  avisos: [] as Aviso[],
  qtdNotificacoes: 1,
  imagens: [] as string[],
};

export default function AgendaVencimentos() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;
  const habilitado = !!organizacaoAtiva;

  const [visao, setVisao] = useState<"lista" | "calendario">("lista");
  const [busca, setBusca] = useState(useBuscaInicial());
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroSituacao, setFiltroSituacao] = useState<"todos" | SituacaoVisual>("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [emailInput, setEmailInput] = useState("");
  const [registroDe, setRegistroDe] = useState<{ id: number; titulo: string } | null>(null);
  const [modalTipos, setModalTipos] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const inputImagens = useRef<HTMLInputElement>(null);

  const { data: lista, isLoading: carregandoLista } = trpc.vencimentos.list.useQuery(
    { condominioId, tipo: filtroTipo, status: "todos" },
    { enabled: habilitado },
  );
  const { data: stats } = trpc.vencimentos.stats.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: tiposManutencao } = trpc.vencimentos.listarTipos.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  const enviarImagem = trpc.upload.image.useMutation();

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [carregandoUser, user, setLocation]);

  const invalidar = async () => {
    await Promise.all([
      utils.vencimentos.list.invalidate(),
      utils.vencimentos.stats.invalidate(),
    ]);
  };

  const criar = trpc.vencimentos.create.useMutation({
    onSuccess: async () => {
      fecharModal();
      await invalidar();
      toast.success("Vencimento cadastrado");
    },
    onError: (e) => toast.error(e.message || "Erro ao cadastrar"),
  });

  const atualizar = trpc.vencimentos.update.useMutation({
    onSuccess: async () => {
      fecharModal();
      await invalidar();
      toast.success("Vencimento atualizado");
    },
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  const excluir = trpc.vencimentos.delete.useMutation({
    onSuccess: async () => {
      await invalidar();
      toast.success("Vencimento excluído");
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir"),
  });

  const criarTipo = trpc.vencimentos.criarTipo.useMutation({
    onSuccess: async () => {
      setNovoTipo("");
      await utils.vencimentos.listarTipos.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro ao criar o tipo"),
  });

  const removerTipo = trpc.vencimentos.removerTipo.useMutation({
    onSuccess: () => utils.vencimentos.listarTipos.invalidate(),
    onError: (e) => toast.error(e.message || "Erro ao remover o tipo"),
  });

  /** "manutencao:<slug>" vira o nome cadastrado; o resto usa o rótulo base. */
  const rotuloTipo = (tipo: string) => {
    if (tipo.startsWith("manutencao:")) {
      const slug = tipo.slice("manutencao:".length);
      return tiposManutencao?.find((t) => t.slug === slug)?.nome ?? "Manutenção";
    }
    return TIPOS_BASE.find((t) => t.valor === tipo)?.rotulo ?? tipo;
  };

  const opcoesTipo = useMemo(
    () => [
      ...TIPOS_BASE,
      ...(tiposManutencao ?? []).map((t) => ({
        valor: `manutencao:${t.slug}`,
        rotulo: t.nome,
      })),
    ],
    [tiposManutencao],
  );

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setEmailInput("");
  };

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setEmailInput("");
    setModalAberto(true);
  };

  const itens = lista?.items ?? [];

  const abrirEdicao = (item: (typeof itens)[number]) => {
    setForm({
      titulo: item.titulo ?? "",
      tipo: item.tipo,
      descricao: item.descricao ?? "",
      dataVencimento: paraCampoData(item.dataVencimento),
      ultimaRealizacao: paraCampoData(item.ultimaRealizacao),
      proximaRealizacao: paraCampoData(item.proximaRealizacao),
      fornecedor: item.fornecedor ?? "",
      responsavel: item.responsavel ?? "",
      emails: [...(item.emails ?? [])],
      avisos: (item.avisos ?? []).map((a) => ({ ...a })),
      qtdNotificacoes: item.qtdNotificacoes ?? 1,
      imagens: [...(item.imagens ?? [])],
    });
    setEditandoId(item.id);
    setEmailInput("");
    setModalAberto(true);
  };

  const filtrados = useMemo(() => {
    return itens.filter((item) => {
      if (filtroSituacao !== "todos" && situacaoDe(item.diasRestantes) !== filtroSituacao) {
        return false;
      }
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      const texto = [item.titulo, item.descricao, item.fornecedor, item.responsavel, item.setor]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return termo.split(/\s+/).every((t) => texto.includes(t));
    });
  }, [itens, filtroSituacao, busca]);

  const adicionarEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("E-mail inválido");
      return;
    }
    if (form.emails.includes(email)) {
      setEmailInput("");
      return;
    }
    setForm((p) => ({ ...p, emails: [...p.emails, email] }));
    setEmailInput("");
  };

  const adicionarAviso = () => {
    if (form.avisos.length >= MAX_AVISOS) return;
    setForm((p) => ({
      ...p,
      avisos: [...p.avisos, { id: gerarId(), tipo: "dias_antes", valor: 7 }],
    }));
  };

  const atualizarAviso = (id: string, campos: Partial<Aviso>) => {
    setForm((p) => ({
      ...p,
      avisos: p.avisos.map((a) => (a.id === id ? { ...a, ...campos } : a)),
    }));
  };

  const selecionarImagens = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviandoImagem(true);
    try {
      const urls: string[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "vencimentos",
        });
        urls.push(url);
      }
      setForm((p) => ({ ...p, imagens: [...p.imagens, ...urls] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a imagem");
    } finally {
      setEnviandoImagem(false);
    }
  };

  /** Texto do compartilhamento, o mesmo para o WhatsApp e para copiar. */
  const mensagemDoItem = (item: (typeof itens)[number]) =>
    [
      "*Vencimento*",
      `*Título:* ${item.titulo}`,
      `*Tipo:* ${rotuloTipo(item.tipo)}`,
      `*Vence em:* ${formatarData(item.dataVencimento)}`,
      item.diasRestantes < 0
        ? `*Situação:* vencido há ${Math.abs(item.diasRestantes)} dia(s)`
        : `*Situação:* faltam ${item.diasRestantes} dia(s)`,
      item.fornecedor ? `*Fornecedor:* ${item.fornecedor}` : "",
      item.responsavel ? `*Responsável:* ${item.responsavel}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const salvar = () => {
    if (form.titulo.trim().length < 3) {
      toast.error("Título muito curto.");
      return;
    }
    if (!form.dataVencimento) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    const campos = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      descricao: form.descricao.trim() || undefined,
      dataVencimento: form.dataVencimento,
      ultimaRealizacao: form.ultimaRealizacao || undefined,
      proximaRealizacao: form.proximaRealizacao || undefined,
      fornecedor: form.fornecedor.trim() || undefined,
      responsavel: form.responsavel.trim() || undefined,
      emails: form.emails,
      avisos: form.avisos,
      qtdNotificacoes: form.qtdNotificacoes,
      imagens: form.imagens,
    };

    if (editandoId !== null) atualizar.mutate({ id: editandoId, ...campos });
    else criar.mutate({ condominioId, ...campos });
  };

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/manutencoes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Agenda de Vencimentos</h1>
            <p className="text-xs text-slate-500">
              {lista?.total ?? 0} registros
              {organizacaoAtiva ? ` · ${organizacaoAtiva.nome}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setModalTipos(true)}>
            <Settings2 className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={abrirNovo} disabled={!habilitado}>
            <Plus className="w-4 h-4 mr-2" /> Novo
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Ativos</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.total ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Próximos 30 dias</p>
              <p className="text-2xl font-bold text-amber-600">{stats?.proximos ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Vencidos</p>
              <p className="text-2xl font-bold text-red-600">{stats?.vencidos ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button
            variant={visao === "lista" ? "default" : "outline"}
            size="sm"
            onClick={() => setVisao("lista")}
          >
            <List className="w-4 h-4 mr-2" /> Lista
          </Button>
          <Button
            variant={visao === "calendario" ? "default" : "outline"}
            size="sm"
            onClick={() => setVisao("calendario")}
          >
            <CalendarDays className="w-4 h-4 mr-2" /> Calendário
          </Button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9 pr-9"
            placeholder="Buscar por título, fornecedor, responsável..."
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

        <div className="flex flex-wrap gap-2">
          {[{ valor: "todos", rotulo: "Todos os tipos" }, ...opcoesTipo].map((t) => (
            <button
              key={t.valor}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtroTipo === t.valor
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setFiltroTipo(t.valor)}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { chave: "todos" as const, rotulo: "Todas as situações" },
            { chave: "vencido" as const, rotulo: "Vencidos" },
            { chave: "proximo" as const, rotulo: "Próximos" },
            { chave: "em_dia" as const, rotulo: "Em dia" },
          ].map((f) => (
            <button
              key={f.chave}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtroSituacao === f.chave
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setFiltroSituacao(f.chave)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {visao === "calendario" ? (
          <CalendarioManutencoes
            itens={filtrados.map((item) => ({
              id: item.id,
              titulo: item.titulo,
              tipo: item.tipo,
              dataVencimento: item.dataVencimento,
              diasRestantes: item.diasRestantes,
              registroStatus: item.registroStatus,
            }))}
            rotuloTipo={rotuloTipo}
            onAbrirItem={(item) => setRegistroDe({ id: item.id, titulo: item.titulo })}
          />
        ) : carregandoLista ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <CalendarClock className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="font-semibold text-slate-700 mt-3">Nenhum vencimento</p>
              <p className="text-sm text-slate-500">
                {busca ? "Nenhum resultado para a busca atual." : "Cadastre o primeiro vencimento."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtrados.map((item) => {
              const situacao = SITUACAO[situacaoDe(item.diasRestantes)];
              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800">{item.titulo}</h4>
                        <p className="text-xs text-slate-500">
                          {rotuloTipo(item.tipo)}
                          {item.fornecedor ? ` · ${item.fornecedor}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ color: situacao.cor, backgroundColor: situacao.fundo }}
                        >
                          {situacao.texto}
                        </span>
                        {rotuloStatus(item.registroStatus) && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              color: rotuloStatus(item.registroStatus)!.cor,
                              backgroundColor: rotuloStatus(item.registroStatus)!.fundo,
                            }}
                          >
                            {rotuloStatus(item.registroStatus)!.rotulo}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.descricao && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.descricao}</p>
                    )}

                    {(item.imagens?.length ?? 0) > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {item.imagens.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                      <span>Vence em {formatarData(item.dataVencimento)}</span>
                      <span className="font-medium text-slate-700">
                        {item.diasRestantes < 0
                          ? `${Math.abs(item.diasRestantes)} dia(s) em atraso`
                          : `faltam ${item.diasRestantes} dia(s)`}
                      </span>
                      {item.ultimaRealizacao && (
                        <span>última: {formatarData(item.ultimaRealizacao)}</span>
                      )}
                      {item.proximaRealizacao && (
                        <span>próxima: {formatarData(item.proximaRealizacao)}</span>
                      )}
                      {item.responsavel && <span>{item.responsavel}</span>}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5" />
                        {(item.avisos?.length ?? 0)} aviso
                        {(item.avisos?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {(item.emails?.length ?? 0)} e-mail
                        {(item.emails?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                      {item.qtdNotificacoes > 0 && (
                        <span>notificar {item.qtdNotificacoes}x</span>
                      )}
                    </div>

                    {(item.avisos?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.avisos.map((a) => (
                          <span
                            key={a.id}
                            className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                          >
                            {a.tipo === "dias_antes"
                              ? `${a.valor} dia(s) antes`
                              : formatarData(a.dataEspecifica)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                      <Button variant="outline" size="sm" onClick={() => abrirEdicao(item)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRegistroDe({ id: item.id, titulo: item.titulo })}
                      >
                        <ClipboardList className="w-4 h-4 mr-2" /> Antes e depois
                      </Button>
                      <BotaoCompartilhar
                        condominioId={condominioId}
                        mensagem={mensagemDoItem(item)}
                        rotulo="Compartilhar"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Excluir "${item.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
                            excluir.mutate({ id: item.id });
                          }
                        }}
                        aria-label={`Excluir ${item.titulo}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Cadastro / edição */}
      <Dialog open={modalAberto} onOpenChange={(aberto) => (aberto ? null : fecharModal())}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId !== null ? "Editar vencimento" : "Novo vencimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Contrato de dedetização"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesTipo.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de vencimento</Label>
                <Input
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Última manutenção</Label>
                <Input
                  type="date"
                  value={form.ultimaRealizacao}
                  onChange={(e) => setForm({ ...form, ultimaRealizacao: e.target.value })}
                />
              </div>
              <div>
                <Label>Próxima manutenção</Label>
                <Input
                  type="date"
                  value={form.proximaRealizacao}
                  onChange={(e) => setForm({ ...form, proximaRealizacao: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor</Label>
                <Input
                  value={form.fornecedor}
                  onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            {/* E-mails avisados */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">E-mails avisados</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="nome@empresa.com.br"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarEmail();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={adicionarEmail}>
                  Adicionar
                </Button>
              </div>
              {form.emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-1 rounded-full"
                    >
                      {email}
                      <button
                        onClick={() =>
                          setForm((p) => ({ ...p, emails: p.emails.filter((e) => e !== email) }))
                        }
                        aria-label={`Remover ${email}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div>
                <Label className="text-xs">Quantas vezes notificar</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.qtdNotificacoes}
                  onChange={(e) =>
                    setForm({ ...form, qtdNotificacoes: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </div>

            {/* Avisos */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">Avisos de vencimento</span>
                </div>
                {form.avisos.length < MAX_AVISOS && (
                  <Button type="button" variant="outline" size="sm" onClick={adicionarAviso}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Aviso
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Até {MAX_AVISOS} avisos, por dias de antecedência ou data específica.
              </p>

              {form.avisos.map((aviso, i) => (
                <div key={aviso.id} className="border rounded-md p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Aviso {i + 1}</span>
                    <button
                      onClick={() =>
                        setForm((p) => ({ ...p, avisos: p.avisos.filter((a) => a.id !== aviso.id) }))
                      }
                      aria-label={`Remover aviso ${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={aviso.tipo}
                      onValueChange={(v) =>
                        atualizarAviso(aviso.id, { tipo: v as Aviso["tipo"] })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dias_antes">Dias antes</SelectItem>
                        <SelectItem value="data_especifica">Data específica</SelectItem>
                      </SelectContent>
                    </Select>
                    {aviso.tipo === "dias_antes" ? (
                      <Input
                        type="number"
                        min={0}
                        className="h-9"
                        value={aviso.valor}
                        onChange={(e) =>
                          atualizarAviso(aviso.id, { valor: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                    ) : (
                      <Input
                        type="date"
                        className="h-9"
                        value={aviso.dataEspecifica ?? ""}
                        onChange={(e) => atualizarAviso(aviso.id, { dataEspecifica: e.target.value })}
                      />
                    )}
                  </div>
                  <Input
                    className="h-9"
                    placeholder="Descrição do aviso (opcional)"
                    value={aviso.descricao ?? ""}
                    onChange={(e) => atualizarAviso(aviso.id, { descricao: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {/* Imagens */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">Imagens</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={enviandoImagem}
                  onClick={() => inputImagens.current?.click()}
                >
                  {enviandoImagem ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Anexar"
                  )}
                </Button>
                <input
                  ref={inputImagens}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    void selecionarImagens(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              {form.imagens.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.imagens.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                      <button
                        className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                        onClick={() =>
                          setForm((p) => ({ ...p, imagens: p.imagens.filter((i) => i !== url) }))
                        }
                        aria-label="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={salvar}
              disabled={criar.isPending || atualizar.isPending || !habilitado}
            >
              {criar.isPending || atualizar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editandoId !== null ? "Salvar alterações" : "Cadastrar vencimento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {registroDe && (
        <RegistroVencimento
          vencimentoId={registroDe.id}
          titulo={registroDe.titulo}
          onFechar={() => setRegistroDe(null)}
        />
      )}

      {/* Tipos de manutenção */}
      <Dialog open={modalTipos} onOpenChange={setModalTipos}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tipos de manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Estes tipos aparecem junto de Contrato, Serviço e Manutenção na hora de cadastrar.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Extintores"
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novoTipo.trim()) {
                    e.preventDefault();
                    criarTipo.mutate({ condominioId, nome: novoTipo.trim() });
                  }
                }}
              />
              <Button
                onClick={() => criarTipo.mutate({ condominioId, nome: novoTipo.trim() })}
                disabled={!novoTipo.trim() || criarTipo.isPending}
              >
                Adicionar
              </Button>
            </div>
            {(tiposManutencao?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-400">Nenhum tipo cadastrado.</p>
            ) : (
              <ul className="divide-y border rounded-lg">
                {tiposManutencao!.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{t.nome}</span>
                    <button
                      onClick={() => removerTipo.mutate({ id: t.id })}
                      aria-label={`Remover ${t.nome}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
