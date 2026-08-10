import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Columns3,
  ListChecks,
  QrCode,
  Search,
  Users,
  Wrench,
} from "lucide-react";

/**
 * Página inicial pública.
 *
 * Segue o desenho das telas do sistema — fundo claro, cartão branco com borda,
 * sem gradiente nem animação de entrada. Quem chega vê o que o sistema faz
 * hoje e entra; a conversa acontece pelo WhatsApp, que já flutua em todas as
 * páginas.
 */

/** O que o sistema entrega. A mesma lista do painel, sem promessa a mais. */
const FUNCOES = [
  {
    icone: ClipboardList,
    titulo: "Ordens de Serviço",
    descricao:
      "Abertura com protocolo, responsáveis, fotos, anexos, orçamento e histórico de cada passo.",
  },
  {
    icone: CalendarClock,
    titulo: "Agenda de Vencimentos",
    descricao: "Contratos, serviços e manutenções num calendário, com aviso antes de vencer.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Checklists",
    descricao:
      "Verificações do dia a dia, item a item, com foto de antes e depois e relato de problema.",
  },
  {
    icone: Search,
    titulo: "Vistorias",
    descricao:
      "Pré-definida ou ao vivo, com status por item, galeria de fotos e relatório em PDF.",
  },
  {
    icone: ListChecks,
    titulo: "Lista de Tarefas",
    descricao: "Tarefas por pessoa e por recorrência, com registro de execução.",
  },
  {
    icone: Columns3,
    titulo: "Quadro de Atividades",
    descricao:
      "A equipe em colunas, importando qualquer registro pelo número de protocolo.",
  },
  {
    icone: AlertTriangle,
    titulo: "Ocorrências",
    descricao: "Registro rápido de incidente, com foto, prioridade e responsável.",
  },
  {
    icone: QrCode,
    titulo: "QR Code por local",
    descricao:
      "Etiqueta em cada ponto: quem escaneia relata pelo celular, sem ter conta no sistema.",
  },
] as const;

/** A diferença de plano é o porte, não a função: os dois veem o sistema inteiro. */
const PLANOS = [
  {
    nome: "Pequeno e médio porte",
    preco: "R$ 199",
    descricao: "Uma unidade e equipe enxuta.",
    destaque: false,
    itens: [
      "Todas as funções do sistema",
      "Portal do funcionário com permissão por pessoa",
      "Relatórios em PDF e QR Code por local",
      "Suporte pelo WhatsApp",
    ],
  },
  {
    nome: "Grande porte",
    preco: "R$ 350",
    descricao: "Várias unidades ou muitos funcionários.",
    destaque: true,
    itens: [
      "Tudo do plano anterior",
      "Várias unidades sob um gestor-chefe",
      "Gestor por unidade, com equipe própria",
      "Vocabulário do sistema adaptado ao seu negócio",
    ],
  },
] as const;

/** Os outros sistemas da casa, que seguem como estão. */
const OUTROS_SISTEMAS = [
  {
    nome: "App Condominial",
    descricao: "O condomínio inteiro no celular do morador.",
    href: "/app",
  },
  {
    nome: "Revista Digital",
    descricao: "A revista do cliente, montada e publicada em minutos.",
    href: "/revista",
  },
  {
    nome: "Relatórios de Gestão",
    descricao: "Relatório de vistoria e de gestão pronto para enviar.",
    href: "/relatorio",
  },
] as const;

