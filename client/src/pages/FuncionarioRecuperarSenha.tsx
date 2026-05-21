import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { KeyRound, Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function FuncionarioRecuperarSenha() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  const recuperarMutation = trpc.funcionario.solicitarRecuperacao.useMutation({
    onSuccess: (data) => {
      setEnviado(true);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Preencha o email");
      return;
    }
    recuperarMutation.mutate({ email });
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Solicitação Enviada</h1>
            <p className="text-slate-500 mt-1">Verifique com o administrador</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-slate-600">
                  Se o email <strong>{email}</strong> estiver cadastrado, o administrador receberá uma notificação com o link de recuperação.
                </p>
                <p className="text-sm text-slate-500">
                  Entre em contacto com o gestor ou administrador da organização para receber o link de recuperação de senha.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => setLocation("/login")}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white mb-4 shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Recuperar Senha</h1>
          <p className="text-slate-500 mt-1">Solicite um link de recuperação</p>
        </div>

        {/* Card de Recuperação */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Esqueceu a senha?</CardTitle>
            <CardDescription className="text-center">
              Digite seu email de acesso para solicitar a recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email de Acesso</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={recuperarMutation.isPending}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                disabled={recuperarMutation.isPending}
              >
                {recuperarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Solicitar Recuperação"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-center text-slate-500">
                O administrador receberá uma notificação e enviará o link de recuperação para você.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Link para voltar ao login */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation("/login")}
            className="text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>
      </div>
    </div>
  );
}
