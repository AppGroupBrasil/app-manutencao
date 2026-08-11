import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { prepareImageForUpload } from "@/lib/imageCompressor";
import { useFieldSettings } from "@/hooks/useFieldSettings";
import { FieldSettingsButton } from "@/components/FieldSettingsModal";
import { 
  Plus, 
  Send, 
  Camera, 
  MapPin, 
  FileText, 
  X, 
  Loader2,
  CheckCircle2,
  ClipboardList,
  Wrench,
  AlertTriangle,
  ArrowLeftRight,
  Image as ImageIcon,
  Tag,
  Star,
  History,
  Trash2,
  ListChecks,
  Check,
  Save,
  Share2,
  Users,
  Flag,
  User,
  BookmarkPlus,
  FolderOpen,
  CalendarClock,
  Gauge,
  Paperclip,
  QrCode,
  PenTool,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { MapView } from "@/components/Map";

type TipoTarefa = "vistoria" | "manutencao" | "ocorrencia" | "antes_depois" | "checklist";

interface ItemChecklist {
  id: string;
  titulo: string;
  concluido: boolean;
  temProblema: boolean;
  problema?: {
    titulo: string;
    descricao: string;
    imagens: string[];
  };
}
type TipoCampo = "titulo" | "descricao" | "local" | "observacao";

// Interface para imagem com legenda individual
interface ImagemComLegenda {
  url: string;
  legenda?: string;
}

// Função para normalizar imagens (compatível com formato antigo string[])
function normalizarImagens(imagens: any): ImagemComLegenda[] {
  if (!imagens || !Array.isArray(imagens)) return [];
  return imagens.map((img: any) => {
    if (typeof img === 'string') {
      return { url: img, legenda: '' };
    }
    return { url: img.url, legenda: img.legenda || '' };
  });
}

interface TarefasSimplesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominioId: number;
  tipoInicial?: TipoTarefa;
  onSuccess?: () => void;
  tarefaParaEditar?: any; // Adicionado para suportar edição
}

