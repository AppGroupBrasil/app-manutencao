import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { useBuscaInicial } from "@/hooks/useBuscaInicial";
import {
  ModalAcoesItem,
  ModalAntesDepois,
  ModalObservacaoItem,
  ModalReportarProblema,
  type ItemAlvo,
} from "@/components/ChecklistItemAcoes";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MoreVertical,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

const STATUS_ROTULO: Record<string, { texto: string; cor: string; fundo: string }> = {
  pendente: { texto: "Pendente", cor: "#616161", fundo: "#f5f5f5" },
  realizada: { texto: "Em andamento", cor: "#e65100", fundo: "#fff3e0" },
  acao_necessaria: { texto: "Requer ação", cor: "#c62828", fundo: "#ffebee" },
  finalizada: { texto: "Concluído", cor: "#2e7d32", fundo: "#e8f5e9" },
  reaberta: { texto: "Reaberta", cor: "#1565c0", fundo: "#e3f2fd" },
  rascunho: { texto: "Rascunho", cor: "#616161", fundo: "#f5f5f5" },
};

/** Um checklist com seus itens: a lista de itens é uma consulta por card. */
function CartaoChecklist({
  checklist,
  condominioId,
}: {
  checklist: { id: number; titulo: string; localizacao: string | null; categoria: string | null; status: string; protocolo: string };
  condominioId: number;
}) {
  const utils = trpc.useUtils();
  const { data: itens } = trpc.checklist.getItens.useQuery({ checklistId: checklist.id });

  const [observacaoDe, setObservacaoDe] = useState<ItemAlvo | null>(null);
  const [acoesDe, setAcoesDe] = useState<ItemAlvo | null>(null);
  const [reportarDe, setReportarDe] = useState<ItemAlvo | null>(null);
  const [antesDepoisDe, setAntesDepoisDe] = useState<ItemAlvo | null>(null);

  const marcar = trpc.checklist.updateItem.useMutation({
    onSuccess: () => utils.checklist.getItens.invalidate({ checklistId: checklist.id }),
    onError: (e) => toast.error(e.message || "Erro ao marcar o item"),
  });

  const lista = itens ?? [];
  const concluidos = lista.filter((i) => i.completo).length;
  const total = lista.length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const status = STATUS_ROTULO[checklist.status] ?? STATUS_ROTULO.pendente;

  /** Item com registro próprio destaca o triângulo, como no Manutenção X. */
  const temRegistro = (item: (typeof lista)[number]) =>
    !!item.observacao?.trim() || !!item.fotoAntes || !!item.fotoDepois;

  const paraAlvo = (item: (typeof lista)[number]): ItemAlvo => ({
    id: item.id,
    descricao: item.descricao,
    observacao: item.observacao,
    fotoAntes: item.fotoAntes,
    descAntes: item.descAntes,
    fotoDepois: item.fotoDepois,
    descDepois: item.descDepois,
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-400">{checklist.protocolo}</p>
            <h4 className="font-semibold text-slate-800">{checklist.titulo}</h4>
            <p className="text-xs text-slate-500">
              {checklist.localizacao || "Sem local"}
              {checklist.categoria ? ` · ${checklist.categoria}` : ""}
            </p>
          </div>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: status.cor, backgroundColor: status.fundo }}
          >
            {status.texto}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {concluidos}/{total} ({pct}%)
          </span>
        </div>

        <div className="mt-3 divide-y border rounded-md">
          {lista.length === 0 ? (
            <p className="text-xs text-slate-400 p-3">Nenhum item neste checklist.</p>
          ) : (
            lista.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-2">
                <button
                  onClick={() => marcar.mutate({ id: item.id, completo: !item.completo })}
                  aria-label={item.completo ? "Desmarcar item" : "Marcar item como concluído"}
                  className="shrink-0"
                >
                  {item.completo ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="block w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                </button>

                <span
                  className={`flex-1 text-sm ${
                    item.completo ? "line-through text-slate-400" : "text-slate-700"
                  }`}
                >
                  {item.descricao}
                </span>

                <button
                  onClick={() => setObservacaoDe(paraAlvo(item))}
                  title={temRegistro(item) ? "Ver anexos e descrição" : "Anexar arquivo/imagem e descrever"}
                  aria-label="Anexos e descrição do item"
                  className="shrink-0"
                >
                  <AlertTriangle
                    className={`w-4 h-4 ${temRegistro(item) ? "text-amber-500" : "text-slate-300"}`}
                  />
                </button>

                <button
                  onClick={() => setAcoesDe(paraAlvo(item))}
                  title="Ações"
                  aria-label="Ações do item"
                  className="shrink-0"
                >
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {observacaoDe && (
        <ModalObservacaoItem item={observacaoDe} onFechar={() => setObservacaoDe(null)} />
      )}

      {acoesDe && (
        <ModalAcoesItem
          item={acoesDe}
          onReportar={() => {
            setReportarDe(acoesDe);
            setAcoesDe(null);
          }}
          onAntesDepois={() => {
            setAntesDepoisDe(acoesDe);
            setAcoesDe(null);
          }}
          onFechar={() => setAcoesDe(null)}
        />
      )}

      {reportarDe && (
        <ModalReportarProblema
          item={reportarDe}
          checklistId={checklist.id}
          condominioId={condominioId}
          onFechar={() => setReportarDe(null)}
        />
      )}

      {antesDepoisDe && (
        <ModalAntesDepois item={antesDepoisDe} onFechar={() => setAntesDepoisDe(null)} />
      )}
    </Card>
  );
}

const FORM_VAZIO = {
  titulo: "",
  localizacao: "",
  categoria: "diaria",
  responsavelNome: "",
  itens: [""],
};

/** Item do checklist ao vivo: existe só no formulário até o checklist ser salvo. */
type ItemAoVivo = {
  chave: string;
  nome: string;
  observacao: string;
  completo: boolean;
  fotos: string[];
};

const itemAoVivoVazio = (): ItemAoVivo => ({
  chave:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  nome: "",
  observacao: "",
  completo: false,
  fotos: [],
});

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Itens do checklist feito na hora.
 *
 * A foto sobe para o storage no momento em que é tirada, mas o item só vira
 * registro quando o checklist é salvo — antes disso não existe id para vincular.
 */
function ItensAoVivo({
  itens,
  onMudar,
}: {
  itens: ItemAoVivo[];
  onMudar: (itens: ItemAoVivo[]) => void;
}) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const enviarImagem = trpc.upload.image.useMutation();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const atualizar = (chave: string, campos: Partial<ItemAoVivo>) =>
    onMudar(itens.map((i) => (i.chave === chave ? { ...i, ...campos } : i)));

  const fotografar = async (chave: string, arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(chave);
    try {
      const urls: string[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "checklists",
        });
        urls.push(url);
      }
      const atual = itens.find((i) => i.chave === chave);
      if (atual) atualizar(chave, { fotos: [...atual.fotos, ...urls] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Itens verificados</Label>
        <span className="text-xs text-slate-400">
          {itens.filter((i) => i.completo).length}/{itens.filter((i) => i.nome.trim()).length}{" "}
          concluídos
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Escreva o que está sendo checado, marque o que já está feito, tire a foto e descreva.
      </p>

      {itens.map((item, i) => (
        <div key={item.chave} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => atualizar(item.chave, { completo: !item.completo })}
              aria-label={item.completo ? "Desmarcar item" : "Marcar item como concluído"}
              className="shrink-0"
            >
              {item.completo ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <span className="block w-5 h-5 rounded-full border-2 border-slate-300" />
              )}
            </button>
            <Input
              className={item.completo ? "line-through text-slate-400" : ""}
              placeholder={`Item ${i + 1} — ex.: extintor`}
              value={item.nome}
              onChange={(e) => atualizar(item.chave, { nome: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={enviando !== null}
              onClick={() => inputs.current[item.chave]?.click()}
              title="Tirar foto"
              aria-label={`Tirar foto do item ${i + 1}`}
            >
              {enviando === item.chave ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
            <button
              type="button"
              onClick={() => onMudar(itens.filter((x) => x.chave !== item.chave))}
              aria-label={`Remover item ${i + 1}`}
            >
              <X className="w-4 h-4 text-slate-400 hover:text-red-600" />
            </button>
            <input
              ref={(el) => {
                inputs.current[item.chave] = el;
              }}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => {
                void fotografar(item.chave, e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {item.fotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.fotos.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="w-14 h-14 object-cover rounded border" />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                    onClick={() =>
                      atualizar(item.chave, { fotos: item.fotos.filter((f) => f !== url) })
                    }
                    aria-label="Remover foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Observação..."
            value={item.observacao}
            onChange={(e) => atualizar(item.chave, { observacao: e.target.value })}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onMudar([...itens, itemAoVivoVazio()])}
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Item
      </Button>
    </div>
  );
}

export default function Checklists() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;
  const habilitado = !!organizacaoAtiva;

  const [busca, setBusca] = useState(useBuscaInicial());
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  /**
   * Pré-definido: a lista é montada e enviada para alguém executar.
   * Ao vivo: o funcionário monta e checa na hora, com foto e observação.
   */
  const [aoVivo, setAoVivo] = useState(false);
  const [itensAoVivo, setItensAoVivo] = useState<ItemAoVivo[]>(() => [itemAoVivoVazio()]);
  const [verReportes, setVerReportes] = useState(false);

  const { data: lista, isLoading: carregandoLista } = trpc.checklist.list.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: reportes } = trpc.checklist.listarReportes.useQuery(
    { condominioId, status: "todos" },
    { enabled: habilitado },
  );
  const { data: equipe } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [carregandoUser, user, setLocation]);

  const addItem = trpc.checklist.addItem.useMutation();
  const atualizarItemNovo = trpc.checklist.updateItem.useMutation();
  const anexarNoItem = trpc.checklist.adicionarAnexoItem.useMutation();

  const criar = trpc.checklist.create.useMutation({
    onSuccess: async (res) => {
      // No modo ao vivo os itens entram depois, porque carregam marcação,
      // observação e fotos — e tudo isso precisa do id do item.
      if (aoVivo) {
        for (const item of itensAoVivo) {
          const nome = item.nome.trim();
          if (!nome) continue;
          try {
            const { id: itemId } = await addItem.mutateAsync({
              checklistId: res.id,
              descricao: nome,
            });
            if (item.completo || item.observacao.trim()) {
              await atualizarItemNovo.mutateAsync({
                id: itemId,
                completo: item.completo,
                observacao: item.observacao.trim() || undefined,
              });
            }
            for (const url of item.fotos) {
              await anexarNoItem.mutateAsync({ itemId, url });
            }
          } catch {
            toast.error(`Item "${nome}" não pôde ser salvo por completo`);
          }
        }
      }

      setModalNovo(false);
      setForm(FORM_VAZIO);
      setItensAoVivo([itemAoVivoVazio()]);
      await utils.checklist.list.invalidate();
      toast.success(aoVivo ? "Checklist salvo" : "Checklist criado");
    },
    onError: (e) => toast.error(e.message || "Erro ao criar o checklist"),
  });

  const excluir = trpc.checklist.delete.useMutation({
    onSuccess: async () => {
      await utils.checklist.list.invalidate();
      toast.success("Checklist excluído");
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir"),
  });

  const checklists = lista ?? [];

  const filtrados = useMemo(() => {
    return checklists.filter((c) => {
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      const texto = [c.titulo, c.localizacao, c.categoria, c.protocolo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return termo.split(/\s+/).every((t) => texto.includes(t));
    });
  }, [checklists, filtroStatus, busca]);

  const abertos = (reportes ?? []).filter((r) => r.status !== "resolvido").length;

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
            <h1 className="text-lg font-bold">Checklists</h1>
            <p className="text-xs text-slate-500">
              {checklists.length} checklists
              {organizacaoAtiva ? ` · ${organizacaoAtiva.nome}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setVerReportes(true)}>
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
            {abertos}
          </Button>
          <Button size="sm" onClick={() => setModalNovo(true)} disabled={!habilitado}>
            <Plus className="w-4 h-4 mr-2" /> Novo
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9 pr-9"
            placeholder="Buscar por título, local, protocolo..."
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
          {[
            { chave: "todos", rotulo: "Todos" },
            { chave: "pendente", rotulo: "Pendentes" },
            { chave: "realizada", rotulo: "Em andamento" },
            { chave: "finalizada", rotulo: "Concluídos" },
          ].map((f) => (
            <button
              key={f.chave}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtroStatus === f.chave
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setFiltroStatus(f.chave)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {carregandoLista ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="font-semibold text-slate-700 mt-3">Nenhum checklist</p>
              <p className="text-sm text-slate-500">
                {busca ? "Nenhum resultado para a busca atual." : "Crie o primeiro checklist."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtrados.map((checklist) => (
              <div key={checklist.id} className="relative">
                <CartaoChecklist checklist={checklist} condominioId={condominioId} />
                <button
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-600"
                  onClick={() => {
                    if (confirm(`Excluir o checklist "${checklist.titulo}"?`)) {
                      excluir.mutate({ id: checklist.id });
                    }
                  }}
                  aria-label={`Excluir ${checklist.titulo}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Novo checklist */}
      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle>Novo checklist</DialogTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <span
                  className={`text-xs ${aoVivo ? "text-slate-400" : "font-medium text-slate-700"}`}
                >
                  Pré-definido
                </span>
                <Switch
                  checked={aoVivo}
                  onCheckedChange={(ligado) => {
                    setAoVivo(ligado);
                    if (ligado && itensAoVivo.length === 0) setItensAoVivo([itemAoVivoVazio()]);
                  }}
                  aria-label="Checklist ao vivo"
                />
                <span
                  className={`text-xs ${aoVivo ? "font-medium text-slate-700" : "text-slate-400"}`}
                >
                  Ao vivo
                </span>
              </label>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Limpeza da cozinha"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Local</Label>
                <Input
                  placeholder="Ex.: berçário, cozinha, pátio"
                  value={form.localizacao}
                  onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm({ ...form, categoria: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="especial">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* No pré-definido o checklist é enviado para alguém executar. */}
            <div>
              <Label>{aoVivo ? "Quem está executando" : "Enviar para"}</Label>
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

            {aoVivo ? (
              <ItensAoVivo itens={itensAoVivo} onMudar={setItensAoVivo} />
            ) : (
              <div className="space-y-2">
                <Label>Itens</Label>
                {form.itens.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Item ${i + 1}`}
                      value={item}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          itens: p.itens.map((v, j) => (j === i ? e.target.value : v)),
                        }))
                      }
                    />
                    {form.itens.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm((p) => ({ ...p, itens: p.itens.filter((_, j) => j !== i) }))
                        }
                        aria-label={`Remover item ${i + 1}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, itens: [...p.itens, ""] }))}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Item
                </Button>
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                criar.isPending ||
                form.titulo.trim().length < 3 ||
                (aoVivo
                  ? itensAoVivo.every((i) => !i.nome.trim())
                  : form.itens.every((i) => !i.trim()))
              }
              onClick={() =>
                criar.mutate({
                  condominioId,
                  titulo: form.titulo.trim(),
                  localizacao: form.localizacao.trim() || undefined,
                  categoria: form.categoria,
                  responsavelNome: form.responsavelNome || undefined,
                  // No modo ao vivo os itens entram depois, um a um.
                  itens: aoVivo ? [] : form.itens.map((i) => i.trim()).filter(Boolean),
                })
              }
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : aoVivo ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {aoVivo ? "Salvar checklist" : "Criar checklist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Problemas reportados */}
      <Dialog open={verReportes} onOpenChange={setVerReportes}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Problemas reportados</DialogTitle>
          </DialogHeader>
          {(reportes?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhum problema reportado.</p>
          ) : (
            <ul className="space-y-2">
              {reportes!.map((r) => (
                <li key={r.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-400">{r.protocolo}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {r.status === "aberto"
                        ? "Aberto"
                        : r.status === "em_andamento"
                          ? "Em andamento"
                          : "Resolvido"}
                    </span>
                  </div>
                  {r.itemDesc && (
                    <p className="text-xs text-slate-500 mt-1">Item: {r.itemDesc}</p>
                  )}
                  <p className="text-sm text-slate-700 mt-1">{r.descricao}</p>
                  {r.imagens.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {r.imagens.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    prioridade {r.prioridade}
                    {r.criadoPorNome ? ` · ${r.criadoPorNome}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