/** Passa sozinho; as setas e os pontos só antecipam. */
function Carrossel() {
  const [indice, setIndice] = useState(0);
  const total = OUTROS_SISTEMAS.length;

  useEffect(() => {
    const timer = setInterval(() => setIndice((i) => (i + 1) % total), 5000);
    return () => clearInterval(timer);
  }, [total]);

  const atual = OUTROS_SISTEMAS[indice];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Sistema anterior"
          onClick={() => setIndice((i) => (i - 1 + total) % total)}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <a
          href={atual.href}
          className="flex-1 bg-white border rounded-xl px-6 py-8 text-center hover:border-slate-300 transition-colors"
        >
          <h3 className="font-semibold text-slate-800">{atual.nome}</h3>
          <p className="text-sm text-slate-500 mt-1">{atual.descricao}</p>
          <span className="inline-flex items-center gap-1 text-sm text-blue-600 mt-3">
            Conhecer <ArrowRight className="w-4 h-4" />
          </span>
        </a>

        <Button
          variant="ghost"
          size="sm"
          aria-label="Próximo sistema"
          onClick={() => setIndice((i) => (i + 1) % total)}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex justify-center gap-1.5 mt-4">
        {OUTROS_SISTEMAS.map((s, i) => (
          <button
            key={s.nome}
            aria-label={`Ver ${s.nome}`}
            onClick={() => setIndice(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === indice ? "w-6 bg-slate-700" : "w-1.5 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <img
              src="/logo-manutencao-header.png"
              alt="App Manutenção"
              className="h-9 object-contain"
            />
          </Link>
          <div className="flex-1" />
          <a href="#planos" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900">
            Planos
          </a>
          <Link href="/login">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-4 pt-14 pb-12 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <Wrench className="w-3.5 h-3.5" /> Gestão de manutenção
          </span>

          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mt-5">
            App Manutenção
            {/* A frase é longa para um título: entra menor, sem virar parede de texto. */}
            <span className="block text-blue-600 text-xl md:text-3xl mt-3">
              Manutenção feita sob medida para a sua empresa, de acordo com a sua necessidade
            </span>
          </h1>

          {/* Complemento da chamada: a adaptação está incluída. */}
          <p className="text-base md:text-lg font-medium text-slate-700 mt-3">
            Sem nenhum custo adicional para você.
          </p>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-5">
            Ordens de serviço, vistorias, checklists e tarefas da equipe num sistema só — com
            protocolo, foto e histórico de tudo o que foi feito.
          </p>

          <div className="flex justify-center mt-8">
            <Link href="/login">
              <Button size="lg">
                Entrar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            <strong className="text-slate-700">7 dias grátis</strong>, sem compromisso.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            O que você faz no sistema
          </h2>
          <p className="text-slate-600 text-center mt-2">
            Tudo com número de protocolo, foto e responsável — do celular ou do computador.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {FUNCOES.map((f) => {
              const Icone = f.icone;
              return (
                <div key={f.titulo} className="bg-white border rounded-xl p-4">
                  <Icone className="w-6 h-6 text-blue-500 shrink-0" strokeWidth={1.75} />
                  <h3 className="font-semibold text-slate-800 mt-3">{f.titulo}</h3>
                  <p className="text-sm text-slate-500 mt-1">{f.descricao}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-12">
          <div className="bg-white border rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
            <Users className="w-8 h-8 text-blue-500 shrink-0" strokeWidth={1.75} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Cada pessoa vê o que precisa ver
              </h2>
              <p className="text-slate-600 mt-2">
                O gestor decide, funcionário por funcionário, o que aparece na tela dele, o que
                ele pode registrar e o que pode excluir. O funcionário entra pelo celular e
                registra com foto no lugar onde o serviço acontece; o gestor acompanha tudo num
                painel só.
              </p>
            </div>
          </div>
        </section>

        <section id="planos" className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Planos</h2>
          <p className="text-slate-600 text-center mt-2">
            O sistema é o mesmo nos dois. O que muda é o porte da operação.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {PLANOS.map((p) => (
              <div
                key={p.nome}
                className={`bg-white border rounded-xl p-6 ${
                  p.destaque ? "border-blue-300 ring-1 ring-blue-100" : ""
                }`}
              >
                <h3 className="font-semibold text-slate-800">{p.nome}</h3>
                <p className="text-sm text-slate-500 mt-1">{p.descricao}</p>

                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl font-bold text-slate-900">{p.preco}</span>
                  <span className="text-slate-500">/mês</span>
                </div>

                <ul className="space-y-2 mt-5">
                  {p.itens.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/login">
                  <Button
                    className="w-full mt-6"
                    variant={p.destaque ? "default" : "outline"}
                  >
                    Testar 7 dias grátis
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 text-center mt-6">
            Grande porte é quem tem <strong className="text-slate-700">várias unidades</strong> ou{" "}
            <strong className="text-slate-700">muitos funcionários</strong>. Na dúvida, fale com a
            gente pelo WhatsApp — o botão fica no canto da tela.
          </p>
        </section>

        <section className="border-t bg-white/60">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <h2 className="text-xl font-bold text-slate-900 text-center">
              Outros sistemas da casa
            </h2>
            <p className="text-slate-600 text-center mt-2 mb-8">
              O App Manutenção é um deles. Conheça o resto.
            </p>
            <Carrossel />
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img
            src="/logo-manutencao-header.png"
            alt="App Manutenção"
            className="h-8 object-contain"
          />
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} App Manutenção. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
