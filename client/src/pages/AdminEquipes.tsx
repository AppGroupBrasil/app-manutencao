import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { GerenciarEquipes } from "@/components/GerenciarEquipes";
import { useVocabulario } from "@/hooks/useVocabulario";
import { ArrowLeft, Loader2 } from "lucide-react";

const TENANT_ATIVO_KEY = "condominio_ativo";

/**
 * Equipes de serviço da unidade.
 *
 * A tela é só a moldura: o cadastro em si vive em `GerenciarEquipes`, que a
 * abertura da O.S. também usa pela engrenagem. Dois caminhos, um comportamento.
 */
export default function AdminEquipes() {
  const [, setLocation] = useLocation();
  const v = useVocabulario();

  const { data: user, isLoading: carregandoUser } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const salvo = Number(localStorage.getItem(TENANT_ATIVO_KEY));
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === salvo) ?? organizacoes?.[0] ?? null;
  const condominioId = organizacaoAtiva?.id ?? 0;

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Equipes de Serviço</h1>
            <p className="text-xs text-slate-500">
              {organizacaoAtiva ? organizacaoAtiva.nome : `Sem ${v.unidade.toLowerCase()} vinculada`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {condominioId === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-600">
              Sem {v.unidade.toLowerCase()} vinculada a esta conta.
            </CardContent>
          </Card>
        ) : (
          <GerenciarEquipes condominioId={condominioId} />
        )}
      </main>
    </div>
  );
}
