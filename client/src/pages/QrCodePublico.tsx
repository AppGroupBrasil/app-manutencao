import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Camera, CheckCircle2, ImagePlus, Loader2, MapPin, QrCode, X } from "lucide-react";

const MAX_IMAGENS = 5;

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

function Rotulo({ children, obrigatorio }: { children: React.ReactNode; obrigatorio?: boolean }) {
  return (
    <label className="block text-xs font-semibold tracking-wide text-slate-500 uppercase mb-1.5">
      {children}
      {obrigatorio && <span className="text-orange-500"> *</span>}
    </label>
  );
}

/**
 * Formulário aberto pelo QR Code impresso.
 *
 * Não exige conta: quem passa pelo local escaneia, se identifica, fotografa e
 * descreve. A localização é capturada sozinha, e a data e a hora saem do
 * próprio registro no servidor.
 */
export default function QrCodePublico({ token }: { token: string }) {
  const { data: ponto, isLoading } = trpc.qrcode.obterPorToken.useQuery({ token }, { retry: false });

  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagens, setImagens] = useState<{ fileName: string; fileType: string; fileData: string; preview: string }[]>([]);
  const [local, setLocal] = useState<{ latitude: string; longitude: string } | null>(null);
  const [localizando, setLocalizando] = useState(true);
  const [protocoloEnviado, setProtocoloEnviado] = useState<string | null>(null);
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  // A localização é pedida na abertura: quem está no ponto não deve precisar
  // apertar nada para o registro sair com coordenada.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocalizando(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocal({
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        });
        setLocalizando(false);
      },
      () => setLocalizando(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const enviar = trpc.qrcode.responder.useMutation({
    onSuccess: (res) => setProtocoloEnviado(res.protocolo ?? null),
    onError: (e) => toast.error(e.message || "Não foi possível enviar"),
  });

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    const novas: typeof imagens = [];
    for (const arquivo of Array.from(arquivos)) {
      if (imagens.length + novas.length >= MAX_IMAGENS) {
        toast.error(`Máximo de ${MAX_IMAGENS} imagens`);
        break;
      }
      const base64 = await lerArquivoBase64(arquivo);
      novas.push({
        fileName: arquivo.name,
        fileType: arquivo.type,
        fileData: base64,
        preview: base64,
      });
    }
    setImagens((atual) => [...atual, ...novas]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!ponto) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-10 text-center">
            <QrCode className="w-12 h-12 text-slate-300 mx-auto" strokeWidth={1.5} />
            <p className="font-semibold text-slate-700 mt-3">QR Code inválido</p>
            <p className="text-sm text-slate-500 mt-1">
              Este código não existe ou foi desativado. Procure o responsável pelo local.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (protocoloEnviado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" strokeWidth={1.5} />
            <p className="font-semibold text-slate-800 mt-3">Registro enviado</p>
            <p className="text-sm text-slate-500 mt-1">Guarde o protocolo:</p>
            <p className="font-mono text-lg font-semibold text-slate-800 mt-1">
              {protocoloEnviado}
            </p>
            <p className="text-xs text-slate-400 mt-3">
              A equipe responsável foi notificada no sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const podeEnviar = nome.trim().length >= 2 && !enviar.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-orange-500 text-white px-4 py-5">
        <div className="max-w-md mx-auto">
          <p className="text-xs uppercase tracking-wide opacity-80">
            {ponto.tipo === "item" ? "Item" : "Local"}
          </p>
          <h1 className="text-2xl font-bold">{ponto.titulo}</h1>
          {ponto.descricao && <p className="text-sm opacity-90 mt-1">{ponto.descricao}</p>}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Rotulo obrigatorio>Seu nome</Rotulo>
              <Input
                placeholder="Quem está registrando"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                A identificação é obrigatória — é ela que vincula o registro a quem passou aqui.
              </p>
            </div>

            <div>
              <Rotulo>Telefone ou e-mail</Rotulo>
              <Input
                placeholder="Para retorno, se precisar"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
              />
            </div>

            <div>
              <Rotulo>Anexe imagens</Rotulo>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={imagens.length >= MAX_IMAGENS}
                  onClick={() => inputCamera.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" /> Tirar foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={imagens.length >= MAX_IMAGENS}
                  onClick={() => inputArquivo.current?.click()}
                >
                  <ImagePlus className="w-4 h-4 mr-2" /> Galeria
                </Button>
                <input
                  ref={inputCamera}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    void anexar(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={inputArquivo}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    void anexar(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {imagens.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imagens.map((img, i) => (
                    <div key={`${img.fileName}-${i}`} className="relative">
                      <img
                        src={img.preview}
                        alt=""
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                        onClick={() => setImagens((atual) => atual.filter((_, j) => j !== i))}
                        aria-label="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">Até {MAX_IMAGENS} imagens.</p>
            </div>

            <div>
              <Rotulo>Descrição</Rotulo>
              <textarea
                rows={4}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Descreva o que encontrou..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="text-xs text-slate-500 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {localizando ? (
                <span>Obtendo a localização…</span>
              ) : local ? (
                <span>
                  Localização capturada ({local.latitude}, {local.longitude}). A data e a hora são
                  registradas automaticamente.
                </span>
              ) : (
                <span>
                  Sem permissão de localização — o registro segue mesmo assim, com data e hora.
                </span>
              )}
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={!podeEnviar}
              onClick={() =>
                enviar.mutate({
                  token,
                  informanteNome: nome.trim(),
                  informanteContato: contato.trim() || undefined,
                  descricao: descricao.trim() || undefined,
                  latitude: local?.latitude,
                  longitude: local?.longitude,
                  imagens: imagens.map(({ fileName, fileType, fileData }) => ({
                    fileName,
                    fileType,
                    fileData,
                  })),
                })
              }
            >
              {enviar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
