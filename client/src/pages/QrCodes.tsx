import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { TOM_ANEXO, estiloEtiqueta } from "@/lib/coresRegistro";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Trash2,
} from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

const STATUS_RESPOSTA: Record<string, { rotulo: string; cor: string; fundo: string }> = {
  nova: { rotulo: "Nova", cor: "#c62828", fundo: "#ffebee" },
  em_andamento: { rotulo: "Em andamento", cor: "#e65100", fundo: "#fff3e0" },
  resolvida: { rotulo: "Resolvida", cor: "#2e7d32", fundo: "#e8f5e9" },
};

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

/** Página do gestor: resolve a unidade pela sessão e entrega o conteúdo. */
export default function QrCodes() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [carregandoUser, user, setLocation]);

  if (carregandoUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <ConteudoQrCodes
      condominioId={organizacaoAtiva?.id ?? 0}
      onVoltar={() => setLocation("/admin/manutencoes")}
    />
  );
}

/** Conteúdo reaproveitado pelo portal do funcionário, que já recebe a unidade. */
export function ConteudoQrCodes({
  condominioId,
  onVoltar,
  podeCriar = true,
}: {
  condominioId: number;
  onVoltar?: () => void;
  podeCriar?: boolean;
}) {
  const utils = trpc.useUtils();
  const habilitado = condominioId > 0;

  const [aba, setAba] = useState<"codigos" | "respostas">("codigos");
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({ titulo: "", tipo: "local", descricao: "" });
  const [verCodigo, setVerCodigo] = useState<{ token: string; titulo: string } | null>(null);
  // Registro em resposta; nulo com o modal fechado.
  const [respondendo, setRespondendo] = useState<{
    id: number;
    protocolo: string | null;
    informanteNome: string;
    informanteContato: string | null;
  } | null>(null);
  const [mensagemResposta, setMensagemResposta] = useState("");
  const [fotosResposta, setFotosResposta] = useState<string[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const { data: codigos, isLoading: carregando } = trpc.qrcode.listar.useQuery(
    { condominioId },
    { enabled: habilitado },
  );
  const { data: respostas } = trpc.qrcode.listarRespostas.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  const criar = trpc.qrcode.criar.useMutation({
    onSuccess: async (res) => {
      setModalNovo(false);
      setForm({ titulo: "", tipo: "local", descricao: "" });
      await utils.qrcode.listar.invalidate();
      setVerCodigo({ token: res.token, titulo: form.titulo });
      toast.success(`Código ${res.protocolo} criado`);
    },
    onError: (e) => toast.error(e.message || "Erro ao criar o código"),
  });

  const deletar = trpc.qrcode.deletar.useMutation({
    onSuccess: async () => {
      await utils.qrcode.listar.invalidate();
      toast.success("Código removido");
    },
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const deletarResposta = trpc.qrcode.deletarResposta.useMutation({
    onSuccess: async () => {
      await utils.qrcode.listarRespostas.invalidate();
      toast.success("Registro removido");
    },
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const responder = trpc.qrcode.responderPorEmail.useMutation({
    onSuccess: async (res) => {
      setRespondendo(null);
      setMensagemResposta("");
      setFotosResposta([]);
      await utils.qrcode.listarRespostas.invalidate();
      toast.success(`Resposta enviada para ${res.destino}`);
    },
    onError: (e) => toast.error(e.message || "Erro ao responder"),
  });

  const enviarImagem = trpc.upload.image.useMutation();

  const atualizarResposta = trpc.qrcode.atualizarResposta.useMutation({
    onSuccess: () => utils.qrcode.listarRespostas.invalidate(),
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  const lista = codigos ?? [];
  const novas = (respostas ?? []).filter((r) => r.status === "nova").length;
  const enderecoDe = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/qr/${token}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          {onVoltar && (
            <Button variant="ghost" size="sm" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">QR Code</h1>
            <p className="text-xs text-slate-500">
              {lista.length} ponto(s) · {respostas?.length ?? 0} registro(s)
            </p>
          </div>
          {podeCriar && (
            <Button size="sm" onClick={() => setModalNovo(true)} disabled={!habilitado}>
              <Plus className="w-4 h-4 mr-2" /> Novo
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          <Button
            variant={aba === "codigos" ? "default" : "outline"}
            size="sm"
            onClick={() => setAba("codigos")}
          >
            <QrCode className="w-4 h-4 mr-2" /> Códigos
          </Button>
          <Button
            variant={aba === "respostas" ? "default" : "outline"}
            size="sm"
            onClick={() => setAba("respostas")}
          >
            <Inbox className="w-4 h-4 mr-2" /> Registros recebidos
            {novas > 0 && (
              <span className="ml-2 text-[11px] bg-red-100 text-red-700 rounded-full px-2">
                {novas}
              </span>
            )}
          </Button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : aba === "codigos" ? (
          lista.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center">
                <QrCode className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
                <p className="font-semibold text-slate-700 mt-3">Nenhum código</p>
                <p className="text-sm text-slate-500">
                  Crie um código por local ou item e cole no ponto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lista.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-white p-2 rounded border shrink-0">
                      <QRCodeSVG value={enderecoDe(c.token)} size={72} level="M" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-slate-400">{c.protocolo}</p>
                      <h4 className="font-semibold text-slate-800">{c.titulo}</h4>
                      <p className="text-xs text-slate-500 capitalize">
                        {c.tipo}
                        {c.descricao ? ` · ${c.descricao}` : ""}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVerCodigo({ token: c.token, titulo: c.titulo })}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Remover o código "${c.titulo}"? Os registros recebidos vão junto.`)) {
                              deletar.mutate({ id: c.id });
                            }
                          }}
                          aria-label={`Remover ${c.titulo}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (respostas?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhum registro recebido ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {respostas!.map((r) => {
              const status = STATUS_RESPOSTA[r.status] ?? STATUS_RESPOSTA.nova;
              const ponto = lista.find((c) => c.id === r.qrcodeId);
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-slate-400">{r.protocolo}</p>
                        <h4 className="font-semibold text-slate-800">
                          {ponto?.titulo ?? "Ponto removido"}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {r.informanteNome}
                          {r.informanteContato ? ` · ${r.informanteContato}` : ""}
                        </p>
                      </div>
                      <Select
                        value={r.status}
                        onValueChange={(v) =>
                          atualizarResposta.mutate({
                            id: r.id,
                            status: v as "nova" | "em_andamento" | "resolvida",
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nova">Nova</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="resolvida">Resolvida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {r.descricao && (
                      <p className="text-sm text-slate-600 mt-2">{r.descricao}</p>
                    )}

                    {r.imagens.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.imagens.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                      <span>{formatarDataHora(r.createdAt)}</span>
                      {(r.enderecoGeo || (r.latitude && r.longitude)) && (
                        <a
                          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {/* Coordenada só aparece quando não há endereço: número
                              solto não diz nada a quem vai atender. */}
                          <MapPin className="w-3.5 h-3.5" />
                          {r.enderecoGeo ?? `${r.latitude}, ${r.longitude}`}
                        </a>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ color: status.cor, backgroundColor: status.fundo }}
                      >
                        {status.rotulo}
                      </span>
                    </div>

                    {/* Mapa do OpenStreetMap: mostra onde é sem depender de
                        chave de API nem de conta em serviço de mapas. */}
                    {r.latitude && r.longitude && (
                      <iframe
                        title={`Local do registro ${r.protocolo}`}
                        className="w-full h-40 rounded-lg border mt-3"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                          Number(r.longitude) - 0.002
                        },${Number(r.latitude) - 0.002},${Number(r.longitude) + 0.002},${
                          Number(r.latitude) + 0.002
                        }&layer=mapnik&marker=${r.latitude},${r.longitude}`}
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                      {podeCriar && r.informanteContato?.includes("@") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRespondendo(r)}
                        >
                          <Mail className="w-4 h-4 mr-2" /> Responder
                        </Button>
                      )}
                      {podeCriar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Excluir o registro ${r.protocolo}?`)) {
                              deletarResposta.mutate({ id: r.id });
                            }
                          }}
                          aria-label={`Excluir registro ${r.protocolo}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Novo código */}
      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Tipo
              </label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="item">Item</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Nome do {form.tipo === "item" ? "item" : "local"}
              </label>
              <Input
                placeholder={form.tipo === "item" ? "Ex: Extintor do corredor" : "Ex: Cozinha"}
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Descrição
              </label>
              <Input
                placeholder="Instrução para quem escanear (opcional)"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={criar.isPending || form.titulo.trim().length < 2 || !habilitado}
              onClick={() =>
                criar.mutate({
                  condominioId,
                  titulo: form.titulo.trim(),
                  tipo: form.tipo as "local" | "item",
                  descricao: form.descricao.trim() || undefined,
                })
              }
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Gerar código
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Código para impressão */}
      {/* Responder por e-mail */}
      <Dialog open={respondendo !== null} onOpenChange={(a) => !a && setRespondendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder {respondendo?.protocolo}</DialogTitle>
          </DialogHeader>
          {respondendo && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Para {respondendo.informanteNome} · {respondendo.informanteContato}
              </p>

              <Textarea
                rows={5}
                placeholder="Escreva a resposta que a pessoa vai receber por e-mail…"
                value={mensagemResposta}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setMensagemResposta(e.target.value)
                }
              />

              <div>
                <label
                  className="flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-sm font-medium"
                  style={estiloEtiqueta(TOM_ANEXO)}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={async (e) => {
                      const arquivos = e.target.files;
                      e.target.value = "";
                      if (!arquivos || arquivos.length === 0) return;
                      setEnviandoFoto(true);
                      try {
                        for (const arquivo of Array.from(arquivos)) {
                          const base64 = await new Promise<string>((resolve, reject) => {
                            const leitor = new FileReader();
                            leitor.onload = () => resolve(String(leitor.result));
                            leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
                            leitor.readAsDataURL(arquivo);
                          });
                          const { url } = await enviarImagem.mutateAsync({
                            fileName: arquivo.name,
                            fileType: arquivo.type,
                            fileData: base64,
                            folder: "qrcode-respostas",
                          });
                          setFotosResposta((atual) => [...atual, url]);
                        }
                      } catch (erro) {
                        toast.error(erro instanceof Error ? erro.message : "Erro ao anexar");
                      } finally {
                        setEnviandoFoto(false);
                      }
                    }}
                  />
                  {enviandoFoto ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    "Anexar fotos"
                  )}
                </label>

                {fotosResposta.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fotosResposta.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="w-16 h-16 rounded border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                disabled={responder.isPending || mensagemResposta.trim().length < 2}
                onClick={() =>
                  responder.mutate({
                    id: respondendo.id,
                    mensagem: mensagemResposta.trim(),
                    imagens: fotosResposta,
                  })
                }
              >
                {responder.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar resposta
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!verCodigo} onOpenChange={(aberto) => !aberto && setVerCodigo(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{verCodigo?.titulo}</DialogTitle>
          </DialogHeader>
          {verCodigo && (
            <div className="text-center space-y-3">
              <div className="bg-white p-4 rounded border inline-block">
                <QRCodeSVG value={enderecoDe(verCodigo.token)} size={200} level="M" />
              </div>
              <p className="text-xs text-slate-500 break-all">{enderecoDe(verCodigo.token)}</p>
              <Button className="w-full" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
