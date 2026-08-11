import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LayoutGrid, 
  ArrowLeft, 
  Check,
  Smartphone,
  Bell,
  BarChart3,
  Users,
  Shield,
  Zap,
  MessageSquare,
  Calendar,
  Vote,
  Package,
  Settings,
  Globe
} from "lucide-react";
import { Link } from "wouter";

const features = [
  {
    icon: LayoutGrid,
    title: "Layout em Grade",
    description: "Interface organizada em cards que facilita a navegação e visualização rápida de todas as informações da organização."
  },
  {
    icon: Bell,
    title: "Notificações Push",
    description: "Alertas instantâneos para equipa sobre avisos importantes, eventos e votações ativas."
  },
  {
    icon: BarChart3,
    title: "Dashboard Intuitivo",
    description: "Painel de controle com visão geral de manutenções, vistorias e ocorrências da organização."
  },
  {
    icon: Users,
    title: "Gestão de Usuários",
    description: "Cadastro completo de usuários com informações de contato, setor e histórico."
  },
  {
    icon: Shield,
    title: "Segurança Integrada",
    description: "Controle de acesso, registro de visitantes e comunicação direta com a portaria."
  },
  {
    icon: Zap,
    title: "Acesso Rápido",
    description: "Funções rápidas para criar checklists, manutenções, ocorrências e vistorias em segundos."
  }
];

const modules = [
  { icon: MessageSquare, name: "Avisos", color: "bg-amber-500" },
  { icon: Calendar, name: "Eventos", color: "bg-blue-500" },
  { icon: Vote, name: "Votações", color: "bg-emerald-500" },
  { icon: Package, name: "Classificados", color: "bg-purple-500" },
  { icon: Users, name: "Funcionários", color: "bg-pink-500" },
  { icon: Settings, name: "Manutenções", color: "bg-slate-500" },
];

const benefits = [
  "Acesso 24/7 de qualquer dispositivo",
  "Interface responsiva para mobile e desktop",
  "Atualizações em tempo real",
  "Integração com WhatsApp",
  "Checklists e vistorias",
  "Backup na nuvem"
];

export default function LandingApp() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif font-bold text-xl">App Condominial</span>
            </div>
            <Link href="/dashboard/revistas">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Criar Meu App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 mb-6">
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-medium">Layout Grid</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6">
                Seu Condomínio na
                <span className="text-blue-600"> Palma da Mão</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Um aplicativo completo para gestão condominial com interface moderna em grade, 
                acesso rápido a todas as funcionalidades e notificações em tempo real.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/revistas">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    <LayoutGrid className="w-5 h-5 mr-2" />
                    Criar Meu App Agora
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* App Preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-4 shadow-inner">
                  <div className="grid grid-cols-3 gap-3">
                    {modules.map((module, index) => (
                      <div 
                        key={index}
                        className="aspect-square rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2 p-3 hover:bg-gray-100 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center`}>
                          <module.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{module.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 animate-bounce">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-2">
                <span className="text-sm font-medium text-emerald-600">✓ Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Tudo que seu Condomínio Precisa
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Funcionalidades completas para uma gestão moderna e eficiente
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-blue-600">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">
                Por que escolher o formato App?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                O layout em grade oferece a melhor experiência para acesso rápido e gestão diária da organização.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur">
              <div className="text-center">
                <Globe className="w-16 h-16 text-white mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Acesso Universal</h3>
                <p className="text-blue-100">
                  Funciona em qualquer navegador, sem necessidade de instalar aplicativos. 
                  Usuários acessam de smartphones, tablets ou computadores.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
            Pronto para Modernizar seu Condomínio?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Crie seu app condominial em minutos e transforme a comunicação com a equipa.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard/revistas">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <LayoutGrid className="w-5 h-5 mr-2" />
                Criar Meu App Grátis
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">
                Conhecer Outros Formatos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center text-gray-500">
          <p>© 2024 PlataformaDigital. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