const tipoConfig = {
  vistoria: {
    label: "Vistoria Rápida",
    icon: ClipboardList,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  manutencao: {
    label: "Manutenção Rápida",
    icon: Wrench,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  ocorrencia: {
    label: "Ocorrência Rápida",
    icon: AlertTriangle,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  antes_depois: {
    label: "Antes e Depois Rápido",
    icon: ArrowLeftRight,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  checklist: {
    label: "Checklist Rápido",
    icon: ListChecks,
    cor: "#8B5CF6",
    corClara: "#F5F3FF",
  },
};

// Componente para botão de salvar/selecionar template
interface TemplateSelectorProps {
  condominioId: number;
  tipoCampo: TipoCampo;
  tipoTarefa: TipoTarefa;
  valorAtual: string;
  onSelect: (valor: string) => void;
}

function TemplateSelector({ condominioId, tipoCampo, tipoTarefa, valorAtual, onSelect }: TemplateSelectorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const utils = trpc.useUtils();

  // Buscar templates salvos - ignorar checklist pois não usa templates
  const tipoTarefaParaTemplate = tipoTarefa === "checklist" ? undefined : tipoTarefa;
  const { data: templates, isLoading } = trpc.camposRapidosTemplates.listar.useQuery(
    { condominioId, tipoCampo, tipoTarefa: tipoTarefaParaTemplate },
    { enabled: popoverOpen && condominioId > 0 }
  );

  // Mutations
  const criarTemplateMutation = trpc.camposRapidosTemplates.criar.useMutation({
    onSuccess: (data) => {
      utils.camposRapidosTemplates.listar.invalidate({ condominioId, tipoCampo });
      if (data.jaExistia) {
        toast.info("Este nome já está salvo! Escolha no menu ou cadastre outro nome.");
      } else {
        toast.success("Valor salvo para reutilização!");
      }
    },
    onError: () => {
      toast.error("Erro ao salvar valor");
    }
  });

  const usarTemplateMutation = trpc.camposRapidosTemplates.usar.useMutation();
  
  const toggleFavoritoMutation = trpc.camposRapidosTemplates.toggleFavorito.useMutation({
    onSuccess: () => {
      utils.camposRapidosTemplates.listar.invalidate({ condominioId, tipoCampo });
    }
  });

  const deletarTemplateMutation = trpc.camposRapidosTemplates.deletar.useMutation({
    onSuccess: () => {
      utils.camposRapidosTemplates.listar.invalidate({ condominioId, tipoCampo });
      toast.success("Template removido");
    }
  });

  const handleSalvarAtual = () => {
    if (!valorAtual.trim()) {
      toast.error("Digite um valor antes de salvar");
      return;
    }
    criarTemplateMutation.mutate({
      condominioId,
      tipoCampo,
      tipoTarefa: tipoTarefaParaTemplate,
      valor: valorAtual.trim(),
    });
  };

  const handleSelectTemplate = (template: { id: number; valor: string }) => {
    onSelect(template.valor);
    usarTemplateMutation.mutate({ id: template.id });
    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 w-9 p-0 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
          title="Salvar ou selecionar valor frequente"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b bg-orange-50">
          <h4 className="font-semibold text-sm text-orange-800 flex items-center gap-2">
            <History className="h-4 w-4" />
            Valores Salvos
          </h4>
          <p className="text-xs text-orange-600 mt-1">
            Selecione um valor salvo ou salve o atual
          </p>
        </div>

        {/* Botão para salvar valor atual */}
        {valorAtual.trim() && (
          <div className="p-2 border-b">
            <Button
              onClick={handleSalvarAtual}
              disabled={criarTemplateMutation.isPending}
              className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600"
            >
              {criarTemplateMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Salvar "{valorAtual.substring(0, 30)}{valorAtual.length > 30 ? '...' : ''}"
            </Button>
          </div>
        )}

        {/* Lista de templates */}
        <div className="max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="p-1">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-1 p-2 hover:bg-gray-50 rounded group"
                >
                  <button
                    onClick={() => handleSelectTemplate(template)}
                    className="flex-1 text-left text-sm text-gray-700 truncate hover:text-orange-600"
                  >
                    {template.valor}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleFavoritoMutation.mutate({ id: template.id })}
                      className={`p-1 rounded ${template.favorito ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                      title={template.favorito ? "Remover dos favoritos" : "Marcar como favorito"}
                    >
                      <Star className="h-3 w-3" fill={template.favorito ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => deletarTemplateMutation.mutate({ id: template.id })}
                      className="p-1 rounded text-gray-400 hover:text-red-500"
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {template.vezesUsado && template.vezesUsado > 1 && (
                    <span className="text-xs text-gray-400 ml-1">
                      {template.vezesUsado}x
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhum valor salvo ainda.
              <br />
              <span className="text-xs">Digite um valor e clique em "Salvar"</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TarefasSimplesModal({
  open,
  onOpenChange,
  condominioId,
  tipoInicial = "vistoria",
  onSuccess,
  tarefaParaEditar,
}: TarefasSimplesModalProps) {
  const [tipo, setTipo] = useState<TipoTarefa>(tipoInicial);

  // Sincronizar tipo com tipoInicial quando o prop muda
  useEffect(() => {
    setTipo(tipoInicial);
  }, [tipoInicial]);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [imagens, setImagens] = useState<ImagemComLegenda[]>([]);
  const [statusPersonalizado, setStatusPersonalizado] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [localizacao, setLocalizacao] = useState<{ lat: string; lng: string; endereco: string } | null>(null);
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [modalCompartilharAberto, setModalCompartilharAberto] = useState(false);
  const [membrosSelecionados, setMembrosSelecionados] = useState<number[]>([]);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para checklist
  const [itensChecklist, setItensChecklist] = useState<ItemChecklist[]>([]);
  const [novoItemChecklist, setNovoItemChecklist] = useState("");
  
  // Estados para modal de problema no checklist
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [selectedItemForProblem, setSelectedItemForProblem] = useState<ItemChecklist | null>(null);
  const [problemData, setProblemData] = useState<{ titulo: string; descricao: string; imagens: string[] }>({
    titulo: "",
    descricao: "",
    imagens: [],
  });
  const problemFileInputRef = useRef<HTMLInputElement>(null);
  const antesFileInputRef = useRef<HTMLInputElement>(null);
  const depoisFileInputRef = useRef<HTMLInputElement>(null);

  // Estados para salvar como modelo de checklist
  const [showSalvarModeloDialog, setShowSalvarModeloDialog] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [showCarregarModelo, setShowCarregarModelo] = useState(false);

  // Estados para campos extras de manutenção
  const [prazoConclusao, setPrazoConclusao] = useState("");
  const [nivelUrgencia, setNivelUrgencia] = useState<"baixo" | "medio" | "alto" | "critico">("medio");
  const [anexos, setAnexos] = useState<{ nome: string; url: string }[]>([]);
  const [qrcode, setQrcode] = useState("");
  const [assinaturaTecnico, setAssinaturaTecnico] = useState("");
  const [assinaturaSolicitante, setAssinaturaSolicitante] = useState("");
  const [isDrawingTecnico, setIsDrawingTecnico] = useState(false);
  const [isDrawingSolicitante, setIsDrawingSolicitante] = useState(false);
  const canvasTecnicoRef = useRef<HTMLCanvasElement>(null);
  const canvasSolicitanteRef = useRef<HTMLCanvasElement>(null);
  const anexoFileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Hook para configuração de campos - determina quais campos mostrar
  const { isFieldEnabled, refetch: refetchFieldSettings } = useFieldSettings({
    condominioId,
    modalType: "rapida",
    functionType: tipo,
    enabled: open && condominioId > 0,
  });

  // Buscar equipe
  const { data: equipe } = trpc.membroEquipe.list.useQuery(
    { condominioId },
    { enabled: open && condominioId > 0 }
  );

  // Buscar status personalizados
  const { data: statusList } = trpc.statusPersonalizados.listar.useQuery(
    { condominioId },
    { enabled: open && condominioId > 0 }
  );

  // Status padrões que sempre aparecem + status do DB sem duplicatas
  const STATUS_PADRAO = [
    { id: -1, nome: "Pendente", cor: "#EAB308" },
    { id: -2, nome: "Em Andamento", cor: "#3B82F6" },
    { id: -3, nome: "Realizada", cor: "#22C55E" },
    { id: -4, nome: "Ação Necessária", cor: "#EF4444" },
    { id: -5, nome: "Finalizada", cor: "#10B981" },
    { id: -6, nome: "Reaberta", cor: "#8B5CF6" },
  ];
  const statusMerged = useMemo(() => {
    const nomesPadrao = new Set(STATUS_PADRAO.map(s => s.nome));
    const extras = (statusList || []).filter(s => !nomesPadrao.has(s.nome));
    return [...STATUS_PADRAO, ...extras];
  }, [statusList]);

  // Contar rascunhos pendentes
  const { data: rascunhosCount } = trpc.tarefasSimples.contarRascunhos.useQuery(
    { condominioId, tipo: tipo as any },
    { enabled: open && condominioId > 0 }
  );

  // Mutations
  const gerarProtocoloMutation = trpc.tarefasSimples.gerarProtocolo.useMutation();
  const criarTarefaMutation = trpc.tarefasSimples.criar.useMutation();
  const atualizarTarefaMutation = trpc.tarefasSimples.atualizar.useMutation();
  const criarStatusMutation = trpc.statusPersonalizados.criar.useMutation();
  const uploadImageMutation = trpc.upload.image.useMutation();
  const uploadFileMutation = trpc.upload.file.useMutation();
  const enviarTodasMutation = trpc.tarefasSimples.enviarTodas.useMutation();
  const compartilharMutation = trpc.tarefasSimples.compartilhar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa compartilhada com sucesso!");
      setModalCompartilharAberto(false);
      setMembrosSelecionados([]);
    }
  });

  // Query e mutations para modelos de checklist
  const { data: modelosChecklist } = trpc.checklistModelos.listar.useQuery(
    { condominioId },
    { enabled: open && condominioId > 0 && tipo === "checklist" }
  );
  const salvarModeloMutation = trpc.checklistModelos.criar.useMutation({
    onSuccess: (data) => {
      toast.success(`Modelo "${data.nome}" salvo com sucesso!`);
      setShowSalvarModeloDialog(false);
      setNomeModelo("");
      utils.checklistModelos.listar.invalidate({ condominioId });
    },
    onError: () => {
      toast.error("Erro ao salvar modelo");
    },
  });
  const deletarModeloMutation = trpc.checklistModelos.deletar.useMutation({
    onSuccess: () => {
      toast.success("Modelo excluído!");
      utils.checklistModelos.listar.invalidate({ condominioId });
    },
  });

  // Gerar protocolo ao abrir modal ou mudar tipo
  useEffect(() => {
    if (open) {
      if (tarefaParaEditar) {
        // Carregar dados da tarefa para edição
        const t = tarefaParaEditar;
        setTipo(t.tipo as TipoTarefa);
        setProtocolo(t.protocolo);
        setTitulo(t.titulo || "");
        setDescricao(t.descricao || "");
        setLocal(t.local || "");
        setImagens(normalizarImagens(t.imagens));
        setStatusPersonalizado(t.statusPersonalizado || "");
        if (t.latitude && t.longitude) {
          setLocalizacao({
            lat: t.latitude,
            lng: t.longitude,
            endereco: t.endereco || `${t.latitude}, ${t.longitude}`,
          });
        }
        if (t.itensChecklist) {
          setItensChecklist(t.itensChecklist);
        }
        if (t.prioridade) setPrioridade(t.prioridade);
        if (t.responsavelId) setResponsavelId(t.responsavelId.toString());
      } else {
        // Modo criação
        gerarNovoProtocolo();
        capturarLocalizacao();
        setPrioridade("media");
        setResponsavelId("");
      }
    } else {
      // Limpar ao fechar se não estiver editando (ou limpar edição anterior)
      if (!tarefaParaEditar) {
        setTitulo("");
        setDescricao("");
        setLocal("");
        setImagens([]);
        setStatusPersonalizado("");
        setPrioridade("media");
        setResponsavelId("");
        setItensChecklist([]);
      }
    }
  }, [open, tipo, tarefaParaEditar]);

  const gerarNovoProtocolo = async () => {
    try {
      const result = await gerarProtocoloMutation.mutateAsync({ tipo: tipo as any });
      setProtocolo(result.protocolo);
    } catch (error) {
      console.error("Erro ao gerar protocolo:", error);
      // Gerar protocolo localmente como fallback
      const prefixos: Record<TipoTarefa, string> = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A/D",
        checklist: "CHK",
      };
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').substring(2, 14);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      setProtocolo(`${prefixos[tipo]}-${timestamp}-${random}`);
    }
  };

  const capturarLocalizacao = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocalização não suportada");
      return;
    }

    setCarregandoLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toString();
        const lng = position.coords.longitude.toString();
        
        // Tentar obter endereço via API de geocoding reverso
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          setLocalizacao({
            lat,
            lng,
            endereco: data.display_name || `${lat}, ${lng}`,
          });
        } catch {
          setLocalizacao({ lat, lng, endereco: `${lat}, ${lng}` });
        }
        setCarregandoLocalizacao(false);
      },
      (error) => {
        console.warn("Erro ao obter localização:", error);
        setCarregandoLocalizacao(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const base64 = await prepareImageForUpload(file, "quarterA4");
        const result = await uploadImageMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64,
          folder: "tarefas",
        });
        setImagens((prev) => [...prev, { url: result.url, legenda: '' }]);
      } catch (err) {
        console.error("Erro no upload:", err);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
  };

  // Upload handler para Antes/Depois
  const handleAntesDepoisUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo_ad: "ANTES" | "DEPOIS") => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const base64 = await prepareImageForUpload(file, "quarterA4");
        const result = await uploadImageMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64,
          folder: "tarefas",
        });
        setImagens((prev) => [...prev, { url: result.url, legenda: tipo_ad }]);
      } catch (err) {
        console.error("Erro no upload:", err);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
    // Reset input para permitir re-upload do mesmo arquivo
    e.target.value = '';
  };

  const imagensAntes = imagens.filter(img => img.legenda === "ANTES");
  const imagensDepois = imagens.filter(img => img.legenda === "DEPOIS");

  // Upload handler para Anexos (PDF, Doc, etc)
  const handleAnexoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadFileMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64,
          folder: "anexos",
        });
        setAnexos((prev) => [...prev, { nome: file.name, url: result.url }]);
      } catch (err) {
        console.error("Erro no upload anexo:", err);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
    e.target.value = '';
  };

  // Funções de assinatura digital (canvas touch)
  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const getCanvasPos = (canvas: HTMLCanvasElement, e: React.TouchEvent | React.MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (canvas: HTMLCanvasElement | null, e: React.TouchEvent | React.MouseEvent) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (canvas: HTMLCanvasElement | null, drawing: boolean, e: React.TouchEvent | React.MouseEvent) => {
    if (!canvas || !drawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = (canvas: HTMLCanvasElement | null, setter: (v: string) => void) => {
    if (!canvas) return;
    setter(canvas.toDataURL("image/png"));
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null, setter: (v: string) => void) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setter("");
  };

  const atualizarLegendaImagem = (index: number, legenda: string) => {
    setImagens((prev) => prev.map((img, i) => 
      i === index ? { ...img, legenda } : img
    ));
  };

  const removerImagem = (index: number) => {
    setImagens((prev) => prev.filter((_, i) => i !== index));
  };

  const criarNovoStatus = async () => {
    if (!novoStatus.trim()) return;
    
    try {
      await criarStatusMutation.mutateAsync({
        condominioId,
        nome: novoStatus.trim(),
      });
      setStatusPersonalizado(novoStatus.trim());
      setNovoStatus("");
      utils.statusPersonalizados.listar.invalidate({ condominioId });
      toast.success("Status criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar status");
    }
  };

  const salvarEReiniciar = async () => {
    setSalvando(true);
    try {
      // Campos extras comuns
      const camposExtras = {
        prazoConclusao: prazoConclusao || undefined,
        nivelUrgencia: nivelUrgencia || undefined,
        anexos: anexos.length > 0 ? anexos : undefined,
        qrcode: qrcode || undefined,
        assinaturaTecnico: assinaturaTecnico || undefined,
        assinaturaSolicitante: assinaturaSolicitante || undefined,
      };

      if (tarefaParaEditar) {
        await atualizarTarefaMutation.mutateAsync({
          id: tarefaParaEditar.id,
          titulo: titulo || undefined,
          descricao: descricao || undefined,
          local: local || undefined,
          imagens: imagens.length > 0 ? imagens : undefined,
          statusPersonalizado: statusPersonalizado || undefined,
          prioridade,
          responsavelId: responsavelId ? parseInt(responsavelId) : undefined,
          itensChecklist: tipo === "checklist" && itensChecklist.length > 0 ? itensChecklist : undefined,
          ...camposExtras,
        });

        toast.success("Registro atualizado com sucesso!");
        utils.tarefasSimples.listar.invalidate();
        onOpenChange(false);
      } else {
        await criarTarefaMutation.mutateAsync({
          condominioId,
          tipo: tipo as any,
          protocolo,
          titulo: titulo || undefined,
          descricao: descricao || undefined,
          local: local || undefined,
          imagens: imagens.length > 0 ? imagens : undefined,
          latitude: localizacao?.lat,
          longitude: localizacao?.lng,
          endereco: localizacao?.endereco,
          statusPersonalizado: statusPersonalizado || undefined,
          prioridade,
          responsavelId: responsavelId ? parseInt(responsavelId) : undefined,
          itensChecklist: tipo === "checklist" && itensChecklist.length > 0 ? itensChecklist : undefined,
          ...camposExtras,
        });

        toast.success("Registro salvo! Adicione outro.", {
          description: `Protocolo: ${protocolo}`,
        });

        // Limpar campos para novo registro
        setTitulo("");
        setDescricao("");
        setLocal("");
        setImagens([]);
        setStatusPersonalizado("");
        setItensChecklist([]);
        setNovoItemChecklist("");
        setPrioridade("media");
        setResponsavelId("");
        setPrazoConclusao("");
        setNivelUrgencia("medio");
        setAnexos([]);
        setQrcode("");
        setAssinaturaTecnico("");
        setAssinaturaSolicitante("");
        clearCanvas(canvasTecnicoRef.current, setAssinaturaTecnico);
        clearCanvas(canvasSolicitanteRef.current, setAssinaturaSolicitante);
        await gerarNovoProtocolo();
        
        utils.tarefasSimples.contarRascunhos.invalidate({ condominioId });
        utils.tarefasSimples.listar.invalidate();
      }
    } catch (error) {
      toast.error(tarefaParaEditar ? "Erro ao atualizar registro" : "Erro ao salvar registro");
    } finally {
      setSalvando(false);
    }
  };

  const enviarTodos = async () => {
    // Primeiro salvar o atual se tiver dados
    if (titulo || descricao || imagens.length > 0) {
      await salvarEReiniciar();
    }

    setEnviando(true);
    try {
      await enviarTodasMutation.mutateAsync({
        condominioId,
        tipo: tipo as any,
      });

      toast.success("Todos os registros foram enviados!", {
        description: "Os rascunhos foram enviados com sucesso.",
      });

      utils.tarefasSimples.listar.invalidate({ condominioId });
      utils.tarefasSimples.contarRascunhos.invalidate({ condominioId });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao enviar registros");
    } finally {
      setEnviando(false);
    }
  };

  const config = tipoConfig[tipo];
  const IconeTipo = config.icon;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md max-h-[92vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl">
        {/* Header Premium Laranja */}
        <div 
          className="p-4 rounded-t-lg"
          style={{ 
            background: `linear-gradient(135deg, ${config.cor} 0%, #EA580C 100%)`,
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <IconeTipo className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white">
                    {config.label}
                  </DialogTitle>
                  <p className="text-white/80 text-sm mt-1">
                    Registro rápido e simples
                  </p>
                </div>
              </div>
              {(rascunhosCount?.count ?? 0) > 0 && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  {rascunhosCount?.count} pendente{(rascunhosCount?.count ?? 0) > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Indicador do Tipo Atual */}
          <div className="flex justify-center mt-4">
            <div className="px-4 py-2 bg-white text-orange-600 shadow-lg rounded-lg flex items-center gap-2">
              <IconeTipo className="h-4 w-4" />
              <span className="text-sm font-semibold">{config.label}</span>
            </div>
          </div>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-4 space-y-4 bg-white">
          {/* Botão Configurar Funções */}
          <FieldSettingsButton
            condominioId={condominioId}
            modalType="rapida"
            functionType={tipo}
            variant="full"
          />

          {/* Protocolo */}
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-100">
            <FileText className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700 font-medium">
              Protocolo: {protocolo || "Gerando..."}
            </span>
          </div>

          {/* Título com botão + */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-500" />
                Título (opcional)
              </Label>
              <TemplateSelector
                condominioId={condominioId}
                tipoCampo="titulo"
                tipoTarefa={tipo}
                valorAtual={titulo}
                onSelect={setTitulo}
              />
            </div>
            <Input
              placeholder="Digite um título ou deixe em branco..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="border-gray-200 focus:border-orange-400 focus:ring-orange-400"
            />
          </div>

          {/* Local com botão + */}
          {isFieldEnabled("local") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                Local (opcional)
              </Label>
              <TemplateSelector
                condominioId={condominioId}
                tipoCampo="local"
                tipoTarefa={tipo}
                valorAtual={local}
                onSelect={setLocal}
              />
            </div>
            <Input
              placeholder="Ex: Bloco A, Apartamento 101, Garagem..."
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="border-gray-200 focus:border-orange-400 focus:ring-orange-400"
            />
          </div>
          )}

          {/* Localização */}
          {isFieldEnabled("gps") && (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              Localização (automática)
            </Label>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              {carregandoLocalizacao ? (
                <div className="flex items-center gap-2 text-gray-500 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Obtendo localização...</span>
                </div>
              ) : localizacao ? (
                <div className="space-y-2">
                  {/* Mapa Miniatura */}
                  <div className="w-full h-24 rounded-lg overflow-hidden">
                    <MapView
                      className="w-full h-full"
                      initialCenter={{ 
                        lat: parseFloat(localizacao.lat), 
                        lng: parseFloat(localizacao.lng) 
                      }}
                      initialZoom={16}
                      onMapReady={(map) => {
                        // Adicionar marcador na localização
                        new google.maps.marker.AdvancedMarkerElement({
                          map,
                          position: { 
                            lat: parseFloat(localizacao.lat), 
                            lng: parseFloat(localizacao.lng) 
                          },
                          title: "Localização atual",
                        });
                      }}
                    />
                  </div>
                  {/* Info da localização */}
                  <div className="text-sm text-gray-600 min-w-0 px-1">
                    <div className="flex items-center gap-1 text-green-600 mb-1">
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium text-xs">Localização capturada</span>
                    </div>
                    <p className="text-xs text-gray-500 break-words line-clamp-2">{localizacao.endereco}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={capturarLocalizacao}
                  className="text-sm text-orange-600 hover:text-orange-700 p-2"
                >
                  Clique para capturar localização
                </button>
              )}
            </div>
            {/* Galeria de imagens (movida para seção dedicada) é removida daqui */} 
          </div>
          )}

          {/* Status Personalizado */}
          {isFieldEnabled("status") && (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Status (opcional)</Label>
            <Select value={statusPersonalizado} onValueChange={setStatusPersonalizado}>
              <SelectTrigger className="border-gray-200 focus:border-orange-400 focus:ring-orange-400">
                <SelectValue placeholder="Selecione ou crie um status..." />
              </SelectTrigger>
              <SelectContent>
                {statusMerged.map((status) => (
                  <SelectItem key={status.id} value={status.nome}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.cor || "#F97316" }}
                      />
                      {status.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Criar novo status..."
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                className="flex-1 text-sm border-gray-200"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={criarNovoStatus}
                disabled={!novoStatus.trim()}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          )}

          {/* Novos Campos: Prioridade e Responsável */}
          {(isFieldEnabled("prioridade") || isFieldEnabled("responsavel")) && (
          <div className="grid grid-cols-2 gap-4">
            {isFieldEnabled("prioridade") && (
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-500" />
                Prioridade
              </Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as any)}>
                <SelectTrigger className="border-gray-200">
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
            )}
            {isFieldEnabled("responsavel") && (
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                Responsável
              </Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {equipe?.map((membro) => (
                    <SelectItem key={membro.id} value={membro.id.toString()}>
                      {membro.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
          )}

          {/* Prazo de conclusão. O sistema não trabalha com valores. */}
          {isFieldEnabled("prazo_conclusao") && (
          <div className="grid grid-cols-2 gap-4">
            {(
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                Prazo
              </Label>
              <Input
                type="date"
                value={prazoConclusao}
                onChange={(e) => setPrazoConclusao(e.target.value)}
                className="border-gray-200 focus:border-orange-400 focus:ring-orange-400"
              />
            </div>
            )}
          </div>
          )}

          {/* Nível de Urgência */}
          {isFieldEnabled("nivel_urgencia") && (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-red-500" />
              Nível de Urgência
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: "baixo", label: "Baixo", color: "bg-green-100 text-green-700 border-green-300", active: "bg-green-500 text-white border-green-500" },
                { value: "medio", label: "Médio", color: "bg-yellow-100 text-yellow-700 border-yellow-300", active: "bg-yellow-500 text-white border-yellow-500" },
                { value: "alto", label: "Alto", color: "bg-orange-100 text-orange-700 border-orange-300", active: "bg-orange-500 text-white border-orange-500" },
                { value: "critico", label: "Crítico", color: "bg-red-100 text-red-700 border-red-300", active: "bg-red-500 text-white border-red-500" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNivelUrgencia(opt.value)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${nivelUrgencia === opt.value ? opt.active : opt.color}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* QR Code */}
          {isFieldEnabled("qrcode") && (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4 text-purple-500" />
              QR Code / Código de Barras
            </Label>
            <Input
              type="text"
              placeholder="Digite ou escaneie o código..."
              value={qrcode}
              onChange={(e) => setQrcode(e.target.value)}
              className="border-gray-200 focus:border-orange-400 focus:ring-orange-400"
            />
          </div>
          )}

          {/* Anexos (PDF/Doc) */}
          {isFieldEnabled("anexos") && (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-blue-500" />
              Anexos (PDF/Doc)
            </Label>
            {anexos.length > 0 && (
              <div className="space-y-1">
                {anexos.map((anx, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{anx.nome}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnexos(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => anexoFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group bg-white"
            >
              <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Adicionar Anexo</span>
            </button>
            <input
              ref={anexoFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={handleAnexoUpload}
            />
          </div>
          )}

          {/* Assinatura Digital (Técnico + Solicitante) */}
          {isFieldEnabled("assinatura_digital") && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <PenTool className="h-4 w-4 text-indigo-500" />
              Assinatura Digital
            </h4>
            
            {/* Assinatura Técnico */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Assinatura do Técnico</Label>
              <div className="relative bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <canvas
                  ref={canvasTecnicoRef}
                  width={320}
                  height={120}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={(e) => { setIsDrawingTecnico(true); initCanvas(canvasTecnicoRef.current); startDraw(canvasTecnicoRef.current, e); }}
                  onMouseMove={(e) => draw(canvasTecnicoRef.current, isDrawingTecnico, e)}
                  onMouseUp={() => { setIsDrawingTecnico(false); endDraw(canvasTecnicoRef.current, setAssinaturaTecnico); }}
                  onMouseLeave={() => { setIsDrawingTecnico(false); endDraw(canvasTecnicoRef.current, setAssinaturaTecnico); }}
                  onTouchStart={(e) => { e.preventDefault(); setIsDrawingTecnico(true); initCanvas(canvasTecnicoRef.current); startDraw(canvasTecnicoRef.current, e); }}
                  onTouchMove={(e) => { e.preventDefault(); draw(canvasTecnicoRef.current, isDrawingTecnico, e); }}
                  onTouchEnd={() => { setIsDrawingTecnico(false); endDraw(canvasTecnicoRef.current, setAssinaturaTecnico); }}
                />
                {!assinaturaTecnico && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-gray-300 text-sm">Assine aqui (Técnico)</span>
                  </div>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => clearCanvas(canvasTecnicoRef.current, setAssinaturaTecnico)}>
                Limpar assinatura
              </Button>
            </div>

            {/* Assinatura Solicitante */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Assinatura do Solicitante</Label>
              <div className="relative bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <canvas
                  ref={canvasSolicitanteRef}
                  width={320}
                  height={120}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={(e) => { setIsDrawingSolicitante(true); initCanvas(canvasSolicitanteRef.current); startDraw(canvasSolicitanteRef.current, e); }}
                  onMouseMove={(e) => draw(canvasSolicitanteRef.current, isDrawingSolicitante, e)}
                  onMouseUp={() => { setIsDrawingSolicitante(false); endDraw(canvasSolicitanteRef.current, setAssinaturaSolicitante); }}
                  onMouseLeave={() => { setIsDrawingSolicitante(false); endDraw(canvasSolicitanteRef.current, setAssinaturaSolicitante); }}
                  onTouchStart={(e) => { e.preventDefault(); setIsDrawingSolicitante(true); initCanvas(canvasSolicitanteRef.current); startDraw(canvasSolicitanteRef.current, e); }}
                  onTouchMove={(e) => { e.preventDefault(); draw(canvasSolicitanteRef.current, isDrawingSolicitante, e); }}
                  onTouchEnd={() => { setIsDrawingSolicitante(false); endDraw(canvasSolicitanteRef.current, setAssinaturaSolicitante); }}
                />
                {!assinaturaSolicitante && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-gray-300 text-sm">Assine aqui (Solicitante)</span>
                  </div>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => clearCanvas(canvasSolicitanteRef.current, setAssinaturaSolicitante)}>
                Limpar assinatura
              </Button>
            </div>
          </div>
          )}

          {/* Interface de Checklist - Só aparece quando tipo é checklist */}
          {tipo === "checklist" && isFieldEnabled("itensChecklist") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-gray-700 font-medium flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-purple-500" />
                  Itens do Checklist
                </Label>
                
                {/* Carregar Modelo */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCarregarModelo(!showCarregarModelo)}
                    className="text-xs h-8 border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-1" />
                    Carregar Modelo
                  </Button>
                  
                  {showCarregarModelo && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
                      <div className="p-2 border-b border-gray-100">
                        <span className="text-xs font-medium text-gray-500 px-2">Modelos Salvos</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {modelosChecklist && modelosChecklist.length > 0 ? (
                          modelosChecklist.map((modelo) => (
                            <div
                              key={modelo.id}
                              className="flex items-center justify-between px-3 py-2 hover:bg-purple-50 transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  // Carregar os itens do modelo
                                  const novosItens = (modelo.itens as { id: string; titulo: string }[]).map((item) => ({
                                    id: crypto.randomUUID(),
                                    titulo: item.titulo,
                                    concluido: false,
                                    temProblema: false,
                                  }));
                                  setItensChecklist(novosItens);
                                  setShowCarregarModelo(false);
                                  toast.success(`Modelo "${modelo.nome}" carregado!`);
                                }}
                                className="flex-1 text-left text-sm text-gray-700 hover:text-purple-600 truncate"
                              >
                                {modelo.nome}
                                <span className="block text-xs text-gray-400">
                                  {(modelo.itens as any[]).length} {(modelo.itens as any[]).length === 1 ? "item" : "itens"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Excluir modelo "${modelo.nome}"?`)) {
                                    deletarModeloMutation.mutate({ id: modelo.id });
                                  }
                                }}
                                className="p-1 text-gray-300 hover:text-red-500 shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-400 text-xs">
                            Nenhum modelo salvo ainda.
                            <br />
                            Crie itens e clique em "Salvar como Modelo"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Lista de itens */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {itensChecklist.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all ${
                      item.concluido
                        ? "bg-green-50 border-green-200"
                        : item.temProblema
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Checkbox e título */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => {
                          setItensChecklist(prev =>
                            prev.map((i, idx) =>
                              idx === index ? { ...i, concluido: !i.concluido, temProblema: false, problema: undefined } : i
                            )
                          );
                        }}
                        className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                          item.concluido
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-purple-400"
                        }`}
                      >
                        {item.concluido && <Check className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm break-words ${item.concluido ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {item.titulo}
                        </span>
                        {/* Detalhes do problema */}
                        {item.temProblema && item.problema && (
                          <div className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <span className="font-medium">{item.problema.titulo}</span>
                            {item.problema.imagens && item.problema.imagens.length > 0 && (
                              <span className="ml-2 text-red-400">
                                ({item.problema.imagens.length} foto{item.problema.imagens.length > 1 ? "s" : ""})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Badge de problema no mobile */}
                      {item.temProblema && !item.problema && (
                        <span className="sm:hidden text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                          Problema
                        </span>
                      )}
                    </div>
                    {/* Botões de ação */}
                    <div className="flex items-center gap-1 ml-auto sm:ml-0 shrink-0">
                      <button
                        onClick={() => {
                          // Sempre abre modal - para criar ou editar problema
                          setSelectedItemForProblem(item);
                          setProblemData({
                            titulo: item.problema?.titulo || item.titulo,
                            descricao: item.problema?.descricao || "",
                            imagens: item.problema?.imagens || [],
                          });
                          setShowProblemModal(true);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          item.temProblema
                            ? "bg-red-500 text-white"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                        title={item.temProblema ? "Editar problema" : "Reportar problema"}
                      >
                        <AlertTriangle className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => {
                          setItensChecklist(prev => prev.filter((_, idx) => idx !== index));
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remover item"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Adicionar novo item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar item ao checklist..."
                  value={novoItemChecklist}
                  onChange={(e) => setNovoItemChecklist(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && novoItemChecklist.trim()) {
                      setItensChecklist(prev => [
                        ...prev,
                        {
                          id: crypto.randomUUID(),
                          titulo: novoItemChecklist.trim(),
                          concluido: false,
                          temProblema: false,
                        },
                      ]);
                      setNovoItemChecklist("");
                    }
                  }}
                  className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
                <Button
                  onClick={() => {
                    if (novoItemChecklist.trim()) {
                      setItensChecklist(prev => [
                        ...prev,
                        {
                          id: crypto.randomUUID(),
                          titulo: novoItemChecklist.trim(),
                          concluido: false,
                          temProblema: false,
                        },
                      ]);
                      setNovoItemChecklist("");
                    }
                  }}
                  disabled={!novoItemChecklist.trim()}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {itensChecklist.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>
                    {itensChecklist.filter(i => i.concluido).length} de {itensChecklist.length} concluídos
                  </span>
                  {itensChecklist.filter(i => i.temProblema).length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-red-500">
                        {itensChecklist.filter(i => i.temProblema).length} com problema
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seção Galeria e Descrição - Só mostra se algum dos campos está habilitado */}
          {(isFieldEnabled("imagens") || isFieldEnabled("descricao")) && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              Galeria e Descrição
            </h4>
            
            {/* Seção Antes e Depois - Interface dedicada */}
            {tipo === "antes_depois" && (
            <div className="space-y-4">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-green-500" />
                Fotos Antes e Depois
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Coluna ANTES */}
                <div className="space-y-2">
                  <div className="text-center">
                    <Badge className="bg-red-100 text-red-600 border-0 text-xs font-semibold">ANTES</Badge>
                  </div>
                  
                  {/* Fotos do Antes */}
                  {imagensAntes.map((img, idx) => {
                    const globalIdx = imagens.findIndex(i => i === img);
                    return (
                      <div key={globalIdx} className="relative rounded-xl overflow-hidden border-2 border-red-200 group">
                        <img src={img.url} alt={`Antes ${idx + 1}`} className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => setImagens(prev => prev.filter((_, i) => i !== globalIdx))}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Botão adicionar foto Antes */}
                  <button
                    type="button"
                    onClick={() => antesFileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-1 p-4 border-2 border-dashed border-red-300 rounded-xl cursor-pointer hover:border-red-500 hover:bg-red-50 transition-all"
                  >
                    <Camera className="w-5 h-5 text-red-400" />
                    <span className="text-xs font-medium text-red-400">Foto Antes</span>
                  </button>
                  <input
                    ref={antesFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAntesDepoisUpload(e, "ANTES")}
                  />
                </div>

                {/* Coluna DEPOIS */}
                <div className="space-y-2">
                  <div className="text-center">
                    <Badge className="bg-green-100 text-green-600 border-0 text-xs font-semibold">DEPOIS</Badge>
                  </div>
                  
                  {/* Fotos do Depois */}
                  {imagensDepois.map((img, idx) => {
                    const globalIdx = imagens.findIndex(i => i === img);
                    return (
                      <div key={globalIdx} className="relative rounded-xl overflow-hidden border-2 border-green-200 group">
                        <img src={img.url} alt={`Depois ${idx + 1}`} className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => setImagens(prev => prev.filter((_, i) => i !== globalIdx))}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Botão adicionar foto Depois */}
                  <button
                    type="button"
                    onClick={() => depoisFileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-1 p-4 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all"
                  >
                    <Camera className="w-5 h-5 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Foto Depois</span>
                  </button>
                  <input
                    ref={depoisFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAntesDepoisUpload(e, "DEPOIS")}
                  />
                </div>
              </div>
              
              {/* Resumo */}
              {(imagensAntes.length > 0 || imagensDepois.length > 0) && (
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    {imagensAntes.length} foto{imagensAntes.length !== 1 ? 's' : ''} antes
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    {imagensDepois.length} foto{imagensDepois.length !== 1 ? 's' : ''} depois
                  </span>
                </div>
              )}
            </div>
            )}

            {/* Imagens com legendas individuais (para outros tipos que não antes_depois) */}
            {isFieldEnabled("imagens") && tipo !== "antes_depois" && (
            <div className="space-y-4">
              {/* Lista de imagens com legendas */}
              {imagens.map((img, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
                  <div className="flex gap-3">
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden group">
                      <img src={img.url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImagens(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-gray-500 mb-1 block">Legenda da foto {index + 1}</Label>
                      <Textarea
                        placeholder="Descreva esta imagem..."
                        value={img.legenda || ''}
                        onChange={(e) => atualizarLegendaImagem(index, e.target.value)}
                        rows={2}
                        className="text-sm border-gray-200 focus:border-orange-400 focus:ring-orange-400 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Botão para adicionar nova imagem */}
              <Label
                htmlFor="upload-foto"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all group bg-white"
              >
                <div className="p-2 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                  <Camera className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-orange-600">Adicionar Imagem</span>
                <Input
                  id="upload-foto"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </Label>
            </div>
            )}

            {/* Descrição geral com botão + */}
            {isFieldEnabled("descricao") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 font-medium">Descrição Geral (opcional)</Label>
                <TemplateSelector
                  condominioId={condominioId}
                  tipoCampo="descricao"
                  tipoTarefa={tipo}
                  valorAtual={descricao}
                  onSelect={setDescricao}
                />
              </div>
              <Textarea
                placeholder="Adicione observações ou detalhes..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                className="border-gray-200 focus:border-orange-400 focus:ring-orange-400 resize-none bg-white"
              />
            </div>
            )}
          </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
          <Button
            onClick={salvarEReiniciar}
            disabled={salvando}
            className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200"
          >
            {salvando ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : tarefaParaEditar ? (
              <Save className="h-5 w-5 mr-2" />
            ) : (
              <Plus className="h-5 w-5 mr-2" />
            )}
            {tarefaParaEditar ? "Atualizar Registro" : "Registrar e Adicionar Outra"}
          </Button>

          {/* Botão Salvar como Modelo - só aparece quando tipo é checklist e tem itens */}
          {tipo === "checklist" && itensChecklist.length > 0 && !tarefaParaEditar && (
            <>
              {!showSalvarModeloDialog ? (
                <Button
                  type="button"
                  onClick={() => setShowSalvarModeloDialog(true)}
                  variant="outline"
                  className="w-full h-10 text-sm font-semibold border-2 border-purple-400 text-purple-600 hover:bg-purple-50"
                >
                  <BookmarkPlus className="h-5 w-5 mr-2" />
                  Salvar como Modelo
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input
                    autoFocus
                    placeholder="Nome do modelo..."
                    value={nomeModelo}
                    onChange={(e) => setNomeModelo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nomeModelo.trim()) {
                        salvarModeloMutation.mutate({
                          condominioId,
                          nome: nomeModelo.trim(),
                          itens: itensChecklist.map((item) => ({
                            id: item.id,
                            titulo: item.titulo,
                          })),
                        });
                      }
                      if (e.key === "Escape") {
                        setShowSalvarModeloDialog(false);
                        setNomeModelo("");
                      }
                    }}
                    className="flex-1 h-10 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (nomeModelo.trim()) {
                        salvarModeloMutation.mutate({
                          condominioId,
                          nome: nomeModelo.trim(),
                          itens: itensChecklist.map((item) => ({
                            id: item.id,
                            titulo: item.titulo,
                          })),
                        });
                      }
                    }}
                    disabled={!nomeModelo.trim() || salvarModeloMutation.isPending}
                    size="sm"
                    className="h-10 bg-purple-500 hover:bg-purple-600 shrink-0"
                  >
                    {salvarModeloMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowSalvarModeloDialog(false);
                      setNomeModelo("");
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-10 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
          
          {tarefaParaEditar && (
            <Button
              onClick={() => setModalCompartilharAberto(true)}
              variant="outline"
              className="w-full h-10 text-sm font-semibold border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Compartilhar com Equipe
            </Button>
          )}

          {!tarefaParaEditar && (
            <Button
              onClick={enviarTodos}
              disabled={enviando || ((rascunhosCount?.count ?? 0) === 0 && !titulo && !descricao && imagens.length === 0)}
              variant="outline"
              className="w-full h-10 text-sm font-semibold border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              {enviando ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              Enviar {(rascunhosCount?.count ?? 0) > 0 ? `(${rascunhosCount?.count} registro${(rascunhosCount?.count ?? 0) > 1 ? "s" : ""})` : "Tudo"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Compartilhamento */}
    <Dialog open={modalCompartilharAberto} onOpenChange={setModalCompartilharAberto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-orange-500" />
            Compartilhar com a equipe
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Selecione os membros da equipe que devem receber acesso a esta tarefa.
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
            {equipe?.map((membro) => (
              <div key={membro.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg">
                <Checkbox 
                  id={`membro-${membro.id}`}
                  checked={membrosSelecionados.includes(membro.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setMembrosSelecionados(prev => [...prev, membro.id]);
                    } else {
                      setMembrosSelecionados(prev => prev.filter(id => id !== membro.id));
                    }
                  }}
                />
                <label
                  htmlFor={`membro-${membro.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {membro.nome}
                  <span className="text-xs text-gray-400 block ml-0.5">{membro.cargo || "Membro"}</span>
                </label>
              </div>
            ))}
          </div>
          <Button 
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={() => {
              if (tarefaParaEditar) {
                compartilharMutation.mutate({
                  tarefaId: tarefaParaEditar.id,
                  membrosIds: membrosSelecionados,
                  condominioId
                });
              } else {
                toast.error("Salve a tarefa antes de compartilhar.");
              }
            }}
            disabled={membrosSelecionados.length === 0 || compartilharMutation.isPending}
          >
            {compartilharMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Compartilhar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Modal de Reportar Problema no Item do Checklist */}
    <Dialog open={showProblemModal} onOpenChange={setShowProblemModal}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Reportar Problema
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Item selecionado */}
          {selectedItemForProblem && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800">Item:</p>
              <p className="text-sm text-red-600">{selectedItemForProblem.titulo}</p>
            </div>
          )}
          
          {/* Título do problema */}
          <div className="space-y-2">
            <Label htmlFor="problemTitulo" className="text-sm font-medium">
              Título do Problema
            </Label>
            <Input
              id="problemTitulo"
              value={problemData.titulo}
              onChange={(e) => setProblemData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ex: Equipamento danificado"
              className="border-red-200 focus:border-red-400 focus:ring-red-400"
            />
          </div>
          
          {/* Descrição do problema */}
          <div className="space-y-2">
            <Label htmlFor="problemDescricao" className="text-sm font-medium">
              Descrição do Problema
            </Label>
            <Textarea
              id="problemDescricao"
              value={problemData.descricao}
              onChange={(e) => setProblemData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o problema encontrado..."
              rows={3}
              className="border-red-200 focus:border-red-400 focus:ring-red-400"
            />
          </div>
          
          {/* Upload de fotos do problema */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos do Problema
            </Label>
            
            <input
              type="file"
              ref={problemFileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files) return;
                
                const newImages: string[] = [];
                for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  try {
                    const base64 = await prepareImageForUpload(file, "quarterA4");
                    const result = await uploadImageMutation.mutateAsync({
                      fileName: file.name,
                      fileType: file.type,
                      fileData: base64,
                      folder: "tarefas",
                    });
                    newImages.push(result.url);
                  } catch (err) {
                    console.error("Erro no upload:", err);
                    toast.error(`Erro ao enviar ${file.name}`);
                  }
                }
                setProblemData(prev => ({
                  ...prev,
                  imagens: [...prev.imagens, ...newImages],
                }));
                e.target.value = '';
              }}
            />
            
            <div className="flex flex-wrap gap-2">
              {/* Botão de adicionar foto */}
              <button
                onClick={() => problemFileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-red-300 flex flex-col items-center justify-center text-red-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs mt-1">Adicionar</span>
              </button>
              
              {/* Fotos adicionadas */}
              {problemData.imagens.map((img, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img
                    src={img}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      setProblemData(prev => ({
                        ...prev,
                        imagens: prev.imagens.filter((_, i) => i !== index),
                      }));
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          {/* Botão de remover problema (só aparece se já tem problema) */}
          {selectedItemForProblem?.temProblema && (
            <Button
              variant="outline"
              onClick={() => {
                if (selectedItemForProblem) {
                  setItensChecklist(prev =>
                    prev.map((item) =>
                      item.id === selectedItemForProblem.id
                        ? { ...item, temProblema: false, problema: undefined }
                        : item
                    )
                  );
                  setShowProblemModal(false);
                  setSelectedItemForProblem(null);
                  setProblemData({ titulo: "", descricao: "", imagens: [] });
                  toast.success("Problema removido");
                }
              }}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Problema
            </Button>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowProblemModal(false);
                setSelectedItemForProblem(null);
                setProblemData({ titulo: "", descricao: "", imagens: [] });
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedItemForProblem && problemData.titulo.trim()) {
                  setItensChecklist(prev =>
                    prev.map((item) =>
                      item.id === selectedItemForProblem.id
                        ? {
                            ...item,
                            temProblema: true,
                            concluido: false,
                            problema: {
                              titulo: problemData.titulo.trim(),
                              descricao: problemData.descricao.trim(),
                              imagens: problemData.imagens,
                            },
                          }
                        : item
                    )
                  );
                  setShowProblemModal(false);
                  setSelectedItemForProblem(null);
                  setProblemData({ titulo: "", descricao: "", imagens: [] });
                  toast.success(selectedItemForProblem.temProblema ? "Problema atualizado!" : "Problema reportado!");
                } else {
                  toast.error("Informe o título do problema");
                }
              }}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              {selectedItemForProblem?.temProblema ? "Salvar Alterações" : "Reportar Problema"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default TarefasSimplesModal;
