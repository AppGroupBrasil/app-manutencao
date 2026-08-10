import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { formatarWhatsapp, linkWhatsapp } from "@shared/whatsapp";
import { Copy, Loader2, MessageCircle, Share2, Users } from "lucide-react";

/**
 * Compartilhamento de um registro.
 *
 * Antes era o `navigator.share`, que no computador abre o painel do Windows —
 * Outlook, Teams, Copilot — e raramente mostra o WhatsApp, porque quem monta
 * aquela lista é o sistema operacional. Aqui os dois caminhos são explícitos e
 * iguais em qualquer aparelho.
 *
 * O `wa.me` abre **uma conversa por vez**: por isso a lista mostra as pessoas e
 * cada toque abre o WhatsApp naquele contato. Não existe envio para vários de
 * uma vez por este caminho.
 */
export function CompartilharWhatsapp({
  condominioId,
  mensagem,
  aberto,
  onFechar,
}: {
  condominioId: number;
  /** Texto pronto, com título, protocolo e link quando houver. */
  mensagem: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  const { data: equipe, isLoading } = trpc.funcionario.list.useQuery(
    { condominioId },
    { enabled: aberto && condominioId > 0 },
  );

  const comWhatsapp = (equipe ?? []).filter(
    (f) => !!(f as { whatsapp?: string | null }).whatsapp,
  );

  const abrirConversa = (numero?: string | null) => {
    window.open(linkWhatsapp(mensagem, numero), "_blank");
    onFechar();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      toast.success("Copiado");
      onFechar();
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
          <DialogDescription>
            Escolha quem recebe. O WhatsApp abre com a mensagem pronta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : comWhatsapp.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              Ninguém da equipe tem WhatsApp cadastrado ainda. O campo fica na ficha do
              funcionário.
            </p>
          ) : (
            comWhatsapp.map((f) => {
              const numero = (f as { whatsapp?: string | null }).whatsapp;
              return (
                <button
                  key={f.id}
                  onClick={() => abrirConversa(numero)}
                  className="w-full flex items-center gap-3 border rounded-xl px-3 py-2.5 text-left hover:border-slate-300 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{f.nome}</p>
                    <p className="text-xs text-slate-500">{formatarWhatsapp(numero)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Button
            className="w-full bg-[#25D366] hover:bg-[#1EBE57] text-white"
            onClick={() => abrirConversa(null)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Escolher contato no WhatsApp
          </Button>
          <Button variant="outline" className="w-full" onClick={copiar}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Botão que abre o compartilhamento; deixa a tela chamadora com uma linha só. */
export function BotaoCompartilhar({
  condominioId,
  mensagem,
  rotulo,
}: {
  condominioId: number;
  mensagem: string;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Share2 className="w-4 h-4" />
        {rotulo ? <span className="ml-2">{rotulo}</span> : null}
      </Button>
      <CompartilharWhatsapp
        condominioId={condominioId}
        mensagem={mensagem}
        aberto={aberto}
        onFechar={() => setAberto(false)}
      />
    </>
  );
}

export default CompartilharWhatsapp;
