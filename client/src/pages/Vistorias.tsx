import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ClipboardCheck,
  Loader2,
  MoreVertical,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

const TIPOS = ["rotina", "preventiva", "corretiva", "entrega"];

/**
 * Situações do item, na ordem de gravidade. Os valores gravados no banco são
 * as chaves; mudar rótulo aqui não mexe no que já foi registrado.
 */
const STATUS_ITEM = [
  { valor: "pendente", rotulo: "Pendente", cor: "#616161", fundo: "#f5f5f5" },
  { valor: "vamos_levando", rotulo: "Vamos levando", cor: "#2e7d32", fundo: "#e8f5e9" },
  { valor: "concluir_essa_semana", rotulo: "Concluir essa semana", cor: "#1565c0", fundo: "#e3f2fd" },
  { valor: "proxima_vez", rotulo: "Fica para a próxima", cor: "#6a1b9a", fundo: "#f3e5f5" },
  { valor: "atencao", rotulo: "Atenção", cor: "#e65100", fundo: "#fff3e0" },
  { valor: "problema", rotulo: "Problema", cor: "#c62828", fundo: "#ffebee" },
  { valor: "intervencao_imediata", rotulo: "Intervenção imediata", cor: "#b71c1c", fundo: "#ffcdd2" },
] as const;

type StatusItem = (typeof STATUS_ITEM)[number]["valor"];

function statusItem(valor: string) {
  return STATUS_ITEM.find((s) => s.valor === valor) ?? STATUS_ITEM[0];
}

/** Item da vistoria ao vivo: existe só no formulário até a vistoria ser salva. */
type ItemAoVivo = {
  chave: string;
  nome: string;
  descricao: string;
  status: StatusItem;
  fotos: string[];
};

const itemAoVivoVazio = (): ItemAoVivo => ({
  chave:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  nome: "",
  descricao: "",
  status: "pendente",
  fotos: [],
});

/**
 * Itens da vistoria ao vivo.
 *
 * A foto sobe para o storage no momento em que é tirada, mas o item só vira
 * registro quando a vistoria é salva — antes disso não existe id para vincular.
 */
