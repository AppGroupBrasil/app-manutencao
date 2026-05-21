import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
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
  Tag
} from "lucide-react";
import { toast } from "sonner";

type TipoTarefa = "vistoria" | "manutencao" | "ocorrencia" | "antes_depois";

interface TarefasSimplesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominioId: number;
  tipoInicial?: TipoTarefa;
  onSuccess?: () => void;
}

const tipoConfig = {
  vistoria: {
    label: "Vistoria Simples",
    icon: ClipboardList,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  manutencao: {
    label: "Manutenção Simples",
    icon: Wrench,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  ocorrencia: {
    label: "Ocorrência Simples",
    icon: AlertTriangle,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  antes_depois: {
    label: "Antes e Depois Simples",
    icon: ArrowLeftRight,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
};

export function TarefasSimplesModal({
  open,
  onOpenChange,
  condominioId,
  tipoInicial = "vistoria",
  onSuccess,
}: TarefasSimplesModalProps) {
  const [tipo, setTipo] = useState<TipoTarefa>(tipoInicial);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [statusPersonalizado, setStatusPersonalizado] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [localizacao, setLocalizacao] = useState<{ lat: string; lng: string; endereco: string } | null>(null);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Buscar status personalizados
  const { data: statusList } = trpc.statusPersonalizados.listar.useQuery(
    { condominioId },
    { enabled: open && condominioId > 0 }
  );

  // Contar rascunhos pendentes
  const { data: rascunhosCount } = trpc.tarefasSimples.contarRascunhos.useQuery(
    { condominioId, tipo },
    { enabled: open && condominioId > 0 }
  );

  // Mutations
  const gerarProtocoloMutation = trpc.tarefasSimples.gerarProtocolo.useMutation();
  const criarTarefaMutation = trpc.tarefasSimples.criar.useMutation();
  const criarStatusMutation = trpc.statusPersonalizados.criar.useMutation();
  const enviarTodasMutation = trpc.tarefasSimples.enviarTodas.useMutation();

  // Gerar protocolo ao abrir modal ou mudar tipo
  useEffect(() => {
    if (open) {
      gerarNovoProtocolo();
      capturarLocalizacao();
    }
  }, [open, tipo]);

  const gerarNovoProtocolo = async () => {
    try {
      const result = await gerarProtocoloMutation.mutateAsync({ tipo });
      setProtocolo(result.protocolo);
    } catch (error) {
      console.error("Erro ao gerar protocolo:", error);
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
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImagens((prev) => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
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
      await criarTarefaMutation.mutateAsync({
        condominioId,
        tipo,
        protocolo,
        titulo: titulo || undefined,
        descricao: descricao || undefined,
        imagens: imagens.length > 0 ? imagens : undefined,
        latitude: localizacao?.lat,
        longitude: localizacao?.lng,
        endereco: localizacao?.endereco,
        statusPersonalizado: statusPersonalizado || undefined,
      });

      toast.success("Registro salvo! Adicione outro.", {
        description: `Protocolo: ${protocolo}`,
      });

      // Limpar campos para novo registro
      setTitulo("");
      setDescricao("");
      setImagens([]);
      setStatusPersonalizado("");
      await gerarNovoProtocolo();
      
      utils.tarefasSimples.contarRascunhos.invalidate({ condominioId });
    } catch (error) {
      toast.error("Erro ao salvar registro");
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
        tipo,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl">
        {/* Header Premium Laranja */}
        <div 
          className="p-6 rounded-t-lg"
          style={{ 
            background: `linear-gradient(135deg, ${config.cor} 0%, #EA580C 100%)`,
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <IconeTipo className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
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

          {/* Seletor de Tipo */}
          <div className="flex gap-2 mt-4">
            {(Object.keys(tipoConfig) as TipoTarefa[]).map((t) => {
              const Icon = tipoConfig[t].icon;
              const isActive = t === tipo;
              return (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 p-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-white text-orange-600 shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <Icon className="h-4 w-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 space-y-5 bg-white">
          {/* Protocolo */}
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
            <FileText className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700 font-medium">
              Protocolo: <span className="font-mono">{protocolo || "Gerando..."}</span>
            </span>
          </div>

          {/* Título com botão + */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-orange-500" />
              Título (opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite um título ou deixe em branco..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="flex-1 border-gray-200 focus:border-orange-400 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Imagens */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              Imagens (opcional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {imagens.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Imagem ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border-2 border-orange-200"
                  />
                  <button
                    onClick={() => removerImagem(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-orange-300 rounded-xl flex flex-col items-center justify-center text-orange-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs mt-1">Foto</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              Localização (automática)
            </Label>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              {carregandoLocalizacao ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Obtendo localização...</span>
                </div>
              ) : localizacao ? (
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1 text-green-600 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Localização capturada</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{localizacao.endereco}</p>
                </div>
              ) : (
                <button
                  onClick={capturarLocalizacao}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  Clique para capturar localização
                </button>
              )}
            </div>
          </div>

          {/* Status Personalizado */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Status (opcional)</Label>
            <Select value={statusPersonalizado} onValueChange={setStatusPersonalizado}>
              <SelectTrigger className="border-gray-200 focus:border-orange-400 focus:ring-orange-400">
                <SelectValue placeholder="Selecione ou crie um status..." />
              </SelectTrigger>
              <SelectContent>
                {statusList?.map((status) => (
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

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Descrição (opcional)</Label>
            <Textarea
              placeholder="Adicione observações ou detalhes..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="border-gray-200 focus:border-orange-400 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
          <Button
            onClick={salvarEReiniciar}
            disabled={salvando}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200"
          >
            {salvando ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Plus className="h-5 w-5 mr-2" />
            )}
            Registrar e Adicionar Outra
          </Button>
          
          <Button
            onClick={enviarTodos}
            disabled={enviando || ((rascunhosCount?.count ?? 0) === 0 && !titulo && !descricao && imagens.length === 0)}
            variant="outline"
            className="w-full h-12 text-base font-semibold border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            {enviando ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            Enviar {(rascunhosCount?.count ?? 0) > 0 ? `(${rascunhosCount?.count} registro${(rascunhosCount?.count ?? 0) > 1 ? "s" : ""})` : "Tudo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TarefasSimplesModal;
