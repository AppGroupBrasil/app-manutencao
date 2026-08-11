import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/ui/sonner";
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Loader2,
  FileText,
  MapPin,
  Image,
  Clock,
  Flag,
  User,
  ListChecks,
  CheckCircle2,
  Package,
  Gauge,
  ShieldCheck,
  Bug,
  Sparkles,
  TreeDeciduous,
  Receipt,
  ShoppingCart,
  DollarSign,
  Tag,
  Paperclip,
  Video,
  Mic,
  PenTool,
  Repeat,
  QrCode,
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
} from "lucide-react";

type ModalType = "rapida" | "completa";
type FunctionType = 
  | "vistoria" | "manutencao" | "ocorrencia" | "checklist" | "antes_depois" | "timeline"
  | "inventario" | "leitura_medidores" | "inspecao_seguranca" | "controle_pragas"
  | "limpeza" | "jardinagem" | "orcamentos" | "ordem_compra" | "contratos"
  | "vencimentos" | "ordem_servico";

interface FieldSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominioId: number;
  modalType: ModalType;
  functionType: FunctionType;
  onSave?: () => void;
}

// Mapeamento de ícones por categoria de campo
const fieldIcons: Record<string, React.ElementType> = {
  titulo: FileText,
  subtitulo: FileText,
  descricao: FileText,
  observacoes: FileText,
  local: MapPin,
  localizacao_texto: MapPin,
  gps: MapPin,
  geolocalizacao: MapPin,
  imagens: Image,
  imagens_antes: Image,
  imagens_depois: Image,
  edicao_imagem: Image,
  controle_tempo: Clock,
  data_agendada: Clock,
  prioridade: Flag,
  responsavel: User,
  tipo: ListChecks,
  categoria: ListChecks,
  status: CheckCircle2,
  itensChecklist: ListChecks,
  // Novos campos
  prazo_conclusao: Calendar,
  fornecedor: Building2,
  equipamento_ativo: Briefcase,
  garantia: ShieldCheck,
  nivel_urgencia: AlertTriangle,
  aprovacao: CheckCircle2,
  tags: Tag,
  anexos: Paperclip,
  video: Video,
  audio: Mic,
  assinatura_digital: PenTool,
  recorrencia: Repeat,
  qrcode: QrCode,
  quantidade: Package,
  valor_unitario: DollarSign,
  valor_total: DollarSign,
  leitura_atual: Gauge,
  tipo_medidor: Gauge,
  conforme: CheckCircle2,
  produtos_utilizados: Package,
  plantas_especies: TreeDeciduous,
  itens: ListChecks,
};

// Nomes amigáveis das funções
const functionNames: Record<FunctionType, string> = {
  vistoria: "Vistoria",
  manutencao: "Manutenção",
  ocorrencia: "Ocorrência",
  checklist: "Checklist",
  antes_depois: "Antes e Depois",
  timeline: "Timeline",
  inventario: "Inventário/Estoque",
  leitura_medidores: "Leitura de Medidores",
  inspecao_seguranca: "Inspeção de Segurança",
  controle_pragas: "Controle de Pragas",
  limpeza: "Limpeza",
  jardinagem: "Jardinagem",
  orcamentos: "Orçamentos",
  ordem_compra: "Ordem de Compra",
  contratos: "Contratos",
  vencimentos: "Vencimentos",
  ordem_servico: "Ordens de Serviço",
};

// Cores por tipo
const functionColors: Record<FunctionType, string> = {
  vistoria: "bg-blue-500",
  manutencao: "bg-orange-500",
  ocorrencia: "bg-red-500",
  checklist: "bg-purple-500",
  antes_depois: "bg-teal-500",
  timeline: "bg-amber-600",
  inventario: "bg-amber-500",
  leitura_medidores: "bg-cyan-500",
  inspecao_seguranca: "bg-green-500",
  controle_pragas: "bg-lime-500",
  limpeza: "bg-sky-500",
  jardinagem: "bg-emerald-500",
  orcamentos: "bg-indigo-500",
  ordem_compra: "bg-violet-500",
  contratos: "bg-slate-500",
  vencimentos: "bg-rose-500",
  ordem_servico: "bg-fuchsia-500",
};

