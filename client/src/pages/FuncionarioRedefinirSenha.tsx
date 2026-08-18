import { useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { SENHA_ERR_MSG, SENHA_REGEX } from "@shared/const";
import { Lock, Loader2, ArrowLeft, CheckCircle, XCircle, ShieldCheck } from "lucide-react";

/**
 * Cadastro da nova senha pelo link do e-mail — gestor ou funcionário.
 *
 * As rotas são as de `auth`, que resolvem o token nas duas identidades: o
 * e-mail é um só e quem clica não sabe em qual tabela está cadastrado.
 */
export default function FuncionarioRedefinirSenha() {
  const [, setLocation] = useLocation();
  /**
   * O token vem no caminho (`/redefinir-senha/<token>`).
   *
   * A query fica como reserva porque links antigos, já enviados, usam
   * `?token=` — e um link que abre "link inválido" é indistinguível, para quem
   * recebeu, de um sistema quebrado.
   */
  const params = useParams<{ token?: string }>();
  const busca = new URLSearchParams(useSearch());
  const token = params.token || busca.get("token") || "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const { data: tokenData, isLoading: validandoToken } =
    trpc.auth.validarTokenRecuperacao.useQuery({ token }, { enabled: !!token });

  const redefinirMutation = trpc.auth.redefinirSenha.useMutation({
    onSuccess: (data) => {
      setSucesso(true);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!novaSenha || !confirmarSenha) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Mesma regra do resto do sistema: a validação do servidor recusaria
    // qualquer outra coisa, e o aviso aqui evita a viagem perdida.
    if (!SENHA_REGEX.test(novaSenha)) {
      toast.error(SENHA_ERR_MSG);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    redefinirMutation.mutate({ token, novaSenha });
  };

  // Token inválido ou não fornecido
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white mb-4 shadow-lg">
              <XCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Link Inválido</h1>
            <p className="text-slate-500 mt-1">O link de recuperação não é válido</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-slate-600">
                  O link de recuperação de senha não contém um token válido.
                </p>
                <p className="text-sm text-slate-500">
                  Solicite um novo link de recuperação.
                </p>
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={() => setLocation("/recuperar-senha")}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
                  >
                    Solicitar Nova Recuperação
                  </Button>
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

  // Validando token
  if (validandoToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  // Token inválido ou expirado
  if (tokenData && !tokenData.valido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white mb-4 shadow-lg">
              <XCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {tokenData.expirado ? "Link Expirado" : "Link Inválido"}
            </h1>
            <p className="text-slate-500 mt-1">
              {tokenData.expirado 
                ? "O link de recuperação expirou" 
                : "O link de recuperação não é válido"}
            </p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-slate-600">
                  {tokenData.expirado 
                    ? "O link de recuperação de senha expirou. Os links são válidos por 1 hora."
                    : "O link de recuperação de senha não é válido ou já foi utilizado."}
                </p>
                <p className="text-sm text-slate-500">
                  Solicite um novo link de recuperação.
                </p>
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={() => setLocation("/recuperar-senha")}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
                  >
                    Solicitar Nova Recuperação
                  </Button>
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

  // Sucesso na redefinição
  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Senha Redefinida!</h1>
            <p className="text-slate-500 mt-1">Sua senha foi alterada com sucesso</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-slate-600">
                  Sua senha foi redefinida com sucesso. Agora você pode fazer login com a nova senha.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    Ir para Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Formulário de redefinição
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Redefinir Senha</h1>
          <p className="text-slate-500 mt-1">
            Olá, {tokenData?.nome}! Crie uma nova senha
          </p>
        </div>

        {/* Card de Redefinição */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Digite sua nova senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="novaSenha" className="text-slate-700">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="novaSenha"
                    type="password"
                    // Teclado numérico no celular: a senha do sistema é de
                    // dígitos, e o teclado de letras faz a pessoa errar.
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="pl-10"
                    disabled={redefinirMutation.isPending}
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500">{SENHA_ERR_MSG}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha" className="text-slate-700">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirmarSenha"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="pl-10"
                    disabled={redefinirMutation.isPending}
                    maxLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                disabled={redefinirMutation.isPending}
              >
                {redefinirMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  "Redefinir Senha"
                )}
              </Button>
            </form>
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
