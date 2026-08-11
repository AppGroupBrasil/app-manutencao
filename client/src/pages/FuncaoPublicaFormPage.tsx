import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ClipboardList,
  Wrench,
  AlertTriangle,
  Camera,
  Search,
  Zap,
  Star,
  Shield,
  FileText,
  Settings2,
  ListChecks,
  MapPin,
  Users,
  DollarSign,
  Clock,
  PenTool,
  Eye,
  Sparkles,
  Plus,
  Trash2,
  Upload,
  MapPinned,
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Save,
  QrCode,
  X,
  ScanLine,
  Hash,
  Share2,
} from "lucide-react";

const ICONES_MAP: Record<string, React.ElementType> = {
  ClipboardList, Wrench, AlertTriangle, Camera, Search, Zap, Star, Shield,
  FileText, Settings2, ListChecks, MapPin, Users, DollarSign, Clock, PenTool, Eye, Sparkles,
};

function getIconComponent(key: string): React.ElementType {
  return ICONES_MAP[key] || ClipboardList;
}

const CAMPOS_INFO: Record<string, { label: string; tipo: string; descricao: string }> = {
  titulo: { label: "Título", tipo: "texto", descricao: "Nome/título da tarefa" },
  descricao: { label: "Descrição", tipo: "textarea", descricao: "Descrição detalhada" },
  local: { label: "Local / Item da Manutenção", tipo: "texto", descricao: "Ex: Bloco A - Elevador" },
  imagens: { label: "Fotos", tipo: "imagens", descricao: "Galeria de imagens com legenda" },
  statusPersonalizado: { label: "Status", tipo: "status_select", descricao: "Status personalizado" },
  protocolo: { label: "Protocolo", tipo: "auto_numero", descricao: "Número de protocolo automático" },
  localizacao: { label: "Localização", tipo: "gps", descricao: "Endereço via GPS" },
  prioridade: { label: "Prioridade", tipo: "select", descricao: "Baixa, Média, Alta, Urgente" },
  responsavelId: { label: "Responsável", tipo: "select", descricao: "Membro da equipe responsável" },
  itensChecklist: { label: "Checklist", tipo: "checklist", descricao: "Lista de itens a verificar" },
  prazoConclusao: { label: "Prazo de Conclusão", tipo: "data", descricao: "Data limite para conclusão" },
  nivelUrgencia: { label: "Nível de Urgência", tipo: "select", descricao: "Baixo, Médio, Alto, Crítico" },
  anexos: { label: "Anexos", tipo: "arquivos", descricao: "Documentos e arquivos anexos" },
  qrcode: { label: "QR Code", tipo: "qrcode", descricao: "Leitura de QR Code" },
  assinaturaTecnico: { label: "Assinatura Técnico", tipo: "assinatura", descricao: "Assinatura digital do técnico" },
  assinaturaSolicitante: { label: "Assinatura Solicitante", tipo: "assinatura", descricao: "Assinatura digital do solicitante" },
};

const ORDEM_CAMPOS = [
  "local", "titulo", "descricao", "protocolo", "statusPersonalizado",
  "localizacao", "prioridade", "nivelUrgencia", "responsavelId",
  "prazoConclusao", "custoEstimado", "imagens", "itensChecklist",
  "qrcode", "anexos", "assinaturaTecnico", "assinaturaSolicitante",
];

// ============ ASSINATURA ============
function SignaturePad({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 rounded-lg bg-white overflow-hidden" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full cursor-crosshair"
          style={{ height: "150px", touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
          <Trash2 className="w-3 h-3 mr-1" /> Limpar
        </Button>
        {value && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Assinatura capturada</span>}
      </div>
    </div>
  );
}

// ============ QR CODE SCANNER ============
function QrCodeScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval>;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        intervalId = setInterval(async () => {
          if (!active || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0);
          if ("BarcodeDetector" in window) {
            try {
              const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
              const barcodes = await detector.detect(canvas);
              if (barcodes.length > 0) {
                clearInterval(intervalId);
                onScan(barcodes[0].rawValue);
              }
            } catch { /* continue */ }
          }
        }, 500);
      } catch {
        setError("Não foi possível acessar a câmera");
      }
    }

    startCamera();
    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} className="w-full" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/60 rounded-2xl" />
          </div>
        </div>
      )}
      <p className="text-xs text-center text-muted-foreground">Aponte a câmera para um QR Code</p>
      <Button variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
    </div>
  );
}

