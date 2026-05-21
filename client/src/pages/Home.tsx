import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppLoginModal } from "@/components/AppLoginModal";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import {
  Building2,
  BookOpen,
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  Code,
  Cog,
  FileText,
  Globe,
  Heart,
  LayoutDashboard,
  Package,
  Pen,
  Play,
  Search,
  ShoppingBag,
  Wrench,
  LayoutGrid,
  Shield,
  Clock,
  BarChart3,
  Users,
  Smartphone,
  Check,
  ArrowRight,
  Star,
  Zap,
  Target,
  Award,
  MessageCircle,
  MessageSquare,
  Copy,
  Download,
  Share2,
  ExternalLink,
  Link2,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [showAppLogin, setShowAppLogin] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 pt-6 md:pt-0">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <img src="/logo-manutencao-header.png" alt="App Manutenção" className="h-14 object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
              Funcionalidades
            </a>
            <a href="#setores" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
              Setores
            </a>
            <a href="#beneficios" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
              Benefícios
            </a>
            <a href="#preco" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
              Preços
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Botão removido - já existe botão de acessar a plataforma */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-36 md:pt-32 pb-24 overflow-hidden bg-gradient-to-br from-white via-orange-50/30 to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl" />
        </div>

        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold mb-6 shadow-lg shadow-orange-500/25">
                <Wrench className="w-4 h-4" />
                Sistema Universal de Manutenção
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Gestão de
                <span className="block text-orange-500">Manutenção</span>
                <span className="block text-gray-900">Inteligente</span>
              </h1>

              <p className="text-lg text-gray-600 mb-6 max-w-lg leading-relaxed">
                Plataforma completa para <strong className="text-gray-900">manutenções prediais, industriais, comerciais, hospitalares, escolares</strong> e de <strong className="text-gray-900">máquinas e equipamentos</strong>.
              </p>

              {/* Preço em destaque */}
              <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white mb-8 shadow-xl">
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-400">A partir de</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-orange-400">R$99</span>
                    <span className="text-gray-400">/mês</span>
                  </div>
                </div>
                <div className="w-px h-12 bg-gray-700" />
                <div className="text-left">
                  <span className="text-sm text-gray-300">Acesso completo</span>
                  <p className="text-xs text-orange-400">Sem taxa de adesão</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="text-base bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30">
                    <LayoutGrid className="w-5 h-5 mr-2" />
                    Acessar Plataforma
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                  onClick={() => setShowAppLogin(true)}
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  ACESSO DA EQUIPE
                </Button>
              </div>
            </motion.div>

            {/* Card Premium de Setores */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative mx-auto max-w-lg">
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
                  
                  <div className="text-center mb-8 relative">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-lg shadow-orange-500/30">
                      <Wrench className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Setores Atendidos
                    </h3>
                    <p className="text-gray-500">Soluções para todos os tipos de organização</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="group flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-200/50 transition-all cursor-pointer border border-orange-200/50 hover:border-orange-300 hover:shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Building2 className="w-6 h-6 text-orange-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-center">Predial</span>
                    </div>
                    <div className="group flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 transition-all cursor-pointer border border-gray-200/50 hover:border-gray-300 hover:shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Wrench className="w-6 h-6 text-gray-700" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-center">Industrial</span>
                    </div>
                    <div className="group flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-200/50 transition-all cursor-pointer border border-orange-200/50 hover:border-orange-300 hover:shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-6 h-6 text-orange-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-center">Comercial</span>
                    </div>
                    <div className="group flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 transition-all cursor-pointer border border-gray-200/50 hover:border-gray-300 hover:shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Heart className="w-6 h-6 text-gray-700" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-center">Hospitalar</span>
                    </div>
                    <div className="group flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-200/50 transition-all cursor-pointer border border-orange-200/50 hover:border-orange-300 hover:shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-orange-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-center">Escolar</span>
                    </div>
                    <div className="group flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 transition-all cursor-pointer border border-gray-200/50 hover:border-gray-300 hover:shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Package className="w-6 h-6 text-gray-700" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-center">Máquinas</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center mb-4 uppercase tracking-wider font-medium">Funcionalidades Principais</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <ClipboardCheck className="w-4 h-4 text-orange-500" />
                        <span>Ordens de Serviço</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Search className="w-4 h-4 text-orange-500" />
                        <span>Vistorias</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckSquare className="w-4 h-4 text-orange-500" />
                        <span>Checklists</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FileText className="w-4 h-4 text-orange-500" />
                        <span>Relatórios</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Personalização Sob Medida */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-white to-orange-50 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-orange-500/[0.08] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-orange-500/[0.06] rounded-full pointer-events-none" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 mb-6 shadow-xl shadow-orange-500/30">
              <Pen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Precisa de alguma função ou parâmetro <span className="text-orange-500">personalizado?</span>
            </h2>
            <div className="inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-orange-400 text-lg font-bold shadow-lg mt-2">
              🚀 Desenvolvemos para você sem nenhum custo adicional!*
            </div>
            <p className="text-sm text-gray-500 mt-3">*Disponível para todos os planos ativos. Sujeito a análise técnica de viabilidade.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Wrench,
                title: "Funções Sob Medida",
                description: "Criamos novas funcionalidades exclusivas para o seu fluxo de trabalho.",
              },
              {
                icon: Cog,
                title: "Parâmetros Customizados",
                description: "Ajustamos campos, formulários e regras de negócio à sua realidade.",
              },
              {
                icon: FileText,
                title: "Relatórios Personalizados",
                description: "Modelos de relatórios com a sua marca e os dados que você precisa.",
              },
              {
                icon: LayoutDashboard,
                title: "Dashboards Exclusivos",
                description: "Painéis de controle com os indicadores mais relevantes para sua operação.",
              },
              {
                icon: Code,
                title: "Integrações Especiais",
                description: "Conectamos o App Manutenção aos sistemas que sua empresa já utiliza.",
              },
              {
                icon: MessageSquare,
                title: "Suporte Dedicado",
                description: "Atendimento prioritário para entender suas necessidades e entregar rápido.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group bg-white rounded-2xl p-7 border border-gray-200 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-2xl bg-orange-100 group-hover:bg-orange-500 inline-flex items-center justify-center mb-4 transition-colors">
                  <item.icon className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Acesso / Download Banner */}
      <section className="py-12 bg-gradient-to-br from-gray-900 via-[#1a1a2e] to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-orange-500/[0.08] rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
            <div className="text-center max-w-sm">
              <h3 className="text-xl font-bold text-white mb-2">📲 Comece a usar agora mesmo</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Baixe o app ou acesse pelo navegador e transforme a gestão de manutenção da sua organização.</p>
            </div>

            <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-gray-600 to-transparent" />

            {/* Google Play */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#34A853] to-[#0F9D58] shadow-lg shadow-green-500/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="white"/>
                  <path d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z" fill="white" opacity=".8"/>
                  <path d="M20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81Z" fill="white" opacity=".6"/>
                  <path d="M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="white" opacity=".9"/>
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Disponível no</span>
              <span className="text-sm font-bold text-white">Google Play</span>
            </div>

            <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-gray-600 to-transparent" />

            {/* Web */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Acesse pelo navegador</span>
              <a href="https://www.appmanutencao.com.br" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-orange-400 border-b border-dashed border-orange-400/40 hover:border-orange-400 transition-colors">
                www.appmanutencao.com.br
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades Section */}
      <section id="funcionalidades" className="py-24 bg-gray-50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold mb-4">
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Sistema completo para gestão de manutenções preventivas e corretivas
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ClipboardCheck, title: "Ordens de Serviço", desc: "Crie, acompanhe e finalize OS com facilidade", color: "orange" },
              { icon: Search, title: "Vistorias", desc: "Realize inspeções detalhadas com fotos e relatórios", color: "gray" },
              { icon: CheckSquare, title: "Checklists", desc: "Listas de verificação personalizáveis", color: "orange" },
              { icon: Wrench, title: "Manutenções", desc: "Preventivas e corretivas organizadas", color: "gray" },
              { icon: Clock, title: "Agenda", desc: "Controle de vencimentos e prazos", color: "orange" },
              { icon: BarChart3, title: "Relatórios", desc: "Análises e métricas completas", color: "gray" },
              { icon: Users, title: "Equipes", desc: "Gestão de técnicos e colaboradores", color: "orange" },
              { icon: Smartphone, title: "App Mobile", desc: "Acesso em qualquer dispositivo", color: "gray" },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${item.color === 'orange' ? 'bg-orange-100' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
                      <item.icon className={`w-6 h-6 ${item.color === 'orange' ? 'text-orange-600' : 'text-gray-700'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Livro de Manutenção Section */}
      <section id="livro-manutencao" className="py-24 bg-gradient-to-br from-emerald-900 to-emerald-800">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold mb-4">
              Exclusivo
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Livro de Manutenção
            </h2>
            <p className="text-emerald-100 max-w-2xl mx-auto">
              Documente toda a história de manutenção da sua organização em um livro profissional e interativo
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Preview do Livro */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
                
                {/* Capa do Livro */}
                <div className="text-center mb-6 pb-6 border-b border-gray-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-4 shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Centro de Manutenção XYZ</h3>
                  <p className="text-gray-500 text-sm">Relatório Mensal - Fevereiro 2026</p>
                </div>

                {/* Conteúdo de Exemplo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
                    <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">12 Vistorias Realizadas</p>
                      <p className="text-gray-500 text-xs">100% dentro do prazo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
                    <Wrench className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">28 Manutenções Concluídas</p>
                      <p className="text-gray-500 text-xs">18 preventivas, 10 corretivas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">45 Checklists Aplicados</p>
                      <p className="text-gray-500 text-xs">Taxa de conformidade: 96%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Próximos Vencimentos</p>
                      <p className="text-gray-500 text-xs">3 calibrações, 2 licenças</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl" />
            </motion.div>

            {/* Benefícios do Livro */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Registre tudo em um só lugar
              </h3>
              <div className="space-y-4 mb-8">
                {[
                  { title: "Histórico Completo", desc: "Todas as manutenções, vistorias e ocorrências documentadas" },
                  { title: "Antes e Depois", desc: "Fotos comparativas das melhorias realizadas" },
                  { title: "Relatórios Automáticos", desc: "Gere livros profissionais com um clique" },
                  { title: "Compartilhe com a Equipe", desc: "Acesso fácil para toda a organização" },
                  { title: "Exportação em PDF", desc: "Imprima ou envie por email quando precisar" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-emerald-200 text-sm">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Link href="/demo-layouts">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Ver Exemplo do Livro
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefícios Section */}
      <section id="beneficios" className="py-24 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold mb-4">
                Benefícios
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Por que escolher o App Manutenção?
              </h2>
              <p className="text-gray-600 mb-8">
                Simplifique a gestão de manutenções da sua organização com uma plataforma moderna e intuitiva.
              </p>

              <div className="space-y-4">
                {[
                  "Reduza custos com manutenções preventivas",
                  "Aumente a produtividade da sua equipe",
                  "Tenha controle total em tempo real",
                  "Gere relatórios profissionais automaticamente",
                  "Acesse de qualquer lugar pelo celular",
                  "Suporte técnico especializado",
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Zap, title: "Rápido", desc: "Implantação em minutos", color: "orange" },
                { icon: Shield, title: "Seguro", desc: "Dados protegidos", color: "gray" },
                { icon: Target, title: "Preciso", desc: "Métricas confiáveis", color: "gray" },
                { icon: Award, title: "Qualidade", desc: "Sistema premiado", color: "orange" },
              ].map((item, index) => (
                <Card key={index} className={`border-0 shadow-lg ${index % 2 === 0 ? 'mt-8' : ''}`}>
                  <CardContent className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-2xl ${item.color === 'orange' ? 'bg-orange-100' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
                      <item.icon className={`w-7 h-7 ${item.color === 'orange' ? 'text-orange-600' : 'text-gray-700'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Preço Section */}
      <section id="preco" className="py-24 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold mb-4">
              PREÇOS E PLANOS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Planos flexíveis para sua organização
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Escolha o plano que melhor se adapta às suas necessidades
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {/* Plano Individual - R$99 */}
            <Card className="border-0 shadow-lg bg-white overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-1">Individual</h3>
                <p className="text-white font-semibold text-lg">1 USUÁRIO</p>
                <p className="text-orange-100 text-sm mt-1">Para começar</p>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg text-gray-500">R$</span>
                    <span className="text-6xl font-bold text-gray-900">99</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                  <p className="text-orange-500 mt-2 font-medium">Sem taxa de adesão</p>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    "Ordens de Serviço ilimitadas",
                    "Vistorias e Checklists",
                    "Relatórios profissionais",
                    "App mobile incluso",
                    "Suporte técnico",
                    "Atualizações gratuitas",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-gray-600" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/dashboard" className="block">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6">
                    Começar Agora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plano Pequenas Equipes - R$199 */}
            <Card className="border-0 shadow-lg bg-white overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-1">Pequenas Equipes</h3>
                <p className="text-white font-semibold text-lg">3 USUÁRIOS</p>
                <p className="text-orange-100 text-sm mt-1">Mais recursos e prioridade</p>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg text-gray-500">R$</span>
                    <span className="text-6xl font-bold text-gray-900">199</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                  <p className="text-orange-500 mt-2 font-medium">Sem taxa de adesão</p>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    "Ordens de Serviço ilimitadas",
                    "Vistorias e Checklists",
                    "Relatórios profissionais",
                    "App mobile incluso",
                    "Suporte técnico",
                    "Atualizações gratuitas",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-orange-600" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/dashboard" className="block">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6">
                    Começar Agora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plano Equipes Médias - R$299 */}
            <Card className="border-0 shadow-lg bg-white overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-1">Equipes Médias</h3>
                <p className="text-white font-semibold text-lg">5 USUÁRIOS</p>
                <p className="text-orange-100 text-sm mt-1">Solução completa</p>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg text-gray-500">R$</span>
                    <span className="text-6xl font-bold text-gray-900">299</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                  <p className="text-orange-500 mt-2 font-medium">Sem taxa de adesão</p>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    "Ordens de Serviço ilimitadas",
                    "Vistorias e Checklists",
                    "Relatórios profissionais",
                    "App mobile incluso",
                    "Suporte técnico",
                    "Atualizações gratuitas",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-gray-700" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/dashboard" className="block">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6">
                    Começar Agora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Seção de Contato para Equipes Maiores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-200 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Para equipes maiores
              </h3>
              <p className="text-gray-600 mb-6">
                Precisa de uma solução customizada com mais usuários e funcionalidades personalizadas? Entre em contato com o nosso suporte.
              </p>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com Suporte
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Conheça nosso contrato Section */}
      <section className="py-24 bg-gradient-to-br from-orange-50 to-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Conheça nosso contrato
              </h2>
              <p className="text-gray-600 text-lg">
                Transparência e flexibilidade em cada detalhe
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  title: "Sem Compromisso Longo",
                  description: "Cancele a qualquer momento sem multas ou penalidades. Você está no controle.",
                  icon: "✓",
                },
                {
                  title: "Sem Taxa de Adesão",
                  description: "Comece a usar imediatamente. Nenhuma taxa oculta ou inicial.",
                  icon: "✓",
                },
                {
                  title: "Suporte Dedicado",
                  description: "Equipe de suporte técnico pronta para ajudar com suas dúvidas.",
                  icon: "✓",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-orange-100 hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Link href="/contrato">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6">
                  <FileText className="w-5 h-5 mr-2" />
                  Visualizar Contrato
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Conheça o App Manutenção - Apresentação */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/[0.06] rounded-full blur-3xl" />
          <div className="absolute top-10 right-10 w-32 h-32 border border-orange-500/10 rounded-full" />
          <div className="absolute bottom-10 left-10 w-24 h-24 border border-orange-500/10 rounded-full" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Apresentação Completa
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Conheça o <span className="text-orange-400">App Manutenção</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Baixe nossa apresentação completa ou compartilhe o link com sua equipe e parceiros.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Baixar Apresentação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-orange-500/40 transition-all duration-300 text-center hover:bg-white/[0.08] cursor-pointer"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/apresentacao/apresentacao-home.html';
                link.target = '_blank';
                link.click();
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 inline-flex items-center justify-center mb-5 shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                <Download className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Baixar Apresentação</h3>
              <p className="text-sm text-gray-400 mb-4">Abra a apresentação completa e salve como PDF para enviar por e-mail.</p>
              <div className="inline-flex items-center gap-2 text-orange-400 text-sm font-semibold group-hover:gap-3 transition-all">
                <FileText className="w-4 h-4" />
                Abrir e exportar PDF
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Copiar Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-orange-500/40 transition-all duration-300 text-center hover:bg-white/[0.08] cursor-pointer"
              onClick={() => {
                const url = window.location.origin + '/apresentacao/apresentacao-home.html';
                navigator.clipboard.writeText(url).then(() => {
                  alert('Link copiado! \n\n' + url);
                });
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 inline-flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Link2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Copiar Link</h3>
              <p className="text-sm text-gray-400 mb-4">Copie o link da apresentação e envie para quem desejar.</p>
              <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-semibold group-hover:gap-3 transition-all">
                <Share2 className="w-4 h-4" />
                Copiar para área de transferência
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Enviar WhatsApp */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-green-500/40 transition-all duration-300 text-center hover:bg-white/[0.08] cursor-pointer"
              onClick={() => {
                const url = window.location.origin + '/apresentacao/apresentacao-home.html';
                const text = encodeURIComponent('Conheça o App Manutenção - Sistema completo de gestão de manutenção! \n\n' + url);
                window.open('https://wa.me/?text=' + text, '_blank');
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 inline-flex items-center justify-center mb-5 shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Enviar via WhatsApp</h3>
              <p className="text-sm text-gray-400 mb-4">Compartilhe a apresentação diretamente pelo WhatsApp.</p>
              <div className="inline-flex items-center gap-2 text-green-400 text-sm font-semibold group-hover:gap-3 transition-all">
                <ExternalLink className="w-4 h-4" />
                Compartilhar agora
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Pronto para transformar sua gestão de manutenção?
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Junte-se a centenas de organizações que já utilizam o App Manutenção
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8">
                  Começar Gratuitamente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-lg px-8">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar com Consultor
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo-manutencao-header.png" alt="App Manutenção" className="h-10 object-contain" />
            </div>
            <p className="text-gray-400 text-sm">
              © 2025 App Manutenção. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Termos de Uso
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Privacidade
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Modal de Login para Apps */}
      <AppLoginModal 
        open={showAppLogin} 
        onOpenChange={setShowAppLogin} 
      />
    </div>
  );
}