function ItensAoVivo({
  itens,
  onMudar,
}: {
  itens: ItemAoVivo[];
  onMudar: (itens: ItemAoVivo[]) => void;
}) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const enviarImagem = trpc.upload.image.useMutation();

  // Um input por item para a câmera do celular abrir no item certo.
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const atualizar = (chave: string, campos: Partial<ItemAoVivo>) =>
    onMudar(itens.map((i) => (i.chave === chave ? { ...i, ...campos } : i)));

  const fotografar = async (chave: string, arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(chave);
    try {
      const urls: string[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "vistorias",
        });
        urls.push(url);
      }
      const atual = itens.find((i) => i.chave === chave);
      if (atual) atualizar(chave, { fotos: [...atual.fotos, ...urls] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Itens da vistoria</Label>
        <span className="text-xs text-slate-400">
          {itens.filter((i) => i.nome.trim()).length} registrado(s)
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Escreva o que está vistoriando — escada, extintor —, tire a foto e descreva.
      </p>

      {itens.map((item, i) => (
        <div key={item.chave} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Item ${i + 1} — ex.: extintor`}
              value={item.nome}
              onChange={(e) => atualizar(item.chave, { nome: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={enviando !== null}
              onClick={() => inputs.current[item.chave]?.click()}
              title="Tirar foto"
              aria-label={`Tirar foto do item ${i + 1}`}
            >
              {enviando === item.chave ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
            <button
              type="button"
              onClick={() => onMudar(itens.filter((x) => x.chave !== item.chave))}
              aria-label={`Remover item ${i + 1}`}
            >
              <X className="w-4 h-4 text-slate-400 hover:text-red-600" />
            </button>
            <input
              ref={(el) => {
                inputs.current[item.chave] = el;
              }}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => {
                void fotografar(item.chave, e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {item.fotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.fotos.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="w-14 h-14 object-cover rounded border" />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                    onClick={() =>
                      atualizar(item.chave, { fotos: item.fotos.filter((f) => f !== url) })
                    }
                    aria-label="Remover foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Descrição do que foi visto..."
            value={item.descricao}
            onChange={(e) => atualizar(item.chave, { descricao: e.target.value })}
          />

          <div className="flex flex-wrap gap-1.5">
            {STATUS_ITEM.map((s) => {
              const ativo = item.status === s.valor;
              return (
                <button
                  key={s.valor}
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
                  style={
                    ativo
                      ? { background: s.cor, color: "#fff", borderColor: s.cor }
                      : { color: s.cor, backgroundColor: s.fundo, borderColor: `${s.cor}33` }
                  }
                  onClick={() => atualizar(item.chave, { status: s.valor })}
                >
                  {s.rotulo}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onMudar([...itens, itemAoVivoVazio()])}
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Item
      </Button>
    </div>
  );
}

/** Cartão de uma vistoria com seus itens. */
function CartaoVistoria({
  vistoria,
  condominioId,
}: {
  vistoria: { id: number; titulo: string; protocolo: string; tipo: string | null; localizacao: string | null; status: string };
  condominioId: number;
}) {
  const utils = trpc.useUtils();
  const { data: itens } = trpc.vistoria.getItens.useQuery({ vistoriaId: vistoria.id });

  const [novoItem, setNovoItem] = useState("");
  const [acoesDe, setAcoesDe] = useState<{ id: number; descricao: string } | null>(null);
  const [reportarDe, setReportarDe] = useState<{ id: number; descricao: string } | null>(null);
  const [fotoDe, setFotoDe] = useState<{ id: number; descricao: string } | null>(null);
  const [registroDe, setRegistroDe] = useState<{ id: number; descricao: string } | null>(null);
  const [antesDepoisDe, setAntesDepoisDe] = useState<{
    id: number;
    descricao: string;
    fotoAntes: string | null;
    descAntes: string | null;
    fotoDepois: string | null;
    descDepois: string | null;
  } | null>(null);

  const recarregar = () => utils.vistoria.getItens.invalidate({ vistoriaId: vistoria.id });

  const addItem = trpc.vistoria.addItem.useMutation({
    onSuccess: async () => {
      setNovoItem("");
      await recarregar();
    },
    onError: (e) => toast.error(e.message || "Erro ao adicionar o item"),
  });

  const removerItem = trpc.vistoria.removerItem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const lista = itens ?? [];
  const avaliados = lista.filter((i) => i.status !== "pendente").length;
  const pct = lista.length > 0 ? Math.round((avaliados / lista.length) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-400">{vistoria.protocolo}</p>
            <h4 className="font-semibold text-slate-800">{vistoria.titulo}</h4>
            <p className="text-xs text-slate-500 capitalize">
              {vistoria.tipo ?? "rotina"}
              {vistoria.localizacao ? ` · ${vistoria.localizacao}` : ""}
            </p>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {avaliados}/{lista.length} ({pct}%)
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-3 divide-y border rounded-md">
          {lista.length === 0 ? (
            <p className="text-xs text-slate-400 p-3">Nenhum item nesta vistoria.</p>
          ) : (
            lista.map((item) => {
              const situacao = statusItem(item.status);
              const temRegistro =
                !!item.observacao?.trim() || !!item.fotoAntes || !!item.fotoDepois;
              return (
                <div key={item.id} className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-slate-700">
                      {item.local ? <span className="text-slate-400">{item.local} · </span> : null}
                      {item.descricao}
                    </span>

                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ color: situacao.cor, backgroundColor: situacao.fundo }}
                    >
                      {situacao.rotulo}
                    </span>

                    {/* Câmera: foto e descrição do item, direto. */}
                    <button
                      onClick={() => setFotoDe({ id: item.id, descricao: item.descricao })}
                      title="Tirar foto e descrever"
                      aria-label="Tirar foto e descrever"
                      className="shrink-0"
                    >
                      <Camera className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    </button>

                    {/* Triângulo de exclamação: galeria, descrição e situação. */}
                    <button
                      onClick={() => setRegistroDe({ id: item.id, descricao: item.descricao })}
                      title="Galeria, descrição e situação"
                      aria-label="Galeria, descrição e situação"
                      className="shrink-0"
                    >
                      <AlertTriangle
                        className={`w-4 h-4 ${temRegistro ? "text-amber-500" : "text-slate-300"}`}
                      />
                    </button>

                    <button
                      onClick={() => setAcoesDe({ id: item.id, descricao: item.descricao })}
                      title="Ações"
                      aria-label="Ações do item"
                      className="shrink-0"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remover o item "${item.descricao}"?`)) {
                          removerItem.mutate({ itemId: item.id });
                        }
                      }}
                      aria-label={`Remover ${item.descricao}`}
                      className="shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <Input
            className="h-8 text-xs"
            placeholder="Novo item da vistoria..."
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && novoItem.trim()) {
                e.preventDefault();
                addItem.mutate({ vistoriaId: vistoria.id, descricao: novoItem.trim() });
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!novoItem.trim() || addItem.isPending}
            onClick={() => addItem.mutate({ vistoriaId: vistoria.id, descricao: novoItem.trim() })}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>

      {acoesDe && (
        <Dialog open onOpenChange={(aberto) => !aberto && setAcoesDe(null)}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Ações do item</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">{acoesDe.descricao}</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setReportarDe(acoesDe);
                  setAcoesDe(null);
                }}
              >
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                Reportar problema
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const item = lista.find((i) => i.id === acoesDe.id);
                  if (item) {
                    setAntesDepoisDe({
                      id: item.id,
                      descricao: item.descricao,
                      fotoAntes: item.fotoAntes,
                      descAntes: item.descAntes,
                      fotoDepois: item.fotoDepois,
                      descDepois: item.descDepois,
                    });
                  }
                  setAcoesDe(null);
                }}
              >
                Antes e depois
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {reportarDe && (
        <ModalReporte
          item={reportarDe}
          vistoriaId={vistoria.id}
          condominioId={condominioId}
          onFechar={() => setReportarDe(null)}
        />
      )}

      {antesDepoisDe && (
        <ModalAntesDepoisVistoria
          item={antesDepoisDe}
          onSalvo={recarregar}
          onFechar={() => setAntesDepoisDe(null)}
        />
      )}

      {fotoDe && (
        <ModalFotoRapida
          item={{
            ...fotoDe,
            observacao: lista.find((i) => i.id === fotoDe.id)?.observacao ?? "",
          }}
          onSalvo={recarregar}
          onFechar={() => setFotoDe(null)}
        />
      )}

      {registroDe && (
        <ModalRegistroItem
          item={{
            ...registroDe,
            observacao: lista.find((i) => i.id === registroDe.id)?.observacao ?? "",
            status: lista.find((i) => i.id === registroDe.id)?.status ?? "pendente",
          }}
          onSalvo={recarregar}
          onFechar={() => setRegistroDe(null)}
        />
      )}
    </Card>
  );
}

