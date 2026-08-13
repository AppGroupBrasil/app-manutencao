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
import { OsDetalhe } from "@/components/OsDetalhe";
import { GerenciarEquipes } from "@/components/GerenciarEquipes";
import { CadastroRapidoFuncionario } from "@/components/CadastroRapidoFuncionario";
import { BotaoCompartilhar } from "@/components/CompartilharWhatsapp";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useVocabulario } from "@/hooks/useVocabulario";
import { FASE_FOTO, TOM_ANEXO, estiloEtiqueta } from "@/lib/coresRegistro";
import { prepareImageForUpload } from "@/lib/imageCompressor";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Settings,
  Hash,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  Share2,
  Trash2,
  UserCircle,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TENANT_ATIVO_KEY = "condominio_ativo";
const POR_PAGINA = 15;

/** Mesma leitura do Manutenção X: data e hora curtas, em pt-BR. */
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

/** Badge colorida pelo próprio cadastro do tenant (status e prioridade têm cor). */
function Etiqueta({ texto, cor }: { texto?: string | null; cor?: string | null }) {
  if (!texto) return null;
  const base = cor || "#6B7280";
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
      style={{ color: base, borderColor: `${base}55`, backgroundColor: `${base}14` }}
    >
      {texto}
    </span>
  );
}

/**
 * Um lado do "antes e depois" na abertura da O.S.
 *
 * Dois botões: a câmera, para quem está no local, e a galeria, para quem já
 * fotografou. A cor é a mesma de anexar em todo o sistema; o rótulo carrega a
 * cor da fase, igual ao seletor de dentro da ordem.
 */
