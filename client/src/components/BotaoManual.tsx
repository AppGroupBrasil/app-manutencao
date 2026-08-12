import { BookOpen, Download, MessageCircle } from "lucide-react";

/**
 * Arquivos estáticos gerados por `pnpm manual` — não são rotas do app.
 * O nome do PDF é o que aparece na conversa do WhatsApp, por isso é descritivo.
 */
const PDF = "/manual-app-manutencao.pdf";

/**
 * Manual de instruções na tela de entrada.
 *
 * Fica antes do login de propósito: o público do cliente é idoso, e a dúvida
 * aparece justamente na hora de entrar. Sai como PDF porque o manual precisa
 * viver fora do sistema — vai para o grupo do WhatsApp, fica no celular e
 * continua servindo sem internet, sem ninguém ter que achar a tela de novo.
 */
export function BotaoManual({ className = "" }: { className?: string }) {
  // Absoluto: o link viaja para outra pessoa, e caminho relativo não abre nada
  // dentro do WhatsApp.
  const endereco =
    typeof window !== "undefined" ? `${window.location.origin}${PDF}` : PDF;

  const mensagem = [
    "*Manual do App Manutenção*",
    "Como usar o sistema, passo a passo, com os botões da tela.",
    "",
    endereco,
  ].join("\n");

  return (
    <div className={`rounded-lg border border-slate-200 bg-white/70 p-3 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <BookOpen className="w-4 h-4 text-blue-600" />
        Manual de instruções
      </p>
      <p className="text-xs text-slate-500 mt-0.5">
        Passo a passo de como usar o sistema, com os botões da tela.
      </p>

      <div className="grid grid-cols-2 gap-2 mt-2.5">
        {/* `download` guarda o arquivo; no iPhone abre no visualizador, de onde
            dá para compartilhar do mesmo jeito. */}
        <a
          href={PDF}
          download="manual-app-manutencao.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium py-2.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar em PDF
        </a>

        {/* wa.me sem número abre a lista de conversas: quem envia escolhe para
            quem. O arquivo em si não vai por link — vai o endereço do PDF. */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-[#25D366] bg-white hover:bg-[#25D366]/10 text-[#0f7a3d] text-sm font-medium py-2.5 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

export default BotaoManual;
