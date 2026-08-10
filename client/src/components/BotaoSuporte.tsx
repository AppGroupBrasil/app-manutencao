import { MessageCircle } from "lucide-react";

/** Mesmo número do balão flutuante — um lugar só para trocar. */
const WHATSAPP = "5511933284364";
const MENSAGEM = "Olá! Preciso de ajuda para acessar o App Manutenção.";

/**
 * Atalho para o suporte na tela de login.
 *
 * Quem não consegue entrar não tem como pedir ajuda dentro do sistema — e o
 * balão flutuante passa despercebido justamente na hora do aperto. Aqui o
 * contato fica na frente, na cor do WhatsApp.
 */
export function BotaoSuporte({ className = "" }: { className?: string }) {
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] hover:bg-[#1EBE57] text-white font-medium py-2.5 transition-colors ${className}`}
    >
      <MessageCircle className="w-5 h-5" />
      Fale com suporte
    </a>
  );
}

export default BotaoSuporte;