// ============ MAIN PUBLIC COMPONENT ============
export default function FuncaoPublicaFormPage() {
  const params = useParams();
  const shareToken = params.token || "";
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [checklistItems, setChecklistItems] = useState<{ texto: string; checked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [imagePreviews, setImagePreviews] = useState<{ url: string; legenda: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const { data: funcao, isLoading, error } = trpc.funcoesPersonalizadas.obterPublica.useQuery(
    { token: shareToken },
    { enabled: !!shareToken }
  );

  const criarRegistroMutation = trpc.funcoesPersonalizadas.criarRegistroPublico.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      toast.success("Registro enviado com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao enviar: " + err.message);
      setIsSubmitting(false);
    },
  });

  const camposAtivos: string[] = useMemo(() => {
    if (!funcao) return [];
    try {
      let raw: any = funcao.camposAtivos;
      if (typeof raw === "string") raw = JSON.parse(raw);
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        return Object.entries(raw).filter(([_, v]) => v === true).map(([k]) => k);
      }
      return [];
    } catch { return []; }
  }, [funcao]);

  const camposOrdenados = useMemo(() => {
    return ORDEM_CAMPOS.filter(c => camposAtivos.includes(c))
      .concat(camposAtivos.filter(c => !ORDEM_CAMPOS.includes(c)));
  }, [camposAtivos]);

  const camposObrigatorios: string[] = useMemo(() => {
    if (!funcao) return [];
    try {
      let raw: any = funcao.camposObrigatorios;
      if (typeof raw === "string") raw = JSON.parse(raw);
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        return Object.entries(raw).filter(([_, v]) => v === true).map(([k]) => k);
      }
      return [];
    } catch { return []; }
  }, [funcao]);

  // Protocolo numérico automático
  useEffect(() => {
    if (camposAtivos.includes("protocolo") && !formValues.protocolo) {
      const proto = String(Date.now()).slice(-8);
      setFormValues(prev => ({ ...prev, protocolo: proto }));
    }
  }, [camposAtivos]);

  // GPS → Endereço
  useEffect(() => {
    if (camposAtivos.includes("localizacao") && !formValues.localizacao && navigator.geolocation) {
      setFormValues(prev => ({ ...prev, localizacao: "Obtendo localização..." }));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const resp = await fetch(
              `/api/geocode/reverse?lat=${lat}&lon=${lng}`
            );
            const data = await resp.json();
            const addr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setFormValues(prev => ({ ...prev, localizacao: addr, _coords: `${lat},${lng}` }));
          } catch {
            setFormValues(prev => ({ ...prev, localizacao: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }));
          }
        },
        () => {
          setFormValues(prev => ({ ...prev, localizacao: "GPS não disponível" }));
        }
      );
    }
  }, [camposAtivos]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews(prev => [...prev, { url: reader.result as string, legenda: "" }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => setImagePreviews(prev => prev.filter((_, i) => i !== index));

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklistItems(prev => [...prev, { texto: newChecklistItem.trim(), checked: false }]);
    setNewChecklistItem("");
  };

  const handleSubmit = async () => {
    for (const campo of camposObrigatorios) {
      if (campo === "imagens" && imagePreviews.length === 0) {
        toast.error(`O campo "${CAMPOS_INFO[campo]?.label || campo}" é obrigatório`);
        return;
      }
      if (campo === "itensChecklist" && checklistItems.length === 0) {
        toast.error(`O campo "${CAMPOS_INFO[campo]?.label || campo}" é obrigatório`);
        return;
      }
      if (!["imagens", "itensChecklist", "protocolo", "localizacao"].includes(campo)) {
        if (!formValues[campo] || (typeof formValues[campo] === "string" && !formValues[campo].trim())) {
          toast.error(`O campo "${CAMPOS_INFO[campo]?.label || campo}" é obrigatório`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    const assinaturas: Record<string, string> = {};
    if (formValues.assinaturaTecnico) assinaturas.tecnico = formValues.assinaturaTecnico;
    if (formValues.assinaturaSolicitante) assinaturas.solicitante = formValues.assinaturaSolicitante;

    criarRegistroMutation.mutate({
      token: shareToken,
      protocolo: formValues.protocolo || undefined,
      dados: { ...formValues },
      imagens: imagePreviews.length > 0 ? imagePreviews : undefined,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
      assinaturas: Object.keys(assinaturas).length > 0 ? assinaturas : undefined,
      status: formValues.statusPersonalizado || "aberto",
    });
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormValues({});
    setChecklistItems([]);
    setImagePreviews([]);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/30">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-4">
          <Loader2 className="w-7 h-7 animate-spin text-white" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Carregando formulário...</p>
      </div>
    );
  }

  if (error || !funcao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/30 p-4">
        <div className="max-w-md w-full rounded-2xl border border-gray-200/60 bg-white shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Formulário não disponível</h2>
          <p className="text-sm text-gray-400">Este link pode ter expirado ou a função foi desativada.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/30 p-4">
        <div className="max-w-md w-full rounded-2xl border border-gray-200/60 bg-white shadow-sm overflow-hidden">
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${funcao.cor}, ${funcao.cor}88)` }} />
          <div className="p-8 text-center">
            <div 
              className="rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${funcao.cor}, ${funcao.cor}cc)`,
                boxShadow: `0 8px 24px ${funcao.cor}25`,
                width: 72, height: 72,
              }}
            >
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Registro Enviado!</h2>
            {formValues.protocolo && (
              <p className="text-sm text-gray-500 mb-1">
                Protocolo: <span className="font-mono font-bold text-gray-900">{formValues.protocolo}</span>
              </p>
            )}
            <p className="text-gray-400 mb-6">Seu registro de "{funcao.nome}" foi enviado com sucesso.</p>
            <Button 
              onClick={resetForm} 
              className="rounded-xl font-semibold text-white shadow-md gap-2"
              style={{ 
                background: `linear-gradient(135deg, ${funcao.cor}, ${funcao.cor}cc)`,
                boxShadow: `0 4px 14px ${funcao.cor}25`
              }}
            >
              <Plus className="w-4 h-4" /> Enviar Novo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = getIconComponent(funcao.icone);

  const renderCampo = (campoKey: string) => {
    const info = CAMPOS_INFO[campoKey];
    if (!info) return null;
    const isRequired = camposObrigatorios.includes(campoKey);
    const requiredMark = isRequired ? <span className="text-red-500">*</span> : null;

    if (info.tipo === "auto_numero") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1"><Hash className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <Input value={formValues[campoKey] || ""} readOnly className="bg-gray-50 font-mono text-lg font-bold" />
        </div>
      );
    }

    if (info.tipo === "gps") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1"><MapPinned className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <div className="p-3 bg-gray-50 border rounded-lg text-sm">
            {formValues[campoKey] === "Obtendo localização..." ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Obtendo endereço...
              </span>
            ) : (
              <span className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                {formValues[campoKey] || "Localização não disponível"}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (info.tipo === "status_select") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1">{info.label} {requiredMark}</Label>
          <Select value={formValues[campoKey] || ""} onValueChange={v => setFormValues(prev => ({ ...prev, [campoKey]: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">🔵 Aberto</SelectItem>
              <SelectItem value="em_andamento">🟡 Em Andamento</SelectItem>
              <SelectItem value="aguardando">🟠 Aguardando</SelectItem>
              <SelectItem value="concluido">🟢 Concluído</SelectItem>
              <SelectItem value="cancelado">🔴 Cancelado</SelectItem>
              <SelectItem value="pendente">⚪ Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (info.tipo === "textarea") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1">{info.label} {requiredMark}</Label>
          <Textarea value={formValues[campoKey] || ""} onChange={e => setFormValues(prev => ({ ...prev, [campoKey]: e.target.value }))} placeholder={info.descricao} rows={4} />
        </div>
      );
    }

    if (info.tipo === "texto") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1">{info.label} {requiredMark}</Label>
          <Input value={formValues[campoKey] || ""} onChange={e => setFormValues(prev => ({ ...prev, [campoKey]: e.target.value }))} placeholder={info.descricao} />
        </div>
      );
    }

    if (info.tipo === "data") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <Input type="date" value={formValues[campoKey] || ""} onChange={e => setFormValues(prev => ({ ...prev, [campoKey]: e.target.value }))} />
        </div>
      );
    }

    if (campoKey === "prioridade") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1">{info.label} {requiredMark}</Label>
          <Select value={formValues[campoKey] || ""} onValueChange={v => setFormValues(prev => ({ ...prev, [campoKey]: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">🟢 Baixa</SelectItem>
              <SelectItem value="media">🟡 Média</SelectItem>
              <SelectItem value="alta">🟠 Alta</SelectItem>
              <SelectItem value="urgente">🔴 Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (campoKey === "nivelUrgencia") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1">{info.label} {requiredMark}</Label>
          <Select value={formValues[campoKey] || ""} onValueChange={v => setFormValues(prev => ({ ...prev, [campoKey]: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixo">Baixo</SelectItem>
              <SelectItem value="medio">Médio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (campoKey === "responsavelId") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1"><Users className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <Input value={formValues[campoKey] || ""} onChange={e => setFormValues(prev => ({ ...prev, [campoKey]: e.target.value }))} placeholder="Seu nome" />
        </div>
      );
    }

    if (info.tipo === "imagens") {
      return (
        <div key={campoKey} className="space-y-3">
          <Label className="flex items-center gap-1"><Camera className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <div className="grid grid-cols-3 gap-2">
            {imagePreviews.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.url} alt="" className="w-full h-24 object-cover rounded-lg" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Camera className="w-6 h-6 text-gray-400" />
              <span className="text-[10px] text-gray-400 mt-1">Adicionar</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>
      );
    }

    if (info.tipo === "checklist") {
      return (
        <div key={campoKey} className="space-y-3">
          <Label className="flex items-center gap-1"><ListChecks className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <div className="space-y-2">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={item.checked} onChange={() => setChecklistItems(prev => prev.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it))} className="w-4 h-4 rounded" />
                <span className={cn("flex-1 text-sm", item.checked && "line-through text-muted-foreground")}>{item.texto}</span>
                <button type="button" onClick={() => setChecklistItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="Novo item do checklist" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }} className="text-sm" />
            <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      );
    }

    if (info.tipo === "qrcode") {
      return (
        <div key={campoKey} className="space-y-3">
          <Label className="flex items-center gap-1"><QrCode className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <div className="flex gap-2">
            <Input value={formValues[campoKey] || ""} onChange={e => setFormValues(prev => ({ ...prev, [campoKey]: e.target.value }))} placeholder="Código lido ou digitado" className="flex-1" />
            <Button type="button" variant="outline" onClick={() => setShowScanner(true)}>
              <ScanLine className="w-4 h-4 mr-1" /> Escanear
            </Button>
          </div>
          {formValues[campoKey] && (
            <div className="flex flex-col items-center gap-2 p-4 bg-white border rounded-lg">
              <QRCodeSVG value={formValues[campoKey]} size={120} />
              <p className="text-xs text-muted-foreground">QR Code gerado</p>
            </div>
          )}
          <Dialog open={showScanner} onOpenChange={setShowScanner}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Escanear QR Code</DialogTitle></DialogHeader>
              <QrCodeScanner
                onScan={(text) => {
                  setFormValues(prev => ({ ...prev, [campoKey]: text }));
                  setShowScanner(false);
                  toast.success("QR Code lido!");
                }}
                onClose={() => setShowScanner(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    if (info.tipo === "assinatura") {
      return (
        <SignaturePad
          key={campoKey}
          label={`${info.label}${isRequired ? " *" : ""}`}
          value={formValues[campoKey] || ""}
          onChange={v => setFormValues(prev => ({ ...prev, [campoKey]: v }))}
        />
      );
    }

    if (info.tipo === "arquivos") {
      return (
        <div key={campoKey} className="space-y-2">
          <Label className="flex items-center gap-1"><Upload className="w-4 h-4" /> {info.label} {requiredMark}</Label>
          <label className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <div className="text-center">
              <Upload className="w-5 h-5 text-gray-400 mx-auto" />
              <span className="text-xs text-gray-400 mt-1">Clique para anexar arquivos</span>
            </div>
            <input type="file" multiple className="hidden" />
          </label>
        </div>
      );
    }

    return (
      <div key={campoKey} className="space-y-2">
        <Label className="flex items-center gap-1">{info.label} {requiredMark}</Label>
        <Input value={formValues[campoKey] || ""} onChange={e => setFormValues(prev => ({ ...prev, [campoKey]: e.target.value }))} placeholder={info.descricao} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/30">
      {/* Premium Public Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ 
              background: `linear-gradient(135deg, ${funcao.cor}, ${funcao.cor}cc)`,
              boxShadow: `0 4px 14px ${funcao.cor}25`
            }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate text-gray-900">{funcao.nome}</h1>
            {funcao.descricao && <p className="text-xs text-gray-400 truncate">{funcao.descricao}</p>}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-emerald-700 font-semibold">Público</span>
          </div>
        </div>
      </div>

      {/* Formulário Premium */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6 space-y-5">
          {camposOrdenados.map(renderCampo)}
        </div>

        {camposOrdenados.length > 0 && (
          <div className="mt-6 pb-6">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 text-base font-semibold text-white rounded-xl shadow-lg transition-all hover:shadow-xl"
              style={{ 
                background: `linear-gradient(135deg, ${funcao.cor}, ${funcao.cor}cc)`,
                boxShadow: `0 8px 24px ${funcao.cor}25`
              }}
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Enviar Registro</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Rodapé Premium */}
      <div className="text-center pb-8">
        <div className="flex items-center justify-center gap-2">
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <p className="text-[11px] text-gray-300 font-medium">Formulário de manutenção • Acesso público</p>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
        </div>
      </div>
    </div>
  );
}
