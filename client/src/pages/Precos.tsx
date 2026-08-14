import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SecaoPlanos } from "@/components/SecaoPlanos";
import { BotaoSuporte } from "@/components/BotaoSuporte";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Preços e planos, alcançável de dentro da tela de entrada.
 *
 * A página inicial já mostra os planos, mas quem chega direto no login (link do
 * WhatsApp, aplicativo instalado) nunca passa por ela — e perguntar o preço
 * virava mensagem para o suporte. A seção é a mesma, importada, para o valor
 * não existir escrito em dois lugares.
 */
export default function Precos() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>
          <div className="flex-1" />
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="" className="h-8 w-8" />
            <span className="font-semibold tracking-tight">App Manutenção</span>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-12 pt-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Preços e planos</h1>
          <p className="text-slate-400 mt-3 text-lg">
            <strong className="text-white font-semibold">7 dias grátis</strong> para testar, sem
            cartão e sem compromisso.
          </p>
        </div>
      </header>

      {/* Aqui o passo seguinte é criar a conta: quem abriu esta página já está
          na porta do sistema e não precisa voltar para o login. */}
      <SecaoPlanos destino="/cadastrar" className="bg-slate-50 border-b flex-1" />

      <section className="bg-white">
        <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4">
          <p className="text-slate-600">
            Ficou com dúvida sobre qual plano é o seu? Fale com a gente.
          </p>
          <BotaoSuporte />
          <Link href="/cadastrar">
            <Button variant="outline" className="w-full h-11">
              Criar conta e testar <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
