import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Cadastro de quem chega sozinho: sete dias de teste, sem cartão.
 *
 * Só o essencial — quem é, como entra e o que administra. O resto (unidades a
 * mais, equipe, funções) o próprio sistema pergunta depois, quando fizer
 * falta. Formulário longo na porta de entrada é gente que desiste antes.
 */
const SEGMENTOS = [
  { valor: "generico", rotulo: "Empresa (geral)" },
  { valor: "condominio", rotulo: "Condomínio" },
  { valor: "facilities", rotulo: "Facilities / terceirizada" },
  { valor: "educacional", rotulo: "Escola, creche ou rede social" },
  { valor: "metalurgia", rotulo: "Indústria / metalurgia" },
  { valor: "oficina", rotulo: "Oficina" },
  { valor: "academia", rotulo: "Academia" },
] as const;

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [organizacao, setOrganizacao] = useState("");
  const [segmento, setSegmento] = useState<string>("generico");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);

  const registar = trpc.auth.registar.useMutation({
    onSuccess: async (res) => {
      if (res.token) localStorage.setItem("app_session_token", res.token);
      await utils.auth.me.invalidate();
      toast.success(res.message);
      setLocation("/admin");
    },
    onError: (e) => toast.error(e.message || "Não foi possível criar a conta"),
  });

  const podeEnviar =
    nome.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    organizacao.trim().length >= 2 &&
    /^\d{6}$/.test(senha);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="/icon-192.png"
            alt="App Manutenção"
            className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg"
          />
          <h1 className="text-2xl font-bold text-slate-800">Criar conta</h1>
          <p className="text-slate-700 font-medium mt-1">App Manutenção</p>
          <p className="text-slate-500 text-sm mt-1">
            7 dias grátis para testar, sem cartão
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Seus dados</CardTitle>
            <CardDescription className="text-center">
              Leva um minuto e você já entra no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Seu nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">É com ele que você entra.</p>
            </div>

            <div>
              <Label>Telefone (opcional)</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>

            <div>
              <Label>Nome da empresa ou condomínio</Label>
              <Input
                placeholder="Ex: Condomínio Vila Nova"
                value={organizacao}
                onChange={(e) => setOrganizacao(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                É a primeira unidade do sistema. Dá para criar outras depois.
              </p>
            </div>

            <div>
              <Label>Ramo</Label>
              <Select value={segmento} onValueChange={setSegmento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTOS.map((s) => (
                    <SelectItem key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Ajusta o vocabulário das telas — unidade, planta, condomínio.
              </p>
            </div>

            <div>
              <Label>Senha de 6 números</Label>
              <div className="relative">
                <Input
                  type={verSenha ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
                >
                  {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!podeEnviar || registar.isPending}
              onClick={() =>
                registar.mutate({
                  nome: nome.trim(),
                  email: email.trim().toLowerCase(),
                  telefone: telefone.trim() || undefined,
                  organizacao: organizacao.trim(),
                  segmento: segmento as (typeof SEGMENTOS)[number]["valor"],
                  senha,
                })
              }
            >
              {registar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar conta e começar
            </Button>

            <Button variant="ghost" className="w-full" onClick={() => setLocation("/login")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Já tenho conta
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-4">
          Ao criar a conta você concorda com os{" "}
          <a href="/termos" className="underline">
            termos de uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" className="underline">
            política de privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
