import { trpc } from "@/lib/trpc";
import { Loader2, Users } from "lucide-react";

/**
 * Quem está na equipe escolhida para a O.S.
 *
 * Equipe e responsáveis eram dois quadros distantes dizendo a mesma coisa: o
 * gestor designava "Facilities" e continuava sem saber quem é Facilities. Aqui
 * o time aparece embaixo do seletor, e a frase diz quem vai ser avisado — que é
 * a pergunta seguinte de quem acabou de designar.
 */
export function MembrosDaEquipeEscolhida({ equipeId }: { equipeId: number }) {
  const { data: membros, isLoading } = trpc.equipes.membros.useQuery(
    { equipeId },
    { enabled: equipeId > 0 },
  );

  if (isLoading) {
    return (
      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando a equipe…
      </p>
    );
  }

  if ((membros?.length ?? 0) === 0) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 mt-2">
        Esta equipe não tem ninguém dentro — ninguém será avisado. Monte o time
        pela engrenagem antes de salvar.
      </p>
    );
  }

  const supervisores = membros!.filter((m) => m.tipoFuncionario === "supervisor");

  return (
    <div className="mt-2 rounded-md border bg-slate-50 px-2.5 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> {membros!.length} na equipe
      </p>
      <p className="text-xs text-slate-700 mt-1">
        {membros!
          .map((m) => (m.tipoFuncionario === "supervisor" ? `${m.nome} (supervisor)` : m.nome))
          .join(", ")}
      </p>
      <p className="text-[11px] text-slate-500 mt-1">
        {supervisores.length > 0
          ? `Aviso da O.S. vai para ${supervisores.map((s) => s.nome).join(", ")}.`
          : "Sem supervisor na equipe: o aviso vai para todos eles."}
      </p>
    </div>
  );
}

export default MembrosDaEquipeEscolhida;
