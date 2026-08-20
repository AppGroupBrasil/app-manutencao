import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVocabulario } from "@/hooks/useVocabulario";
import {
  ArrowLeft,
  Building2,
  Check,
  Plus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

/**
 * Tutorial da tela de equipes, mostrado dentro dela mesma.
 *
 * Não é texto explicando botão: cada passo desenha a própria tela, com os
 * mesmos botões e campos, e destaca o que tocar. Quem lê "clique em Nova
 * equipe" precisa achar o botão; quem vê o botão aceso reconhece na hora.
 *
 * Os elementos aqui são figura — não clicam, não salvam nada. É de propósito:
 * o tutorial ensina o caminho, e o caminho de verdade é a tela atrás dele.
 */
export function ComoFuncionaEquipes({ onFechar }: { onFechar: () => void }) {
  const v = useVocabulario();
  const { data: organizacoes } = trpc.condominio.list.useQuery();
  const [passo, setPasso] = useState(0);

  const passos = [
    {
      titulo: "Comece pela equipe",
      texto:
        "A equipe é quem recebe a ordem de serviço e responde por ela. Toque em “Nova equipe” para o time da casa, ou “Nova equipe externa” para uma empresa contratada.",
      figura: (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border-2 border-slate-800 bg-white px-3 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4" /> Nova equipe
            </span>
            <span className="block text-xs text-slate-500 leading-snug mt-1">
              Funcionários da casa
            </span>
          </div>
          <div className="rounded-md border px-3 py-3 opacity-60">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="w-4 h-4" /> Nova equipe externa
            </span>
            <span className="block text-xs text-slate-500 leading-snug mt-1">
              Empresa contratada
            </span>
          </div>
        </div>
      ),
    },
    {
      titulo: "Dê um nome à equipe",
      texto:
        "Use o nome pelo qual vocês já chamam o grupo — “Elétrica”, “Jardinagem”, “Facilities”.",
      figura: (
        <div className="space-y-1.5">
          <Label>Nome da equipe</Label>
          <Input value="Elétrica" readOnly className="border-slate-800" />
        </div>
      ),
    },
    {
      titulo: `Marque as ${v.unidade.toLowerCase()}s que ela atende`,
      texto: `Uma equipe pode atender uma ${v.unidade.toLowerCase()} ou todas. Marcando “Todas”, ela aparece nas ordens de qualquer uma.`,
      figura: (
        <div className="border rounded-md divide-y">
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
            <Checkbox checked className="pointer-events-none" />
            {/* O número é o real do cliente: "15" fixo mentiria para quem tem
                três, e tutorial que não bate com a tela ensina errado. */}
            <span>
              Todas as {v.unidade.toLowerCase()}s ({organizacoes?.length ?? 0})
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
            <Checkbox checked className="pointer-events-none" />
            <span>São José</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
            <Checkbox checked className="pointer-events-none" />
            <span>Bela Vista</span>
          </div>
        </div>
      ),
    },
    {
      titulo: "Marque quem participa",
      texto:
        "Toque no nome de cada pessoa que faz parte da equipe. Supervisor marcado é quem recebe o aviso da ordem.",
      figura: (
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 rounded-md border-2 border-slate-800 px-2 py-2 text-sm">
            <Checkbox checked className="pointer-events-none" />
            <span className="flex-1">André</span>
            <span className="text-[11px] text-indigo-600">supervisor</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-2 py-2 text-sm text-slate-500">
            <Checkbox className="pointer-events-none" />
            <span className="flex-1">Bruno</span>
          </div>
        </div>
      ),
    },
    {
      titulo: "Não achou a pessoa? Cadastre aqui",
      texto:
        "Se o funcionário ainda não existe, toque em “Cadastrar funcionário”, preencha o nome e a função. Ele já entra marcado na equipe.",
      figura: (
        <div className="space-y-2">
          <div className="rounded-md border-2 border-slate-800 px-3 py-2 text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Cadastrar funcionário
          </div>
          <div className="rounded-md border bg-slate-50 p-3 space-y-2">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-slate-500" /> Novo funcionário
            </p>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value="André" readOnly />
            </div>
            <div className="text-xs text-slate-500">Função: Supervisor</div>
          </div>
        </div>
      ),
    },
    {
      titulo: "Salve e designe na ordem",
      texto:
        "Ao salvar, a equipe passa a aparecer no campo “Equipe designada” da ordem de serviço. Designou, ela recebe o aviso e responde pelo serviço.",
      figura: (
        <div className="space-y-2">
          <div className="rounded-md border-2 border-slate-800 bg-slate-800 text-white px-3 py-2 text-sm flex items-center gap-2 justify-center">
            <Plus className="w-4 h-4" /> Salvar equipe
          </div>
          <div className="rounded-md border px-3 py-2">
            <span className="text-xs text-slate-500">Equipe designada</span>
            <p className="text-sm font-medium text-slate-800">Elétrica</p>
          </div>
        </div>
      ),
    },
  ];

  const atual = passos[passo];
  const ultimo = passo === passos.length - 1;

  return (
    <div className="space-y-3">
      {/* Barra de segmentos, como as histórias do celular: quantos passos são
          e em qual deles a pessoa está. */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {passos.map((p, i) => (
            <span
              key={p.titulo}
              className={`h-1.5 flex-1 rounded-full ${
                i <= passo ? "bg-slate-800" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-slate-500"
          onClick={onFechar}
          aria-label="Fechar o passo a passo"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div>
        <p className="text-xs text-slate-500">
          Passo {passo + 1} de {passos.length}
        </p>
        <h3 className="text-base font-semibold text-slate-800">{atual.titulo}</h3>
        <p className="text-sm text-slate-600 mt-1">{atual.texto}</p>
      </div>

      {/* A tela de verdade, em miniatura: é o que a pessoa vai ver ao sair
          daqui, com o passo destacado. */}
      <div className="rounded-lg border bg-white p-3">{atual.figura}</div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => (passo === 0 ? onFechar() : setPasso(passo - 1))}
        >
          <ArrowLeft className="w-4 h-4" />
          {passo === 0 ? "Fechar" : "Voltar"}
        </Button>

        <Button className="flex-1" onClick={() => (ultimo ? onFechar() : setPasso(passo + 1))}>
          {ultimo ? (
            <>
              <Check className="w-4 h-4" /> Entendi, quero cadastrar
            </>
          ) : (
            "Próximo"
          )}
        </Button>
      </div>
    </div>
  );
}

export default ComoFuncionaEquipes;
