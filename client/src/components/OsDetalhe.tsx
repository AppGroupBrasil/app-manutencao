import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Paperclip,
  Play,
  RotateCcw,
  Plus,
  Printer,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

const FASES = [
  { valor: "antes", rotulo: "Antes" },
  { valor: "durante", rotulo: "Durante" },
  { valor: "depois", rotulo: "Depois" },
] as const;

/** Miniaturas com remoção — mesmo desenho em todas as fases. */
function Galeria({
  imagens,
  onRemover,
}: {
  imagens: { id: number; url: string }[];
  onRemover: (imagemId: number) => void;
}) {
  if (imagens.length === 0) {
    return <p className="text-xs text-slate-400">Nenhuma foto.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {imagens.map((img) => (
        <div key={img.id} className="relative">
          <img src={img.url} alt="" className="w-16 h-16 object-cover rounded border" />
          <button
            className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
            onClick={() => onRemover(img.id)}
            aria-label="Remover foto"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

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

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Miolo da O.S. aberta: fotos por fase, anexos, responsáveis, comentários,
 * andamento e avaliação — as abas que o Manutenção X mostra ao abrir a O.S.
 */
export function OsDetalhe({
  ordemServicoId,
  condominioId,
}: {
  ordemServicoId: number;
  condominioId: number;
}) {
  const utils = trpc.useUtils();

  const {
    data: os,
    isLoading,
    error: erroOs,
  } = trpc.ordensServico.getById.useQuery({ id: ordemServicoId }, { retry: false });
  const { data: anexos } = trpc.ordensServico.listarAnexos.useQuery({ ordemServicoId });
  const { data: candidatos } = trpc.ordensServico.listarCandidatos.useQuery({ condominioId });

  const [comentario, setComentario] = useState("");
  const [faseFoto, setFaseFoto] = useState<(typeof FASES)[number]["valor"]>("antes");
  const [enviando, setEnviando] = useState(false);
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputAnexo = useRef<HTMLInputElement>(null);
  // Quando foi a última gravação. Sem isto, quem mexe na O.S. não tem sinal
  // nenhum de que o sistema guardou — e procura um botão de salvar que não
  // existe, porque aqui tudo grava na hora.
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);

  const recarregar = async () => {
    await Promise.all([
      utils.ordensServico.getById.invalidate({ id: ordemServicoId }),
      utils.ordensServico.listarAnexos.invalidate({ ordemServicoId }),
      utils.ordensServico.list.invalidate(),
    ]);
    setSalvoEm(new Date());
  };

  // Mesmo endereço que o QR do PDF: a folha impressa e a tela apontam para cá.
  const urlDaOs = `${typeof window !== "undefined" ? window.location.origin : ""}/manutencoes/ordens-servico/${ordemServicoId}`;

  const uploadImagem = trpc.ordensServico.uploadImagem.useMutation();
  const uploadAnexo = trpc.ordensServico.uploadAnexo.useMutation();

  const gerarPdf = trpc.ordensServico.generatePDF.useMutation({
    onSuccess: (res) => {
      const bytes = Uint8Array.from(atob(res.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(e.message || "Erro ao gerar o PDF"),
  });

  const deletarImagem = trpc.ordensServico.deletarImagem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover a foto"),
  });
  const deletarAnexo = trpc.ordensServico.deletarAnexo.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover o anexo"),
  });
  const addResponsavel = trpc.ordensServico.addResponsavel.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao adicionar responsável"),
  });
  const removeResponsavel = trpc.ordensServico.removeResponsavel.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover responsável"),
  });
  const addComentario = trpc.ordensServico.addComentario.useMutation({
    onSuccess: async () => {
      setComentario("");
      await recarregar();
    },
    onError: (e) => toast.error(e.message || "Erro ao comentar"),
  });
  const iniciar = trpc.ordensServico.iniciarServico.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao iniciar"),
  });
  const finalizar = trpc.ordensServico.finalizarServico.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao finalizar"),
  });
  const reabrir = trpc.ordensServico.reabrir.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Ordem reaberta");
    },
    onError: (e) => toast.error(e.message || "Erro ao reabrir"),
  });
  const avaliar = trpc.ordensServico.avaliar.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Avaliação registrada");
    },
    onError: (e) => toast.error(e.message || "Erro ao avaliar"),
  });

  const enviarFotos = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        // O próprio upload já registra a imagem com a fase: chamar `addImagem`
        // em seguida criaria uma segunda linha para o mesmo arquivo.
        await uploadImagem.mutateAsync({
          ordemServicoId,
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          tipo: faseFoto,
        });
      }
      await recarregar();
      toast.success(arquivos.length > 1 ? "Fotos salvas" : "Foto salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(false);
    }
  };

  const enviarAnexos = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        await uploadAnexo.mutateAsync({
          ordemServicoId,
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
        });
      }
      await recarregar();
      toast.success(arquivos.length > 1 ? "Anexos salvos" : "Anexo salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar o anexo");
    } finally {
      setEnviando(false);
    }
  };

  // O QR pode chegar com uma O.S. apagada ou de outra unidade: sem isto a tela
  // ficava girando para sempre, sem dizer o que houve.
  if (erroOs) {
    return (
      <p className="text-sm text-slate-600 py-6 text-center">
        {erroOs.data?.code === "FORBIDDEN"
          ? "Esta ordem de serviço é de outra organização."
          : "Ordem de serviço não encontrada."}
      </p>
    );
  }

  if (isLoading || !os) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const imagensPorFase = (fase: string) =>
    (os.imagens ?? []).filter((img) => (img.tipo ?? "outro") === fase);

  // Fotos enviadas antes de a fase existir ficaram em "outro"/"orcamento":
  // continuam visíveis aqui em vez de sumirem da tela.
  const outrasImagens = (os.imagens ?? []).filter(
    (img) => !["antes", "durante", "depois"].includes(img.tipo ?? "outro"),
  );

  const jaResponsavel = (nome: string) =>
    (os.responsaveis ?? []).some((r) => r.nome.toLowerCase() === nome.toLowerCase());

  return (
    <div className="space-y-4">
      {/* O aviso troca o botão de salvar que as pessoas procuram. */}
      <div className="flex items-center justify-between gap-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          As alterações são salvas automaticamente.
        </span>
        {salvoEm && (
          <span className="text-emerald-700 shrink-0">
            Salvo às{" "}
            {salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Identificação: o que a folha impressa precisa carregar. */}
      <div className="border rounded-lg p-3 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Protocolo</p>
          <p className="font-mono text-lg font-semibold text-slate-800 break-all">
            {os.protocolo}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Escaneie para abrir esta O.S. e editar pelo celular.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={gerarPdf.isPending}
            onClick={() => gerarPdf.mutate({ osId: ordemServicoId })}
          >
            {gerarPdf.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Baixar PDF
          </Button>
        </div>
        <div className="bg-white p-2 rounded border shrink-0">
          <QRCodeSVG value={urlDaOs} size={96} level="M" />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {os.endereco || "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> {formatarDataHora(os.createdAt)}
        </span>
        {os.solicitanteNome && <span>Aberta por {os.solicitanteNome}</span>}
      </div>

      <p className="text-sm text-slate-600">{os.descricao || "Sem descrição inicial."}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!!os.dataInicio || iniciar.isPending}
          onClick={() => iniciar.mutate({ id: ordemServicoId })}
        >
          <Play className="w-4 h-4 mr-2" />
          {os.dataInicio ? `Iniciada em ${formatarDataHora(os.dataInicio)}` : "Iniciar serviço"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!os.dataInicio || !!os.dataFim || finalizar.isPending}
          onClick={() => finalizar.mutate({ id: ordemServicoId })}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {os.dataFim ? `Finalizada em ${formatarDataHora(os.dataFim)}` : "Finalizar serviço"}
        </Button>
        {/* Só aparece depois de encerrada; o motivo fica na linha do tempo. */}
        {os.dataFim && (
          <Button
            variant="outline"
            size="sm"
            disabled={reabrir.isPending}
            onClick={() => {
              const motivo = window.prompt("Por que esta ordem está sendo reaberta?");
              if (motivo === null) return;
              if (motivo.trim().length < 3) {
                toast.error("Escreva o motivo da reabertura");
                return;
              }
              reabrir.mutate({ id: ordemServicoId, motivo: motivo.trim() });
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reabrir
          </Button>
        )}
      </div>

      {/* Responsáveis */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium">Responsáveis pela O.S.</span>
        </div>

        {(os.responsaveis?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-400">Ninguém definido.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {os.responsaveis.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-1 rounded-full"
              >
                {r.nome}
                {r.cargo ? <span className="text-slate-400">· {r.cargo}</span> : null}
                <button
                  onClick={() => removeResponsavel.mutate({ id: r.id, ordemServicoId })}
                  aria-label={`Remover ${r.nome}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="max-h-40 overflow-y-auto divide-y border rounded-md">
          {(candidatos ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 p-2">Nenhuma pessoa cadastrada nesta unidade.</p>
          ) : (
            candidatos!.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={jaResponsavel(c.nome)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      addResponsavel.mutate({
                        ordemServicoId,
                        nome: c.nome,
                        cargo: c.cargo ?? undefined,
                        email: c.email ?? undefined,
                        telefone: c.telefone ?? undefined,
                        funcionarioId: c.id,
                      });
                    } else {
                      const atual = (os.responsaveis ?? []).find(
                        (r) => r.nome.toLowerCase() === c.nome.toLowerCase(),
                      );
                      if (atual) removeResponsavel.mutate({ id: atual.id, ordemServicoId });
                    }
                  }}
                />
                <span className="flex-1">{c.nome}</span>
                <span className="text-[11px] text-slate-400">{c.cargo ?? ""}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Fotos por fase */}
      <div className="border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Fotos</span>
          <div className="flex items-center gap-2">
            <Select value={faseFoto} onValueChange={(v) => setFaseFoto(v as typeof faseFoto)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FASES.map((f) => (
                  <SelectItem key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={enviando}
              onClick={() => inputCamera.current?.click()}
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={enviando}
              onClick={() => inputFoto.current?.click()}
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
            <input
              ref={inputCamera}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void enviarFotos(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void enviarFotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Antes e depois lado a lado: é a comparação que interessa olhar. */}
        <div className="grid grid-cols-2 gap-3">
          {(["antes", "depois"] as const).map((fase) => (
            <div key={fase} className="border rounded-md p-2">
              <p className="text-xs font-medium text-slate-600 mb-1 capitalize">{fase}</p>
              <Galeria
                imagens={imagensPorFase(fase)}
                onRemover={(imagemId) => deletarImagem.mutate({ imagemId })}
              />
            </div>
          ))}
        </div>

        {/* Durante e soltas só aparecem quando existem, para não poluir. */}
        {imagensPorFase("durante").length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Durante</p>
            <Galeria
              imagens={imagensPorFase("durante")}
              onRemover={(imagemId) => deletarImagem.mutate({ imagemId })}
            />
          </div>
        )}
        {outrasImagens.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Sem fase definida</p>
            <Galeria
              imagens={outrasImagens}
              onRemover={(imagemId) => deletarImagem.mutate({ imagemId })}
            />
          </div>
        )}
      </div>

      {/* Anexos */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Anexos</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={enviando}
            onClick={() => inputAnexo.current?.click()}
          >
            {enviando ? <Loader2 className="w-4 h-4" /> : "Anexar arquivo"}
          </Button>
          <input
            ref={inputAnexo}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void enviarAnexos(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {(anexos?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-400">Nenhum anexo.</p>
        ) : (
          <ul className="divide-y border rounded-md">
            {anexos!.map((anexo) => (
              <li key={anexo.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate hover:underline"
                >
                  {anexo.nome ?? anexo.url}
                </a>
                <button
                  onClick={() => deletarAnexo.mutate({ anexoId: anexo.id })}
                  aria-label="Remover anexo"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Avaliação */}
      <div className="border rounded-lg p-3 space-y-2">
        <span className="text-sm font-medium">Avaliação do serviço</span>
        {os.avaliacaoNota ? (
          <div>
            <p className="text-amber-500 text-lg leading-none">
              {"★".repeat(os.avaliacaoNota)}
              {"☆".repeat(5 - os.avaliacaoNota)}
            </p>
            {os.avaliacaoComentario && (
              <p className="text-xs text-slate-600 mt-1">{os.avaliacaoComentario}</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNotaAvaliacao(n)}
                  aria-label={`${n} estrela(s)`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      n <= notaAvaliacao ? "text-amber-500 fill-amber-500" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Input
              placeholder="Comentário (opcional)"
              value={comentarioAvaliacao}
              onChange={(e) => setComentarioAvaliacao(e.target.value)}
            />
            <Button
              size="sm"
              disabled={notaAvaliacao === 0 || avaliar.isPending}
              onClick={() =>
                avaliar.mutate({
                  id: ordemServicoId,
                  nota: notaAvaliacao,
                  comentario: comentarioAvaliacao.trim() || undefined,
                })
              }
            >
              Avaliar
            </Button>
          </>
        )}
      </div>

      {/* Histórico e comentários */}
      <div className="border rounded-lg p-3 space-y-2">
        <span className="text-sm font-medium">Histórico</span>
        <div className="flex gap-2">
          <Textarea
            rows={2}
            placeholder="Adicionar um comentário..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <Button
            size="sm"
            disabled={comentario.trim().length === 0 || addComentario.isPending}
            onClick={() => addComentario.mutate({ ordemServicoId, descricao: comentario.trim() })}
          >
            Enviar
          </Button>
        </div>
        {(os.timeline?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-400">Sem eventos registrados.</p>
        ) : (
          <ul className="space-y-2">
            {os.timeline.map((evento) => (
              <li key={evento.id} className="text-xs border-l-2 border-slate-200 pl-3">
                <p className="text-slate-700">{evento.descricao}</p>
                <p className="text-slate-400">
                  {formatarDataHora(evento.createdAt)}
                  {evento.usuarioNome ? ` · ${evento.usuarioNome}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default OsDetalhe;
