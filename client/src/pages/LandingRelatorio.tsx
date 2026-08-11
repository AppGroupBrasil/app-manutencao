import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ScrollText, 
  ArrowLeft, 
  Check,
  FileText,
  Camera,
  Table,
  Printer,
  Search,
  Clock,
  ClipboardList,
  Wrench,
  ClipboardCheck,
  Eye,
  AlertTriangle,
  ImageIcon
} from "lucide-react";
import { Link } from "wouter";

const features = [
  {
    icon: ScrollText,
    title: "Rolagem Contínua",
    description: "Documento longo com navegação fluida, ideal para leitura detalhada de vistorias e manutenções."
  },
  {
    icon: Table,
    title: "Tabelas e Dados",
    description: "Apresente checklists, itens verificados e status de manutenções de forma clara e organizada."
  },
  {
    icon: Camera,
    title: "Fotos Antes e Depois",
    description: "Documente visualmente o progresso de obras, reparos e melhorias com comparativos fotográficos."
  },
  {
    icon: Search,
    title: "Busca no Documento",
    description: "Encontre rapidamente qualquer informação com a função de pesquisa integrada."
  },
  {
    icon: Printer,
    title: "Impressão Otimizada",
    description: "Layout preparado para impressão em formato A4 com quebras de página automáticas."
  },
  {
    icon: Clock,
    title: "Histórico Completo",
    description: "Mantenha um arquivo organizado de todos os relatórios de gestão ao longo do tempo."
  }
];

const reportTypes = [
  { icon: ClipboardCheck, name: "Vistorias", color: "bg-purple-500" },
  { icon: Wrench, name: "Manutenções", color: "bg-blue-500" },
  { icon: ClipboardList, name: "Checklists", color: "bg-emerald-500" },
  { icon: ImageIcon, name: "Antes e Depois", color: "bg-amber-500" },
  { icon: AlertTriangle, name: "Ocorrências", color: "bg-pink-500" },
  { icon: Eye, name: "Inspeções", color: "bg-slate-500" },
];

const benefits = [
  "Formato profissional para documentos",
  "Índice automático navegável",
  "Fotos com legendas detalhadas",
  "Cabeçalho e rodapé personalizados",
  "Exportação em PDF",
  "Geolocalização incluída"
];

export default function LandingRelatorio() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
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
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif font-bold text-xl">Relatórios de Gestão</span>
            </div>
            <Link href="/dashboard/revistas">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Criar Relatório
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 mb-6">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Layout Scroll</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6">
                Relatórios de
                <span className="text-purple-600"> Gestão</span>
                <br />Detalhados
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Crie documentos extensos com rolagem contínua, perfeitos para vistorias, 
                manutenções, checklists e relatórios de ocorrências da organização.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/revistas">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                    <ScrollText className="w-5 h-5 mr-2" />
                    Criar Meu Relatório
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Report Preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-lg shadow-inner overflow-hidden">
                  {/* Report Document */}
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="border-b pb-4">
                      <p className="text-xs text-purple-600 font-medium">RELATÓRIO DE VISTORIA</p>
                      <h3 className="text-lg font-serif font-bold text-gray-900">Inspeção Mensal</h3>
                      <p className="text-xs text-gray-500">Dezembro 2024 • Residencial Jardins</p>
                    </div>
                    
                    {/* Content preview */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <p className="text-sm font-medium text-gray-900">1. Áreas Comuns</p>
                      </div>
                      <div className="pl-3 space-y-1">
                        <div className="h-2 bg-gray-100 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 rounded w-4/5"></div>
                        <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <p className="text-sm font-medium text-gray-900">2. Checklist de Itens</p>
                      </div>
                      <div className="pl-3">
                        <div className="bg-gray-50 rounded p-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Itens OK</span>
                            <span className="text-emerald-600 font-medium">45 itens</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-600">Pendências</span>
                            <span className="text-amber-600 font-medium">3 itens</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <p className="text-sm font-medium text-gray-900">3. Fotos Antes/Depois</p>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="border-t pt-2 text-center">
                      <p className="text-xs text-gray-400">Página 1 de 8</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-2">
                <span className="text-sm font-medium text-purple-600">PDF Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Report Types Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">
              Tipos de Relatórios
            </h2>
            <p className="text-gray-600">Modelos prontos para gestão operacional da organização</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {reportTypes.map((type, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className={`w-12 h-12 rounded-xl ${type.color} flex items-center justify-center mx-auto mb-3`}>
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{type.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Documentos Completos e Profissionais
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Recursos avançados para criar relatórios de gestão que impressionam
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-purple-600" />
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
      <section className="py-20 bg-purple-600">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">
                Por que escolher o formato Relatório?
              </h2>
              <p className="text-xl text-purple-100 mb-8">
                O formato de documento contínuo é perfeito para vistorias detalhadas, 
                manutenções documentadas e checklists completos.
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
                <ClipboardCheck className="w-16 h-16 text-white mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Gestão Documentada</h3>
                <p className="text-purple-100">
                  Documente todas as vistorias, manutenções e ocorrências da organização 
                  com fotos, checklists e relatórios profissionais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
            Documente sua Gestão com Profissionalismo
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Crie relatórios detalhados de vistorias, manutenções e ocorrências.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard/revistas">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                <ScrollText className="w-5 h-5 mr-2" />
                Criar Meu Relatório Grátis
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