function LadoDaFoto({
  fase,
  fotos,
  onEscolher,
  onRemover,
}: {
  fase: "antes" | "depois";
  fotos: { chave: string; previa: string }[];
  onEscolher: (arquivos: FileList | null) => void;
  onRemover: (chave: string) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const tom = FASE_FOTO[fase];

  return (
    <div className="border rounded-md p-3">
      {/* Uma linha por fase, ocupando a largura toda: a etiqueta fixa à
          esquerda e os dois botões dividindo o resto. Espremido em duas
          colunas, sobravam 118px por lado e o dedo não acertava. */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0"
          style={estiloEtiqueta(tom)}
        >
          {tom.rotulo}
        </span>
        <div className="flex gap-2 flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border h-10 flex-1"
            style={estiloEtiqueta(TOM_ANEXO)}
            onClick={() => camera.current?.click()}
            aria-label={`Tirar foto de ${tom.rotulo.toLowerCase()}`}
          >
            <Camera className="w-4 h-4 mr-1.5" /> Câmera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border h-10 flex-1"
            style={estiloEtiqueta(TOM_ANEXO)}
            onClick={() => galeria.current?.click()}
            aria-label={`Escolher foto de ${tom.rotulo.toLowerCase()} do aparelho`}
          >
            <ImagePlus className="w-4 h-4 mr-1.5" /> Galeria
          </Button>
        </div>
      </div>

      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onEscolher(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onEscolher(e.target.files);
          e.target.value = "";
        }}
      />

      {fotos.length === 0 ? (
        <p className="text-xs text-slate-400 mt-2">Nenhuma foto.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          {fotos.map((f) => (
            <div key={f.chave} className="relative">
              <img src={f.previa} alt="" className="w-16 h-16 object-cover rounded border" />
              <button
                type="button"
                className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                onClick={() => onRemover(f.chave)}
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
}

/** Hoje em `AAAA-MM-DD`, no fuso de quem está usando. */
function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Dia em `AAAA-MM-DD` como o brasileiro lê. */
function formatarDia(dia?: string | null): string {
  if (!dia) return "—";
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/** Quanto falta para a data máxima — ou quanto já passou dela. */
function textoDoPrazo(prazo: string, encerrada: boolean): { texto: string; classe: string } {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const alvo = new Date(`${prazo}T12:00:00`);
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);

  if (encerrada) return { texto: `prazo era ${formatarDia(prazo)}`, classe: "text-slate-500" };
  if (dias < 0) return { texto: `${Math.abs(dias)} dia(s) além do prazo`, classe: "text-red-600 font-medium" };
  if (dias === 0) return { texto: "prazo é hoje", classe: "text-amber-700 font-medium" };
  return { texto: `prazo em ${dias} dia(s)`, classe: "text-slate-500" };
}

const FORM_VAZIO = {
  titulo: "",
  descricao: "",
  categoriaId: "",
  prioridadeId: "",
  statusId: "",
  setorId: "",
  endereco: "",
  /** Quem pediu o serviço. Em branco, fica quem está com a conta aberta. */
  solicitanteNome: "",
  /** Dia em que o chamado chegou; a tela abre com hoje. */
  dataAbertura: "",
  /** Data máxima de finalização; obrigatória nas unidades com o fluxo. */
  prazoLimite: "",
  /** Equipe que fica com o serviço; o supervisor dela recebe o aviso. */
  equipeId: "",
  observacoes: "",
};

/** Página do gestor: resolve a unidade pela sessão e entrega o conteúdo. */
export default function OrdensServico({ osInicial }: { osInicial?: number }) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error('Sessão expirada. Faça login novamente.');
      setLocation('/login');
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
    <ConteudoOrdensServico
      condominioId={organizacaoAtiva?.id ?? 0}
      osInicial={osInicial}
      unidades={organizacoes ?? []}
      organizacao={
        organizacaoAtiva
          ? {
              nome: organizacaoAtiva.nome,
              autoNotificar: !!organizacaoAtiva.osAutoNotificar,
            }
          : undefined
      }
      onVoltar={() => setLocation('/admin/manutencoes')}
    />
  );
}

/**
 * Conteúdo reaproveitado pelo portal do funcionário, que já recebe a unidade.
 *
 * `organizacao` só chega pelo gestor: é o que libera o bloco de configuração de
 * avisos, que é decisão da unidade e não do funcionário.
 */
export function ConteudoOrdensServico({
  condominioId,
  osInicial,
  organizacao,
  unidades,
  onVoltar,
  podeCriar = true,
  podeExcluir = true,
  ehGestor = true,
}: {
  condominioId: number;
  osInicial?: number;
  organizacao?: { nome: string; autoNotificar: boolean };
  /**
   * Unidades que esta pessoa alcança. Com mais de uma, a abertura da O.S.
   * pergunta para qual delas vai — é o caso do gerente da rede. Gestor de
   * unidade e funcionário recebem uma só (ou nenhuma) e ficam presos a ela.
   */
  unidades?: { id: number; nome: string }[];
  onVoltar?: () => void;
  podeCriar?: boolean;
  /** Excluir e permissao a parte: o gestor libera por funcionario. */
  podeExcluir?: boolean;
  /** Falso no portal do funcionário: esconde o que é decisão do gestor. */
  ehGestor?: boolean;
}) {
  const utils = trpc.useUtils();
  const v = useVocabulario();
  const { temModulo, modulosIndefinidos } = useBootstrap();
  const habilitado = condominioId > 0;

  /**
   * Unidade para onde a O.S. nova vai.
   *
   * Só o gerente escolhe; para os demais é sempre a unidade da sessão. Fica em
   * estado próprio porque categoria, prioridade, status, equipe e responsáveis
   * são cadastros DA UNIDADE: escolher uma unidade e gravar com o status de
   * outra criaria ordem apontando para registro alheio.
   */
  const podeEscolherUnidade = (unidades?.length ?? 0) > 1;
  const [unidadeNova, setUnidadeNova] = useState(condominioId);
  useEffect(() => setUnidadeNova(condominioId), [condominioId]);
  // O Manutenção X carrega a lista inteira e filtra/pagina no cliente. Manter
  // isso preserva o comportamento das abas e do gráfico, que somam tudo.
  const { data: lista, isLoading: carregandoLista } = trpc.ordensServico.list.useQuery(
    { condominioId, limit: 500 },
    { enabled: habilitado },
  );
  // Filtro da lista: sempre a unidade da tela.
  const { data: statusList } = trpc.ordensServico.getStatus.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: candidatos } = trpc.ordensServico.listarCandidatos.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  // Cadastros do formulário: da unidade escolhida para a O.S. nova.
  const { data: statusNova } = trpc.ordensServico.getStatus.useQuery(
    { condominioId: unidadeNova },
    { enabled: unidadeNova > 0 },
  );
  const { data: prioridades } = trpc.ordensServico.getPrioridades.useQuery(
    { condominioId: unidadeNova },
    { enabled: unidadeNova > 0 },
  );
  const { data: categorias } = trpc.ordensServico.getCategorias.useQuery(
    { condominioId: unidadeNova },
    { enabled: unidadeNova > 0 },
  );
  const { data: candidatosNova } = trpc.ordensServico.listarCandidatos.useQuery(
    { condominioId: unidadeNova },
    { enabled: unidadeNova > 0 },
  );
  // Equipes da unidade: sem o módulo ligado a lista volta vazia e o campo some.
  const { data: equipesDaUnidade } = trpc.equipes.list.useQuery(
    { condominioId: unidadeNova },
    { enabled: unidadeNova > 0 && !modulosIndefinidos && temModulo("equipes") },
  );

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<number | "todos">("todos");
  const [pagina, setPagina] = useState(1);
  const [modalNova, setModalNova] = useState(false);
  /** Cadastro de equipes aberto por cima da O.S., pela engrenagem. */
  const [modalEquipes, setModalEquipes] = useState(false);
  /** Ficha rápida de funcionário, pela engrenagem dos responsáveis. */
  const [modalFuncionarios, setModalFuncionarios] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [responsaveisNova, setResponsaveisNova] = useState<number[]>([]);
  /**
   * Fotos escolhidas na abertura, antes de a O.S. existir.
   *
   * Ficam como arquivo na mão até haver id para vincular — o mesmo caminho dos
   * responsáveis. Sem isto, a foto do problema (o "antes") só entrava depois de
   * criar e reabrir a ordem, e quase nunca entrava.
   */
  const [fotosNovas, setFotosNovas] = useState<
    { chave: string; fase: "antes" | "depois"; arquivo: File; previa: string }[]
  >([]);
  // Vindo do QR Code, a O.S. já abre; depois disso o estado é do usuário.
  const [detalheId, setDetalheId] = useState<number | null>(
    Number.isFinite(osInicial) && osInicial ? osInicial : null,
  );

  const invalidar = async () => {
    await Promise.all([
      utils.ordensServico.list.invalidate(),
      detalheId !== null ? utils.ordensServico.getById.invalidate({ id: detalheId }) : null,
    ]);
  };

  const addResponsavel = trpc.ordensServico.addResponsavel.useMutation();
  const uploadImagem = trpc.ordensServico.uploadImagem.useMutation();

  /** Solta as prévias da memória; sem isto o navegador segura os arquivos. */
  const limparFotosNovas = () => {
    setFotosNovas((atual) => {
      atual.forEach((f) => URL.revokeObjectURL(f.previa));
      return [];
    });
  };

  const criar = trpc.ordensServico.create.useMutation({
    onSuccess: async (res) => {
      // Responsáveis são registros filhos: entram depois que a O.S. existe.
      for (const funcionarioId of responsaveisNova) {
        const pessoa = candidatosNova?.find((c) => c.id === funcionarioId);
        if (!pessoa) continue;
        await addResponsavel
          .mutateAsync({
            ordemServicoId: res.id,
            nome: pessoa.nome,
            cargo: pessoa.cargo ?? undefined,
            email: pessoa.email ?? undefined,
            telefone: pessoa.telefone ?? undefined,
            funcionarioId: pessoa.id,
          })
          .catch(() => toast.error(`Não foi possível vincular ${pessoa.nome}`));
      }

      // As fotos sobem com a fase que a pessoa escolheu. Falha aqui não desfaz
      // a O.S.: ela já existe, e a foto pode ser anexada de novo lá dentro.
      for (const foto of fotosNovas) {
        try {
          // Comprime antes de subir: foto de celular passa de 5 MB, e o corpo
          // da requisição para em 10 MB. É o mesmo preparo dos outros uploads.
          const base64 = await prepareImageForUpload(foto.arquivo, "quarterA4");
          await uploadImagem.mutateAsync({
            ordemServicoId: res.id,
            fileName: foto.arquivo.name,
            fileType: foto.arquivo.type,
            fileData: base64,
            tipo: foto.fase,
          });
        } catch {
          toast.error(`Não foi possível enviar a foto de ${foto.fase}`);
        }
      }

      setModalNova(false);
      setForm(FORM_VAZIO);
      setResponsaveisNova([]);
      limparFotosNovas();
      await invalidar();
      // Aberta em outra unidade não aparece nesta lista: dizer para onde foi
      // evita a pessoa procurar na tela errada.
      const destino = unidades?.find((u) => u.id === unidadeNova);
      toast.success(
        unidadeNova === condominioId || !destino
          ? `O.S. ${res.protocolo} criada`
          : `O.S. ${res.protocolo} criada em ${destino.nome}`,
      );
    },
    onError: (e) => toast.error(e.message || "Erro ao criar a O.S."),
  });

  const setAutoNotificar = trpc.ordensServico.setAutoNotificar.useMutation({
    onSuccess: () => utils.condominio.list.invalidate(),
    onError: (e) => toast.error(e.message || "Erro ao salvar a configuração"),
  });

  const setNotificarEmail = trpc.ordensServico.setNotificarEmail.useMutation({
    onSuccess: () => utils.ordensServico.listarCandidatos.invalidate({ condominioId }),
    onError: (e) => toast.error(e.message || "Erro ao salvar a preferência"),
  });

  const atualizar = trpc.ordensServico.update.useMutation({
    onSuccess: invalidar,
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  const excluir = trpc.ordensServico.delete.useMutation({
    onSuccess: async () => {
      setDetalheId(null);
      await invalidar();
      toast.success("O.S. excluída");
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir a O.S."),
  });

  const ordens = lista?.items ?? [];

  /** Texto do compartilhamento, o mesmo para WhatsApp e para copiar. */
  const mensagemDe = (os: (typeof ordens)[number]) => {
    const mensagem = [
      "*Ordem de Serviço*",
      `*Protocolo:* ${os.protocolo}`,
      `*Título:* ${os.titulo}`,
      os.categoria?.nome ? `*Categoria:* ${os.categoria.nome}` : "",
      os.prioridade?.nome ? `*Prioridade:* ${os.prioridade.nome}` : "",
      os.status?.nome ? `*Status:* ${os.status.nome}` : "",
      `*Local:* ${os.endereco || "N/A"}`,
      `*Abertura:* ${formatarDataHora(os.createdAt)}`,
    ]
      .filter(Boolean)
      .join("\n");
    return mensagem;
  };

  const filtradas = useMemo(() => {
    return ordens.filter((os) => {
      if (filtroStatus !== "todos" && os.statusId !== filtroStatus) return false;
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      const texto = [
        os.titulo,
        os.descricao,
        os.protocolo,
        os.endereco,
        os.categoria?.nome,
        os.prioridade?.nome,
        os.status?.nome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return termo.split(/\s+/).every((t) => texto.includes(t));
    });
  }, [ordens, filtroStatus, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroStatus]);

  const osDetalhe = ordens.find((os) => os.id === detalheId);
  const tituloDetalhe = osDetalhe
    ? `${osDetalhe.protocolo} — ${osDetalhe.titulo}`
    : "Ordem de Serviço";

  const dadosGrafico = useMemo(
    () =>
      (statusList ?? []).map((s) => ({
        status: s.nome,
        total: ordens.filter((os) => os.statusId === s.id).length,
      })),
    [statusList, ordens],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {onVoltar && (
            <Button variant="ghost" size="sm" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">{v.ordensServico}</h1>
            <p className="text-xs text-slate-500">
              {lista?.total ?? 0} ordens registradas
              {organizacao ? ` · ${organizacao.nome}` : ""}
            </p>
          </div>
          {podeCriar && (
            <Button
              size="sm"
              disabled={!habilitado}
              onClick={() => {
                // Abre com hoje preenchido: é o caso comum, e quem registra um
                // chamado antigo só troca a data.
                setForm((atual) => ({ ...atual, dataAbertura: atual.dataAbertura || hojeISO() }));
                setModalNova(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Nova O.S.
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9 pr-9"
            placeholder="Buscar por título, protocolo, local, categoria, prioridade..."
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

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors ${
              filtroStatus === "todos"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => setFiltroStatus("todos")}
          >
            Todas
          </button>
          {(statusList ?? []).map((s) => {
            const ativo = filtroStatus === s.id;
            return (
              <button
                key={s.id}
                className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors"
                style={
                  ativo
                    ? { background: s.cor ?? "#334155", color: "#fff", borderColor: s.cor ?? "#334155" }
                    : { color: s.cor ?? "#475569", borderColor: `${s.cor ?? "#94a3b8"}55` }
                }
                onClick={() => setFiltroStatus(s.id)}
              >
                {s.nome}
              </button>
            );
          })}
        </div>

        {carregandoLista ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Wrench className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="font-semibold text-slate-700 mt-3">Nenhuma ordem de serviço</p>
              <p className="text-sm text-slate-500">
                {busca ? "Nenhum resultado para a busca atual." : "Crie sua primeira ordem de serviço."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visiveis.map((os) => (
              <Card key={os.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-mono">#{os.id}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        <Hash className="w-3 h-3" /> {os.protocolo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Etiqueta texto={os.prioridade?.nome} cor={os.prioridade?.cor} />
                      <Etiqueta texto={os.status?.nome} cor={os.status?.cor} />
                    </div>
                  </div>

                  {os.responsavelPrincipalNome && (
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-medium">Responsável:</span> {os.responsavelPrincipalNome}
                    </p>
                  )}

                  <h4 className="font-semibold text-slate-800 mt-2">{os.titulo}</h4>
                  {os.descricao && (
                    <p className="text-sm text-slate-600 line-clamp-2">{os.descricao}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {os.endereco || "—"}
                    </span>
                    {/* Abertura: quando e por quem. É o que o cliente cobra
                        primeiro quando pergunta "de quando é esse chamado?". */}
                    {/* A data que vale é a que a pessoa informou; sem ela, a
                        do registro. */}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />{" "}
                      {os.dataAbertura ? formatarDia(os.dataAbertura) : formatarDataHora(os.createdAt)}
                    </span>
                    {os.solicitanteNome && (
                      <span className="inline-flex items-center gap-1">
                        <UserCircle className="w-3.5 h-3.5" /> {os.solicitanteNome}
                      </span>
                    )}
                    {os.equipe?.nome && (
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ color: os.equipe.cor ?? undefined }}
                      >
                        <Users className="w-3.5 h-3.5" /> {os.equipe.nome}
                      </span>
                    )}
                    {os.prazoLimite && (
                      <span className={textoDoPrazo(os.prazoLimite, !!os.dataFim).classe}>
                        {textoDoPrazo(os.prazoLimite, !!os.dataFim).texto}
                      </span>
                    )}
                    {os.categoria?.nome && <span>{os.categoria.nome}</span>}
                  </div>

                  {/* O dia marcado: sem ele a ordem aparece só pelo prazo, e
                      quem olha não sabe se já entrou na agenda de alguém. */}
                  {os.dataProgramada && (
                    <p className="text-xs text-slate-500 mt-2">
                      programada para {formatarDia(os.dataProgramada)}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Status:</span>
                      <Select
                        value={os.statusId ? String(os.statusId) : ""}
                        disabled={!podeCriar}
                        onValueChange={(v) =>
                          atualizar.mutate({ id: os.id, statusId: Number(v) })
                        }
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder="Definir" />
                        </SelectTrigger>
                        <SelectContent>
                          {(statusList ?? []).map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setDetalheId(os.id)}>
                      Abrir O.S.
                    </Button>
                    <BotaoCompartilhar
                      condominioId={condominioId}
                      mensagem={mensagemDe(os)}
                      rotulo="Compartilhar"
                    />
                    {podeExcluir && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Excluir a O.S. ${os.protocolo} — "${os.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
                            excluir.mutate({ id: os.id });
                          }
                        }}
                        aria-label={`Excluir O.S. ${os.protocolo}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  {filtradas.length} ordens · página {paginaAtual} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Resumo por Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>

      {/* Nova O.S. */}
      <Dialog
        open={modalNova}
        onOpenChange={(aberto) => {
          setModalNova(aberto);
          if (!aberto) limparFotosNovas();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Unidade de atendimento: quem cuida de várias precisa ver, antes
                de digitar qualquer coisa, para onde esta ordem vai. */}
            {podeEscolherUnidade ? (
              <div>
                <Label>{v.unidade} de atendimento</Label>
                <Select
                  value={String(unidadeNova)}
                  onValueChange={(valor) => {
                    setUnidadeNova(Number(valor));
                    // Categoria, prioridade, status e equipe são da unidade
                    // anterior: manter o que estava escolhido gravaria a ordem
                    // apontando para cadastro de outra unidade.
                    setForm((atual) => ({
                      ...atual,
                      categoriaId: "",
                      prioridadeId: "",
                      statusId: "",
                      equipeId: "",
                    }));
                    setResponsaveisNova([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades!.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              organizacao && (
                <div className="rounded-lg border bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">
                    {v.unidade} de atendimento
                  </span>
                  <p className="text-sm font-medium text-slate-800">{organizacao.nome}</p>
                </div>
              )
            )}
            {/* Quem pediu o serviço nem sempre é quem digita: o gerente abre
                pelo coordenador da unidade, o gestor abre pela cozinheira que
                avisou. Campo livre, porque não há cadastro para isso. */}
            <div>
              <Label>Responsável pela abertura</Label>
              <Input
                placeholder="Quem pediu o serviço"
                value={form.solicitanteNome}
                onChange={(e) => setForm({ ...form, solicitanteNome: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Em branco, fica registrado quem está com a conta aberta.
              </p>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Manutenção do elevador"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                placeholder="Descreva o problema detalhadamente..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de abertura do chamado</Label>
              <Input
                type="date"
                value={form.dataAbertura}
                onChange={(e) => setForm({ ...form, dataAbertura: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                O dia em que o pedido chegou — pode ser anterior ao de hoje.
              </p>
            </div>

            {/* Prazo: é ele que coloca a O.S. no calendário e cobra alguém. */}
            <div>
              <Label>Data máxima de finalização</Label>
              <Input
                type="date"
                value={form.prazoLimite}
                onChange={(e) => setForm({ ...form, prazoLimite: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                É esta data que coloca o serviço no calendário.
              </p>
            </div>

            {/* Equipe designada: marcar aqui já dispara o aviso ao supervisor,
                sem precisar reabrir a ordem depois. */}
            {temModulo("equipes") && (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label>Equipe designada</Label>
                  {/* Falta a equipe na lista? Resolve aqui, sem perder o que já
                      foi digitado nesta O.S. Só quem responde pela unidade
                      cadastra — o servidor recusa o funcionário de qualquer
                      forma. */}
                  {ehGestor && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-slate-500"
                      onClick={() => setModalEquipes(true)}
                      aria-label="Cadastrar equipes e membros"
                      title="Cadastrar equipes e membros"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Select
                  value={form.equipeId}
                  onValueChange={(valor) => setForm({ ...form, equipeId: valor })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Designar depois" />
                  </SelectTrigger>
                  <SelectContent>
                    {(equipesDaUnidade ?? []).map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(equipesDaUnidade?.length ?? 0) === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Nenhuma equipe cadastrada nesta {v.unidade.toLowerCase()} ainda.
                  </p>
                )}
                {form.equipeId && (
                  <p className="text-xs text-slate-500 mt-1">
                    O supervisor da equipe recebe o aviso com esta O.S.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.categoriaId}
                  onValueChange={(v) => setForm({ ...form, categoriaId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categorias ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridadeId}
                  onValueChange={(v) => setForm({ ...form, prioridadeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(prioridades ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status inicial</Label>
              <Select
                value={form.statusId}
                onValueChange={(v) => setForm({ ...form, statusId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Primeiro status" />
                </SelectTrigger>
                <SelectContent>
                  {(statusNova ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Local ocupa a linha inteira: "Bloco A, sala 3, atrás da caixa
                d'água" não cabe em meia tela, e é essa descrição que faz a
                equipe achar o serviço sem telefonar. */}
            <div>
              <Label>Local</Label>
              <Input
                placeholder="Ex: Bloco A - 3º andar, sala da caldeira"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </div>

            {/* Antes e depois já na abertura: quem está no local fotografa o
                problema agora, e o "depois" entra quando o serviço terminar —
                aqui ou dentro da própria ordem. */}
            <div className="border rounded-lg p-3 space-y-2">
              <span className="text-sm font-medium">Fotos de antes e depois</span>
              <p className="text-xs text-slate-500">
                A foto do problema é o “antes”. O “depois” pode entrar agora ou quando o serviço
                for concluído, abrindo a O.S.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {(["antes", "depois"] as const).map((fase) => (
                  <LadoDaFoto
                    key={fase}
                    fase={fase}
                    fotos={fotosNovas.filter((f) => f.fase === fase)}
                    onEscolher={(arquivos) => {
                      if (!arquivos || arquivos.length === 0) return;
                      const novas = Array.from(arquivos).map((arquivo) => ({
                        chave: `${fase}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        fase,
                        arquivo,
                        previa: URL.createObjectURL(arquivo),
                      }));
                      setFotosNovas((atual) => [...atual, ...novas]);
                    }}
                    onRemover={(chave) =>
                      setFotosNovas((atual) => {
                        const alvo = atual.find((f) => f.chave === chave);
                        if (alvo) URL.revokeObjectURL(alvo.previa);
                        return atual.filter((f) => f.chave !== chave);
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Observações adicionais</Label>
              <Textarea
                rows={2}
                placeholder="Acesso, horário, contato no local..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>

            {/* Responsáveis */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Responsáveis pela O.S.</span>
                {/* Mesma ideia da equipe: quem falta na lista é cadastrado aqui,
                    sem abandonar a O.S. começada. */}
                {ehGestor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-slate-500"
                    onClick={() => setModalFuncionarios(true)}
                    aria-label="Cadastrar funcionários"
                    title="Cadastrar funcionários"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Marque uma ou mais pessoas da equipe desta unidade.
              </p>
              {(candidatosNova?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma pessoa cadastrada nesta unidade.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y border rounded-md">
                  {candidatosNova!.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={responsaveisNova.includes(c.id)}
                        onChange={() =>
                          setResponsaveisNova((atual) =>
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
              )}
            </div>

            {/* Avisos de abertura: configuração da unidade, só o gestor vê. */}
            {organizacao && (
              <div className="border rounded-lg p-3 space-y-2">
                <span className="text-sm font-medium">Avisos ao abrir a O.S.</span>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={organizacao.autoNotificar}
                    disabled={!habilitado || setAutoNotificar.isPending}
                    onChange={(e) =>
                      setAutoNotificar.mutate({ condominioId, ativo: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Envio automático para funcionários</strong> — ao criar a O.S., a equipe
                    desta unidade recebe notificação no aplicativo.
                  </span>
                </label>

                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    Notificação por e-mail: marque quem recebe. Fica salvo até desmarcar.
                  </p>
                  {(candidatos?.length ?? 0) === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum funcionário cadastrado.</p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto divide-y border rounded-md">
                      {candidatos!.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={c.notificarOsEmail}
                            disabled={!c.email}
                            onChange={(e) =>
                              setNotificarEmail.mutate({
                                funcionarioId: c.id,
                                ativo: e.target.checked,
                              })
                            }
                          />
                          <span className="flex-1">
                            {c.nome}
                            {c.email ? "" : " (sem e-mail)"}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                criar.isPending ||
                form.titulo.trim().length < 3 ||
                !habilitado ||
                !form.prazoLimite
              }
              onClick={() =>
                criar.mutate({
                  condominioId: unidadeNova,
                  titulo: form.titulo.trim(),
                  descricao: form.descricao.trim() || undefined,
                  categoriaId: form.categoriaId ? Number(form.categoriaId) : undefined,
                  prioridadeId: form.prioridadeId ? Number(form.prioridadeId) : undefined,
                  statusId: form.statusId ? Number(form.statusId) : undefined,
                  endereco: form.endereco.trim() || undefined,
                  solicitanteNome: form.solicitanteNome.trim() || undefined,
                  dataAbertura: form.dataAbertura || undefined,
                  prazoLimite: form.prazoLimite,
                  equipeId: form.equipeId ? Number(form.equipeId) : undefined,
                  observacoes: form.observacoes.trim() || undefined,
                })
              }
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Ordem de Serviço
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cadastro de equipes, por cima da abertura da O.S. */}
      <Dialog open={modalEquipes} onOpenChange={setModalEquipes}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Equipes desta {v.unidade.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <GerenciarEquipes
            condominioId={unidadeNova}
            onMudou={() => utils.equipes.list.invalidate()}
          />
        </DialogContent>
      </Dialog>

      {/* Ficha rápida de funcionário, por cima da abertura da O.S. */}
      <Dialog open={modalFuncionarios} onOpenChange={setModalFuncionarios}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Funcionários desta {v.unidade.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <CadastroRapidoFuncionario
            condominioId={unidadeNova}
            onMudou={() => utils.ordensServico.listarCandidatos.invalidate()}
          />
        </DialogContent>
      </Dialog>

      {/* Detalhe da O.S. */}
      <Dialog open={detalheId !== null} onOpenChange={(aberto) => !aberto && setDetalheId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{tituloDetalhe}</DialogTitle>
          </DialogHeader>
          {detalheId !== null && (
            <OsDetalhe ordemServicoId={detalheId} condominioId={condominioId} ehGestor={ehGestor} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
