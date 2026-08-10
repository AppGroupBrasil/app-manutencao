import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { BotaoCompartilhar } from "@/components/CompartilharWhatsapp";
import { BotaoQrCode } from "@/components/BotaoQrCode";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ImagePlus, Loader2, MapPin, Printer, Search, Wrench, X } from "lucide-react";

type CoreSection = "checklists" | "manutencoes" | "ocorrencias" | "vistorias";

type RegistroItem = {
  id: number;
  protocolo: string;
  titulo: string;
  descricao?: string | null;
  status?: string | null;
  prioridade?: string | null;
  localizacao?: string | null;
  createdAt?: string | Date | null;
  /** Fotos anexadas; vêm de `listWithDetails`. */
  imagens?: { id: number; url: string }[];
  /** Token do link público, usado no QR. */
  shareToken?: string | null;
};

interface CoreModulesPanelProps {
  section: CoreSection;
  condominioId: number;
  /** Vem da permissão do funcionário: sem isto, a tela é só de leitura. */
  podeCriar?: boolean;
}

interface SectionLayoutProps {
  section: CoreSection;
  title: string;
  description: string;
  accentClass: string;
  records: RegistroItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  rememberTitleEnabled?: boolean;
  rememberTitleChecked?: boolean;
  onRememberTitleChange?: (checked: boolean) => void;
  titleSuggestions?: string[];
  onSubmit: (values: FormValues) => Promise<void>;
  /** Falso esconde o formulário e deixa apenas a lista. */
  podeCriar?: boolean;
  /** Unidade ativa: alimenta o compartilhamento com a equipe. */
  condominioId?: number;
  /** Gera o relatório do registro; sem isto o botão não aparece. */
  onBaixarPdf?: (id: number) => void;
  baixandoPdf?: boolean;
  /** Marca o registro como finalizado. */
  onFinalizar?: (id: number) => void;
  finalizando?: boolean;
}

