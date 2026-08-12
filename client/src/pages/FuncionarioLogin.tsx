import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { BotaoSuporte } from "@/components/BotaoSuporte";
import { useCredenciaisLembradas } from "@/hooks/useCredenciaisLembradas";
import { Building2, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";

export default function FuncionarioLogin() {
  const [, setLocation] = useLocation();
  const { salvas, lembrar, alternarLembrar, persistir } = useCredenciaisLembradas("app_login_lembrado");
  const [identificador, setIdentificador] = useState(salvas.identificador);
  const [senha, setSenha] = useState(salvas.senha);
  const [showSenha, setShowSenha] = useState(false);

  const utils = trpc.useContext();
  const loginMutation = trpc.auth.loginUnificado.useMutation({
    onSuccess: async (data, variables) => {
      persistir({ identificador: variables.email, senha: variables.senha });
      if (data.token) {
        localStorage.setItem("app_session_token", data.token);
      }
      await Promise.allSettled([utils.auth.me.invalidate(), utils.funcionario.me.invalidate()]);
      toast.success(`Bem-vindo, ${data.user.nome || data.user.email}!`);
      setLocation(data.redirect || "/dashboard");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador || !senha) {
      toast.error("Preencha o usuário e a senha");
      return;
    }
    loginMutation.mutate({ email: identificador, senha });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Entrar no Sistema</h1>
          <p className="text-slate-500 mt-1">Gerente, administrador ou funcionário</p>
        </div>

        {/* Card de Login */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              Use seu e-mail (ou usuário) e senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identificador" className="text-slate-700">Usuário ou E-mail</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="identificador"
                    type="text"
                    placeholder="nomecompleto ou email@exemplo.com"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    className="pl-10"
                    autoComplete="username"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-slate-700">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                    disabled={loginMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="lembrar"
                  checked={lembrar}
                  onCheckedChange={(valor) => alternarLembrar(valor === true)}
                  disabled={loginMutation.isPending}
                />
                <Label htmlFor="lembrar" className="text-sm font-normal text-slate-600 cursor-pointer">
                  Lembrar e-mail e senha neste dispositivo
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a 
                href="/recuperar-senha" 
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Esqueceu a senha?
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <BotaoSuporte />
              <p className="text-xs text-center text-slate-500">
                Problemas para acessar? Fale com o gestor da sua unidade ou com o nosso suporte.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
