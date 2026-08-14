import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Revelar } from "@/components/Revelar";
import { Check } from "lucide-react";

/**
 * Preços e planos — a mesma seção da página inicial e da tela de Preços.
 *
 * Vive fora da Home porque quem já está na tela de entrada também precisa ver o
 * preço, e preço escrito em dois lugares vira preço divergente no dia do
 * reajuste.
 */

/** A diferença de plano é o porte, não a função: os dois veem o sistema inteiro. */
export const PLANOS = [
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

export function SecaoPlanos({
  /** Para onde vai o botão do plano. Na tela de entrada, o cadastro é o passo seguinte. */
  destino = "/login",
  className = "bg-slate-50 border-b",
}: {
  destino?: string;
  className?: string;
}) {
  return (
    <section id="planos" className={className}>
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

                <Link href={destino}>
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
  );
}

export default SecaoPlanos;
