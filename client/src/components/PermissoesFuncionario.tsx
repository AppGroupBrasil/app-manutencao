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
import { Loader2 } from "lucide-react";

type Permissao = { habilitada: boolean; podeCriar: boolean };

/**
 * O que o funcionário vê e o que ele pode criar, função por função.
 *
 * Tudo nasce ligado: quem cadastra alguém espera que a pessoa trabalhe. O
 * gestor desliga o que não quer — desligar "ver" faz a função sumir da tela
 * dele; desligar "criar" deixa a função visível, mas só de leitura.
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
  const { data, isLoading } = trpc.funcionario.listFuncoes.useQuery({ funcionarioId });

  const [permissoes, setPermissoes] = useState<Record<string, Permissao>>({});

  useEffect(() => {
    if (!data) return;

    const mapa: Record<string, Permissao> = {};
    for (const funcao of FUNCOES_FUNCIONARIO) {
      const gravada = data.find((f) => f.funcaoKey === funcao.chave);
      // Sem linha gravada, vale o padrão: vê e cria.
      mapa[funcao.chave] = {
        habilitada: gravada ? gravada.habilitada : true,
        podeCriar: gravada ? gravada.podeCriar : true,
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
      // Sem ver, criar não faz sentido: desligar um desliga o outro.
      if (campo === "habilitada" && !valor) alvo.podeCriar = false;
      if (campo === "podeCriar" && valor) alvo.habilitada = true;
      return { ...atual, [chave]: alvo };
    });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de {nome}</DialogTitle>
          <DialogDescription>
            O que aparece no aplicativo dele e o que ele pode registrar.
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
            </div>

            {FUNCOES_FUNCIONARIO.map((funcao) => {
              const atual = permissoes[funcao.chave] ?? { habilitada: true, podeCriar: true };
              return (
                <div
                  key={funcao.chave}
                  className="flex items-center gap-4 border rounded-lg px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{funcao.rotulo}</p>
                    <p className="text-xs text-slate-500">{funcao.descricao}</p>
                  </div>
                  <div className="w-10 flex justify-center">
                    <Switch
                      checked={atual.habilitada}
                      onCheckedChange={(v) => alternar(funcao.chave, "habilitada", v)}
                      aria-label={`Ver ${funcao.rotulo}`}
                    />
                  </div>
                  <div className="w-10 flex justify-center">
                    <Switch
                      checked={atual.podeCriar}
                      onCheckedChange={(v) => alternar(funcao.chave, "podeCriar", v)}
                      aria-label={`Criar em ${funcao.rotulo}`}
                    />
                  </div>
                </div>
              );
            })}

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
