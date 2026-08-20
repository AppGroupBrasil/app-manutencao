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
import { useBootstrap } from "@/hooks/useBootstrap";
import { useVocabulario } from "@/hooks/useVocabulario";
import { FASE_FOTO, TOM_ANEXO, estiloEtiqueta } from "@/lib/coresRegistro";
import { prepareImageForUpload } from "@/lib/imageCompressor";
import { QRCodeSVG } from "qrcode.react";
import { MembrosDaEquipeEscolhida } from "@/components/MembrosDaEquipeEscolhida";
import {
  Calendar,
  CalendarClock,
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

/** O seletor não aceita valor vazio; esta é a opção "tirar a equipe". */
const SEM_EQUIPE = "nenhuma";


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

function formatarDia(dia?: string | null): string {
  if (!dia) return "—";
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/**
 * As duas datas da ordem e quem executa.
 *
 * Prazo máximo é o combinado com quem pediu; data programada é o dia em que a
 * equipe vai. Ficam juntas porque a pergunta de quem abre a O.S. é sempre a
 * mesma: "vence quando e vai ficar para quando?".
 */
function AgendaDaOs({
  os,
  condominioId,
  podeEditar,
  onFeito,
}: {
  os: {
    id: number;
    prazoLimite?: string | null;
    dataProgramada?: string | null;
    responsaveis?: { nome: string }[];
  };
  condominioId: number;
  podeEditar: boolean;
  onFeito: () => Promise<void> | void;
}) {
  const [data, setData] = useState(os.dataProgramada ?? "");
  const [equipe, setEquipe] = useState<number[]>([]);

  const { data: candidatos } = trpc.ordensServico.listarCandidatos.useQuery(
    { condominioId },
    { enabled: podeEditar },
  );

  const aoTerminar = async (mensagem: string) => {
    toast.success(mensagem);
    setEquipe([]);
    await onFeito();
  };

  const programar = trpc.ordensServico.programar.useMutation({
    onSuccess: () => aoTerminar("Serviço programado"),
    onError: (e) => toast.error(e.message),
  });
  const definirPrazo = trpc.ordensServico.definirPrazo.useMutation({
    onSuccess: () => aoTerminar("Data máxima atualizada"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <span className="text-sm font-medium">Datas e execução</span>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="font-medium">Prazo máximo:</span> {formatarDia(os.prazoLimite)}
          {/* Errar a data na abertura acontece; corrigir aqui evita apagar a
              O.S. e perder protocolo, fotos e histórico. */}
          {podeEditar && (
            <button
              type="button"
              className="text-blue-700 hover:underline"
              onClick={() => {
                const novo = window.prompt(
                  "Nova data máxima (dia/mês/ano):",
                  formatarDia(os.prazoLimite),
                );
                if (novo === null) return;
                const partes = novo.trim().split(/[/\-.]/);
                if (partes.length !== 3) {
                  toast.error("Escreva a data como 20/08/2026");
                  return;
                }
                const [d, m, a] = partes;
                const iso = `${a.padStart(4, "20")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
                if (Number.isNaN(new Date(`${iso}T12:00:00`).getTime())) {
                  toast.error("Data inválida");
                  return;
                }
                definirPrazo.mutate({ id: os.id, prazoLimite: iso });
              }}
            >
              corrigir
            </button>
          )}
        </span>
        <span>
          <span className="font-medium">Programado para:</span>{" "}
          {os.dataProgramada ? formatarDia(os.dataProgramada) : "ainda não programado"}
        </span>
        {(os.responsaveis?.length ?? 0) > 0 && (
          <span>
            <span className="font-medium">Executa:</span>{" "}
            {os.responsaveis!.map((r) => r.nome).join(", ")}
          </span>
        )}
      </div>

      {podeEditar && (
        <div className="border rounded-md p-2.5 space-y-2 bg-slate-50">
          <p className="text-xs font-medium text-slate-700">
            {os.dataProgramada ? "Reprogramar o serviço" : "Programar o serviço"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="h-9 w-[170px]"
            />
            <Button
              size="sm"
              disabled={!data || programar.isPending}
              onClick={() =>
                programar.mutate({
                  id: os.id,
                  dataProgramada: data,
                  responsaveisIds: equipe.length ? equipe : undefined,
                })
              }
            >
              {programar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CalendarClock className="w-4 h-4 mr-2" />
              )}
              {os.dataProgramada ? "Reprogramar" : "Programar"}
            </Button>
          </div>

          {(candidatos?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] text-slate-500 mb-1">
                Quem executa (quem não estiver marcado continua como está):
              </p>
              <div className="max-h-32 overflow-y-auto divide-y border rounded-md bg-white">
                {candidatos!.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={equipe.includes(c.id)}
                      onChange={() =>
                        setEquipe((atual) =>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Miolo da O.S. aberta: fotos por fase, anexos, responsáveis, comentários,
 * andamento e avaliação — as abas que o Manutenção X mostra ao abrir a O.S.
 */
export function OsDetalhe({
  ordemServicoId,
  condominioId,
  ehGestor = true,
}: {
  ordemServicoId: number;
  condominioId: number;
  /**
   * Verdadeiro no painel do gestor, falso no portal do funcionário.
   *
   * Decide o que é decisão de quem responde pela unidade: reabrir a ordem,
   * programar a data e designar a equipe. O servidor recusa o funcionário de
   * qualquer forma; aqui é só para não mostrar botão que vai dar erro.
   */
  ehGestor?: boolean;
}) {
  const utils = trpc.useUtils();
  const { temModulo, modulosIndefinidos } = useBootstrap();
  const v = useVocabulario();

  const {
    data: os,
    isLoading,
    error: erroOs,
  } = trpc.ordensServico.getById.useQuery({ id: ordemServicoId }, { retry: false });
  const { data: anexos } = trpc.ordensServico.listarAnexos.useQuery({ ordemServicoId });
  /**
   * Unidade da própria ordem, com a da tela só como ponto de partida.
   *
   * Quem chega por link direto — QR Code, item do calendário da rede — pode
   * abrir uma ordem de outra unidade; oferecer os funcionários e as equipes da
   * unidade ativa designaria gente que não trabalha lá.
   */
  const unidadeDaOs = os?.condominioId ?? condominioId;
  const { data: candidatos } = trpc.ordensServico.listarCandidatos.useQuery(
    { condominioId: unidadeDaOs },
    { enabled: unidadeDaOs > 0 },
  );

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

  // Mesmo endereço que o QR do PDF. É link público: quem lê o código no local
  // costuma não ter conta, e antes o celular parava na tela de login.
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const urlDaOs = os?.shareToken
    ? `${origem}/os/${os.shareToken}`
    : `${origem}/manutencoes/ordens-servico/${ordemServicoId}`;

  const uploadImagem = trpc.ordensServico.uploadImagem.useMutation();
  const uploadAnexo = trpc.ordensServico.uploadAnexo.useMutation();

  // Equipe designada e observações: gravam pela mesma rota de edição da O.S.
  const atualizarOs = trpc.ordensServico.update.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Não foi possível salvar"),
  });
  const { data: equipesDaUnidade } = trpc.equipes.list.useQuery(
    { condominioId: unidadeDaOs },
    { enabled: unidadeDaOs > 0 && !modulosIndefinidos && temModulo("equipes") },
  );
  /** A equipe que está com esta O.S.: mostra o time dela ou o contato da empresa. */
  const equipeDesignada = (equipesDaUnidade ?? []).find((e) => e.id === os?.equipeId);

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
        // Comprime antes de subir: a foto crua de celular passa de 5 MB e o
        // corpo da requisição para em 10 MB — a foto do "depois" sumia com erro
        // de rede justamente na hora de encerrar o serviço.
        const base64 = await prepareImageForUpload(arquivo, "quarterA4");
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
        {os.unidade?.nome && (
          <span>
            {v.unidade}: <span className="text-slate-700">{os.unidade.nome}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {os.endereco || "—"}
        </span>
        {/* Data informada por quem registrou; sem ela, a do próprio registro. */}
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />{" "}
          {os.dataAbertura ? formatarDia(os.dataAbertura) : formatarDataHora(os.createdAt)}
        </span>
        {os.solicitanteNome && <span>Aberta por {os.solicitanteNome}</span>}
        {os.prazoLimite && <span>Prazo: {formatarDia(os.prazoLimite)}</span>}
      </div>

      <p className="text-sm text-slate-600">{os.descricao || "Sem descrição inicial."}</p>

      {/* Equipe designada: mudar aqui avisa o supervisor da equipe nova. */}
      {temModulo("equipes") && (
        <div className="border rounded-lg p-3 space-y-1.5">
          <span className="text-sm font-medium">Equipe designada</span>
          <Select
            value={os.equipeId ? String(os.equipeId) : ""}
            disabled={!ehGestor || atualizarOs.isPending}
            onValueChange={(valor) =>
              atualizarOs.mutate({
                id: ordemServicoId,
                // Designação errada precisa ter volta, senão a ordem fica
                // pendurada numa equipe que não vai fazer o serviço.
                equipeId: valor === SEM_EQUIPE ? null : Number(valor),
                // Escolher uma equipe apaga o nome digitado à mão nas ordens
                // antigas — ela passa a ser quem responde. Tirar a designação
                // não apaga: seria descartar o histórico sem ninguém pedir.
                equipeExterna: valor === SEM_EQUIPE ? undefined : null,
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Nenhuma equipe designada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_EQUIPE}>Nenhuma equipe</SelectItem>
              {(equipesDaUnidade ?? []).map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nome}
                  {e.externa ? " (externa)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ordem antiga, aberta quando a empresa de fora era nome digitado.
              Fica à vista até alguém escolher uma equipe cadastrada. */}
          {!os.equipeId && os.equipeExterna && (
            <p className="text-xs text-slate-600">
              Serviço com <strong>{os.equipeExterna}</strong> (anotado antes de a empresa virar
              cadastro).
            </p>
          )}

          {/* Sem equipe atendendo a unidade, o seletor vazio parecia defeito:
              o gestor via o campo, nenhuma opção e nenhuma explicação. */}
          {(equipesDaUnidade?.length ?? 0) === 0 && (
            <p className="text-xs text-slate-500">
              Nenhuma equipe atende esta unidade ainda — cadastre pela engrenagem, em
              Funcionários, ou na aba Equipes.
            </p>
          )}

          {equipeDesignada ? (
            <MembrosDaEquipeEscolhida
              equipeId={equipeDesignada.id}
              externa={equipeDesignada.externa}
              email={equipeDesignada.email}
            />
          ) : (
            <p className="text-xs text-slate-500">
              {ehGestor
                ? "Ao designar, a equipe recebe o aviso e entra como responsável pela O.S."
                : "Quem designa a equipe é quem responde pela unidade."}
            </p>
          )}
        </div>
      )}

      {/* Observações adicionais: sai do campo e grava, como o resto da tela. */}
      <div className="border rounded-lg p-3 space-y-1.5">
        <span className="text-sm font-medium">Observações adicionais</span>
        <Textarea
          rows={2}
          defaultValue={os.observacoes ?? ""}
          placeholder="Acesso, horário, contato no local..."
          onBlur={(e) => {
            const valor = e.target.value.trim();
            if (valor === (os.observacoes ?? "")) return;
            atualizarOs.mutate({ id: ordemServicoId, observacoes: valor || null });
          }}
        />
      </div>

      <AgendaDaOs
        os={os}
        condominioId={condominioId}
        podeEditar={ehGestor}
        onFeito={recarregar}
      />

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
        {os.dataFim && ehGestor && (
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
            {/* A cor do seletor é a da fase escolhida: âmbar em "Antes", azul
                em "Durante", verde em "Depois". É o recado de que existem as
                outras — sem isso, quase tudo era anexado em "Antes". */}
            <Select value={faseFoto} onValueChange={(v) => setFaseFoto(v as typeof faseFoto)}>
              <SelectTrigger
                className="h-8 w-28 text-xs font-semibold border"
                style={estiloEtiqueta(FASE_FOTO[faseFoto])}
              >
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
            {/* Anexar tem cor própria, a mesma em todas as funções. */}
            <Button
              variant="outline"
              size="sm"
              className="border"
              style={estiloEtiqueta(TOM_ANEXO)}
              disabled={enviando}
              onClick={() => inputCamera.current?.click()}
              aria-label="Tirar foto agora"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border"
              style={estiloEtiqueta(TOM_ANEXO)}
              disabled={enviando}
              onClick={() => inputFoto.current?.click()}
              aria-label="Escolher foto do aparelho"
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
            className="border font-medium"
            style={estiloEtiqueta(TOM_ANEXO)}
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
