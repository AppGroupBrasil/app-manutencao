import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CoreModulesPanel } from "@/components/funcionario/CoreModulesPanel";
import { ArrowLeft, Loader2 } from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

/**
 * Ocorrências no painel do gestor.
 *
 * Reaproveita o mesmo componente do portal do funcionário — a tela é boa e não
 * havia razão para escrever uma segunda. As rotas de ocorrência aceitam tanto
 * sessão de gestor quanto de funcionário, então o componente serve aos dois
 * sem adaptação.
 */
export default function Ocorrencias() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Ocorrências</h1>
            <p className="text-xs text-slate-500">
              {organizacaoAtiva ? organizacaoAtiva.nome : "Sem organização vinculada"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {organizacaoAtiva ? (
          <CoreModulesPanel section="ocorrencias" condominioId={organizacaoAtiva.id} />
        ) : (
          <p className="text-sm text-slate-500">Nenhuma organização vinculada a esta conta.</p>
        )}
      </main>
    </div>
  );
}