/** Câmera do item: tira ou escolhe a foto e já grava a descrição junto. */
function ModalFotoRapida({
  item,
  onSalvo,
  onFechar,
}: {
  item: { id: number; descricao: string; observacao: string };
  onSalvo: () => void;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const [texto, setTexto] = useState(item.observacao);
  const [enviando, setEnviando] = useState(false);
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const { data: anexos } = trpc.vistoria.listarAnexosItem.useQuery({ itemId: item.id });
  const enviarImagem = trpc.upload.image.useMutation();

  const recarregar = async () => {
    await utils.vistoria.listarAnexosItem.invalidate({ itemId: item.id });
    onSalvo();
  };

  const adicionar = trpc.vistoria.adicionarAnexoItem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao anexar"),
  });

  const salvarDescricao = trpc.vistoria.atualizarItem.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Registro salvo");
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "vistorias",
        });
        await adicionar.mutateAsync({ itemId: item.id, url, nome: arquivo.name });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-slate-500" />
            Foto do item
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{item.descricao}</p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={enviando}
              onClick={() => inputCamera.current?.click()}
            >
              {enviando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Tirar foto
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={enviando}
              onClick={() => inputArquivo.current?.click()}
            >
              Escolher arquivo
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

          {(anexos?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {anexos!.map((a) => (
                <img
                  key={a.id}
                  src={a.url}
                  alt={a.nome ?? ""}
                  className="w-16 h-16 object-cover rounded border"
                />
              ))}
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que esta foto mostra..."
            />
          </div>

          <Button
            className="w-full"
            disabled={salvarDescricao.isPending}
            onClick={() => salvarDescricao.mutate({ itemId: item.id, observacao: texto.trim() })}
          >
            {salvarDescricao.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Triângulo de exclamação: galeria, descrição e troca de situação. */
function ModalRegistroItem({
  item,
  onSalvo,
  onFechar,
}: {
  item: { id: number; descricao: string; observacao: string; status: string };
  onSalvo: () => void;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const [texto, setTexto] = useState(item.observacao);
  const [status, setStatus] = useState<StatusItem>(item.status as StatusItem);
  const [enviando, setEnviando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const { data: anexos } = trpc.vistoria.listarAnexosItem.useQuery({ itemId: item.id });
  const enviarImagem = trpc.upload.image.useMutation();

  const recarregar = async () => {
    await utils.vistoria.listarAnexosItem.invalidate({ itemId: item.id });
    onSalvo();
  };

  const adicionar = trpc.vistoria.adicionarAnexoItem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao anexar"),
  });

  const remover = trpc.vistoria.removerAnexoItem.useMutation({
    onSuccess: recarregar,
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const salvar = trpc.vistoria.atualizarItem.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Item atualizado");
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "vistorias",
        });
        await adicionar.mutateAsync({ itemId: item.id, url, nome: arquivo.name });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Registro do item
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{item.descricao}</p>

        <div className="space-y-4">
          <div>
            <Label>Situação</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {STATUS_ITEM.map((s) => {
                const ativo = status === s.valor;
                return (
                  <button
                    key={s.valor}
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                    style={
                      ativo
                        ? { background: s.cor, color: "#fff", borderColor: s.cor }
                        : { color: s.cor, backgroundColor: s.fundo, borderColor: `${s.cor}33` }
                    }
                    onClick={() => setStatus(s.valor)}
                  >
                    {s.rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Galeria de fotos</span>
              <Button
                variant="outline"
                size="sm"
                disabled={enviando}
                onClick={() => inputArquivo.current?.click()}
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anexar"}
              </Button>
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
            {(anexos?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma foto.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {anexos!.map((a) => (
                  <div key={a.id} className="relative">
                    <img
                      src={a.url}
                      alt={a.nome ?? ""}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                      onClick={() => remover.mutate({ itemId: item.id, anexoId: a.id })}
                      aria-label="Remover foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Descrição</Label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que foi observado neste item..."
            />
          </div>

          <Button
            className="w-full"
            disabled={salvar.isPending}
            onClick={() =>
              salvar.mutate({ itemId: item.id, observacao: texto.trim(), status })
            }
          >
            {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function lerArquivoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

function ModalReporte({
  item,
  vistoriaId,
  condominioId,
  onFechar,
}: {
  item: { id: number; descricao: string };
  vistoriaId: number;
  condominioId: number;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [imagens, setImagens] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const enviarImagem = trpc.upload.image.useMutation();

  const reportar = trpc.vistoria.reportarProblema.useMutation({
    onSuccess: async (res) => {
      await utils.vistoria.listarReportes.invalidate();
      toast.success(`Problema reportado. Protocolo: ${res.protocolo}`);
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao reportar"),
  });

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const base64 = await lerArquivoBase64(arquivo);
        const { url } = await enviarImagem.mutateAsync({
          fileName: arquivo.name,
          fileType: arquivo.type,
          fileData: base64,
          folder: "vistorias",
        });
        setImagens((atual) => [...atual, url]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a imagem");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Reportar problema
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Item: <strong>{item.descricao}</strong>
        </p>

        <div className="space-y-3">
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Imagens</span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    void anexar(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex items-center text-xs border rounded-md px-3 py-1.5 hover:bg-slate-50">
                  {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Anexar"}
                </span>
              </label>
            </div>
            {imagens.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma imagem.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {imagens.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5"
                      onClick={() => setImagens((a) => a.filter((i) => i !== url))}
                      aria-label="Remover imagem"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Descrição do problema</Label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o problema encontrado..."
            />
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as typeof prioridade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={reportar.isPending || descricao.trim().length < 3}
            onClick={() =>
              reportar.mutate({
                condominioId,
                vistoriaId,
                vistoriaItemId: item.id,
                itemDesc: item.descricao,
                descricao: descricao.trim(),
                prioridade,
                imagens,
              })
            }
          >
            {reportar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModalAntesDepoisVistoria({
  item,
  onSalvo,
  onFechar,
}: {
  item: {
    id: number;
    descricao: string;
    fotoAntes: string | null;
    descAntes: string | null;
    fotoDepois: string | null;
    descDepois: string | null;
  };
  onSalvo: () => void;
  onFechar: () => void;
}) {
  const [estado, setEstado] = useState({
    fotoAntes: item.fotoAntes,
    descAntes: item.descAntes ?? "",
    fotoDepois: item.fotoDepois,
    descDepois: item.descDepois ?? "",
  });
  const [enviando, setEnviando] = useState<"antes" | "depois" | null>(null);
  const enviarImagem = trpc.upload.image.useMutation();

  const salvar = trpc.vistoria.salvarAntesDepois.useMutation({
    onSuccess: async () => {
      await onSalvo();
      toast.success("Antes e depois salvo");
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  const trocarFoto = async (arquivo: File | undefined, fase: "antes" | "depois") => {
    if (!arquivo) return;
    setEnviando(fase);
    try {
      const base64 = await lerArquivoBase64(arquivo);
      const { url } = await enviarImagem.mutateAsync({
        fileName: arquivo.name,
        fileType: arquivo.type,
        fileData: base64,
        folder: "vistorias",
      });
      setEstado((a) => (fase === "antes" ? { ...a, fotoAntes: url } : { ...a, fotoDepois: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Antes e depois</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Item: <strong>{item.descricao}</strong>
        </p>

        <div className="space-y-3">
          {(["antes", "depois"] as const).map((fase) => {
            const foto = fase === "antes" ? estado.fotoAntes : estado.fotoDepois;
            const desc = fase === "antes" ? estado.descAntes : estado.descDepois;
            return (
              <div key={fase} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{fase}</span>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        void trocarFoto(e.target.files?.[0], fase);
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex items-center text-xs border rounded-md px-3 py-1.5 hover:bg-slate-50">
                      {enviando === fase ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Foto"
                      )}
                    </span>
                  </label>
                </div>
                {foto ? (
                  <img src={foto} alt={fase} className="w-24 h-24 object-cover rounded border" />
                ) : (
                  <p className="text-xs text-slate-400">Sem foto.</p>
                )}
                <textarea
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder={`Descrição do ${fase}`}
                  value={desc}
                  onChange={(e) =>
                    setEstado((a) =>
                      fase === "antes"
                        ? { ...a, descAntes: e.target.value }
                        : { ...a, descDepois: e.target.value },
                    )
                  }
                />
              </div>
            );
          })}

          <Button
            className="w-full"
            disabled={salvar.isPending}
            onClick={() =>
              salvar.mutate({
                itemId: item.id,
                fotoAntes: estado.fotoAntes,
                descAntes: estado.descAntes.trim(),
                fotoDepois: estado.fotoDepois,
                descDepois: estado.descDepois.trim(),
              })
            }
          >
            {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Vistorias() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;
  const habilitado = !!organizacaoAtiva;

  const [busca, setBusca] = useState("");
  const [modalNova, setModalNova] = useState(false);
  const [form, setForm] = useState({ titulo: "", tipo: "rotina", localizacao: "", itens: [""] });

  /**
   * Vistoria pré-definida: a lista de itens é montada antes e conferida depois.
   * Vistoria ao vivo: o item nasce durante a ronda — nome, foto e descrição no
   * mesmo gesto —, e por isso o botão do final salva em vez de criar.
   */
  // Ao vivo é o modo padrão: a vistoria costuma ser feita em campo, e quem
  // trabalha com lista montada antes desliga a chave.
  const [aoVivo, setAoVivo] = useState(true);
  const [itensAoVivo, setItensAoVivo] = useState<ItemAoVivo[]>(() => [itemAoVivoVazio()]);

  const { data: lista, isLoading: carregandoLista } = trpc.vistoria.list.useQuery(
    { condominioId },
    { enabled: habilitado },
  );

  useEffect(() => {
    if (!carregandoUser && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [carregandoUser, user, setLocation]);

  const addItem = trpc.vistoria.addItem.useMutation();
  const atualizarItemNovo = trpc.vistoria.atualizarItem.useMutation();
  const anexarNoItem = trpc.vistoria.adicionarAnexoItem.useMutation();

  const criar = trpc.vistoria.create.useMutation({
    onSuccess: async (res) => {
      // Os itens só podem ser vinculados depois que a vistoria existe.
      if (aoVivo) {
        for (const item of itensAoVivo) {
          const nome = item.nome.trim();
          if (!nome) continue;
          try {
            const { id: itemId } = await addItem.mutateAsync({
              vistoriaId: res.id,
              descricao: nome,
            });
            if (item.descricao.trim() || item.status !== "pendente") {
              await atualizarItemNovo.mutateAsync({
                itemId,
                observacao: item.descricao.trim() || undefined,
                status: item.status,
              });
            }
            for (const url of item.fotos) {
              await anexarNoItem.mutateAsync({ itemId, url });
            }
          } catch {
            toast.error(`Item "${nome}" não pôde ser salvo por completo`);
          }
        }
      } else {
        for (const descricao of form.itens.map((i) => i.trim()).filter(Boolean)) {
          await addItem
            .mutateAsync({ vistoriaId: res.id, descricao })
            .catch(() => toast.error(`Item "${descricao}" não pôde ser criado`));
        }
      }

      setModalNova(false);
      setForm({ titulo: "", tipo: "rotina", localizacao: "", itens: [""] });
      setItensAoVivo([itemAoVivoVazio()]);
      await utils.vistoria.list.invalidate();
      toast.success(aoVivo ? "Vistoria salva" : "Vistoria criada");
    },
    onError: (e) => toast.error(e.message || "Erro ao criar a vistoria"),
  });

  const excluir = trpc.vistoria.delete.useMutation({
    onSuccess: async () => {
      await utils.vistoria.list.invalidate();
      toast.success("Vistoria excluída");
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir"),
  });

  const vistorias = lista ?? [];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return vistorias;
    return vistorias.filter((v) =>
      [v.titulo, v.protocolo, v.tipo, v.localizacao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [vistorias, busca]);

  if (carregandoUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/manutencoes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Vistorias</h1>
            <p className="text-xs text-slate-500">
              {vistorias.length} vistorias
              {organizacaoAtiva ? ` · ${organizacaoAtiva.nome}` : ""}
            </p>
          </div>
          <Button size="sm" onClick={() => setModalNova(true)} disabled={!habilitado}>
            <Plus className="w-4 h-4 mr-2" /> Nova
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9 pr-9"
            placeholder="Buscar por título, protocolo, tipo, local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {carregandoLista ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
              <p className="font-semibold text-slate-700 mt-3">Nenhuma vistoria</p>
              <p className="text-sm text-slate-500">
                {busca ? "Nenhum resultado para a busca atual." : "Crie a primeira vistoria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtradas.map((v) => (
              <div key={v.id} className="relative">
                <CartaoVistoria vistoria={v} condominioId={condominioId} />
                <button
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-600"
                  onClick={() => {
                    if (confirm(`Excluir a vistoria "${v.titulo}"?`)) {
                      excluir.mutate({ id: v.id });
                    }
                  }}
                  aria-label={`Excluir ${v.titulo}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle>Nova vistoria</DialogTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className={`text-xs ${aoVivo ? "text-slate-400" : "font-medium text-slate-700"}`}>
                  Pré-definida
                </span>
                <Switch
                  checked={aoVivo}
                  onCheckedChange={(ligado) => {
                    setAoVivo(ligado);
                    // Já abre com uma linha pronta: em campo ninguém quer
                    // apertar "+ Item" antes de registrar o primeiro.
                    if (ligado && itensAoVivo.length === 0) setItensAoVivo([itemAoVivoVazio()]);
                  }}
                  aria-label="Vistoria ao vivo"
                />
                <span className={`text-xs ${aoVivo ? "font-medium text-slate-700" : "text-slate-400"}`}>
                  Ao vivo
                </span>
              </label>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Vistoria mensal do bloco A"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local</Label>
                <Input
                  value={form.localizacao}
                  onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                />
              </div>
            </div>

            {aoVivo ? (
              <ItensAoVivo itens={itensAoVivo} onMudar={setItensAoVivo} />
            ) : (
              <div className="space-y-2">
                <Label>Itens</Label>
                {form.itens.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Item ${i + 1}`}
                      value={item}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          itens: p.itens.map((v, j) => (j === i ? e.target.value : v)),
                        }))
                      }
                    />
                    {form.itens.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm((p) => ({ ...p, itens: p.itens.filter((_, j) => j !== i) }))
                        }
                        aria-label={`Remover item ${i + 1}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, itens: [...p.itens, ""] }))}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Item
                </Button>
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                criar.isPending ||
                form.titulo.trim().length < 3 ||
                !habilitado ||
                (aoVivo && itensAoVivo.every((i) => !i.nome.trim()))
              }
              onClick={() =>
                criar.mutate({
                  condominioId,
                  titulo: form.titulo.trim(),
                  tipo: form.tipo,
                  localizacao: form.localizacao.trim() || undefined,
                })
              }
            >
              {criar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : aoVivo ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {aoVivo ? "Salvar vistoria" : "Criar vistoria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
