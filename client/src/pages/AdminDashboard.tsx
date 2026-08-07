import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Building2, Users, Wrench, SlidersHorizontal } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: condominios } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      localStorage.removeItem("app_session_token");
      await utils.auth.me.invalidate();
      setLocation("/login");
    },
  });

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
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Painel Administrativo</h1>
            <p className="text-xs text-slate-500">{user.name} · {user.role}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo, {user.name?.split(" ")[0] || "Admin"}</CardTitle>
            <CardDescription>
              Você está logado como <strong>{user.role}</strong> ({user.tipoConta}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Painel inicial. As páginas de gestão completas serão habilitadas conforme demanda.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base">Condomínios</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{condominios?.length ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-1">cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <CardTitle className="text-base">Funcionários</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Disponível em breve</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-base">Ordens de Serviço</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Disponível em breve</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => setLocation("/admin/modulos")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base">Módulos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Definir o que cada organização enxerga
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
