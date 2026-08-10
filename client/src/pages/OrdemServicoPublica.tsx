import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Calendar, Hash, Loader2, MapPin } from "lucide-react";

/**
 * Ordem de serviço aberta pelo QR Code, sem login.
 *
 * O QR da folha impressa é lido por quem está no local — morador, cliente,
 * fiscal — e essa gente não tem conta. Antes o código apontava para a tela
 * interna e o celular parava no login. Aqui é só leitura, pelo token de
 * compartilhamento da própria O.S.
 */
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

export default function OrdemServicoPublica({ token }: { token: string }) {
  const { data: os, isLoading, isError } = trpc.ordensServico.getByShareToken.useQuery(
    { token },
    { enabled: !!token, retry: false },
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !os) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-10 flex flex-col items-center text-center">
            <AlertTriangle className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
            <p className="font-semibold text-slate-700 mt-3">Ordem não encontrada</p>
            <p className="text-sm text-slate-500 mt-1">
              O código pode ter sido substituído ou a ordem removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fases = [
    { valor: "antes", rotulo: "Antes" },
    { valor: "durante", rotulo: "Durante" },
    { valor: "depois", rotulo: "Depois" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Ordem de serviço</p>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5">{os.titulo}</h1>
          <p className="font-mono text-sm text-slate-500 mt-1 inline-flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> {os.protocolo}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {os.status?.nome && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    color: os.status.cor ?? "#334155",
                    borderColor: `${os.status.cor ?? "#94a3b8"}55`,
                    backgroundColor: `${os.status.cor ?? "#94a3b8"}14`,
                  }}
                >
                  {os.status.nome}
                </span>
              )}
              {os.prioridade?.nome && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border text-slate-600">
                  {os.prioridade.nome}
                </span>
              )}
              {os.categoria?.nome && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border text-slate-600">
                  {os.categoria.nome}
                </span>
              )}
            </div>

            {os.descricao && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{os.descricao}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {os.endereco || "Local não informado"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Aberta em {formatarDataHora(os.createdAt)}
              </span>
              {os.dataFim && <span>Concluída em {formatarDataHora(os.dataFim)}</span>}
            </div>
          </CardContent>
        </Card>

        {fases.map((fase) => {
          const fotos = (os.imagens ?? []).filter((i) => (i.tipo ?? "") === fase.valor);
          if (fotos.length === 0) return null;
          return (
            <Card key={fase.valor}>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">{fase.rotulo}</p>
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((f) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                      <img
                        src={f.url}
                        alt=""
                        className="w-full h-24 object-cover rounded border"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(os.timeline?.length ?? 0) > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Andamento</p>
              <ol className="space-y-3">
                {os.timeline!.map((evento) => (
                  <li key={evento.id} className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{evento.descricao}</p>
                      <p className="text-xs text-slate-400">
                        {formatarDataHora(evento.createdAt)}
                        {evento.usuarioNome ? ` · ${evento.usuarioNome}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
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
