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
import { BotaoQrCode } from "@/components/BotaoQrCode";
import { useVocabulario } from "@/hooks/useVocabulario";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Printer,
  Share2,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

const DIAS = [
  { valor: 0, curto: "Dom", nome: "Domingo" },
  { valor: 1, curto: "Seg", nome: "Segunda" },
  { valor: 2, curto: "Ter", nome: "Terça" },
  { valor: 3, curto: "Qua", nome: "Quarta" },
  { valor: 4, curto: "Qui", nome: "Quinta" },
  { valor: 5, curto: "Sex", nome: "Sexta" },
  { valor: 6, curto: "Sáb", nome: "Sábado" },
];

const RECORRENCIAS = [
  { valor: "unica", rotulo: "Data Específica" },
  { valor: "diaria", rotulo: "Diária" },
  { valor: "semanal", rotulo: "Semanal" },
  { valor: "mensal", rotulo: "Mensal" },
];

const RECORRENCIA_ROTULO: Record<string, string> = {
  unica: "Única",
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};

const PRIORIDADE_COR: Record<string, { cor: string; fundo: string; rotulo: string }> = {
  baixa: { cor: "#2e7d32", fundo: "#e8f5e9", rotulo: "Baixa" },
  media: { cor: "#1565c0", fundo: "#e3f2fd", rotulo: "Média" },
  alta: { cor: "#e65100", fundo: "#fff3e0", rotulo: "Alta" },
  urgente: { cor: "#c62828", fundo: "#ffebee", rotulo: "Urgente" },
};

const STATUS_EXECUCAO: Record<string, { rotulo: string; cor: string; fundo: string }> = {
  realizada: { rotulo: "Realizada", cor: "#2e7d32", fundo: "#e8f5e9" },
  pendente: { rotulo: "Pendente", cor: "#e65100", fundo: "#fff3e0" },
  nao_executada: { rotulo: "Não executada", cor: "#c62828", fundo: "#ffebee" },
};

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

