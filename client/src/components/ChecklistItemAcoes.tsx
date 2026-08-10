import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertTriangle, ImagePlus, Loader2, Repeat, Trash2, X } from "lucide-react";

export type ItemAlvo = {
  id: number;
  descricao: string;
  observacao?: string | null;
  fotoAntes?: string | null;
  descAntes?: string | null;
  fotoDepois?: string | null;
  descDepois?: string | null;
};

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

/** Upload das imagens do checklist, reaproveitado pelos três modais. */
function useUploadImagem() {
  const enviar = trpc.upload.image.useMutation();

  return async (arquivo: File) => {
    const base64 = await lerArquivoBase64(arquivo);
    const { url } = await enviar.mutateAsync({
      fileName: arquivo.name,
      fileType: arquivo.type,
      fileData: base64,
      folder: "checklists",
    });
    return url;
  };
}

/**
 * Observação e anexos do item — é o que abre no botão de triângulo.
 */
export function ModalObservacaoItem({
  item,
  onFechar,
}: {
  item: ItemAlvo;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const upload = useUploadImagem();
  const [texto, setTexto] = useState(item.observacao ?? "");
  const [enviando, setEnviando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const { data: anexos } = trpc.checklist.listarAnexosItem.useQuery({ itemId: item.id });

  const recarregar = async () => {
    await Promise.all([
      utils.checklist.listarAnexosItem.invalidate({ itemId: item.id }),
      utils.checklist.getItens.invalidate(),
    ]);
  };

  const salvar = trpc.checklist.updateItem.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Observação salva");
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  const adicionar = trpc.checklist.adicionarAnexoItem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao anexar"),
  });

  const remover = trpc.checklist.removerAnexoItem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const url = await upload(arquivo);
        await adicionar.mutateAsync({ itemId: item.id, url, nome: arquivo.name });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao anexar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anexos e descrição</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">
          Item: <strong>{item.descricao}</strong>
        </p>

        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Descreva o que foi observado neste item..."
            />
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Anexos</span>
              <Button
                variant="outline"
                size="sm"
                disabled={enviando}
                onClick={() => inputArquivo.current?.click()}
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anexar"}
              </Button>
              <input
                ref={inputArquivo}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void anexar(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {(anexos?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-400">Nenhum anexo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {anexos!.map((anexo) => (
                  <div key={anexo.id} className="relative">
                    <img
                      src={anexo.url}
                      alt={anexo.nome ?? ""}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                      onClick={() => remover.mutate({ itemId: item.id, anexoId: anexo.id })}
                      aria-label="Remover anexo"
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
            disabled={salvar.isPending}
            onClick={() => salvar.mutate({ id: item.id, observacao: texto.trim() })}
          >
            {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Antes e depois do item, com foto e descrição de cada lado. */
export function ModalAntesDepois({
  item,
  onFechar,
}: {
  item: ItemAlvo;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const upload = useUploadImagem();
  const [estado, setEstado] = useState({
    fotoAntes: item.fotoAntes ?? null,
    descAntes: item.descAntes ?? "",
    fotoDepois: item.fotoDepois ?? null,
    descDepois: item.descDepois ?? "",
  });
  const [enviando, setEnviando] = useState<"antes" | "depois" | null>(null);
  const inputAntes = useRef<HTMLInputElement>(null);
  const inputDepois = useRef<HTMLInputElement>(null);

  const salvar = trpc.checklist.salvarAntesDepois.useMutation({
    onSuccess: async () => {
      await utils.checklist.getItens.invalidate();
      toast.success("Antes e depois salvo");
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  const trocarFoto = async (arquivo: File | undefined, fase: "antes" | "depois") => {
    if (!arquivo) return;
    setEnviando(fase);
    try {
      const url = await upload(arquivo);
      setEstado((atual) =>
        fase === "antes" ? { ...atual, fotoAntes: url } : { ...atual, fotoDepois: url },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(null);
    }
  };

  const lados = [
    {
      fase: "antes" as const,
      rotulo: "Antes",
      foto: estado.fotoAntes,
      desc: estado.descAntes,
      input: inputAntes,
    },
    {
      fase: "depois" as const,
      rotulo: "Depois",
      foto: estado.fotoDepois,
      desc: estado.descDepois,
      input: inputDepois,
    },
  ];

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Antes e depois</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">
          Item: <strong>{item.descricao}</strong>
        </p>

        <div className="space-y-3">
          {lados.map((lado) => (
            <div key={lado.fase} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{lado.rotulo}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={enviando !== null}
                  onClick={() => lado.input.current?.click()}
                >
                  {enviando === lado.fase ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </Button>
                <input
                  ref={lado.input}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void trocarFoto(e.target.files?.[0], lado.fase);
                    e.target.value = "";
                  }}
                />
              </div>

              {lado.foto ? (
                <div className="relative w-fit">
                  <img src={lado.foto} alt={lado.rotulo} className="w-24 h-24 object-cover rounded border" />
                  <button
                    className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                    onClick={() =>
                      setEstado((atual) =>
                        lado.fase === "antes"
                          ? { ...atual, fotoAntes: null }
                          : { ...atual, fotoDepois: null },
                      )
                    }
                    aria-label={`Remover foto de ${lado.rotulo.toLowerCase()}`}
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sem foto.</p>
              )}

              <Textarea
                rows={2}
                placeholder={`Descrição do ${lado.rotulo.toLowerCase()}`}
                value={lado.desc}
                onChange={(e) =>
                  setEstado((atual) =>
                    lado.fase === "antes"
                      ? { ...atual, descAntes: e.target.value }
                      : { ...atual, descDepois: e.target.value },
                  )
                }
              />
            </div>
          ))}

          <Button
            className="w-full"
            disabled={salvar.isPending}
            onClick={() =>
              salvar.mutate({
                itemId: item.id,
                fotoAntes: estado.fotoAntes,
                descAntes: estado.descAntes.trim(),
                fotoDepois: estado.fotoDepois,
                descDepois: estado.descDepois.trim(),
              })
            }
          >
            {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reportar problema a partir do item, gerando protocolo. */
export function ModalReportarProblema({
  item,
  checklistId,
  condominioId,
  onFechar,
}: {
  item: ItemAlvo;
  checklistId: number;
  condominioId: number;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const upload = useUploadImagem();
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<"aberto" | "em_andamento" | "resolvido">("aberto");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [imagens, setImagens] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const inputImagens = useRef<HTMLInputElement>(null);

  const reportar = trpc.checklist.reportarProblema.useMutation({
    onSuccess: async (res) => {
      await utils.checklist.listarReportes.invalidate();
      toast.success(`Problema reportado. Protocolo: ${res.protocolo}`);
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao reportar"),
  });

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      const urls: string[] = [];
      for (const arquivo of Array.from(arquivos)) urls.push(await upload(arquivo));
      setImagens((atual) => [...atual, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a imagem");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Reportar problema
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">
          Item: <strong>{item.descricao}</strong>
        </p>

        <div className="space-y-3">
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Imagens</span>
              <Button
                variant="outline"
                size="sm"
                disabled={enviando}
                onClick={() => inputImagens.current?.click()}
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              </Button>
              <input
                ref={inputImagens}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void anexar(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {imagens.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma imagem.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {imagens.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                      onClick={() => setImagens((atual) => atual.filter((i) => i !== url))}
                      aria-label="Remover imagem"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Descrição do problema</Label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o problema encontrado..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as typeof prioridade)}>
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
          </div>

          <Button
            className="w-full"
            disabled={reportar.isPending || descricao.trim().length < 3}
            onClick={() =>
              reportar.mutate({
                condominioId,
                checklistId,
                itemId: item.id,
                itemDesc: item.descricao,
                descricao: descricao.trim(),
                status,
                prioridade,
                imagens,
              })
            }
          >
            {reportar.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            Enviar reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Menu dos três pontinhos: as duas ações do item. */
export function ModalAcoesItem({
  item,
  onReportar,
  onAntesDepois,
  onFechar,
}: {
  item: ItemAlvo;
  onReportar: () => void;
  onAntesDepois: () => void;
  onFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Ações do item</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{item.descricao}</p>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={onReportar}>
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
            Reportar problema
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={onAntesDepois}>
            <Repeat className="w-4 h-4 mr-2 text-sky-500" />
            Antes e depois
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