interface FormValues {
  titulo: string;
  descricao: string;
  localizacao: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  /** URLs já enviadas ao storage; vinculadas ao registro depois de criado. */
  imagens: string[];
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

/** Status que já contam como encerrados: não faz sentido finalizar de novo. */
const ESTADOS_CONCLUIDOS = ["finalizada", "realizada", "concluida", "resolvida"];

/** O tipo como a rota pública o conhece. */
const TIPO_PUBLICO: Record<CoreSection, string> = {
  checklists: "checklist",
  manutencoes: "manutencao",
  ocorrencias: "ocorrencia",
  vistorias: "vistoria",
};

/** Texto do compartilhamento, no mesmo formato usado na ordem de serviço. */
function mensagemDoRegistro(section: CoreSection, item: RegistroItem): string {
  return [
    `*${SECTION_META[section].title}*`,
    `*Protocolo:* ${item.protocolo}`,
    `*Título:* ${item.titulo}`,
    item.status ? `*Status:* ${item.status}` : "",
    item.prioridade ? `*Prioridade:* ${item.prioridade}` : "",
    item.localizacao ? `*Local:* ${item.localizacao}` : "",
    item.descricao ? `\n${item.descricao}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SECTION_META: Record<CoreSection, { title: string; description: string; accentClass: string }> = {
  checklists: {
    title: "Checklists",
    description: "Registre verificações rápidas e acompanhe os protocolos gerados.",
    accentClass: "bg-emerald-500",
  },
  manutencoes: {
    title: "Manutenções",
    description: "Abra chamados de manutenção e acompanhe a fila operacional.",
    accentClass: "bg-blue-500",
  },
  ocorrencias: {
    title: "Ocorrências",
    description: "Cadastre incidentes com prioridade e localização.",
    accentClass: "bg-orange-500",
  },
  vistorias: {
    title: "Vistorias",
    description: "Lance inspeções operacionais com protocolo imediato.",
    accentClass: "bg-violet-500",
  },
};

function formatDate(value?: string | Date | null) {
  if (!value) return "Agora";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Agora" : date.toLocaleString("pt-BR");
}

function statusVariant(status?: string | null) {
  switch (status) {
    case "finalizada":
    case "realizada":
      return "default" as const;
    case "urgente":
    case "reaberta":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

/**
 * O registro nasce sem imagem: elas já estão no storage, mas só podem ser
 * vinculadas depois que existe id. Falha aqui não desfaz o registro.
 */
async function vincularImagens(imagens: string[], anexar: (url: string) => Promise<unknown>) {
  for (const url of imagens) {
    await anexar(url).catch(() => toast.error("Uma das imagens não pôde ser vinculada"));
  }
}

function SectionLayout({
  podeCriar = true,
  section,
  title,
  description,
  accentClass,
  records,
  isLoading,
  isSubmitting,
  rememberTitleEnabled,
  rememberTitleChecked,
  onRememberTitleChange,
  titleSuggestions,
  onSubmit,
  condominioId,
  onBaixarPdf,
  baixandoPdf,
  onFinalizar,
  finalizando,
}: Readonly<SectionLayoutProps>) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [prioridade, setPrioridade] = useState<FormValues["prioridade"]>("media");
  const [imagens, setImagens] = useState<string[]>([]);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const enviarImagem = trpc.upload.image.useMutation();

  async function anexarImagens(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setEnviandoImagem(true);
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
          folder: section,
        });
        urls.push(url);
      }
      setImagens((atual) => [...atual, ...urls]);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Erro ao enviar a imagem");
    } finally {
      setEnviandoImagem(false);
    }
  }

  const total = records.length;
  const pendentes = useMemo(
    () => records.filter((item) => !item.status || !["finalizada", "realizada"].includes(item.status)).length,
    [records],
  );

  const titleListId = `${section}-titulo-sugestoes`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = titulo.trim();

    if (!trimmedTitle) {
      toast.error("Informe um título para continuar.");
      return;
    }

    await onSubmit({
      titulo: trimmedTitle,
      descricao: descricao.trim(),
      localizacao: localizacao.trim(),
      prioridade,
      imagens,
    });

    setTitulo("");
    setDescricao("");
    setLocalizacao("");
    setPrioridade("media");
    setImagens([]);
  }

  let recordsContent = (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
      Nenhum registro ainda. Use o formulário ao lado para criar o primeiro.
    </div>
  );

  if (isLoading) {
    recordsContent = (
      <div className="flex min-h-40 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando registros...
      </div>
    );
  } else if (records.length > 0) {
    recordsContent = (
      <>
        {records.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.titulo}</p>
                <p className="mt-1 text-sm text-slate-500">Protocolo #{item.protocolo}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={statusVariant(item.status)}>{item.status || "pendente"}</Badge>
                {item.prioridade ? <Badge variant={statusVariant(item.prioridade)}>{item.prioridade}</Badge> : null}
              </div>
            </div>
            {item.descricao ? <p className="mt-3 text-sm text-slate-600">{item.descricao}</p> : null}

            {/* Fotos anexadas: sem isto, quem anexou não via o que mandou. */}
            {item.imagens && item.imagens.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.imagens.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                    <img
                      src={img.url}
                      alt=""
                      className="h-16 w-16 rounded border object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>{formatDate(item.createdAt)}</span>
              {item.localizacao ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.localizacao}
                </span>
              ) : null}
            </div>

            {/* Mesmas ações da ordem de serviço: finalizar, relatório, QR e
                compartilhamento. */}
            {(onBaixarPdf || condominioId || onFinalizar) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                {onFinalizar && !ESTADOS_CONCLUIDOS.includes(item.status ?? "") && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={finalizando}
                    onClick={() => onFinalizar(item.id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finalizar
                  </Button>
                )}
                {item.shareToken ? (
                  <BotaoQrCode
                    titulo={item.titulo}
                    url={`${typeof window !== "undefined" ? window.location.origin : ""}/registro/${TIPO_PUBLICO[section]}/${item.shareToken}`}
                  />
                ) : null}
                {onBaixarPdf && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={baixandoPdf}
                    onClick={() => onBaixarPdf(item.id)}
                  >
                    {baixandoPdf ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="mr-2 h-4 w-4" />
                    )}
                    PDF
                  </Button>
                )}
                {condominioId ? (
                  <BotaoCompartilhar
                    condominioId={condominioId}
                    mensagem={mensagemDoRegistro(section, item)}
                    rotulo="Compartilhar"
                  />
                ) : null}
              </div>
            )}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Registros</p>
              <p className="text-3xl font-semibold text-slate-900">{total}</p>
            </div>
            <div className={`h-11 w-11 rounded-2xl ${accentClass}`} />
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Pendentes</p>
            <p className="text-3xl font-semibold text-slate-900">{pendentes}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Fluxo</p>
            <p className="text-base font-medium text-slate-800">Cadastro e acompanhamento no mesmo painel</p>
          </CardContent>
        </Card>
      </div>

      <div
        className={`grid gap-6 ${podeCriar ? "xl:grid-cols-[420px_minmax(0,1fr)]" : "xl:grid-cols-1"}`}
      >
        {podeCriar && (
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor={`${title}-titulo`}>Título</Label>
                <Input
                  id={`${title}-titulo`}
                  list={titleSuggestions?.length ? titleListId : undefined}
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  placeholder={`Novo registro de ${title.toLowerCase()}`}
                />
                {titleSuggestions?.length ? (
                  <datalist id={titleListId}>
                    {titleSuggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                ) : null}
                {rememberTitleEnabled ? (
                  <label className="flex items-center gap-2 text-xs text-slate-400 select-none">
                    <input
                      checked={rememberTitleChecked}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                      onChange={(event) => onRememberTitleChange?.(event.target.checked)}
                      type="checkbox"
                    />
                    Lembrar este título para próximas checagens
                  </label>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${title}-descricao`}>Descrição</Label>
                <Textarea
                  id={`${title}-descricao`}
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Descreva o que precisa ser registrado"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${title}-localizacao`}>Localização</Label>
                <Input
                  id={`${title}-localizacao`}
                  value={localizacao}
                  onChange={(event) => setLocalizacao(event.target.value)}
                  placeholder="Bloco, torre, área comum, apartamento..."
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["baixa", "media", "alta", "urgente"] as const).map((nivel) => (
                    <Button
                      key={nivel}
                      type="button"
                      variant={prioridade === nivel ? "default" : "outline"}
                      className="capitalize"
                      onClick={() => setPrioridade(nivel)}
                    >
                      {nivel}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagens</Label>
                <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(event) => {
                      void anexarImagens(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  {enviandoImagem ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-2 h-4 w-4" /> Anexar imagens
                    </>
                  )}
                </label>
                {imagens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {imagens.map((url) => (
                      <div key={url} className="relative">
                        <img src={url} alt="" className="h-14 w-14 rounded border object-cover" />
                        <button
                          type="button"
                          className="absolute -right-1.5 -top-1.5 rounded-full border bg-white p-0.5"
                          onClick={() => setImagens((atual) => atual.filter((i) => i !== url))}
                          aria-label="Remover imagem"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button className="w-full" disabled={isSubmitting || enviandoImagem} type="submit">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar registro
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        <Card className="border-0 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Últimos registros</CardTitle>
            <CardDescription>Lista operacional com protocolo, status e localização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">{recordsContent}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChecklistSection({ condominioId, podeCriar }: Readonly<{ condominioId: number; podeCriar: boolean }>) {
  const utils = trpc.useUtils();
  // `listWithDetails` traz as fotos junto: sem elas o cartão não mostra o que
  // foi anexado.
  const { data, isLoading } = trpc.checklist.listWithDetails.useQuery({ condominioId });
  // O servidor devolve só o base64; o nome do arquivo é montado aqui.
  const gerarPdf = trpc.checklist.generatePdf.useMutation({
    onError: (error) => toast.error(error.message || "Erro ao gerar o PDF"),
  });
  const finalizar = trpc.checklist.update.useMutation({
    onSuccess: async () => {
      await utils.checklist.listWithDetails.invalidate({ condominioId });
      toast.success("Registro finalizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao finalizar"),
  });
  const storageKey = `checklist_saved_titles_${condominioId}`;
  const [rememberTitle, setRememberTitle] = useState(false);
  const [savedTitles, setSavedTitles] = useState<string[]>(() => {
    if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
      return [];
    }

    const stored = globalThis.localStorage.getItem(storageKey);

    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  });
  const createMutation = trpc.checklist.create.useMutation({
    onSuccess: async () => {
      await utils.checklist.list.invalidate({ condominioId });
      toast.success("Checklist criado com sucesso.");
    },
    onError: (error) => toast.error(error.message),
  });

  const titleSuggestions = useMemo(() => {
    const recordTitles = (data || []).map((item) => item.titulo).filter((item): item is string => Boolean(item));
    return Array.from(new Set([...savedTitles, ...recordTitles])).slice(0, 12);
  }, [data, savedTitles]);

  return (
    <SectionLayout
      podeCriar={podeCriar}
      section="checklists"
      title={SECTION_META.checklists.title}
      description={SECTION_META.checklists.description}
      accentClass={SECTION_META.checklists.accentClass}
      records={(data || []) as RegistroItem[]}
      isLoading={isLoading}
      condominioId={condominioId}
      onBaixarPdf={async (id) => {
        const res = await gerarPdf.mutateAsync({ id });
        baixarPdfBase64(res.pdf, `checklists-${id}.pdf`);
      }}
      baixandoPdf={gerarPdf.isPending}
      onFinalizar={(id) => finalizar.mutate({ id, status: "finalizada" })}
      finalizando={finalizar.isPending}
      isSubmitting={createMutation.isPending}
      rememberTitleEnabled
      rememberTitleChecked={rememberTitle}
      onRememberTitleChange={setRememberTitle}
      titleSuggestions={titleSuggestions}
      onSubmit={async (values) => {
        const { imagens: _imagensChecklist, ...dados } = values;
        await createMutation.mutateAsync({ condominioId, ...dados });

        if (rememberTitle) {
          const normalizedTitle = values.titulo.trim();
          const updatedTitles = Array.from(new Set([normalizedTitle, ...savedTitles])).slice(0, 12);
          setSavedTitles(updatedTitles);

          if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
            globalThis.localStorage.setItem(storageKey, JSON.stringify(updatedTitles));
          }

          setRememberTitle(false);
        }
      }}
    />
  );
}

function ManutencaoSection({ condominioId, podeCriar }: Readonly<{ condominioId: number; podeCriar: boolean }>) {
  const utils = trpc.useUtils();
  // `listWithDetails` traz as fotos junto: sem elas o cartão não mostra o que
  // foi anexado.
  const { data, isLoading } = trpc.manutencao.listWithDetails.useQuery({ condominioId });
  // O servidor devolve só o base64; o nome do arquivo é montado aqui.
  const gerarPdf = trpc.manutencao.generatePdf.useMutation({
    onError: (error) => toast.error(error.message || "Erro ao gerar o PDF"),
  });
  const finalizar = trpc.manutencao.update.useMutation({
    onSuccess: async () => {
      await utils.manutencao.listWithDetails.invalidate({ condominioId });
      toast.success("Registro finalizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao finalizar"),
  });
  const addImagemManutencao = trpc.manutencao.addImagem.useMutation();
  const createMutation = trpc.manutencao.create.useMutation({
    onSuccess: async () => {
      await utils.manutencao.list.invalidate({ condominioId });
      toast.success("Manutenção criada com sucesso.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <SectionLayout
      podeCriar={podeCriar}
      section="manutencoes"
      title={SECTION_META.manutencoes.title}
      description={SECTION_META.manutencoes.description}
      accentClass={SECTION_META.manutencoes.accentClass}
      records={(data || []) as RegistroItem[]}
      isLoading={isLoading}
      condominioId={condominioId}
      onBaixarPdf={async (id) => {
        const res = await gerarPdf.mutateAsync({ id });
        baixarPdfBase64(res.pdf, `manutencoes-${id}.pdf`);
      }}
      baixandoPdf={gerarPdf.isPending}
      onFinalizar={(id) => finalizar.mutate({ id, status: "finalizada" })}
      finalizando={finalizar.isPending}
      isSubmitting={createMutation.isPending}
      onSubmit={async (values) => {
        const { imagens, ...dados } = values;
        const criada = await createMutation.mutateAsync({ condominioId, tipo: "corretiva", ...dados });
        await vincularImagens(imagens, (url) => addImagemManutencao.mutateAsync({ manutencaoId: criada.id, url }));
      }}
    />
  );
}

function OcorrenciaSection({ condominioId, podeCriar }: Readonly<{ condominioId: number; podeCriar: boolean }>) {
  const utils = trpc.useUtils();
  // `listWithDetails` traz as fotos junto: sem elas o cartão não mostra o que
  // foi anexado.
  const { data, isLoading } = trpc.ocorrencia.listWithDetails.useQuery({ condominioId });
  // O servidor devolve só o base64; o nome do arquivo é montado aqui.
  const gerarPdf = trpc.ocorrencia.generatePdf.useMutation({
    onError: (error) => toast.error(error.message || "Erro ao gerar o PDF"),
  });
  const finalizar = trpc.ocorrencia.update.useMutation({
    onSuccess: async () => {
      await utils.ocorrencia.listWithDetails.invalidate({ condominioId });
      toast.success("Registro finalizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao finalizar"),
  });
  const addImagem = trpc.ocorrencia.addImagem.useMutation();
  const createMutation = trpc.ocorrencia.create.useMutation({
    onSuccess: async () => {
      await utils.ocorrencia.list.invalidate({ condominioId });
      toast.success("Ocorrência criada com sucesso.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <SectionLayout
      podeCriar={podeCriar}
      section="ocorrencias"
      title={SECTION_META.ocorrencias.title}
      description={SECTION_META.ocorrencias.description}
      accentClass={SECTION_META.ocorrencias.accentClass}
      records={(data || []) as RegistroItem[]}
      isLoading={isLoading}
      condominioId={condominioId}
      onBaixarPdf={async (id) => {
        const res = await gerarPdf.mutateAsync({ id });
        baixarPdfBase64(res.pdf, `ocorrencias-${id}.pdf`);
      }}
      baixandoPdf={gerarPdf.isPending}
      onFinalizar={(id) => finalizar.mutate({ id, status: "finalizada" })}
      finalizando={finalizar.isPending}
      isSubmitting={createMutation.isPending}
      onSubmit={async (values) => {
        const { imagens, ...dados } = values;
        const criada = await createMutation.mutateAsync({
          condominioId,
          categoria: "outros",
          ...dados,
        });
        await vincularImagens(imagens, (url) =>
          addImagem.mutateAsync({ ocorrenciaId: criada.id, url }),
        );
      }}
    />
  );
}

function VistoriaSection({ condominioId, podeCriar }: Readonly<{ condominioId: number; podeCriar: boolean }>) {
  const utils = trpc.useUtils();
  // `listWithDetails` traz as fotos junto: sem elas o cartão não mostra o que
  // foi anexado.
  const { data, isLoading } = trpc.vistoria.listWithDetails.useQuery({ condominioId });
  // O servidor devolve só o base64; o nome do arquivo é montado aqui.
  const gerarPdf = trpc.vistoria.generatePdf.useMutation({
    onError: (error) => toast.error(error.message || "Erro ao gerar o PDF"),
  });
  const finalizar = trpc.vistoria.update.useMutation({
    onSuccess: async () => {
      await utils.vistoria.listWithDetails.invalidate({ condominioId });
      toast.success("Registro finalizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao finalizar"),
  });
  const addImagemVistoria = trpc.vistoria.addImagem.useMutation();
  const createMutation = trpc.vistoria.create.useMutation({
    onSuccess: async () => {
      await utils.vistoria.list.invalidate({ condominioId });
      toast.success("Vistoria criada com sucesso.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <SectionLayout
      podeCriar={podeCriar}
      section="vistorias"
      title={SECTION_META.vistorias.title}
      description={SECTION_META.vistorias.description}
      accentClass={SECTION_META.vistorias.accentClass}
      records={(data || []) as RegistroItem[]}
      isLoading={isLoading}
      condominioId={condominioId}
      onBaixarPdf={async (id) => {
        const res = await gerarPdf.mutateAsync({ id });
        baixarPdfBase64(res.pdf, `vistorias-${id}.pdf`);
      }}
      baixandoPdf={gerarPdf.isPending}
      onFinalizar={(id) => finalizar.mutate({ id, status: "finalizada" })}
      finalizando={finalizar.isPending}
      isSubmitting={createMutation.isPending}
      onSubmit={async (values) => {
        const { imagens, ...dados } = values;
        const criada = await createMutation.mutateAsync({ condominioId, tipo: "rotina", ...dados });
        await vincularImagens(imagens, (url) => addImagemVistoria.mutateAsync({ vistoriaId: criada.id, url }));
      }}
    />
  );
}

export function CoreModulesPanel({
  section,
  condominioId,
  podeCriar = true,
}: Readonly<CoreModulesPanelProps>) {
  if (section === "checklists")
    return <ChecklistSection condominioId={condominioId} podeCriar={podeCriar} />;
  if (section === "manutencoes")
    return <ManutencaoSection condominioId={condominioId} podeCriar={podeCriar} />;
  if (section === "ocorrencias")
    return <OcorrenciaSection condominioId={condominioId} podeCriar={podeCriar} />;
  if (section === "vistorias")
    return <VistoriaSection condominioId={condominioId} podeCriar={podeCriar} />;

  return (
    <Card className="border-0 bg-white/90 shadow-sm">
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <AlertTriangle className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Módulo indisponível</h3>
        <p className="max-w-md text-sm text-slate-500">Esta seção foi removida do dashboard até que exista uma implementação operacional nova.</p>
      </CardContent>
    </Card>
  );
}

export const CORE_MODULE_ICONS = {
  checklists: ClipboardCheck,
  manutencoes: Wrench,
  ocorrencias: AlertTriangle,
  vistorias: Search,
};