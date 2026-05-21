import { useParams } from "wouter";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import {
  Megaphone,
  Calendar,
  Vote,
  ShoppingBag,
  Users,
  FileText,
  Image,
  MessageSquare,
  Bell,
  Car,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  Search,
  BookOpen,
  Building2,
  Phone,
  MapPin,
  Shield,
  Lightbulb,
  Package,
  Hammer,
  Camera,
  CalendarClock,
  Video,
  HelpCircle,
  Award,
  Sparkles,
  Newspaper,
  Briefcase,
  Home,
  Key,
  Truck,
  ParkingCircle,
  Wifi,
  Zap,
  HeartHandshake,
  ClipboardList,
  FileCheck,
  BadgeCheck,
  ArrowLeft,
  Share2,
  Smartphone,
  Copy,
  Check,
  Mail,
  Download,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

// Ícone do WhatsApp
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Mapeamento de ícones
const iconMap: Record<string, React.ElementType> = {
  avisos: Megaphone,
  comunicados: MessageSquare,
  notificacoes: Bell,
  eventos: Calendar,
  vencimentos: CalendarClock,
  assembleia: Video,
  votacoes: Vote,
  enquetes: ClipboardList,
  manutencoes: Wrench,
  checklists: ClipboardCheck,
  ocorrencias: AlertTriangle,
  vistorias: Search,
  antes_depois: Camera,
  melhorias: Hammer,
  aquisicoes: Package,
  realizacoes: Award,
  classificados: ShoppingBag,
  caronas: Truck,
  achados_perdidos: HelpCircle,
  moradores: Users,
  funcionarios: Briefcase,
  notificar_morador: Bell,
  documentos: FileText,
  regimento: BookOpen,
  regras_normas: FileCheck,
  dicas_seguranca: Shield,
  galeria: Image,
  albuns: Camera,
  vagas: Car,
  estacionamento: ParkingCircle,
  areas_comuns: Home,
  reservas: Key,
  sobre: Building2,
  contatos: Phone,
  localizacao: MapPin,
  publicidade: Sparkles,
  parceiros: HeartHandshake,
  personalizado: Zap,
  mensagem_sindico: MessageSquare,
  destaques: Lightbulb,
  novidades: Newspaper,
  wifi: Wifi,
  portaria: BadgeCheck,
};

// Mapeamento de módulos para rotas do Dashboard
const moduleRouteMap: Record<string, string> = {
  avisos: "/dashboard/avisos",
  comunicados: "/dashboard/comunicados",
  notificacoes: "/dashboard/gestao-notificacoes",
  eventos: "/dashboard/eventos",
  vencimentos: "/dashboard/vencimentos",
  assembleia: "/dashboard/assembleia",
  votacoes: "/dashboard/votacoes",
  enquetes: "/dashboard/votacoes",
  manutencoes: "/dashboard/manutencoes",
  checklists: "/dashboard/checklists",
  ocorrencias: "/dashboard/ocorrencias",
  vistorias: "/dashboard/vistorias",
  antes_depois: "/dashboard/antes-depois",
  melhorias: "/dashboard/melhorias",
  aquisicoes: "/dashboard/aquisicoes",
  realizacoes: "/dashboard/realizacoes",
  classificados: "/dashboard/classificados",
  caronas: "/dashboard/caronas",
  achados_perdidos: "/dashboard/achados",
  moradores: "/dashboard/moradores",
  funcionarios: "/dashboard/funcionarios",
  notificar_morador: "/dashboard/notificar-morador",
  documentos: "/dashboard/documentos",
  regimento: "/dashboard/regras",
  regras_normas: "/dashboard/regras",
  dicas_seguranca: "/dashboard/seguranca",
  galeria: "/dashboard/galeria",
  albuns: "/dashboard/galeria",
  vagas: "/dashboard/vagas",
  estacionamento: "/dashboard/vagas",
  areas_comuns: "/dashboard/condominio",
  reservas: "/dashboard/reservas",
  sobre: "/dashboard/condominio",
  contatos: "/dashboard/condominio",
  localizacao: "/dashboard/condominio",
  publicidade: "/dashboard/publicidade",
  parceiros: "/dashboard/publicidade",
  personalizado: "/dashboard/personalizado",
  mensagem_sindico: "/dashboard/condominio",
  destaques: "/dashboard/destaques",
  novidades: "/dashboard/avisos",
  wifi: "/dashboard/condominio",
  portaria: "/dashboard/condominio",
  // Novas rotas adicionadas
  ordem_servico: "/dashboard/ordens-servico",
  // Funções Rápidas
  antes_depois_rapido: "/dashboard/funcoes-rapidas-page",
  checklist_rapido: "/dashboard/funcoes-rapidas-page",
  manutencao_rapida: "/dashboard/funcoes-rapidas-page",
  ocorrencia_rapida: "/dashboard/funcoes-rapidas-page",
  vistoria_rapida: "/dashboard/funcoes-rapidas-page",
};

// Mapeamento de cores de fundo
const bgColorMap: Record<string, string> = {
  "bg-orange-500": "bg-orange-500",
  "bg-cyan-500": "bg-cyan-500",
  "bg-red-500": "bg-red-500",
  "bg-blue-500": "bg-blue-500",
  "bg-fuchsia-500": "bg-fuchsia-500",
  "bg-rose-500": "bg-rose-500",
  "bg-purple-500": "bg-purple-500",
  "bg-indigo-500": "bg-indigo-500",
  "bg-slate-600": "bg-slate-600",
  "bg-teal-500": "bg-teal-500",
  "bg-yellow-500": "bg-yellow-500",
  "bg-emerald-500": "bg-emerald-500",
  "bg-violet-500": "bg-violet-500",
  "bg-amber-500": "bg-amber-500",
  "bg-green-500": "bg-green-500",
  "bg-yellow-600": "bg-yellow-600",
  "bg-green-600": "bg-green-600",
  "bg-blue-600": "bg-blue-600",
  "bg-orange-600": "bg-orange-600",
  "bg-indigo-600": "bg-indigo-600",
  "bg-gray-600": "bg-gray-600",
  "bg-rose-600": "bg-rose-600",
  "bg-gray-500": "bg-gray-500",
  "bg-pink-500": "bg-pink-500",
  "bg-purple-600": "bg-purple-600",
  "bg-amber-600": "bg-amber-600",
  "bg-teal-600": "bg-teal-600",
  "bg-violet-600": "bg-violet-600",
  "bg-lime-600": "bg-lime-600",
  "bg-sky-500": "bg-sky-500",
  "bg-pink-600": "bg-pink-600",
  "bg-red-600": "bg-red-600",
  "bg-blue-700": "bg-blue-700",
  "bg-cyan-600": "bg-cyan-600",
};

const DISABLED_MODULE_KEYS = new Set(["avisos", "comunicados", "eventos"]);

export default function AppViewer() {
  const params = useParams();
  const shareLink = params.shareLink as string;
  const [copied, setCopied] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Handler para navegar para a função do módulo
  const handleModuleClick = (moduloKey: string) => {
    // Funções personalizadas (custom_123)
    if (moduloKey.startsWith("custom_")) {
      const funcaoId = moduloKey.replace("custom_", "");
      setLocation(`/dashboard/funcao-personalizada/${funcaoId}`);
      return;
    }
    const route = moduleRouteMap[moduloKey];
    if (route) {
      setLocation(route);
    } else {
      toast.info("Função em desenvolvimento");
    }
  };

  const { data: appData, isLoading, error } = trpc.apps.getByShareLink.useQuery(
    { shareLink },
    { enabled: !!shareLink }
  );

  const appUrl = typeof window !== 'undefined' ? window.location.href : '';
  const appName = appData?.nome || 'App';
  const condominioName = appData?.condominio?.nome || 'Condomínio';
  const visibleModules = appData?.modulos?.filter((modulo) => !DISABLED_MODULE_KEYS.has(modulo.moduloKey)) || [];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`Olá! Confira o app "${appName}" do ${condominioName}:\n\n${appUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`App ${appName} - ${condominioName}`);
    const body = encodeURIComponent(`Olá!\n\nConfira o app "${appName}" do ${condominioName}:\n\n${appUrl}\n\nAtenciosamente.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleDownloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qrcode-${appName.toLowerCase().replace(/\s+/g, '-')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando app...</p>
        </div>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">App não encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Este app não existe ou foi desativado.
            </p>
            <Button onClick={() => window.history.back()} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Obter mês/ano atual para edição
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const now = new Date();
  const currentEdition = `${months[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{appData.nome}</h1>
                <p className="text-xs text-muted-foreground">{appData.condominio?.nome}</p>
              </div>
            </div>
            
            {/* Botão de Compartilhar com Dialog */}
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-white text-lg">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                      Compartilhar App
                    </DialogTitle>
                  </DialogHeader>
                </div>
                
                <div className="space-y-6 p-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-white rounded-2xl shadow-lg border">
                      <QRCodeSVG
                        id="qr-code-svg"
                        value={appUrl}
                        size={180}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#1e40af"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 text-center">
                      Escaneie o QR Code para acessar o app
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownloadQRCode}
                      className="mt-2 gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Baixar QR Code
                    </Button>
                  </div>

                  {/* Link para copiar */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Link do App</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm truncate">
                        {appUrl}
                      </div>
                      <Button 
                        onClick={handleCopyLink}
                        variant={copied ? "default" : "outline"}
                        className={cn(
                          "gap-2 min-w-[100px]",
                          copied && "bg-green-500 hover:bg-green-600"
                        )}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Botões de compartilhamento */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Compartilhar via</label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleShareWhatsApp}
                        className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
                      >
                        <WhatsAppIcon />
                        WhatsApp
                      </Button>
                      <Button 
                        onClick={handleShareEmail}
                        variant="outline"
                        className="gap-2"
                      >
                        <Mail className="w-5 h-5" />
                        E-mail
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Preview do App */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-sm mx-auto">
          {/* Moldura do celular */}
          <div className="relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
            
            {/* Tela do celular */}
            <div className="bg-black rounded-[3rem] p-3 shadow-2xl">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-[2.5rem] overflow-hidden min-h-[600px]">
                {/* Header do App */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 pt-10 text-white">
                  <p className="text-xs uppercase tracking-wider opacity-80">Edição {currentEdition}</p>
                  <h2 className="text-xl font-bold mt-1">{appData.nome}</h2>
                  {appData.condominio?.nome && (
                    <p className="text-sm opacity-80 mt-1">{appData.condominio.nome}</p>
                  )}
                </div>

                {/* Grid de módulos */}
                <div className="p-4">
                  {visibleModules.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {visibleModules.map((modulo) => {
                        const iconKey = modulo.icone || modulo.moduloKey;
                        const Icon = iconKey?.startsWith("custom_") ? Sparkles : (iconMap[iconKey] || Smartphone);
                        const bgColor = modulo.moduloKey?.startsWith("custom_") 
                          ? (modulo.bgCor || "bg-pink-500")
                          : (bgColorMap[modulo.bgCor || "bg-blue-500"] || "bg-blue-500");
                        
                        return (
                          <div
                            key={modulo.id}
                            className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleModuleClick(modulo.moduloKey)}
                          >
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg transition-shadow",
                              bgColor
                            )}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <span className="text-[10px] text-center mt-1.5 text-gray-700 font-medium leading-tight">
                              {modulo.titulo}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm">Nenhum módulo configurado</p>
                    </div>
                  )}
                </div>

                {/* Footer do App */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <div className="w-32 h-1 bg-gray-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {visibleModules.length} módulos ativos
            </p>
            {appData.descricao && (
              <p className="text-sm text-muted-foreground mt-2">{appData.descricao}</p>
            )}
          </div>

          {/* Botões de ação rápida */}
          <div className="mt-6 flex flex-col gap-3">
            <Button 
              onClick={handleCopyLink}
              variant="outline"
              className="w-full gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Link Copiado!" : "Copiar Link do App"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleShareWhatsApp}
                className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                <WhatsAppIcon />
                WhatsApp
              </Button>
              <Button 
                onClick={() => setShareDialogOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