/** Texto do compartilhamento, no mesmo formato das outras funções. */
function mensagemDaTarefa(
  tarefa: {
    protocolo?: string | null;
    titulo: string;
    funcionarioNome?: string | null;
    bloco?: string | null;
    local?: string | null;
    descricao?: string | null;
  },
  execucoes: number,
): string {
  return [
    "*Tarefa*",
    tarefa.protocolo ? `*Protocolo:* ${tarefa.protocolo}` : "",
    `*Título:* ${tarefa.titulo}`,
    tarefa.funcionarioNome ? `*Responsável:* ${tarefa.funcionarioNome}` : "",
    [tarefa.bloco, tarefa.local].filter(Boolean).length
      ? `*Local:* ${[tarefa.bloco, tarefa.local].filter(Boolean).join(" · ")}`
      : "",
    `*Execuções:* ${execucoes}`,
    tarefa.descricao ? `\n${tarefa.descricao}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const FORM_VAZIO = {
  titulo: "",
  funcionarioNome: "",
  descricao: "",
  bloco: "Todos",
  local: "",
  prioridade: "media",
  recorrencia: "unica",
  dataEspecifica: "",
  diasSemana: [] as number[],
  diaMes: 1,
};

function formatarData(valor?: string | Date | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
}

/** Rótulo em caixa alta com o asterisco de obrigatório, como na tela do MX. */
function Rotulo({ children, obrigatorio }: { children: React.ReactNode; obrigatorio?: boolean }) {
  return (
    <label className="block text-xs font-semibold tracking-wide text-slate-500 uppercase mb-1.5">
      {children}
      {obrigatorio && <span className="text-orange-500"> *</span>}
    </label>
  );
}

/**
 * Página do gestor: resolve a unidade pela sessão dele e entrega o conteúdo.
 *
 * O funcionário usa o mesmo conteúdo por outro caminho — ele não tem `auth.me`
 * nem `condominio.list`, então recebe a unidade pronta de fora.
 */
export default function ListaTarefas() {
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
    <ConteudoListaTarefas
      condominioId={organizacaoAtiva?.id ?? 0}
      organizacoes={organizacoes ?? []}
      onVoltar={() => setLocation("/admin/manutencoes")}
    />
  );
}

export function ConteudoListaTarefas({
  condominioId,
  organizacoes,
  onVoltar,
  podeCriar = true,
}: {
  condominioId: number;
  organizacoes: { id: number; nome: string }[];
  onVoltar?: () => void;
  podeCriar?: boolean;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();
  const organizacaoAtiva = organizacoes.find((o) => o.id === condominioId) ?? null;
  const habilitado = condominioId > 0;

  const [comoFunciona, setComoFunciona] = useState(false);
  const [aba, setAba] = useState<"tarefas" | "acompanhar">("tarefas");
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [organizacaoForm, setOrganizacaoForm] = useState("");
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"diario" | "semanal" | "mensal">("mensal");
  const [executarDe, setExecutarDe] = useState<{ id: number; titulo: string } | null>(null);
  const conteudo = useRef<HTMLDivElement>(null);

  const { data: tarefas, isLoading: carregandoTarefas } = trpc.tarefasAgendadas.listar.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: execucoes } = trpc.tarefasAgendadas.listarExecucoesDaOrganizacao.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: equipe } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  // A organização do formulário começa na ativa, mas o gestor-chefe pode trocar.
  useEffect(() => {
    if (organizacaoAtiva && !organizacaoForm) setOrganizacaoForm(String(organizacaoAtiva.id));
  }, [organizacaoAtiva, organizacaoForm]);

  const invalidar = async () => {
    await Promise.all([
      utils.tarefasAgendadas.listar.invalidate(),
      utils.tarefasAgendadas.listarExecucoesDaOrganizacao.invalidate(),
    ]);
  };

  const criar = trpc.tarefasAgendadas.criar.useMutation({
    onSuccess: async () => {
      setFormAberto(false);
      setForm(FORM_VAZIO);
      await invalidar();
      toast.success("Tarefa criada");
    },
    onError: (e) => toast.error(e.message || "Erro ao criar a tarefa"),
  });

  // Relatório de uma tarefa. O da página inteira, mais abaixo, é outro.
  const gerarPdfDaTarefa = trpc.tarefasAgendadas.generatePdf.useMutation({
    onError: (e) => toast.error(e.message || "Erro ao gerar o PDF"),
  });

  const deletar = trpc.tarefasAgendadas.deletar.useMutation({
    onSuccess: async () => {
      await invalidar();
      toast.success("Tarefa excluída");
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir"),
  });

  const registrar = trpc.tarefasAgendadas.registrarExecucao.useMutation({
    onSuccess: async () => {
      setExecutarDe(null);
      await invalidar();
      toast.success("Execução registrada");
    },
    onError: (e) => toast.error(e.message || "Erro ao registrar"),
  });

  const lista = tarefas ?? [];

  const execucoesFiltradas = useMemo(() => {
    const dias = filtroPeriodo === "diario" ? 1 : filtroPeriodo === "semanal" ? 7 : 30;
    const corte = new Date();
    corte.setDate(corte.getDate() - dias);

    return (execucoes ?? []).filter((e) => {
      if (filtroFuncionario !== "todos" && e.funcionarioNome !== filtroFuncionario) return false;
      return new Date(e.dataExecucao) >= corte;
    });
  }, [execucoes, filtroPeriodo, filtroFuncionario]);

  const resumo = useMemo(
    () => ({
      total: execucoesFiltradas.length,
      realizadas: execucoesFiltradas.filter((e) => e.status === "realizada").length,
      pendentes: execucoesFiltradas.filter((e) => e.status === "pendente").length,
      naoExecutadas: execucoesFiltradas.filter((e) => e.status === "nao_executada").length,
    }),
    [execucoesFiltradas],
  );

  const descreverRecorrencia = (t: (typeof lista)[number]) => {
    if (t.recorrencia === "semanal") {
      const nomes = t.diasSemana.map((d) => DIAS[d]?.nome ?? "").filter(Boolean);
      return nomes.length > 0 ? `Semanal · ${nomes.join(", ")}` : "Semanal";
    }
    if (t.recorrencia === "mensal") return `Mensal · dia ${t.diaMes ?? 1}`;
    if (t.recorrencia === "unica" && t.dataEspecifica) {
      return `Data específica · ${formatarData(t.dataEspecifica)}`;
    }
    return RECORRENCIA_ROTULO[t.recorrencia] ?? t.recorrencia;
  };

  const mensagemDaLista = () =>
    `*Lista de Tarefas*\n${lista.length} tarefa(s), ${execucoes?.length ?? 0} execução(ões) registradas`;

  const gerarPdf = async () => {
    if (!conteudo.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    (html2pdf() as any)
      .set({
        margin: 10,
        filename: `tarefas-agendadas-${new Date().toISOString().slice(0, 10)}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(conteudo.current)
      .save();
  };

  const formularioValido =
    form.titulo.trim().length >= 3 && !!form.funcionarioNome && !!organizacaoForm && habilitado;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Como funciona */}
      <button
        className="w-full bg-orange-500 text-white px-4 py-4 flex items-center justify-between"
        onClick={() => setComoFunciona((v) => !v)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <ClipboardList className="w-5 h-5" />
          Como funciona
        </span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${comoFunciona ? "rotate-180" : ""}`}
        />
      </button>
      {comoFunciona && (
        <div className="bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <ul className="list-disc pl-5 space-y-1">
            <li>Crie a tarefa definindo responsável, local e prioridade</li>
            <li>Escolha a recorrência: data específica, diária, semanal ou mensal</li>
            <li>A equipe registra a execução com foto e observação</li>
            <li>Acompanhe o que foi realizado, o que ficou pendente e o que não foi executado</li>
          </ul>
        </div>
      )}

      <main ref={conteudo} className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start gap-2">
          {onVoltar && (
            <Button variant="ghost" size="sm" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">Tarefas Agendadas</h1>
            <p className="text-slate-500 mt-1">
              {lista.length} tarefa(s) | {execucoes?.length ?? 0} execuções registradas
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <BotaoCompartilhar condominioId={condominioId} mensagem={mensagemDaLista()} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            aria-label="Imprimir"
          >
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

        {/* Abas + criar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                className={`flex items-center gap-2 text-sm ${
                  aba === "tarefas" ? "font-semibold text-slate-900" : "text-slate-500"
                }`}
                onClick={() => setAba("tarefas")}
              >
                <ClipboardList className="w-4 h-4" />
                Tarefas
                <span className="text-slate-400">{lista.length}</span>
              </button>
              {podeCriar && (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => setFormAberto((v) => !v)}
                  disabled={!habilitado}
                >
                  <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
                </Button>
              )}
            </div>
            <button
              className={`flex items-center gap-2 text-sm mt-2 ${
                aba === "acompanhar" ? "font-semibold text-slate-900" : "text-slate-500"
              }`}
              onClick={() => setAba("acompanhar")}
            >
              <CheckCircle2 className="w-4 h-4" />
              Acompanhamento
            </button>
          </CardContent>
        </Card>

        {/* Formulário de criação, na própria página */}
        {formAberto && podeCriar && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Rotulo obrigatorio>Título da tarefa</Rotulo>
                <Input
                  placeholder="Ex: Limpeza do hall de entrada"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>

              <div>
                <Rotulo obrigatorio>Funcionário</Rotulo>
                <Select
                  value={form.funcionarioNome}
                  onValueChange={(v) => setForm({ ...form, funcionarioNome: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(equipe ?? []).length === 0 ? (
                      <SelectItem value="sem-equipe" disabled>
                        Nenhum funcionário cadastrado
                      </SelectItem>
                    ) : (
                      equipe!.map((f) => (
                        <SelectItem key={f.id} value={f.nome}>
                          {f.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Rotulo>Descrição</Rotulo>
                <Textarea
                  rows={3}
                  placeholder="Descreva o detalhes da tarefa..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              <div>
                <Rotulo obrigatorio>Unidade</Rotulo>
                <Select value={organizacaoForm} onValueChange={setOrganizacaoForm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(organizacoes ?? []).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Rotulo>{v.setor}</Rotulo>
                {/* Texto livre: cada unidade nomeia os setores do seu jeito
                    (berçário, cozinha, secretaria), e a lista fixa de blocos
                    era vocabulário de condomínio. */}
                <Input
                  placeholder="Ex.: berçário, cozinha, secretaria"
                  value={form.bloco === "Todos" ? "" : form.bloco}
                  onChange={(e) => setForm({ ...form, bloco: e.target.value || "Todos" })}
                />
              </div>

              <div>
                <Rotulo>{v.local}</Rotulo>
                <Input
                  placeholder="Ex.: cozinha, pátio, sala 3"
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                />
              </div>

              <div>
                <Rotulo>Prioridade</Rotulo>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm({ ...form, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Rotulo>Recorrência</Rotulo>
                <Select
                  value={form.recorrencia}
                  onValueChange={(v) => setForm({ ...form, recorrencia: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORRENCIAS.map((r) => (
                      <SelectItem key={r.valor} value={r.valor}>
                        {r.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.recorrencia === "unica" && (
                <div>
                  <Rotulo>Data</Rotulo>
                  <Input
                    type="date"
                    className="max-w-[200px]"
                    value={form.dataEspecifica}
                    onChange={(e) => setForm({ ...form, dataEspecifica: e.target.value })}
                  />
                </div>
              )}

              {form.recorrencia === "semanal" && (
                <div>
                  <Rotulo>Dias da semana</Rotulo>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS.map((d) => {
                      const ativo = form.diasSemana.includes(d.valor);
                      return (
                        <button
                          key={d.valor}
                          type="button"
                          className={`px-3 h-9 rounded-full border text-xs font-medium transition-colors ${
                            ativo
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              diasSemana: ativo
                                ? p.diasSemana.filter((x) => x !== d.valor)
                                : [...p.diasSemana, d.valor].sort(),
                            }))
                          }
                        >
                          {d.curto}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.recorrencia === "mensal" && (
                <div>
                  <Rotulo>Dia do mês</Rotulo>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    className="max-w-[120px]"
                    value={form.diaMes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        diaMes: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={!formularioValido || criar.isPending}
                  onClick={() =>
                    criar.mutate({
                      condominioId: Number(organizacaoForm),
                      titulo: form.titulo.trim(),
                      descricao: form.descricao.trim() || undefined,
                      funcionarioNome: form.funcionarioNome,
                      bloco: form.bloco !== "Todos" ? form.bloco : undefined,
                      local: form.local.trim() || undefined,
                      recorrencia: form.recorrencia as "unica" | "diaria" | "semanal" | "mensal",
                      diasSemana: form.recorrencia === "semanal" ? form.diasSemana : [],
                      dataEspecifica:
                        form.recorrencia === "unica" && form.dataEspecifica
                          ? form.dataEspecifica
                          : undefined,
                      diaMes: form.recorrencia === "mensal" ? form.diaMes : undefined,
                      prioridade: form.prioridade as "baixa" | "media" | "alta" | "urgente",
                    })
                  }
                >
                  {criar.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Criar Tarefa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormAberto(false);
                    setForm(FORM_VAZIO);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {aba === "tarefas" ? (
          carregandoTarefas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : lista.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center">
                <ClipboardList className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
                <p className="font-semibold text-slate-700 mt-3">Nenhuma tarefa</p>
                <p className="text-sm text-slate-500">Crie a primeira tarefa.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lista.map((t) => {
                const prioridade = PRIORIDADE_COR[t.prioridade] ?? PRIORIDADE_COR.media;
                const daTarefa = (execucoes ?? []).filter((e) => e.tarefaId === t.id);
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800">{t.titulo}</h4>
                          <p className="text-xs text-slate-500">{descreverRecorrencia(t)}</p>
                        </div>
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ color: prioridade.cor, backgroundColor: prioridade.fundo }}
                        >
                          {prioridade.rotulo}
                        </span>
                      </div>

                      {t.descricao && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t.descricao}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                        {t.funcionarioNome && <span>{t.funcionarioNome}</span>}
                        {(t.local || t.bloco) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {[t.bloco, t.local].filter(Boolean).join(" · ")}
                          </span>
                        )}
                        <span>{daTarefa.length} execução(ões)</span>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExecutarDe({ id: t.id, titulo: t.titulo })}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Registrar execução
                        </Button>

                        {/* Mesmo rodapé das outras funções: consulta pública,
                            relatório e compartilhamento. */}
                        {t.shareToken ? (
                          <BotaoQrCode
                            titulo={t.titulo}
                            url={`${typeof window !== "undefined" ? window.location.origin : ""}/registro/tarefa/${t.shareToken}`}
                          />
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={gerarPdfDaTarefa.isPending}
                          onClick={async () => {
                            const res = await gerarPdfDaTarefa.mutateAsync({ id: t.id });
                            baixarPdfBase64(res.pdf, `tarefa-${t.id}.pdf`);
                          }}
                        >
                          {gerarPdfDaTarefa.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4 mr-2" />
                          )}
                          PDF
                        </Button>
                        <BotaoCompartilhar
                          condominioId={condominioId}
                          mensagem={mensagemDaTarefa(t, daTarefa.length)}
                          rotulo="Compartilhar"
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Excluir a tarefa "${t.titulo}"?`)) {
                              deletar.mutate({ id: t.id });
                            }
                          }}
                          aria-label={`Excluir ${t.titulo}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os funcionários</SelectItem>
                  {(equipe ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtroPeriodo}
                onValueChange={(v) => setFiltroPeriodo(v as typeof filtroPeriodo)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Último dia</SelectItem>
                  <SelectItem value="semanal">Últimos 7 dias</SelectItem>
                  <SelectItem value="mensal">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { rotulo: "Total", valor: resumo.total, cor: "text-slate-900" },
                { rotulo: "Realizadas", valor: resumo.realizadas, cor: "text-emerald-600" },
                { rotulo: "Pendentes", valor: resumo.pendentes, cor: "text-amber-600" },
                { rotulo: "Não executadas", valor: resumo.naoExecutadas, cor: "text-red-600" },
              ].map((c) => (
                <Card key={c.rotulo}>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">{c.rotulo}</p>
                    <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {execucoesFiltradas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  Nenhuma execução no período.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {execucoesFiltradas.map((e) => {
                  const status = STATUS_EXECUCAO[e.status] ?? STATUS_EXECUCAO.pendente;
                  return (
                    <Card key={e.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {e.tarefaTitulo}
                          </span>
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ color: status.cor, backgroundColor: status.fundo }}
                          >
                            {status.rotulo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatarData(e.dataExecucao)}
                          {e.horaExecucao ? ` · ${e.horaExecucao}` : ""}
                          {e.funcionarioNome ? ` · ${e.funcionarioNome}` : ""}
                        </p>
                        {e.observacao && (
                          <p className="text-xs text-slate-600 mt-1">{e.observacao}</p>
                        )}
                        {e.fotos.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {e.fotos.map((url) => (
                              <img
                                key={url}
                                src={url}
                                alt=""
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {executarDe && (
        <ModalExecucao
          tarefa={executarDe}
          pendente={registrar.isPending}
          onRegistrar={(dados) => registrar.mutate({ tarefaId: executarDe.id, ...dados })}
          onFechar={() => setExecutarDe(null)}
        />
      )}
    </div>
  );
}

/** Registro de execução: status, observação e fotos. */
function ModalExecucao({
  tarefa,
  pendente,
  onRegistrar,
  onFechar,
}: {
  tarefa: { id: number; titulo: string };
  pendente: boolean;
  onRegistrar: (dados: {
    status: "realizada" | "pendente" | "nao_executada";
    observacao?: string;
    fotos?: string[];
  }) => void;
  onFechar: () => void;
}) {
  const [status, setStatus] = useState<"realizada" | "pendente" | "nao_executada">("realizada");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const enviarImagem = trpc.upload.image.useMutation();

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      const urls: string[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const leitor = new FileReader();
          leitor.onload = () => resolve(String(leitor.result));
          leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
          leitor.readAsDataURL(arquivo);
        });
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "tarefas",
        });
        urls.push(url);
      }
      setFotos((atual) => [...atual, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar execução</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">{tarefa.titulo}</p>

        <div className="space-y-3">
          <div className="flex gap-2">
            {[
              { valor: "realizada" as const, rotulo: "Realizada", icone: CheckCircle2 },
              { valor: "pendente" as const, rotulo: "Pendente", icone: Loader2 },
              { valor: "nao_executada" as const, rotulo: "Não executada", icone: XCircle },
            ].map((s) => (
              <Button
                key={s.valor}
                variant={status === s.valor ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus(s.valor)}
              >
                <s.icone className="w-4 h-4 mr-1.5" />
                {s.rotulo}
              </Button>
            ))}
          </div>

          <div>
            <Rotulo>Observação</Rotulo>
            <Textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Como ficou a execução..."
            />
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fotos</span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    void anexar(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex items-center text-xs border rounded-md px-3 py-1.5 hover:bg-slate-50">
                  {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Anexar"}
                </span>
              </label>
            </div>
            {fotos.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma foto.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fotos.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                      onClick={() => setFotos((atual) => atual.filter((f) => f !== url))}
                      aria-label="Remover foto"
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
            disabled={pendente}
            onClick={() =>
              onRegistrar({
                status,
                observacao: observacao.trim() || undefined,
                fotos,
              })
            }
          >
            {pendente && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
