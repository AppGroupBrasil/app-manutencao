import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Eye,
  FileText,
  HelpCircle,
  Inbox,
  List,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

/** As quatro colunas do quadro, na ordem e nas cores dos prints. */
const COLUNAS = [
  { valor: "a_fazer", rotulo: "A Fazer", cor: "#6366f1", icone: Inbox },
  { valor: "em_andamento", rotulo: "Em Andamento", cor: "#f59e0b", icone: RotateCcw },
  { valor: "em_revisao", rotulo: "Em Revisão", cor: "#a855f7", icone: Eye },
  { valor: "concluido", rotulo: "Concluído", cor: "#10b981", icone: CheckCircle2 },
] as const;

type StatusQuadro = (typeof COLUNAS)[number]["valor"];

/** Texto do compartilhamento, no mesmo formato das outras funções. */
function mensagemDaAtividade(atividade: {
  titulo: string;
  descricao: string | null;
  prioridade: string;
  rotina: string;
  responsavelNome: string | null;
  protocolo?: string | null;
}): string {
  return [
    "*Atividade*",
    atividade.protocolo ? `*Protocolo:* ${atividade.protocolo}` : "",
    `*Título:* ${atividade.titulo}`,
    `*Prioridade:* ${atividade.prioridade}`,
    `*Rotina:* ${atividade.rotina}`,
    atividade.responsavelNome ? `*Responsável:* ${atividade.responsavelNome}` : "",
    atividade.descricao ? `\n${atividade.descricao}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Baixa o base64 devolvido pelo servidor como arquivo. */
function baixarPdfBase64(base64: string, nome: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

const ROTINAS = [
  { valor: "diaria", rotulo: "Diária" },
  { valor: "semanal", rotulo: "Semanal" },
  { valor: "mensal", rotulo: "Mensal" },
  { valor: "anual", rotulo: "Anual" },
  { valor: "data_especifica", rotulo: "Data Específica" },
];

const PRIORIDADES = [
  { valor: "baixa", rotulo: "Baixa", cor: "#2e7d32", fundo: "#e8f5e9" },
  { valor: "media", rotulo: "Média", cor: "#1565c0", fundo: "#e3f2fd" },
  { valor: "alta", rotulo: "Alta", cor: "#e65100", fundo: "#fff3e0" },
  { valor: "urgente", rotulo: "Urgente", cor: "#c62828", fundo: "#ffebee" },
];

const ORIGEM_ROTULO: Record<string, string> = {
  os: "Ordem de Serviço",
  vencimento: "Vencimento",
  checklist: "Checklist",
  vistoria: "Vistoria",
  manutencao: "Manutenção",
  qrcode: "QR Code",
};

const FORM_VAZIO = {
  titulo: "",
  descricao: "",
  status: "a_fazer" as StatusQuadro,
  prioridade: "media",
  rotina: "diaria",
  dataEspecifica: "",
  responsavelNome: "",
  origem: "",
};

/** Página do gestor: resolve a unidade pela sessão e entrega o conteúdo. */
export default function QuadroAtividades() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;

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
    <ConteudoQuadroAtividades
      condominioId={organizacaoAtiva?.id ?? 0}
      onVoltar={() => setLocation("/admin/manutencoes")}
      onPermissoes={() => setLocation("/admin/funcionarios")}
    />
  );
}

/** Conteúdo reaproveitado pelo portal do funcionário, que já recebe a unidade. */
export function ConteudoQuadroAtividades({
  condominioId,
  onVoltar,
  onPermissoes,
  podeCriar = true,
}: {
  condominioId: number;
  onVoltar?: () => void;
  onPermissoes?: () => void;
  podeCriar?: boolean;
}) {
  const utils = trpc.useUtils();
  const habilitado = condominioId > 0;

  const [comoFunciona, setComoFunciona] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroRotina, setFiltroRotina] = useState("todas");
  const [visao, setVisao] = useState<"kanban" | "lista">("kanban");
  const [modalNova, setModalNova] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [arrastando, setArrastando] = useState<number | null>(null);
  // Atividade aberta para edição; nulo com o modal fechado.
  const [editando, setEditando] = useState<{
    id: number;
    titulo: string;
    descricao: string | null;
    prioridade: string;
    rotina: string;
    responsavelNome: string | null;
  } | null>(null);
  const [protocolo, setProtocolo] = useState("");
  const [buscarProtocolo, setBuscarProtocolo] = useState("");
  const [colunaImportar, setColunaImportar] = useState<StatusQuadro>("a_fazer");
  const conteudo = useRef<HTMLDivElement>(null);

  const { data: achados, isLoading: carregandoBusca } =
    trpc.quadroAtividades.buscarPorProtocolo.useQuery(
      { condominioId, protocolo: buscarProtocolo },
      { enabled: habilitado && buscarProtocolo.length > 0 },
    );

  const { data: atividades, isLoading: carregando } = trpc.quadroAtividades.listar.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: origens } = trpc.quadroAtividades.origensDisponiveis.useQuery(
    { condominioId },
    { enabled: habilitado && modalNova },
  );
  const { data: equipe } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  const invalidar = async () => {
    await Promise.all([
      utils.quadroAtividades.listar.invalidate(),
      utils.quadroAtividades.origensDisponiveis.invalidate(),
      utils.quadroAtividades.buscarPorProtocolo.invalidate(),
    ]);
  };

  const criar = trpc.quadroAtividades.criar.useMutation({
    onSuccess: async () => {
      setModalNova(false);
      setForm(FORM_VAZIO);
      await invalidar();
      toast.success("Atividade criada");
    },
    onError: (e) => toast.error(e.message || "Erro ao criar a atividade"),
  });

  const atualizar = trpc.quadroAtividades.atualizar.useMutation({
    onSuccess: invalidar,
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  // Relatório de uma coluna: é o que se leva impresso para a reunião.
  const gerarPdfColuna = trpc.quadroAtividades.generatePdfColuna.useMutation({
    onError: (e) => toast.error(e.message || "Erro ao gerar o PDF"),
  });

  const deletar = trpc.quadroAtividades.deletar.useMutation({
    onSuccess: async () => {
      await invalidar();
      toast.success("Atividade removida");
    },
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const lista = atividades ?? [];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((a) => {
      if (filtroPrioridade !== "todas" && a.prioridade !== filtroPrioridade) return false;
      if (filtroRotina !== "todas" && a.rotina !== filtroRotina) return false;
      if (!termo) return true;
      return [a.titulo, a.descricao, a.responsavelNome]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [lista, busca, filtroPrioridade, filtroRotina]);

  const daColuna = (status: string) => filtradas.filter((a) => a.status === status);

  const mensagemDoQuadro = () =>
    `*Quadro de Atividades*\n` +
    COLUNAS.map((c) => `${c.rotulo}: ${daColuna(c.valor).length}`).join("\n");

  const gerarPdf = async () => {
    if (!conteudo.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    (html2pdf() as any)
      .set({
        margin: 10,
        filename: `quadro-atividades-${new Date().toISOString().slice(0, 10)}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(conteudo.current)
      .save();
  };

  const soltarNaColuna = (status: StatusQuadro) => {
    if (arrastando === null) return;
    const atividade = lista.find((a) => a.id === arrastando);
    setArrastando(null);
    if (!atividade || atividade.status === status) return;
    atualizar.mutate({ id: atividade.id, status });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main ref={conteudo} className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start gap-2">
          {onVoltar && (
            <Button variant="ghost" size="sm" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">Quadro de Atividades</h1>
            <p className="text-slate-500 mt-1">
              Gerencie atividade da equipe de forma visual e organizada
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <BotaoCompartilhar condominioId={condominioId} mensagem={mensagemDoQuadro()} />
          <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="Imprimir">
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={gerarPdf}
            aria-label="Gerar PDF"
          >
            <FileText className="w-4 h-4" />
          </Button>
        </div>

        <button
          className="w-full bg-orange-500 text-white rounded-xl px-4 py-4 flex items-center justify-between"
          onClick={() => setComoFunciona((v) => !v)}
        >
          <span className="flex items-center gap-2 font-semibold">
            <HelpCircle className="w-5 h-5" />
            Como funciona
          </span>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${comoFunciona ? "rotate-180" : ""}`}
          />
        </button>
        {comoFunciona && (
          <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm text-orange-900">
            <ul className="list-disc pl-5 space-y-1">
              <li>Crie a atividade do zero ou vincule a uma O.S., vencimento, checklist, vistoria ou manutenção que já existe</li>
              <li>Defina a rotina — diária, semanal, mensal, anual ou data específica — e o responsável</li>
              <li>Arraste o cartão entre as colunas conforme a atividade anda</li>
              <li>Use a visão em lista quando quiser ver tudo de uma vez</li>
            </ul>
          </div>
        )}

        {/* Resumo por coluna */}
        <div className="space-y-3">
          {COLUNAS.map((coluna) => {
            const Icone = coluna.icone;
            return (
              <Card key={coluna.valor}>
                <CardContent className="p-4 flex items-center gap-4">
                  <span
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: coluna.cor }}
                  >
                    <Icone className="w-6 h-6 text-white" />
                  </span>
                  <div>
                    <p className="text-3xl font-bold text-slate-900 leading-none">
                      {daColuna(coluna.valor).length}
                    </p>
                    <p className="text-slate-500 mt-1">{coluna.rotulo}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filtros */}
        <Input
          placeholder="Buscar atividade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Prioridades</SelectItem>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p.valor} value={p.valor}>
                {p.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroRotina} onValueChange={setFiltroRotina}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Rotinas</SelectItem>
            {ROTINAS.map((r) => (
              <SelectItem key={r.valor} value={r.valor}>
                {r.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            className={`px-4 py-2 text-sm flex items-center gap-2 ${
              visao === "kanban" ? "bg-orange-500 text-white" : "bg-white text-slate-600"
            }`}
            onClick={() => setVisao("kanban")}
          >
            <Columns3 className="w-4 h-4" /> Kanban
          </button>
          <button
            className={`px-4 py-2 text-sm flex items-center gap-2 ${
              visao === "lista" ? "bg-orange-500 text-white" : "bg-white text-slate-600"
            }`}
            onClick={() => setVisao("lista")}
          >
            <List className="w-4 h-4" /> Lista
          </button>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onPermissoes}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" /> Permissões
        </Button>

        {/* Importar pelo número do protocolo */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Adicionar por protocolo
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: VNC-000012, OS-260810-4821, 123456"
                value={protocolo}
                onChange={(e) => setProtocolo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && protocolo.trim()) {
                    e.preventDefault();
                    setBuscarProtocolo(protocolo.trim());
                  }
                }}
              />
              <Select
                value={colunaImportar}
                onValueChange={(v) => setColunaImportar(v as StatusQuadro)}
              >
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUNAS.map((c) => (
                    <SelectItem key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!protocolo.trim()}
                onClick={() => setBuscarProtocolo(protocolo.trim())}
              >
                Buscar
              </Button>
            </div>

            {buscarProtocolo && (
              <div className="border rounded-md divide-y">
                {carregandoBusca ? (
                  <p className="text-xs text-slate-500 p-3">Procurando…</p>
                ) : (achados?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500 p-3">
                    Nenhum registro com o protocolo <strong>{buscarProtocolo}</strong> nesta
                    unidade.
                  </p>
                ) : (
                  achados!.map((a) => (
                    <div
                      key={`${a.tipo}:${a.id}`}
                      className="flex items-center justify-between gap-2 p-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{a.titulo}</p>
                        <p className="text-xs text-slate-500">
                          {a.rotuloTipo}
                          {a.protocolo ? ` · ${a.protocolo}` : ""}
                        </p>
                      </div>
                      {a.jaNoQuadro ? (
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          já no quadro
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 shrink-0"
                          disabled={criar.isPending}
                          onClick={() =>
                            criar.mutate({
                              condominioId,
                              titulo: a.titulo,
                              status: colunaImportar,
                              origemTipo: a.tipo,
                              origemId: a.id,
                            })
                          }
                        >
                          Adicionar
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full bg-orange-500 hover:bg-orange-600"
          onClick={() => setModalNova(true)}
          disabled={!habilitado}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Atividade
        </Button>

        {carregando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : visao === "kanban" ? (
          <div className="space-y-4">
            {COLUNAS.map((coluna) => {
              const itens = daColuna(coluna.valor);
              return (
                <Card
                  key={coluna.valor}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => soltarNaColuna(coluna.valor)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: coluna.cor }}
                        />
                        {coluna.rotulo}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Relatório da coluna inteira, não de uma atividade. */}
                        <button
                          className="text-slate-300 hover:text-slate-600"
                          aria-label={`Baixar PDF de ${coluna.rotulo}`}
                          onClick={async () => {
                            const res = await gerarPdfColuna.mutateAsync({
                              condominioId,
                              status: coluna.valor,
                            });
                            baixarPdfBase64(res.pdf, `quadro-${coluna.valor}.pdf`);
                          }}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
                          {itens.length}
                        </span>
                      </div>
                    </div>
                    <div className="h-0.5" style={{ backgroundColor: coluna.cor }} />

                    <div className="p-4 min-h-[220px]">
                      {itens.length === 0 ? (
                        <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-400">
                          <Inbox className="w-8 h-8" strokeWidth={1.5} />
                          <p className="text-sm mt-2">
                            Arraste atividades
                            <br />
                            para esta coluna
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {itens.map((a) => (
                            <CartaoAtividade
                              key={a.id}
                              atividade={a}
                              onArrastar={() => setArrastando(a.id)}
                              onExcluir={() => {
                                if (confirm(`Remover "${a.titulo}" do quadro?`)) {
                                  deletar.mutate({ id: a.id });
                                }
                              }}
                              onEditar={() => setEditando(a)}
                              onFinalizar={() =>
                                atualizar.mutate({ id: a.id, status: "concluido" })
                              }
                              onPrioridade={(prioridade) =>
                                atualizar.mutate({
                                  id: a.id,
                                  prioridade: prioridade as "baixa" | "media" | "alta" | "urgente",
                                })
                              }
                              condominioId={condominioId}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhuma atividade.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtradas.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{a.titulo}</span>
                    <Select
                      value={a.status}
                      onValueChange={(v) => atualizar.mutate({ id: a.id, status: v as StatusQuadro })}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUNAS.map((c) => (
                          <SelectItem key={c.valor} value={c.valor}>
                            {c.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {ROTINAS.find((r) => r.valor === a.rotina)?.rotulo}
                    {a.responsavelNome ? ` · ${a.responsavelNome}` : ""}
                    {a.origemTipo ? ` · ${ORIGEM_ROTULO[a.origemTipo]}` : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Editar atividade */}
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar atividade</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={editando.descricao ?? ""}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  value={editando.responsavelNome ?? ""}
                  onChange={(e) => setEditando({ ...editando, responsavelNome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={editando.prioridade}
                    onValueChange={(v) => setEditando({ ...editando, prioridade: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map((p) => (
                        <SelectItem key={p.valor} value={p.valor}>
                          {p.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rotina</Label>
                  <Select
                    value={editando.rotina}
                    onValueChange={(v) => setEditando({ ...editando, rotina: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROTINAS.map((r) => (
                        <SelectItem key={r.valor} value={r.valor}>
                          {r.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={atualizar.isPending || editando.titulo.trim().length < 3}
                onClick={() => {
                  atualizar.mutate({
                    id: editando.id,
                    titulo: editando.titulo.trim(),
                    descricao: editando.descricao?.trim() || undefined,
                    responsavelNome: editando.responsavelNome?.trim() || undefined,
                    prioridade: editando.prioridade as "baixa" | "media" | "alta" | "urgente",
                    rotina: editando.rotina as
                      | "diaria"
                      | "semanal"
                      | "mensal"
                      | "anual"
                      | "data_especifica",
                  });
                  setEditando(null);
                }}
              >
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nova atividade */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Vincular a um registro existente</Label>
              <Select
                value={form.origem || "nenhum"}
                onValueChange={(v) => {
                  if (v === "nenhum") {
                    setForm({ ...form, origem: "" });
                    return;
                  }
                  const escolhida = (origens ?? []).find((o) => `${o.tipo}:${o.id}` === v);
                  setForm({
                    ...form,
                    origem: v,
                    // O título entra preenchido, mas continua editável.
                    titulo: escolhida ? escolhida.titulo : form.titulo,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum — atividade avulsa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum — atividade avulsa</SelectItem>
                  {(origens ?? []).map((o) => (
                    <SelectItem key={`${o.tipo}:${o.id}`} value={`${o.tipo}:${o.id}`}>
                      {o.rotuloTipo} · {o.protocolo ? `${o.protocolo} — ` : ""}
                      {o.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Puxa a ordem de serviço, o vencimento, o checklist, a vistoria ou a manutenção que
                já existe. Só aparece o que ainda não está no quadro.
              </p>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Trocar lâmpadas do corredor"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            <div>
              <Label>Responsável</Label>
              <Select
                value={form.responsavelNome || "nenhum"}
                onValueChange={(v) =>
                  setForm({ ...form, responsavelNome: v === "nenhum" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem responsável</SelectItem>
                  {(equipe ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coluna</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as StatusQuadro })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUNAS.map((c) => (
                      <SelectItem key={c.valor} value={c.valor}>
                        {c.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm({ ...form, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>
                        {p.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Rotina</Label>
              <Select value={form.rotina} onValueChange={(v) => setForm({ ...form, rotina: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROTINAS.map((r) => (
                    <SelectItem key={r.valor} value={r.valor}>
                      {r.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.rotina === "data_especifica" && (
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.dataEspecifica}
                  onChange={(e) => setForm({ ...form, dataEspecifica: e.target.value })}
                />
              </div>
            )}

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={criar.isPending || form.titulo.trim().length < 3 || !habilitado}
              onClick={() => {
                const [tipo, id] = form.origem ? form.origem.split(":") : [];
                criar.mutate({
                  condominioId,
                  titulo: form.titulo.trim(),
                  descricao: form.descricao.trim() || undefined,
                  status: form.status,
                  prioridade: form.prioridade as "baixa" | "media" | "alta" | "urgente",
                  rotina: form.rotina as
                    | "diaria"
                    | "semanal"
                    | "mensal"
                    | "anual"
                    | "data_especifica",
                  dataEspecifica:
                    form.rotina === "data_especifica" && form.dataEspecifica
                      ? form.dataEspecifica
                      : undefined,
                  responsavelNome: form.responsavelNome || undefined,
                  origemTipo: tipo as "os" | "vencimento" | "checklist" | "vistoria" | "manutencao" | "qrcode",
                  origemId: id ? Number(id) : undefined,
                });
              }}
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Atividade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold tracking-wide text-slate-500 uppercase mb-1.5">
      {children}
    </label>
  );
}

/** Cartão arrastável de uma atividade. */
function CartaoAtividade({
  atividade,
  onArrastar,
  onExcluir,
  onEditar,
  onFinalizar,
  onPrioridade,
  condominioId,
}: {
  atividade: {
    id: number;
    titulo: string;
    descricao: string | null;
    prioridade: string;
    rotina: string;
    responsavelNome: string | null;
    origemTipo: string | null;
    status: string;
    protocolo?: string | null;
  };
  onArrastar: () => void;
  onExcluir: () => void;
  onEditar: () => void;
  onFinalizar: () => void;
  onPrioridade: (prioridade: string) => void;
  condominioId: number;
}) {
  const prioridade =
    PRIORIDADES.find((p) => p.valor === atividade.prioridade) ?? PRIORIDADES[1];

  return (
    <div
      draggable
      onDragStart={onArrastar}
      className="border rounded-lg p-3 bg-white cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">{atividade.titulo}</span>
        <button onClick={onExcluir} aria-label={`Remover ${atividade.titulo}`}>
          <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-600" />
        </button>
      </div>

      {atividade.descricao && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{atividade.descricao}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ color: prioridade.cor, backgroundColor: prioridade.fundo }}
        >
          {prioridade.rotulo}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {ROTINAS.find((r) => r.valor === atividade.rotina)?.rotulo}
        </span>
        {atividade.origemTipo && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
            {ORIGEM_ROTULO[atividade.origemTipo]}
          </span>
        )}
      </div>

      {atividade.responsavelNome && (
        <p className="text-[11px] text-slate-500 mt-1.5">{atividade.responsavelNome}</p>
      )}

      {/* Prioridade num toque: é o ajuste mais frequente no quadro. */}
      <div className="flex flex-wrap gap-1 mt-2.5">
        {PRIORIDADES.map((p) => {
          const ativa = p.valor === atividade.prioridade;
          return (
            <button
              key={p.valor}
              onClick={() => onPrioridade(p.valor)}
              className="text-[10px] px-1.5 py-0.5 rounded-full border transition-colors"
              style={
                ativa
                  ? { color: p.cor, backgroundColor: p.fundo, borderColor: p.cor }
                  : { color: "#94a3b8", borderColor: "#e2e8f0" }
              }
              aria-label={`Prioridade ${p.rotulo}`}
            >
              {p.rotulo}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t">
        {atividade.status !== "concluido" && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onFinalizar}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Finalizar
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEditar}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
        </Button>
        <BotaoCompartilhar
          condominioId={condominioId}
          mensagem={mensagemDaAtividade(atividade)}
        />
      </div>
    </div>
  );
}
