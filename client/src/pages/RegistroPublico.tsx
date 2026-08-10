import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Calendar, Hash, Loader2, MapPin } from "lucide-react";

/**
 * Leitura pública de checklist, manutenção, ocorrência ou vistoria.
 *
 * É para onde o QR do cartão e da folha impressa aponta. Só leitura: quem
 * escaneia está no local e quase nunca tem conta no sistema.
 */
const TIPOS_VALIDOS = ["checklist", "manutencao", "ocorrencia", "vistoria"] as const;
type TipoValido = (typeof TIPOS_VALIDOS)[number];

function formatarDataHora(valor?: string | Date | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="max-w-sm w-full">
        <CardContent className="py-10 flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
          <p className="font-semibold text-slate-700 mt-3">{texto}</p>
          <p className="text-sm text-slate-500 mt-1">
            O código pode ter sido substituído ou o registro removido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegistroPublico({ tipo, token }: { tipo: string; token: string }) {
  const tipoValido = (TIPOS_VALIDOS as readonly string[]).includes(tipo);

  const { data, isLoading, isError } = trpc.registroPublico.obter.useQuery(
    { tipo: tipo as TipoValido, token },
    { enabled: tipoValido && !!token, retry: false },
  );

  if (!tipoValido) return <Aviso texto="Endereço inválido" />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !data) return <Aviso texto="Registro não encontrado" />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">{data.rotuloTipo}</p>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5">{data.titulo}</h1>
          <p className="font-mono text-sm text-slate-500 mt-1 inline-flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> {data.protocolo}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {data.status && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border text-slate-600 capitalize">
                  {data.status}
                </span>
              )}
              {data.prioridade && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border text-slate-600 capitalize">
                  {data.prioridade}
                </span>
              )}
            </div>

            {data.descricao && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.descricao}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {data.localizacao && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {data.localizacao}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {formatarDataHora(data.criadoEm)}
              </span>
            </div>
          </CardContent>
        </Card>

        {data.imagens.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Fotos</p>
              <div className="grid grid-cols-3 gap-2">
                {data.imagens.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                    <img src={img.url} alt="" className="w-full h-24 object-cover rounded border" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-slate-400 text-center pt-2">
          Consulta pública · App Manutenção
        </p>
      </main>
    </div>
  );
}
