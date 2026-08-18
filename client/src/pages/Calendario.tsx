import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CalendarioGeral } from "@/components/CalendarioGeral";
import { SeletorUnidades } from "@/components/SeletorUnidades";
import { useVocabulario } from "@/hooks/useVocabulario";
import { useUnidadesSelecionadas } from "@/hooks/useUnidadesSelecionadas";
import { ArrowLeft, Loader2 } from "lucide-react";

/**
 * Página do Calendário: a mesma leitura do painel, com filtro por função.
 *
 * As funções aparecem como botões redondos porque é o filtro que o resto do
 * sistema já usa (status da O.S., situação do vencimento) — quem aprendeu lá
 * não precisa aprender de novo aqui.
 */
const FONTES = [
  // A O.S. faltava aqui: marcar qualquer outra função a escondia da agenda, e
  // não havia como pedir só ela — que é o que o gerente olha todo dia.
  { chave: "os", rotulo: "Ordens de Serviço" },
  { chave: "vencimento", rotulo: "Vencimentos" },
  { chave: "manutencao", rotulo: "Manutenções" },
  { chave: "checklist", rotulo: "Checklists" },
  { chave: "vistoria", rotulo: "Vistorias" },
  { chave: "tarefa", rotulo: "Tarefas" },
  { chave: "atividade", rotulo: "Atividades" },
] as const;

export default function Calendario() {
  const [, setLocation] = useLocation();
  const v = useVocabulario();

  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: organizacoes } = trpc.condominio.list.useQuery(undefined, { enabled: !!user });

  // A mesma marcação do painel: quem abriu a agenda de três unidades lá espera
  // as três aqui, não a unidade que estava ativa antes de marcar.
  const selecao = useUnidadesSelecionadas();
  const organizacaoAtiva =
    organizacoes?.find((c) => c.id === selecao.principal) ?? organizacoes?.[0] ?? null;

  // Nenhuma marcada = todas visíveis; é o estado em que a tela abre.
  const [fontes, setFontes] = useState<string[]>([]);

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

  const rotuloDaFonte = (chave: string, padrao: string) => {
    // O cliente pode renomear a função; o filtro segue o nome dele.
    if (chave === "vencimento") return padrao;
    const mapa: Record<string, string> = {
      os: v.ordensServico,
      manutencao: v.manutencoes,
      checklist: v.checklists,
      vistoria: v.vistorias,
      tarefa: v.tarefas,
      atividade: v.atividades,
    };
    return mapa[chave] ?? padrao;
  };

  const alternar = (chave: string) =>
    setFontes((atual) =>
      atual.includes(chave) ? atual.filter((f) => f !== chave) : [...atual, chave],
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">Calendário</h1>
            {selecao.temEscolha ? (
              <SeletorUnidades selecao={selecao} className="mt-0.5 max-w-[240px]" />
            ) : (
              <p className="text-xs text-slate-500 truncate">
                {organizacaoAtiva ? organizacaoAtiva.nome : "Sem organização vinculada"}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              fontes.length === 0
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => setFontes([])}
          >
            Todas as funções
          </button>
          {FONTES.map((f) => {
            const ativo = fontes.includes(f.chave);
            return (
              <button
                key={f.chave}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  ativo
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => alternar(f.chave)}
              >
                {rotuloDaFonte(f.chave, f.rotulo)}
              </button>
            );
          })}
        </div>

        <CalendarioGeral
          condominioId={organizacaoAtiva?.id ?? 0}
          unidades={selecao.marcadas}
          fontesVisiveis={fontes.length > 0 ? fontes : undefined}
        />

        <p className="text-xs text-slate-500">
          Toque num dia para ver o que vence nele. Toque no item para abrir a função, já com o
          registro filtrado pelo número de protocolo.
        </p>
      </main>
    </div>
  );
}
