import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Copy, Printer, QrCode } from "lucide-react";

/**
 * QR Code de um registro, para colar no local ou imprimir.
 *
 * O endereço é sempre público: quem escaneia está no local e quase nunca tem
 * conta. Também mostra o link em texto, porque nem todo aparelho lê código.
 */
export function BotaoQrCode({ titulo, url }: { titulo: string; url: string }) {
  const [aberto, setAberto] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <QrCode className="mr-2 h-4 w-4" />
        QR Code
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">{titulo}</DialogTitle>
            <DialogDescription>
              Aponte a câmera para consultar. Abre sem precisar de login.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded border print:border-0">
              <QRCodeSVG value={url} size={180} level="M" />
            </div>
            <p className="text-[11px] text-slate-400 break-all text-center">{url}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={copiar}>
              <Copy className="mr-2 h-4 w-4" /> Copiar link
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BotaoQrCode;
