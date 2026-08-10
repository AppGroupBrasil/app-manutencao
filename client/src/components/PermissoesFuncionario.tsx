import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { FUNCOES_FUNCIONARIO } from "@shared/funcoesFuncionario";
import { useVocabulario } from "@/hooks/useVocabulario";
import { Loader2 } from "lucide-react";

type Permissao = { habilitada: boolean; podeCriar: boolean; podeExcluir: boolean };

/**
 * O que o funcionário vê, o que ele pode criar e o que ele pode excluir.
 *
 * Ver e criar nascem ligados: quem cadastra alguém espera que a pessoa
 * trabalhe. Excluir nasce desligado e só aparece onde apagar destrói histórico
 * junto — hoje, ordens de serviço.
 */
export function PermissoesFuncionario({
  funcionarioId,
  nome,
  onFechar,
}: {
  funcionarioId: number;
  nome: string;
  onFechar: () => void;
}) {
  const utils = trpc.useUtils();
  // O gestor vê a função com o nome que o cliente dele usa.
  const v = useVocabulario();
  const { data, isLoading } = trpc.funcionario.listFuncoes.useQuery({ funcionarioId });

  const [permissoes, setPermissoes] = useState<Record<string, Permissao>>({});

  useEffect(() => {
    if (!data) return;

    const mapa: Record<string, Permissao> = {};
    for (const funcao of FUNCOES_FUNCIONARIO) {
      const gravada = data.find((f) => f.funcaoKey === funcao.chave);
      // Sem linha gravada, vale o padrão: vê e cria, mas não exclui.
      mapa[funcao.chave] = {
        habilitada: gravada ? gravada.habilitada : true,
        podeCriar: gravada ? gravada.podeCriar : true,
        podeExcluir: gravada ? gravada.podeExcluir : false,
      };
    }
    setPermissoes(mapa);
  }, [data]);

  const salvar = trpc.funcionario.updateFuncoes.useMutation({
    onSuccess: async () => {
      await utils.funcionario.listFuncoes.invalidate({ funcionarioId });
      toast.success("Permissões salvas");
      onFechar();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  const alternar = (chave: string, campo: keyof Permissao, valor: boolean) =>
    setPermissoes((atual) => {
      const alvo = { ...atual[chave], [campo]: valor };
      // Sem ver, o resto não faz sentido: desligar "ver" desliga tudo.
      if (campo === "habilitada" && !valor) {
        alvo.podeCriar = false;
        alvo.podeExcluir = false;
      }
      if (campo === "podeCriar") {
        if (valor) alvo.habilitada = true;
        // Quem não registra também não apaga.
        else alvo.podeExcluir = false;
      }
      if (campo === "podeExcluir" && valor) {
        alvo.habilitada = true;
        alvo.podeCriar = true;
      }
      return { ...atual, [chave]: alvo };
    });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de {nome}</DialogTitle>
          <DialogDescription>
            O que aparece no aplicativo dele, o que ele pode registrar e o que pode excluir.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-6 pr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span className="w-10 text-center">Ver</span>
              <span className="w-10 text-center">Criar</span>
              <span className="w-10 text-center">Excluir</span>
            </div>

            {FUNCOES_FUNCIONARIO.map((funcao) => {
              const atual =
                permissoes[funcao.chave] ??
                { habilitada: true, podeCriar: true, podeExcluir: false };
              return (
                <div
                  key={funcao.chave}
                  className="flex items-center gap-4 border rounded-lg px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{v[funcao.termo]}</p>
                    <p className="text-xs text-slate-500">{funcao.descricao}</p>
                  </div>
                  <div className="w-10 flex justify-center">
                    <Switch
                      checked={atual.habilitada}
                      onCheckedChange={(v) => alternar(funcao.chave, "habilitada", v)}
                      aria-label={`Ver ${v[funcao.termo]}`}
                    />
                  </div>
                  <div className="w-10 flex justify-center">
                    <Switch
                      checked={atual.podeCriar}
                      onCheckedChange={(v) => alternar(funcao.chave, "podeCriar", v)}
                      aria-label={`Criar em ${v[funcao.termo]}`}
                    />
                  </div>
                  <div className="w-10 flex justify-center">
                    {funcao.temExclusao ? (
                      <Switch
                        checked={atual.podeExcluir}
                        onCheckedChange={(v) => alternar(funcao.chave, "podeExcluir", v)}
                        aria-label={`Excluir em ${v[funcao.termo]}`}
                      />
                    ) : (
                      <span className="text-slate-300 text-xs" aria-hidden>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-slate-500 pt-1">
              Excluir ordem de serviço apaga junto fotos, anexos, orçamentos e histórico. Deixe
              desligado se a equipe só precisa registrar e acompanhar.
            </p>

            <Button
              className="w-full mt-2"
              disabled={salvar.isPending}
              onClick={() =>
                salvar.mutate({
                  funcionarioId,
                  funcoes: FUNCOES_FUNCIONARIO.map((f) => ({
                    funcaoKey: f.chave,
                    habilitada: permissoes[f.chave]?.habilitada ?? true,
                    podeCriar: permissoes[f.chave]?.podeCriar ?? true,
                    podeExcluir: f.temExclusao
                      ? permissoes[f.chave]?.podeExcluir ?? false
                      : false,
                  })),
                })
              }
            >
              {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar permissões
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PermissoesFuncionario;
