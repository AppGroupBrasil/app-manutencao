import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useRevelar } from "@/hooks/useRevelar";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  ClipboardCheck,
  ClipboardList,
  Columns3,
  FileText,
  Hash,
  ListChecks,
  QrCode,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

/**
 * Página inicial pública.
 *
 * Usa o mesmo vocabulário visual do sistema — cartão branco, borda fina, azul
 * como único acento — mas com o peso que uma página de venda pede: abertura
 * escura, tipografia grande e respiro entre as seções. Nada de gradiente em
 * tudo nem biblioteca de animação: o movimento é um fade discreto ao rolar.
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
    descricao: "A equipe em colunas, importando qualquer registro pelo número de protocolo.",
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

/** Três promessas que o sistema cumpre em toda função, sem exceção. */
const PILARES = [
  {
    icone: Hash,
    titulo: "Protocolo em tudo",
    descricao: "Cada registro nasce com um número que identifica ele sozinho.",
  },
  {
    icone: Camera,
    titulo: "Foto no lugar do serviço",
    descricao: "O registro é feito onde o trabalho acontece, do celular.",
  },
  {
    icone: FileText,
    titulo: "Relatório pronto",
    descricao: "PDF com fotos e histórico para enviar a quem cobra resultado.",
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

/** Bloco que aparece com um fade ao entrar na tela. */
function Revelar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { referencia, classe } = useRevelar<HTMLDivElement>();
  return (
    <div ref={referencia} className={`${classe} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Amostra da tela do sistema, montada com os mesmos elementos do painel.
 *
 * Não é captura de tela: é a própria linguagem do produto — cartão branco,
 * etiqueta de status, número de protocolo — o que mantém a promessa da página
 * igual ao que a pessoa encontra depois de entrar.
 */
function AmostraDoPainel() {
  const registros = [
    { protocolo: "OS-260810-0042", titulo: "Troca de lâmpadas — pátio", status: "Em execução", cor: "#2563eb" },
    { protocolo: "000318", titulo: "Vistoria mensal — cozinha", status: "Concluída", cor: "#059669" },
    { protocolo: "TRF-000127", titulo: "Limpeza da caixa d'água", status: "Agendada", cor: "#d97706" },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-slate-50">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-[11px] text-slate-400">appmanutencao.com.br</span>
      </div>

      <div className="p-4 space-y-2.5 bg-slate-50">
        {registros.map((r) => (
          <div key={r.protocolo} className="bg-white border rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-mono text-slate-400">{r.protocolo}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{r.titulo}</p>
              </div>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0"
                style={{ color: r.cor, borderColor: `${r.cor}55`, backgroundColor: `${r.cor}14` }}
              >
                {r.status}
              </span>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[ClipboardCheck, Search, QrCode].map((Icone, i) => (
            <div key={i} className="bg-white border rounded-xl p-3 flex items-center justify-center">
              <Icone className="w-5 h-5 text-blue-500" strokeWidth={1.75} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============ ABERTURA ============ */}
      <div className="relative bg-slate-950 text-white overflow-hidden">
        {/* Luz difusa e grade: profundidade sem gradiente gritante. */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-blue-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at 50% 0%, black 40%, transparent 75%)",
            }}
          />
        </div>

        <header className="relative z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            {/* Marca amarela como ela é, com o nome em texto: a arte com o
                lettering some no fundo escuro. */}
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
              <span className="font-bold text-lg tracking-tight">App Manutenção</span>
            </Link>
            <div className="flex-1" />
            <a
              href="#funcoes"
              className="hidden sm:block text-sm text-slate-300 hover:text-white transition-colors"
            >
              Funções
            </a>
            <a
              href="#planos"
              className="hidden sm:block text-sm text-slate-300 hover:text-white transition-colors ml-6"
            >
              Planos
            </a>
            <Link href="/login">
              <Button size="sm" className="ml-4 bg-white text-slate-900 hover:bg-slate-100">
                Entrar
              </Button>
            </Link>
          </div>
        </header>

        <section className="relative z-10 max-w-6xl mx-auto px-4 pt-12 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Revelar>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300 bg-blue-500/10 ring-1 ring-inset ring-blue-400/20 rounded-full px-3 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Gestão de manutenção
              </span>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mt-6">
                App Manutenção
                {/* A frase é longa para um título: entra menor, sem virar parede de texto. */}
                <span className="block text-blue-400 text-xl md:text-3xl font-semibold leading-snug mt-4">
                  Manutenção feita sob medida para a sua empresa e condomínio, de acordo com a
                  sua necessidade
                </span>
              </h1>

              <p className="text-lg text-slate-200 font-medium mt-5">
                Sem nenhum custo adicional para você.
              </p>

              <p className="text-base md:text-lg text-slate-400 max-w-xl mt-4 leading-relaxed">
                Ordens de serviço, vistorias, checklists e tarefas da equipe num sistema só —
                com protocolo, foto e histórico de tudo o que foi feito.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-9">
                <Link href="/login">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-12 text-base shadow-lg shadow-blue-950/50">
                    Entrar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <span className="text-sm text-slate-400">
                  <strong className="text-white font-semibold">7 dias grátis</strong>, sem
                  compromisso.
                </span>
              </div>

              {/* A promessa de adaptação fica junto do botão: é o argumento que
                  diferencia, e o cliente decide ali. */}
              <p className="text-sm md:text-base text-slate-400 max-w-xl mt-5 leading-relaxed border-l-2 border-blue-500/40 pl-4">
                A base já está pronta. <span className="text-slate-200">Nomes, funções, tipos
                de acesso e de manutenção</span> se ajustam ao seu caso — e o que faltar, a
                gente desenvolve para você.
              </p>
            </Revelar>

            <Revelar className="lg:pl-6">
              <AmostraDoPainel />
            </Revelar>
          </div>
        </section>

        {/* Faixa de pilares, encaixada na borda da abertura. */}
        <div className="relative z-10 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            {PILARES.map((p) => {
              const Icone = p.icone;
              return (
                <div key={p.titulo} className="py-6 sm:px-8 first:sm:pl-0 last:sm:pr-0">
                  <Icone className="w-5 h-5 text-blue-400" strokeWidth={1.75} />
                  <h3 className="font-semibold mt-3">{p.titulo}</h3>
                  <p className="text-sm text-slate-400 mt-1">{p.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============ FUNÇÕES ============ */}
      <section id="funcoes" className="bg-slate-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-20 lg:py-24">
          <Revelar className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              O que você faz no sistema
            </h2>
            <p className="text-slate-600 mt-4 text-lg">
              Tudo com número de protocolo, foto e responsável — do celular ou do computador.
            </p>
          </Revelar>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
            {FUNCOES.map((f) => {
              const Icone = f.icone;
              return (
                <Revelar key={f.titulo}>
                  <div className="h-full bg-white border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                      <Icone className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-4">{f.titulo}</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.descricao}</p>
                  </div>
                </Revelar>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ EQUIPE ============ */}
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-20 lg:py-24">
          <Revelar>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100 rounded-full px-3 py-1.5">
                  <Users className="w-3.5 h-3.5" /> Sua equipe
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mt-6">
                  Cada pessoa vê o que precisa ver
                </h2>
                <p className="text-slate-600 mt-5 text-lg leading-relaxed">
                  O gestor decide, funcionário por funcionário, o que aparece na tela dele, o
                  que ele pode registrar e o que pode excluir.
                </p>
                <ul className="space-y-3 mt-7">
                  {[
                    "O funcionário entra pelo celular e registra com foto no local",
                    "Permissão por pessoa: ver, criar e excluir, função por função",
                    "O gestor acompanha tudo num painel só, com o que espera resposta em destaque",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-6">
                <div className="space-y-3">
                  {[
                    { nome: "Ana — Zeladoria", funcoes: "Checklists · Ocorrências", cria: true },
                    { nome: "Carlos — Manutenção", funcoes: "O.S. · Vistorias · Tarefas", cria: true },
                    { nome: "Marta — Recepção", funcoes: "Ocorrências", cria: false },
                  ].map((p) => (
                    <div
                      key={p.nome}
                      className="bg-white border rounded-xl p-4 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{p.nome}</p>
                        <p className="text-xs text-slate-500 truncate">{p.funcoes}</p>
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                          p.cria
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                            : "text-slate-500 border-slate-200 bg-slate-50"
                        }`}
                      >
                        {p.cria ? "vê e registra" : "só consulta"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      {/* ============ PLANOS ============ */}
      <section id="planos" className="bg-slate-50 border-b">
        <div className="max-w-5xl mx-auto px-4 py-20 lg:py-24">
          <Revelar className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Planos</h2>
            <p className="text-slate-600 mt-4 text-lg">
              O sistema é o mesmo nos dois. O que muda é o porte da operação.
            </p>
          </Revelar>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14">
            {PLANOS.map((p) => (
              <Revelar key={p.nome}>
                <div
                  className={`h-full bg-white rounded-2xl p-8 relative ${
                    p.destaque
                      ? "ring-2 ring-blue-600 shadow-xl shadow-blue-950/5"
                      : "border shadow-sm"
                  }`}
                >
                  {p.destaque && (
                    <span className="absolute -top-3 left-8 text-[11px] font-semibold uppercase tracking-wide text-white bg-blue-600 rounded-full px-3 py-1">
                      Mais completo
                    </span>
                  )}

                  <h3 className="font-semibold text-slate-900 text-lg">{p.nome}</h3>
                  <p className="text-sm text-slate-500 mt-1">{p.descricao}</p>

                  <div className="flex items-baseline gap-1.5 mt-6">
                    <span className="text-4xl font-bold text-slate-900 tracking-tight">
                      {p.preco}
                    </span>
                    <span className="text-slate-500">/mês</span>
                  </div>

                  <ul className="space-y-3 mt-7">
                    {p.itens.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link href="/login">
                    <Button
                      className={`w-full mt-8 h-11 ${
                        p.destaque ? "bg-blue-600 hover:bg-blue-500" : ""
                      }`}
                      variant={p.destaque ? "default" : "outline"}
                    >
                      Testar 7 dias grátis
                    </Button>
                  </Link>
                </div>
              </Revelar>
            ))}
          </div>

          <p className="text-sm text-slate-500 text-center mt-8 max-w-2xl mx-auto">
            Grande porte é quem tem <strong className="text-slate-700">várias unidades</strong> ou{" "}
            <strong className="text-slate-700">muitos funcionários</strong>. Na dúvida, fale com a
            gente pelo WhatsApp — o botão fica no canto da tela.
          </p>
        </div>
      </section>

      {/* ============ FECHAMENTO ============ */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Revelar>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Comece hoje, sem compromisso
            </h2>
            <p className="text-slate-400 mt-4 text-lg">
              São 7 dias grátis para colocar a sua operação dentro do sistema e ver o resultado.
            </p>
            <div className="flex justify-center mt-8">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 px-8 h-12 text-base"
                >
                  Entrar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Revelar>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-white/10 text-slate-400">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-slate-200">App Manutenção</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} App Manutenção. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
