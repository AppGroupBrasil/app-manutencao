import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ModulosConfig } from "@/components/ModulosConfig";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

// O servidor recusa quem não for admin; aqui é só para não mostrar uma tela
// que só produziria erro ao salvar.
const HIERARQUIAS_ADMIN = new Set(["admin", "admin_master"]);
const ROLES_ADMIN = new Set(["admin", "master", "sindico"]);

function podeConfigurar(user: { hierarquia?: string | null; role?: string | null }): boolean {
  if (user.hierarquia) return HIERARQUIAS_ADMIN.has(user.hierarquia);
  return ROLES_ADMIN.has(user.role ?? "");
}

export default function AdminModulos() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/login");
      return;
    }
    if (!podeConfigurar(user)) {
      toast.error("Apenas administradores podem configurar módulos.");
      setLocation("/admin");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user || !podeConfigurar(user)) {
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
          <h1 className="text-lg font-bold">Módulos</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <ModulosConfig />
      </main>
    </div>
  );
}
