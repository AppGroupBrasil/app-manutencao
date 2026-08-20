import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";

/**
 * Caixa de avisos do portal do funcionário.
 *
 * O sino do painel lê `notificacoes` por conta de usuário, e o funcionário não
 * tem uma: a O.S. designada para a equipe dele saía por e-mail e não existia no
 * aplicativo. Aqui é a mesma caixa, endereçada a ele.
 *
 * Some quando não há nada: quem trabalha em cliente que não usa equipe nunca
 * recebe aviso, e um sino sempre vazio só ocuparia a barra.
 */
export function AvisosDoFuncionario() {
  const [, setLocation] = useLocation();
  const [aberto, setAberto] = useState(false);
  const utils = trpc.useUtils();

  const { data: avisos = [], isLoading } = trpc.notificacaoFuncionario.list.useQuery(
    { limit: 20 },
    // Enquanto o portal está aberto, a designação pode chegar a qualquer hora.
    // `retry: false` porque sessão expirada não melhora com insistência: o sino
    // some e o portal segue funcionando.
    { refetchInterval: 60_000, retry: false },
  );
  const { data: naoLidas = 0 } = trpc.notificacaoFuncionario.countUnread.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: false,
  });

  const recarregar = async () => {
    await Promise.all([
      utils.notificacaoFuncionario.list.invalidate(),
      utils.notificacaoFuncionario.countUnread.invalidate(),
    ]);
  };

  const marcarLida = trpc.notificacaoFuncionario.markAsRead.useMutation({ onSuccess: recarregar });
  const marcarTodas = trpc.notificacaoFuncionario.markAllAsRead.useMutation({
    onSuccess: recarregar,
  });
  const excluir = trpc.notificacaoFuncionario.delete.useMutation({ onSuccess: recarregar });

  if (!isLoading && avisos.length === 0) return null;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Avisos">
          <Bell className="w-5 h-5 text-slate-600" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Avisos</span>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => marcarTodas.mutate()}
            >
              <Check className="w-3.5 h-3.5" /> Marcar todos
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : (
            avisos.map((aviso) => (
              <div
                key={aviso.id}
                className={`px-3 py-2 ${aviso.lida ? "" : "bg-blue-50/60"}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => {
                      if (!aviso.lida) marcarLida.mutate({ id: aviso.id });
                      if (aviso.link) {
                        setAberto(false);
                        setLocation(aviso.link);
                      }
                    }}
                  >
                    <p className="text-sm font-medium text-slate-800">{aviso.titulo}</p>
                    {aviso.mensagem && (
                      <p className="text-xs text-slate-600 line-clamp-2">{aviso.mensagem}</p>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-slate-400 hover:text-red-600"
                    onClick={() => excluir.mutate({ id: aviso.id })}
                    aria-label="Excluir aviso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AvisosDoFuncionario;
