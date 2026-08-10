import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Loader2, X } from "lucide-react";

/** Status de execução de uma manutenção agendada. */
export const STATUS_REGISTRO = [
  { valor: "concluida", rotulo: "Concluída", cor: "#2e7d32", fundo: "#e8f5e9" },
  { valor: "fora_do_prazo", rotulo: "Fora do prazo", cor: "#c62828", fundo: "#ffebee" },
  { valor: "antecipada", rotulo: "Antecipada", cor: "#1565c0", fundo: "#e3f2fd" },
  { valor: "reagendada", rotulo: "Reagendada", cor: "#e65100", fundo: "#fff3e0" },
] as const;

export function rotuloStatus(valor?: string | null) {
  return STATUS_REGISTRO.find((s) => s.valor === valor);
}

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Registro de execução de um vencimento: o que foi feito, em que situação
 * terminou e as fotos de antes e depois.
 *
 * Serve tanto à lista quanto ao calendário — por isso vive fora da página.
 */
export function RegistroVencimento({
  vencimentoId,
  titulo,
  onFechar,
}: {
  vencimentoId: number;
  titulo: string;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.vencimentos.getRegistro.useQuery({ id: vencimentoId });

  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState("");
  const [enviando, setEnviando] = useState(false);
  const inputAntes = useRef<HTMLInputElement>(null);
  const inputDepois = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setDescricao(data.descricao);
      setStatus(data.status);
    }
  }, [data]);

  const enviarImagem = trpc.upload.image.useMutation();

  const recarregar = async () => {
    await Promise.all([
      utils.vencimentos.getRegistro.invalidate({ id: vencimentoId }),
      utils.vencimentos.list.invalidate(),
    ]);
  };

  const salvar = trpc.vencimentos.salvarRegistro.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Registro salvo");
      // Salvou, acabou: deixar o modal aberto faz a pessoa duvidar se gravou.
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar o registro"),
  });

  const adicionarAnexos = trpc.vencimentos.adicionarAnexos.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao anexar"),
  });

  const removerAnexo = trpc.vencimentos.removerAnexo.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const anexar = async (arquivos: FileList | null, fase: "antes" | "depois") => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      const novos: { url: string; nome: string; fase: "antes" | "depois" }[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "vencimentos",
        });
        novos.push({ url, nome: arquivo.name, fase });
      }
      await adicionarAnexos.mutateAsync({ id: vencimentoId, anexos: novos });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao anexar");
    } finally {
      setEnviando(false);
    }
  };

  const porFase = (fase: "antes" | "depois") =>
    (data?.anexos ?? []).filter((a) => a.fase === fase);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registro — {titulo}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Situação</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STATUS_REGISTRO.map((s) => {
                  const ativo = status === s.valor;
                  return (
                    <button
                      key={s.valor}
                      type="button"
                      className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                      style={
                        ativo
                          ? { background: s.cor, color: "#fff", borderColor: s.cor }
                          : { color: s.cor, backgroundColor: s.fundo, borderColor: `${s.cor}33` }
                      }
                      onClick={() => setStatus(ativo ? "" : s.valor)}
                    >
                      {s.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>O que foi feito</Label>
              <Textarea
                rows={4}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o serviço realizado..."
              />
            </div>

            {(["antes", "depois"] as const).map((fase) => (
              <div key={fase} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{fase}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={enviando}
                    onClick={() => (fase === "antes" ? inputAntes : inputDepois).current?.click()}
                  >
                    {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Anexar foto"}
                  </Button>
                  <input
                    ref={fase === "antes" ? inputAntes : inputDepois}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      void anexar(e.target.files, fase);
                      e.target.value = "";
                    }}
                  />
                </div>
                {porFase(fase).length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhuma foto.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {porFase(fase).map((anexo) => (
                      <div key={anexo.id} className="relative">
                        <img
                          src={anexo.url}
                          alt={anexo.nome ?? ""}
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <button
                          className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                          onClick={() => removerAnexo.mutate({ anexoId: anexo.id })}
                          aria-label="Remover anexo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Button
              className="w-full"
              onClick={() => salvar.mutate({ id: vencimentoId, descricao, status })}
              disabled={salvar.isPending}
            >
              {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar registro
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RegistroVencimento;
