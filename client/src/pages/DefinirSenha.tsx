import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { SENHA_DIGITOS, SENHA_ERR_MSG, SENHA_REGEX } from "@shared/const";
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";

/**
 * Troca obrigatória da senha de implantação.
 *
 * Contas criadas em lote entram com senha padrão e o servidor recusa qualquer
 * outra rota enquanto ela não for trocada (`SENHA_PROVISORIA`). Esta tela é a
 * única saída — por isso não tem "voltar", só "sair".
 */
export default function DefinirSenhaPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: usuario, isLoading: carregandoUsuario } = trpc.auth.me.useQuery();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");

  const definir = trpc.auth.definirSenhaProvisoria.useMutation({
    onSuccess: async () => {
      // Sem invalidar, o guard continuaria vendo a conta como provisória.
      await utils.auth.me.invalidate();
      setLocation("/admin");
    },
    onError: (err) => setErro(err.message || "Não foi possível definir a senha"),
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/admin/login"),
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!SENHA_REGEX.test(novaSenha)) {
      setErro(SENHA_ERR_MSG);
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    definir.mutate({ novaSenha });
  };

  if (carregandoUsuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Redirect, e não setLocation: navegar durante o render dispara aviso do
  // React por atualizar outro componente enquanto este ainda renderiza.
  if (!usuario) return <Redirect to="/admin/login" />;

  // Conta que já definiu senha não tem o que fazer aqui.
  if (!usuario.senhaProvisoria) return <Redirect to="/admin" />;

  const emProgresso = definir.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Crie sua senha
            </CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              {usuario.name ? <>Olá <strong>{usuario.name}</strong>, sua </> : "Sua "}
              conta foi criada com uma senha temporária. Defina uma senha só sua
              para continuar.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={enviar} className="space-y-4">
              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erro}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="novaSenha" className="text-gray-700 font-medium">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="novaSenha"
                    type={mostrarSenha ? "text" : "password"}
                    // Teclado numérico no celular; o filtro impede colar letras.
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={SENHA_DIGITOS}
                    placeholder={`${SENHA_DIGITOS} dígitos numéricos`}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value.replace(/\D/g, ""))}
                    className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 tracking-widest"
                    disabled={emProgresso}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha" className="text-gray-700 font-medium">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmarSenha"
                    type={mostrarSenha ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={SENHA_DIGITOS}
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value.replace(/\D/g, ""))}
                    className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 tracking-widest"
                    disabled={emProgresso}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={emProgresso}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200"
              >
                {emProgresso ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar e entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-start gap-3 text-sm text-gray-500">
                <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p>
                  Enquanto a senha temporária não for trocada, o acesso ao
                  sistema fica bloqueado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => logout.mutate()}
                className="w-full mt-4 text-sm text-gray-600 hover:text-orange-600 transition-colors"
              >
                Sair
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-400 mt-6">
          App Manutenção © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
