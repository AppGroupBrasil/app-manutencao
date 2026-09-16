import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, Printer, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from "@/lib/seo";

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  bgColor: string;
  textColor: string;
}

export default function Apresentacao() {
  useSeo(
    "Apresentação do sistema",
    "Conheça o App Manutenção: como funcionam as ordens de serviço, as vistorias, os checklists, o QR Code por local e o portal do funcionário.",
    "/apresentacao",
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const slides: Slide[] = [
    {
      id: 1,
      title: 'APP MANUTENÇÃO',
      subtitle: 'Sistema Universal de Gestão de Manutenção',
      content: (
        <div className="text-center space-y-4 md:space-y-6">
          <p className="text-lg md:text-2xl text-gray-600">
            A plataforma completa para gerenciar manutenções de qualquer escala
          </p>
          <div className="flex justify-center gap-3 md:gap-4 text-2xl md:text-3xl flex-wrap">
            <span>🏢</span>
            <span>🏭</span>
            <span>🏪</span>
            <span>🏥</span>
            <span>🏫</span>
          </div>
        </div>
      ),
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      textColor: 'text-gray-900'
    },
    {
      id: 2,
      title: 'Bem-vindo ao Futuro da Manutenção',
      subtitle: 'Desenvolvido para todos os tipos de operação',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          {[
            { icon: '🏢', text: 'Manutenções Prediais' },
            { icon: '🏭', text: 'Manutenções Industriais' },
            { icon: '🏪', text: 'Manutenções Comerciais' },
            { icon: '🏥', text: 'Manutenções Hospitalares' },
            { icon: '🏫', text: 'Manutenções Escolares' },
            { icon: '⚙️', text: 'Máquinas e Equipamentos' }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-lg shadow-md"
            >
              <span className="text-2xl md:text-3xl">{item.icon}</span>
              <span className="font-semibold text-gray-800 text-sm md:text-base">{item.text}</span>
            </motion.div>
          ))}
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 3,
      title: 'Dashboard Profissional',
      subtitle: '📊 Visão Completa do Seu Sistema',
      content: (
        <div className="flex justify-center">
          <img src="/sistema-dashboard.png" alt="Dashboard" className="w-full max-w-4xl rounded-lg shadow-lg" />
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 4,
      title: 'Ordens de Serviço',
      subtitle: '📋 Gestão Completa de Tarefas',
      content: (
        <div className="flex justify-center">
          <img src="/sistema-ordens.png" alt="Ordens de Serviço" className="w-full max-w-4xl rounded-lg shadow-lg" />
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 5,
      title: 'Relatórios Executivos',
      subtitle: '📊 Análises e Métricas Avançadas',
      content: (
        <div className="flex justify-center">
          <img src="/sistema-relatorios.png" alt="Relatórios" className="w-full max-w-4xl rounded-lg shadow-lg" />
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 6,
      title: 'App Mobile',
      subtitle: '📱 Manutenção na Palma da Sua Mão',
      content: (
        <div className="flex justify-center">
          <img src="/sistema-mobile.png" alt="App Mobile" className="max-h-64 md:max-h-96 rounded-lg shadow-lg" />
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 7,
      title: 'Vistorias Detalhadas',
      subtitle: '🔍 Inspeções Profissionais',
      content: (
        <div className="flex justify-center">
          <img src="/sistema-vistorias.png" alt="Vistorias" className="w-full max-w-4xl rounded-lg shadow-lg" />
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 8,
      title: 'Gestão de Equipe',
      subtitle: '👥 Controle de Técnicos e Desempenho',
      content: (
        <div className="flex justify-center">
          <img src="/sistema-equipe.png" alt="Gestão de Equipe" className="w-full max-w-4xl rounded-lg shadow-lg" />
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 9,
      title: 'Plano Individual',
      subtitle: 'R$ 99/mês',
      content: (
        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-xl text-gray-700 font-semibold">Perfeito para profissionais autônomos</p>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-8 rounded-xl">
            <ul className="space-y-2 md:space-y-3 text-base md:text-lg">
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>1 usuário ativo</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Ordens de serviço ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Suporte técnico</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>App mobile</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Relatórios básicos</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 10,
      title: 'Plano Pequenas Equipes',
      subtitle: 'R$ 199/mês',
      content: (
        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-xl text-gray-700 font-semibold">Ideal para pequenas e médias empresas</p>
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 md:p-8 rounded-xl border-2 border-orange-500">
            <ul className="space-y-2 md:space-y-3 text-base md:text-lg">
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Até 3 usuários</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Ordens de serviço ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Suporte técnico prioritário</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>App mobile</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Relatórios avançados</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Integração com APIs</span>
              </li>
            </ul>
          </div>
          <p className="text-center text-orange-600 font-bold text-lg">RECOMENDADO</p>
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 11,
      title: 'Plano Equipes Médias',
      subtitle: 'R$ 299/mês',
      content: (
        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-xl text-gray-700 font-semibold">Para operações em larga escala</p>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-8 rounded-xl">
            <ul className="space-y-2 md:space-y-3 text-base md:text-lg">
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Até 5 usuários</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Ordens de serviço ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Suporte técnico 24/7</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>App mobile</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Relatórios customizados</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Integração completa</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Backup automático</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 12,
      title: 'Termos do Contrato',
      subtitle: 'Transparência e Segurança',
      content: (
        <div className="space-y-3 md:space-y-4">
          {[
            { title: 'Período', desc: '1 ano renovável automaticamente' },
            { title: 'Reajuste', desc: 'Anual conforme IPCA ou mudança de plano' },
            { title: 'Bloqueio', desc: 'Após 5 dias corridos de atraso' },
            { title: 'Cancelamento', desc: '30 dias de aviso prévio' },
            { title: 'Penalidade', desc: '1 mês adicional se aviso não for respeitado' },
            { title: 'Suporte', desc: 'Disponível em todos os planos' }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500"
            >
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm md:text-base">{item.title}</h4>
                <p className="text-gray-700 text-xs md:text-base">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 13,
      title: 'Por Que Escolher APP MANUTENÇÃO?',
      subtitle: 'Diferenciais que fazem a diferença',
      content: (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
          {[
            '✓ Sem taxa de adesão',
            '✓ Sem compromisso longo',
            '✓ Suporte dedicado',
            '✓ Plataforma intuitiva',
            '✓ Segurança garantida',
            '✓ Integração fácil',
            '✓ Relatórios profissionais',
            '✓ Acesso mobile completo'
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              className="p-2 md:p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg text-sm md:text-lg font-semibold text-gray-900"
            >
              {item}
            </motion.div>
          ))}
        </div>
      ),
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 14,
      title: 'Próximos Passos',
      subtitle: 'Comece sua transformação agora',
      content: (
        <div className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { num: '1', title: 'Escolha', desc: 'Seu plano' },
              { num: '2', title: 'Teste', desc: '7 dias grátis' },
              { num: '3', title: 'Configure', desc: 'Sua conta' },
              { num: '4', title: 'Comece', desc: 'A usar' }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="text-center"
              >
                <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <span className="text-lg md:text-2xl font-bold text-white">{step.num}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm md:text-base">{step.title}</h4>
                <p className="text-xs md:text-sm text-gray-700">{step.desc}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-base md:text-xl text-gray-700">
            <strong>Estamos prontos para transformar sua gestão de manutenção!</strong>
          </p>
        </div>
      ),
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      textColor: 'text-gray-900'
    }
  ];

  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlay, slides.length]);

  // Touch/swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/apresentacao_sistema.pdf';
    link.download = 'apresentacao_sistema.pdf';
    link.click();
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch { /* clipboard not available */ }
  };

  const sharePresentation = async () => {
    const url = window.location.href;
    const text = `APP MANUTENÇÃO - Apresentação\nConfira nossa apresentação do sistema de gestão de manutenção\n${url}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch { /* clipboard not available */ }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  };

  const slide = slides[currentSlide];

  return (
    <>
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-slide {
            page-break-after: always;
            page-break-inside: avoid;
            width: 100%;
            height: 100vh;
            margin: 0;
            padding: 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: white !important;
            color: #1f2937 !important;
            border: none !important;
          }
          .print-slide img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
          }
          .print-slide h1 {
            font-size: 48px;
            margin: 0 0 20px 0;
            color: #1f2937;
            page-break-after: avoid;
          }
          .print-slide h2 {
            font-size: 28px;
            margin: 0 0 30px 0;
            color: #666;
            page-break-after: avoid;
          }
          .print-slide .print-content {
            font-size: 16px;
            line-height: 1.6;
            color: #1f2937;
            page-break-inside: avoid;
          }
          .print-slide ul {
            margin: 20px 0;
            padding-left: 30px;
          }
          .print-slide li {
            margin: 10px 0;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gray-100 flex flex-col" ref={presentationRef}>
        {!isPrintMode && (
          <>
            {/* Header */}
            <div className="bg-white shadow-md p-3 md:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3">
                <img src="/LogoManutenção2.png" alt="APP MANUTENÇÃO" className="h-8 md:h-12" />
                <span className="text-lg md:text-xl font-bold text-gray-900">Apresentação</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadPDF}
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <Copy className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Copiar Link</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sharePresentation}
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-1 md:gap-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 text-xs md:text-sm"
                >
                  <Printer className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div 
              className="flex-1 flex flex-col items-center justify-center p-3 md:p-8"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className={`w-full max-w-5xl ${slide.bgColor} rounded-xl md:rounded-2xl shadow-xl md:shadow-2xl p-4 md:p-12 min-h-[50vh] md:min-h-96 flex flex-col justify-center ${slide.textColor}`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4 md:space-y-6"
                  >
                    <div>
                      <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-1 md:mb-2">{slide.title}</h1>
                      {slide.subtitle && (
                        <p className="text-base md:text-xl text-gray-600">{slide.subtitle}</p>
                      )}
                    </div>
                    <div className="text-sm md:text-lg">{slide.content}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white shadow-md p-3 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2 md:gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevSlide}
                  className="rounded-full w-8 h-8 md:w-10 md:h-10"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                <span className="text-xs md:text-sm font-semibold text-gray-700 min-w-[60px] text-center">
                  {currentSlide + 1} / {slides.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextSlide}
                  className="rounded-full w-8 h-8 md:w-10 md:h-10"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>

              {/* Slide Indicators */}
              <div className="flex gap-1 md:gap-2 flex-wrap justify-center max-w-[200px] sm:max-w-xs md:max-w-2xl order-last sm:order-none overflow-hidden">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`h-1.5 md:h-2 rounded-full transition-all ${
                      idx === currentSlide
                        ? 'bg-orange-500 w-4 md:w-8'
                        : 'bg-gray-300 w-1.5 md:w-2 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isAutoPlay ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={`text-xs md:text-sm ${isAutoPlay ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  {isAutoPlay ? '⏸ Pausar' : '▶ Auto'}
                </Button>
              </div>
            </div>
          </>
        )}
        {isPrintMode && (
          <div className="print-view">
            {slides.map((slide, idx) => (
              <div key={idx} className="print-slide">
                <div>
                  <h1>{slide.title}</h1>
                  {slide.subtitle && <h2>{slide.subtitle}</h2>}
                  <div className="print-content">
                    {slide.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