export function FieldSettingsModal({
  open,
  onOpenChange,
  condominioId,
  modalType,
  functionType,
  onSave,
}: FieldSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();

  // Buscar configuração atual
  const { data, isLoading, isError, error } = trpc.fieldSettings.get.useQuery(
    { condominioId, modalType, functionType },
    { enabled: open && condominioId > 0 }
  );

  // Mutations
  const saveMutation = trpc.fieldSettings.save.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      // Invalidar todas as queries de fieldSettings para forçar atualização em todos os lugares
      utils.fieldSettings.get.invalidate();
      setHasChanges(false);
      onSave?.();
    },
    onError: () => {
      toast.error("Erro ao salvar configuração");
    },
  });

  const resetMutation = trpc.fieldSettings.reset.useMutation({
    onSuccess: (result) => {
      toast.success("Configuração restaurada para o padrão!");
      setLocalConfig(result.config);
      setHasChanges(false);
      // Invalidar todas as queries de fieldSettings para forçar atualização em todos os lugares
      utils.fieldSettings.get.invalidate();
    },
    onError: () => {
      toast.error("Erro ao restaurar configuração");
    },
  });

  // Sincronizar configuração local quando dados carregam
  useEffect(() => {
    if (data?.config) {
      setLocalConfig(data.config);
      setHasChanges(false);
    }
  }, [data?.config]);

  // Toggle de um campo
  const toggleField = (fieldKey: string, isRequired: boolean) => {
    if (isRequired) {
      toast.error("Este campo é obrigatório e não pode ser desabilitado");
      return;
    }

    setLocalConfig((prev) => {
      const newConfig = { ...prev, [fieldKey]: !prev[fieldKey] };
      setHasChanges(true);
      return newConfig;
    });
  };

  // Salvar configuração
  const handleSave = () => {
    saveMutation.mutate({
      condominioId,
      modalType,
      functionType,
      fieldsConfig: localConfig,
    });
  };

  // Resetar para padrão
  const handleReset = () => {
    resetMutation.mutate({ condominioId, modalType, functionType });
  };

  // Contar campos habilitados/total
  const enabledCount = Object.values(localConfig).filter(Boolean).length;
  const totalCount = data?.campos?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${functionColors[functionType]} text-white`}>
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg">Configurar Campos</div>
              <div className="text-sm font-normal text-gray-500">
                {functionNames[functionType]} {modalType === "rapida" ? "Rápida" : "Completa"}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-red-500 text-sm">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Erro ao carregar campos</p>
            <p className="text-xs text-gray-400 mt-1">{error?.message}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Campos visíveis no formulário</span>
              <Badge variant="outline">
                {enabledCount} / {totalCount} ativos
              </Badge>
            </div>

            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-3">
                {data?.campos?.map((campo) => {
                  const Icon = fieldIcons[campo.key] || FileText;
                  const isEnabled = localConfig[campo.key] ?? true;

                  return (
                    <div
                      key={campo.key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isEnabled
                          ? "bg-white border-gray-200"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isEnabled ? "bg-gray-100" : "bg-gray-200"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              isEnabled ? "text-gray-600" : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div>
                          <Label
                            className={`font-medium ${
                              isEnabled ? "text-gray-900" : "text-gray-400"
                            }`}
                          >
                            {campo.label}
                          </Label>
                          {campo.required && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleField(campo.key, campo.required)}
                        disabled={campo.required}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="flex-1"
              >
                {resetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Restaurar Padrão
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                className={`flex-1 ${functionColors[functionType]} hover:opacity-90`}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Botão de engrenagem para abrir o modal
interface FieldSettingsButtonProps {
  condominioId: number;
  modalType: ModalType;
  functionType: FunctionType;
  className?: string;
  variant?: "icon" | "full"; // icon = só ícone, full = botão completo com texto
}

export function FieldSettingsButton({
  condominioId,
  modalType,
  functionType,
  className = "",
  variant = "icon",
}: FieldSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  // Variante completa com texto
  if (variant === "full") {
    // Estilo diferente para Funções Rápidas (laranja) vs Funções Completas (azul)
    const isRapida = modalType === "rapida";
    const buttonStyle = isRapida
      ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 shadow-md"
      : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 shadow-md";
    
    return (
      <>
        <Button
          variant="default"
          onClick={() => setOpen(true)}
          className={`w-full justify-center gap-2 transition-all ${buttonStyle} ${className}`}
        >
          <Settings className="h-4 w-4" />
          <span className="font-medium">Configurar Funções</span>
        </Button>

        <FieldSettingsModal
          open={open}
          onOpenChange={setOpen}
          condominioId={condominioId}
          modalType={modalType}
          functionType={functionType}
        />
      </>
    );
  }

  // Variante ícone (padrão)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={`h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 ${className}`}
        title="Configurar campos visíveis"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <FieldSettingsModal
        open={open}
        onOpenChange={setOpen}
        condominioId={condominioId}
        modalType={modalType}
        functionType={functionType}
      />
    </>
  );
}
