import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ModulosConfig } from "@/components/ModulosConfig";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AdminModulos() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  // Quem decide é o servidor: dono da organização ou gestor-chefe. A regra
  // antiga olhava `users.hierarquia`, que fica no default para toda conta de
  // cliente — na prática ninguém do cliente conseguia abrir esta tela.
  const { data: podeConfigurar, isLoading: carregandoPermissao } =
    trpc.funcoesCondominio.podeConfigurar.useQuery(undefined, { enabled: !!user });

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
      return;
    }
    if (!carregandoPermissao && podeConfigurar === false) {
      toast.error("Apenas o gestor-chefe ou o dono da organização configura módulos.");
      setLocation("/admin");
    }
  }, [isLoading, user, carregandoPermissao, podeConfigurar, setLocation]);

  if (isLoading || carregandoPermissao || !user || !podeConfigurar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold">Configurações</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <ModulosConfig />
      </main>
    </div>
  );
}
