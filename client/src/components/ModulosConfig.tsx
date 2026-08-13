import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useBootstrap } from "@/hooks/useBootstrap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

const ROTULO_CATEGORIA: Record<string, string> = {
  comunicacao: "Comunicação",
  agenda: "Agenda",
  operacional: "Operacional",
  interativo: "Interativo",
  documentacao: "Documentação",
  midia: "Mídia",
  publicidade: "Publicidade",
  projetos: "Projetos",
  gestao: "Gestão",
  relatorios: "Relatórios",
};

/**
 * Configuração dos módulos visíveis para uma organização.
 *
 * O catálogo já vem filtrado pelo servidor: módulo exclusivo de outro cliente
 * não aparece aqui. Desligar um módulo bloqueia as rotas dele no servidor, não
 * apenas o item de menu.
 */
export function ModulosConfig() {
  const utils = trpc.useUtils();
  const { tenant } = useBootstrap();

  const { data: organizacoes } = trpc.condominio.list.useQuery();
  const { data: catalogo, isLoading: carregandoCatalogo } =
    trpc.funcoesCondominio.listarDisponiveis.useQuery();
  const { data: estados, isLoading: carregandoEstados } =
    trpc.funcoesCondominio.listar.useQuery();

  // Alterações pendentes: funcaoId -> habilitada
  const [pendentes, setPendentes] = useState<Record<string, boolean>>({});
  // Rede de unidades: a mesma configuração vale para todas, de uma vez.
  const [aplicarEmTodas, setAplicarEmTodas] = useState(false);

  const salvar = trpc.funcoesCondominio.atualizarMultiplas.useMutation({
    onSuccess: async (res) => {
      setPendentes({});
      await Promise.all([
        utils.funcoesCondominio.listar.invalidate(),
        utils.system.bootstrap.invalidate(),
      ]);
      toast.success(
        res.organizacoes > 1
          ? `Configuração aplicada a ${res.organizacoes} organizações`
          : `${res.updated} módulo(s) atualizados`,
      );
    },
    onError: (e) => toast.error(e.message || "Não foi possível salvar"),
  });

  const estadoAtual = useMemo(() => {
    const mapa: Record<string, boolean> = {};
    for (const e of estados ?? []) mapa[e.funcaoId] = e.habilitada;
    return mapa;
  }, [estados]);

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, { id: string; nome: string; descricao: string }[]>();
    for (const m of catalogo ?? []) {
      const lista = grupos.get(m.categoria) ?? [];
      lista.push({ id: m.id, nome: m.nome, descricao: m.descricao });
      grupos.set(m.categoria, lista);
    }
    return [...grupos.entries()];
  }, [catalogo]);

  const valorDe = (id: string) => pendentes[id] ?? estadoAtual[id] ?? false;

  const alternar = (id: string, valor: boolean) => {
    setPendentes((atual) => {
      const proximo = { ...atual };
      // Voltar ao valor original remove a pendência em vez de gravá-la
      if ((estadoAtual[id] ?? false) === valor) delete proximo[id];
      else proximo[id] = valor;
      return proximo;
    });
  };

  const trocarOrganizacao = (valor: string) => {
    localStorage.setItem(TENANT_ATIVO_KEY, valor);
    setPendentes({});
    // O tenant vai no cabeçalho de toda chamada; recarregar é o caminho mais
    // simples e seguro para revalidar tudo de uma vez.
    window.location.reload();
  };

  /**
   * O que a gravação leva.
   *
   * Numa organização só, bastam as alterações. Aplicando a todas, vai o estado
   * inteiro desta tela: a promessa é que as unidades fiquem iguais, e mandar só
   * as alterações deixaria cada uma com a configuração antiga no resto.
   */
  const oQueGravar = () => {
    const alterado = Object.entries(pendentes).map(([funcaoId, habilitada]) => ({
      funcaoId,
      habilitada,
    }));

    if (!aplicarEmTodas || !organizacoes) return { funcoes: alterado };

    return {
      organizacoesIds: organizacoes.map((o) => o.id),
      funcoes: (catalogo ?? []).map((m) => ({ funcaoId: m.id, habilitada: valorDe(m.id) })),
    };
  };

  const totalPendentes = Object.keys(pendentes).length;
  const carregando = carregandoCatalogo || carregandoEstados;

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma organização</CardTitle>
          <CardDescription>
            Cadastre uma organização para configurar os módulos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Módulos da organização</CardTitle>
          <CardDescription>
            Escolha o que esta organização enxerga. O que estiver desligado fica
            indisponível também na API, não só no menu.
          </CardDescription>
        </CardHeader>
        {(organizacoes?.length ?? 0) > 1 && (
          <CardContent>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Organização
            </label>
            <Select value={String(tenant.id)} onValueChange={trocarOrganizacao}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizacoes?.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                checked={aplicarEmTodas}
                onCheckedChange={(v) => setAplicarEmTodas(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                Aplicar a todas as {organizacoes?.length} organizações
                <span className="block text-xs text-slate-500">
                  As mesmas alterações são gravadas em todas — o que estiver
                  configurado diferente em outra unidade passa a seguir esta tela.
                </span>
              </span>
            </label>
          </CardContent>
        )}
      </Card>

      {porCategoria.map(([categoria, modulos]) => (
        <Card key={categoria}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {ROTULO_CATEGORIA[categoria] ?? categoria}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {modulos.map((m) => {
              const alterado = m.id in pendentes;
              return (
                <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{m.nome}</span>
                      {alterado && (
                        <Badge variant="secondary" className="text-[10px]">
                          alterado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{m.descricao}</p>
                  </div>
                  <Switch
                    checked={valorDe(m.id)}
                    onCheckedChange={(v) => alternar(m.id, v)}
                    aria-label={m.nome}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex items-center justify-end gap-2">
        {totalPendentes > 0 && (
          <Button
            variant="outline"
            onClick={() => setPendentes({})}
            disabled={salvar.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Descartar
          </Button>
        )}
        {/* Aplicar a todas vale mesmo sem alteração nova: é o jeito de copiar
            a configuração desta unidade para as demais. */}
        <Button
          onClick={() => salvar.mutate(oQueGravar())}
          disabled={(totalPendentes === 0 && !aplicarEmTodas) || salvar.isPending}
        >
          {salvar.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar {totalPendentes > 0 ? `(${totalPendentes})` : ""}
        </Button>
      </div>
    </div>
  );
}

export default ModulosConfig;
