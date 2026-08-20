import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Loader2, Pencil, Plus, Search, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { PermissoesFuncionario } from "@/components/PermissoesFuncionario";
import { SeletorUnidades } from "@/components/SeletorUnidades";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useUnidadesSelecionadas } from "@/hooks/useUnidadesSelecionadas";
import { useVocabulario } from "@/hooks/useVocabulario";

const TIPOS = ["auxiliar", "zelador", "porteiro", "supervisor", "gerente", "sindico_externo"] as const;
type TipoFuncionario = (typeof TIPOS)[number];

const ROTULO_TIPO: Record<TipoFuncionario, string> = {
  auxiliar: "Auxiliar",
  zelador: "Zelador",
  porteiro: "Funcionário",
  supervisor: "Supervisor",
  gerente: "Gerente",
  sindico_externo: "Gestor externo",
};

type Funcionario = {
  id: number;
  nome: string;
  /** Unidade da ficha: decide quais equipes podem ser oferecidas a ela. */
  condominioId?: number | null;
  /** Preenchido pelo servidor quando a lista soma mais de uma unidade. */
  unidadeNome?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean | null;
  tipoFuncionario?: string | null;
  loginEmail?: string | null;
  loginUsuario?: string | null;
  loginAtivo?: boolean | null;
};

type Equipe = {
  id: number;
  condominioId: number;
  nome: string;
  cor?: string | null;
  unidadeNome?: string | null;
  totalMembros: number;
  /** Em quantas unidades ela atende. Mais de uma é equipe de rede. */
  totalUnidades?: number;
};

/**
 * Ficha da equipe, aberta pela aba Equipes. `id: null` é equipe ainda por criar.
 *
 * A aba só listava: o botão do topo abria a ficha de funcionário e criar equipe
 * existia apenas dentro do cadastro de alguém — quem queria só montar o time
 * tinha de cadastrar uma pessoa para chegar lá.
 */
type FichaEquipe = {
  id: number | null;
  nome: string;
  /**
   * Unidades que a equipe atende. `null` é "ainda como está no servidor" —
   * mesma ideia dos membros.
   *
   * Uma equipe pode cobrir a rede inteira: "Facilities" atende as quinze e
   * precisa aparecer na O.S. de qualquer uma delas.
   */
  unidades: number[] | null;
  /**
   * Funcionários marcados. `null` é "ninguém mexeu ainda": vale o que está
   * gravado no servidor.
   *
   * A distinção importa porque a lista da tela pode não mostrar o time inteiro
   * — `funcionario.list` recorta por quem cadastrou —, e uma lista semeada pela
   * tela tiraria da equipe quem o gestor nunca chegou a ver.
   */
  membros: number[] | null;
};

type Formulario = {
  nome: string;
  cargo: string;
  telefone: string;
  whatsapp: string;
  email: string;
  tipoFuncionario: TipoFuncionario;
  loginEmail: string;
  senha: string;
  loginAtivo: boolean;
};

const VAZIO: Formulario = {
  nome: "",
  cargo: "",
  telefone: "",
  whatsapp: "",
  email: "",
  tipoFuncionario: "auxiliar",
  loginEmail: "",
  senha: "",
  loginAtivo: false,
};

export default function AdminFuncionarios() {
  const [permissoesDe, setPermissoesDe] = useState<{ id: number; nome: string } | null>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();
  const v = useVocabulario();
  const { temModulo, modulosIndefinidos } = useBootstrap();

  const { data: organizacoes } = trpc.condominio.list.useQuery();
  /**
   * A tela abre com a equipe de todas as unidades e o gerente estreita depois.
   *
   * Uma unidade por vez escondia quem tinha acabado de ser cadastrado: quem
   * salvou em Central Pinheiros e estava vendo outra unidade não achava a ficha
   * e concluía que o cadastro não tinha salvo.
   */
  const selecao = useUnidadesSelecionadas();
  const orgId = selecao.principal || null;

  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [form, setForm] = useState<Formulario>(VAZIO);
  /**
   * Unidade da ficha nova. A pessoa trabalha em uma unidade, mesmo quando a
   * lista mostra várias — gravar na "unidade da tela" mandaria o cadastro para
   * a primeira marcada, que não é escolha de ninguém.
   */
  const [unidadeNova, setUnidadeNova] = useState<number>(0);
  /** Equipes marcadas na ficha aberta — gravadas junto com ela. */
  const [equipesDoForm, setEquipesDoForm] = useState<number[]>([]);
  /** Nome digitado no "criar equipe aqui mesmo", dentro da ficha. */
  const [equipeNova, setEquipeNova] = useState("");
  const [aba, setAba] = useState<"pessoas" | "equipes">("pessoas");
  /** Equipe aberta na aba Equipes: nome, unidade e quem está dentro. */
  const [fichaEquipe, setFichaEquipe] = useState<FichaEquipe | null>(null);

  const { data: lista, isLoading } = trpc.funcionario.list.useQuery(
    { condominioId: orgId ?? 0, unidades: selecao.marcadas },
    { enabled: !!orgId },
  );

  /**
   * Equipes vivem aqui dentro: criar a pessoa, criar o time e juntar os dois é
   * um fluxo só. Função desligada some da tela inteira, abas inclusive.
   */
  const usaEquipes = !modulosIndefinidos && temModulo("equipes");
  /**
   * A aba de equipes só vale com a função ligada: sem o `usaEquipes`, desligar
   * equipes com a aba aberta deixaria a tela em equipes sem as abas para voltar.
   */
  const abaEquipes = usaEquipes && aba === "equipes";
  const { data: equipes, isLoading: carregandoEquipes } = trpc.equipes.list.useQuery(
    { condominioId: orgId ?? 0, unidades: selecao.marcadas },
    { enabled: !!orgId && usaEquipes },
  );
  const { data: vinculos } = trpc.equipes.porFuncionario.useQuery(
    { condominioId: orgId ?? 0, unidades: selecao.marcadas },
    { enabled: !!orgId && usaEquipes },
  );

  /** Equipes de cada funcionário, para as etiquetas da lista e da ficha. */
  const equipesPorFuncionario = useMemo(() => {
    const mapa = new Map<number, { equipeId: number; nome: string; cor: string | null }[]>();
    for (const v of vinculos ?? []) {
      const atual = mapa.get(v.funcionarioId) ?? [];
      atual.push({ equipeId: v.equipeId, nome: v.nome, cor: v.cor });
      mapa.set(v.funcionarioId, atual);
    }
    return mapa;
  }, [vinculos]);

  async function recarregar() {
    await Promise.all([
      utils.funcionario.list.invalidate(),
      utils.equipes.list.invalidate(),
      utils.equipes.porFuncionario.invalidate(),
      utils.equipes.unidades.invalidate(),
    ]);
  }

  const criar = trpc.funcionario.create.useMutation({ onError: (e) => toast.error(e.message) });
  const atualizar = trpc.funcionario.update.useMutation({ onError: (e) => toast.error(e.message) });
  const definirEquipes = trpc.equipes.definirDoFuncionario.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const criarEquipe = trpc.equipes.create.useMutation({
    onError: (e) => toast.error(e.message || "Não foi possível criar a equipe"),
  });
  const atualizarEquipe = trpc.equipes.update.useMutation({
    onError: (e) => toast.error(e.message || "Não foi possível salvar a equipe"),
  });
  const excluirEquipe = trpc.equipes.delete.useMutation({
    onSuccess: async () => {
      await recarregar();
      toast.success("Equipe removida");
    },
    onError: (e) => toast.error(e.message || "Não foi possível remover"),
  });

  const remover = trpc.funcionario.delete.useMutation({
    onSuccess: async () => {
      toast.success("Funcionário excluído");
      await recarregar();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const itens = (lista ?? []) as Funcionario[];
    if (!termo) return itens;
    return itens.filter(
      (f) =>
        f.nome.toLowerCase().includes(termo) ||
        (f.cargo ?? "").toLowerCase().includes(termo) ||
        (f.email ?? "").toLowerCase().includes(termo) ||
        // Procurar pelo nome da unidade é o caminho natural com a rede na tela.
        (f.unidadeNome ?? "").toLowerCase().includes(termo),
    );
  }, [lista, busca]);

  function abrirCriacao() {
    setForm(VAZIO);
    // Abre na unidade que a pessoa estava vendo; com várias marcadas, na
    // primeira delas — e o campo fica à vista para trocar.
    setUnidadeNova(orgId ?? 0);
    setEquipesDoForm([]);
    setEquipeNova("");
    setCriando(true);
  }

  function abrirEdicao(f: Funcionario) {
    setForm({
      nome: f.nome ?? "",
      cargo: f.cargo ?? "",
      telefone: f.telefone ?? "",
      whatsapp: (f as { whatsapp?: string | null }).whatsapp ?? "",
      email: f.email ?? "",
      tipoFuncionario: (f.tipoFuncionario as TipoFuncionario) ?? "auxiliar",
      loginEmail: f.loginEmail ?? f.email ?? "",
      senha: "",
      loginAtivo: !!f.loginAtivo,
    });
    setUnidadeNova(f.condominioId ?? orgId ?? 0);
    setEquipesDoForm((equipesPorFuncionario.get(f.id) ?? []).map((e) => e.equipeId));
    setEquipeNova("");
    setEditando(f);
  }

  function fechar() {
    setCriando(false);
    setEditando(null);
    setForm(VAZIO);
    setEquipesDoForm([]);
    setEquipeNova("");
  }

  /**
   * Equipes oferecidas na ficha: as da unidade da pessoa, e só.
   *
   * Consulta própria, e não um filtro da lista da tela: dá para cadastrar
   * alguém numa unidade que não está marcada no seletor, e aí as equipes dela
   * não vieram na lista — a ficha diria "nenhuma equipe" com equipes existindo.
   */
  const fichaAberta = criando || !!editando;
  const { data: equipesDaUnidadeDoForm } = trpc.equipes.list.useQuery(
    { condominioId: unidadeNova, unidades: [unidadeNova] },
    { enabled: usaEquipes && fichaAberta && unidadeNova > 0 },
  );

  /**
   * Equipe criada de dentro da ficha, já marcada.
   *
   * É o atalho que fecha o fluxo: quem está cadastrando alguém e percebe que o
   * time ainda não existe resolve ali, sem sair e perder o que digitou.
   */
  async function criarEquipeAqui() {
    const nome = equipeNova.trim();
    if (nome.length < 2) return toast.error("Informe o nome da equipe");
    if (!unidadeNova) return toast.error(`Escolha a ${v.unidade.toLowerCase()} primeiro`);

    const criada = await criarEquipe.mutateAsync({ condominioId: unidadeNova, nome });
    await utils.equipes.list.invalidate();
    setEquipesDoForm((atual) => [...atual, criada.id]);
    setEquipeNova("");
    toast.success(`Equipe "${nome}" criada`);
  }

  /** Unidades já gravadas da equipe aberta, para a ficha abrir marcada. */
  const { data: unidadesGravadas } = trpc.equipes.unidades.useQuery(
    { equipeId: fichaEquipe?.id ?? 0 },
    { enabled: usaEquipes && !!fichaEquipe?.id },
  );

  /** O que os quadradinhos de unidade mostram: o marcado, ou o gravado. */
  const unidadesMarcadas = fichaEquipe?.unidades ?? unidadesGravadas ?? [];

  /**
   * Quem pode entrar na equipe aberta, e em que times essas pessoas já estão.
   *
   * Consulta pelas unidades que a equipe atende, e não pela lista da tela: a
   * equipe pode cobrir unidade que não está marcada no seletor, e aí metade do
   * time não apareceria para ser montado.
   */
  const unidadeDaEquipe = unidadesMarcadas[0] ?? 0;
  const { data: pessoasDaUnidadeDaEquipe } = trpc.funcionario.list.useQuery(
    { condominioId: unidadeDaEquipe, unidades: unidadesMarcadas },
    { enabled: usaEquipes && unidadeDaEquipe > 0 },
  );
  const { data: vinculosDaUnidadeDaEquipe } = trpc.equipes.porFuncionario.useQuery(
    { condominioId: unidadeDaEquipe, unidades: unidadesMarcadas },
    { enabled: usaEquipes && unidadeDaEquipe > 0 },
  );

  function abrirCriacaoEquipe() {
    setFichaEquipe({
      id: null,
      nome: "",
      unidades: orgId ? [orgId] : [],
      membros: [],
    });
  }

  function abrirEdicaoEquipe(equipe: Equipe) {
    setFichaEquipe({ id: equipe.id, nome: equipe.nome, unidades: null, membros: null });
  }

  /** Quem o servidor diz que está na equipe aberta. */
  const membrosGravados = useMemo(
    () =>
      (vinculosDaUnidadeDaEquipe ?? [])
        .filter((x) => x.equipeId === fichaEquipe?.id)
        .map((x) => x.funcionarioId),
    [vinculosDaUnidadeDaEquipe, fichaEquipe?.id],
  );

  /** O que os quadradinhos mostram: o que foi marcado, ou o que está gravado. */
  const membrosMarcados = fichaEquipe?.membros ?? membrosGravados;

  /** Grava o nome da equipe e o time inteiro de uma vez. */
  async function salvarEquipe() {
    if (!fichaEquipe) return;
    const nome = fichaEquipe.nome.trim();
    if (nome.length < 2) return toast.error("Informe o nome da equipe");
    if (unidadesMarcadas.length === 0) {
      return toast.error(`Marque ao menos uma ${v.unidade.toLowerCase()}`);
    }
    // `definirDoFuncionario` grava a lista inteira de equipes da pessoa: sem os
    // vínculos carregados, montar este time apagaria os outros dela.
    if (!vinculosDaUnidadeDaEquipe) {
      return toast.error(`Aguarde carregar os funcionários desta ${v.unidade.toLowerCase()}.`);
    }

    let equipeId = fichaEquipe.id;
    if (equipeId) {
      await atualizarEquipe.mutateAsync({ id: equipeId, nome, unidades: unidadesMarcadas });
    } else {
      equipeId = (
        await criarEquipe.mutateAsync({
          condominioId: unidadesMarcadas[0],
          nome,
          unidades: unidadesMarcadas,
        })
      ).id;
    }

    /** As outras equipes de cada pessoa, que precisam sobreviver à gravação. */
    const outras = new Map<number, number[]>();
    const jaEstavam = new Set<number>();
    for (const vinculo of vinculosDaUnidadeDaEquipe) {
      if (vinculo.equipeId === equipeId) {
        jaEstavam.add(vinculo.funcionarioId);
        continue;
      }
      outras.set(vinculo.funcionarioId, [...(outras.get(vinculo.funcionarioId) ?? []), vinculo.equipeId]);
    }

    // Sem marcação nenhuma, o time fica como está: o `null` é justamente para
    // salvar só o nome sem tocar em quem já é da equipe.
    const marcados = new Set(fichaEquipe.membros ?? jaEstavam);
    const mudaram = [...new Set([...jaEstavam, ...marcados])].filter(
      (id) => jaEstavam.has(id) !== marcados.has(id),
    );

    for (const funcionarioId of mudaram) {
      const resto = outras.get(funcionarioId) ?? [];
      // A unidade é a da pessoa, não a da equipe: numa equipe de rede cada
      // membro é de uma, e o portão da função olha a unidade dele.
      const dele = (pessoasDaUnidadeDaEquipe ?? []).find((f) => f.id === funcionarioId);
      await definirEquipes.mutateAsync({
        condominioId: dele?.condominioId ?? unidadesMarcadas[0],
        funcionarioId,
        equipeIds: marcados.has(funcionarioId) ? [...resto, equipeId] : resto,
      });
    }

    await recarregar();
    toast.success(fichaEquipe.id ? "Equipe atualizada" : `Equipe "${nome}" criada`);
    setFichaEquipe(null);
  }

  const salvandoEquipe =
    criarEquipe.isPending || atualizarEquipe.isPending || definirEquipes.isPending;

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!unidadeNova) return toast.error(`Escolha a ${v.unidade.toLowerCase()}`);

    if (editando) {
      await atualizar.mutateAsync({
        id: editando.id,
        nome: form.nome.trim(),
        cargo: form.cargo.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        email: form.email.trim() || undefined,
        tipoFuncionario: form.tipoFuncionario,
        loginEmail: form.loginEmail.trim() || undefined,
        // Campo em branco não mexe na senha atual.
        senha: form.senha.trim() || undefined,
        loginAtivo: form.loginAtivo,
      });
      // `vinculos` é o que a ficha abriu marcado. Sem ele carregado, gravar
      // significaria "esta pessoa não é de nenhuma equipe" e apagaria os times
      // dela por causa de uma consulta que ainda não voltou.
      if (usaEquipes && vinculos) {
        await definirEquipes.mutateAsync({
          condominioId: unidadeNova || undefined,
          funcionarioId: editando.id,
          equipeIds: equipesDoForm,
        });
      }
      toast.success("Funcionário atualizado");
      await recarregar();
      fechar();
      return;
    }

    // Acesso junto do cadastro: com senha, o funcionário já nasce podendo
    // entrar; sem senha, fica só como ficha.
    if (form.senha.trim() && !/^\d{6}$/.test(form.senha.trim())) {
      return toast.error("A senha de acesso precisa ter 6 dígitos");
    }

    const novo = await criar.mutateAsync({
      condominioId: unidadeNova,
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      email: form.email.trim() || undefined,
      tipoFuncionario: form.tipoFuncionario,
      loginEmail: form.loginEmail.trim() || form.email.trim() || undefined,
      senha: form.senha.trim() || undefined,
    });

    // A ficha nasce já no time: sem isto, cadastrar e montar a equipe seguiriam
    // sendo duas idas à mesma tela.
    if (usaEquipes && equipesDoForm.length > 0) {
      await definirEquipes.mutateAsync({
        condominioId: unidadeNova,
        funcionarioId: novo.id,
        equipeIds: equipesDoForm,
      });
    }

    toast.success("Funcionário cadastrado");
    await recarregar();
    fechar();
  }

  const salvando = criar.isPending || atualizar.isPending || definirEquipes.isPending;

  /** O erro já virou aviso no `onError` de cada mutação; aqui ele só para. */
  const salvarSemQuebrar = () => void salvar().catch(() => undefined);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 mr-auto">
            <Users className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold">Funcionários</h1>
          </div>
          {/* Todas marcadas ao abrir: a equipe inteira aparece e o gerente
              estreita para a unidade que quiser. */}
          <SeletorUnidades selecao={selecao} className="w-[240px]" />
          {/* O botão é da aba que está aberta: em Equipes ele abria a ficha de
              funcionário, e não havia como criar uma equipe pela tela. */}
          {abaEquipes ? (
            <Button onClick={abrirCriacaoEquipe}>
              <Plus className="w-4 h-4" /> Nova equipe
            </Button>
          ) : (
            <Button onClick={abrirCriacao}>
              <Plus className="w-4 h-4" /> Novo
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Pessoas e equipes na mesma tela: montar o time era outra tela, e
            quem cadastrava alguém tinha de repetir o caminho para juntá-lo. */}
        {usaEquipes && (
          <div className="flex gap-2">
            {(["pessoas", "equipes"] as const).map((chave) => (
              <button
                key={chave}
                onClick={() => setAba(chave)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  aba === chave
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {chave === "pessoas"
                  ? `Funcionários (${lista?.length ?? 0})`
                  : `Equipes (${equipes?.length ?? 0})`}
              </button>
            ))}
          </div>
        )}

        {abaEquipes ? (
          carregandoEquipes ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : (
          <ListaDeEquipes
            equipes={equipes ?? []}
            funcionarios={(lista ?? []) as Funcionario[]}
            equipesPorFuncionario={equipesPorFuncionario}
            onExcluir={(id, nome) => {
              if (confirm(`Remover a equipe "${nome}"?`)) excluirEquipe.mutate({ id });
            }}
            onNova={abrirCriacaoEquipe}
            onEditar={abrirEdicaoEquipe}
          />
          )
        ) : (
        <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar por nome, cargo, e-mail ou ${v.unidade.toLowerCase()}`}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {lista?.length ? "Nenhum funcionário com esse filtro." : "Nenhum funcionário nesta organização."}
              </p>
              <Button className="mt-4" onClick={abrirCriacao}>
                <Plus className="w-4 h-4" /> Cadastrar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtrados.map((f) => (
              <Card key={f.id}>
                <CardContent className="py-3 flex items-start gap-2">
                  <div className="mr-auto">
                    <p className="font-medium text-slate-800">{f.nome}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      {/* Só vem preenchido quando a lista soma mais de uma
                          unidade: é o que diz de onde é a pessoa. */}
                      {f.unidadeNome && (
                        <span className="font-medium text-slate-600">{f.unidadeNome}</span>
                      )}
                      {f.cargo && <span>{f.cargo}</span>}
                      {f.email && <span>{f.email}</span>}
                      {f.telefone && <span>{f.telefone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {ROTULO_TIPO[(f.tipoFuncionario as TipoFuncionario) ?? "auxiliar"]}
                      </Badge>
                      {f.loginAtivo ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">acesso ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-500">sem acesso</Badge>
                      )}
                      {/* De que time a pessoa é, sem abrir a ficha. */}
                      {(equipesPorFuncionario.get(f.id) ?? []).map((e) => (
                        <Badge
                          key={e.equipeId}
                          variant="outline"
                          className="text-xs"
                          style={{ color: e.cor ?? "#334155", borderColor: `${e.cor ?? "#94a3b8"}66` }}
                        >
                          {e.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Permissões"
                    aria-label={`Permissões de ${f.nome}`}
                    onClick={() => setPermissoesDe({ id: f.id, nome: f.nome })}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => abrirEdicao(f)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={remover.isPending}
                    onClick={() => {
                      if (confirm(`Excluir ${f.nome}?`)) remover.mutate({ id: f.id });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </>
        )}
      </main>

      {permissoesDe && (
        <PermissoesFuncionario
          funcionarioId={permissoesDe.id}
          nome={permissoesDe.nome}
          onFechar={() => setPermissoesDe(null)}
        />
      )}

      <Dialog open={criando || !!editando} onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
            <DialogDescription>
              {editando ? editando.nome : "O acesso ao portal é configurado depois de criar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Unidade da ficha: a primeira coisa, porque é o que decide onde a
                pessoa vai aparecer depois. Só no cadastro — mudar a unidade de
                quem já existe mexe em equipe, O.S. e permissões. */}
            {!editando && selecao.temEscolha && (
              <div className="space-y-1.5">
                <Label>{v.unidade}</Label>
                <Select
                  value={unidadeNova ? String(unidadeNova) : undefined}
                  onValueChange={(valor) => {
                    setUnidadeNova(Number(valor));
                    // As equipes são da unidade anterior: manter o que estava
                    // marcado pendurria a pessoa no time de outra unidade.
                    setEquipesDoForm([]);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={`Escolha a ${v.unidade.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {(organizacoes ?? []).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="f-nome">Nome</Label>
              <Input id="f-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-cargo">Cargo</Label>
                <Input id="f-cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipoFuncionario}
                  onValueChange={(v) => setForm({ ...form, tipoFuncionario: v as TipoFuncionario })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t} value={t}>{ROTULO_TIPO[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-email">E-mail</Label>
                <Input id="f-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-tel">Telefone</Label>
                <Input id="f-tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-zap">WhatsApp</Label>
                <Input
                  id="f-zap"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
                <p className="text-xs text-slate-500">
                  Para receber os links das funções no WhatsApp.
                </p>
              </div>
            </div>

            {/* Equipe junto da ficha: é o passo que antes exigia sair daqui,
                abrir a tela de equipes e procurar a pessoa na lista. */}
            {usaEquipes && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium text-slate-700">Equipes</p>
                {editando && !vinculos ? (
                  // Marcar antes de saber em quais equipes a pessoa já está
                  // gravaria uma lista incompleta por cima da atual.
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando as equipes desta pessoa…
                  </p>
                ) : (equipesDaUnidadeDoForm ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhuma equipe nesta {v.unidade.toLowerCase()} ainda — crie a primeira abaixo.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {(equipesDaUnidadeDoForm ?? []).map((e) => {
                      const marcada = equipesDoForm.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() =>
                            setEquipesDoForm((atual) =>
                              marcada ? atual.filter((id) => id !== e.id) : [...atual, e.id],
                            )
                          }
                          className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                          <Checkbox checked={marcada} className="pointer-events-none" />
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: e.cor ?? "#3b82f6" }}
                          />
                          <span className="truncate">{e.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={equipeNova}
                    onChange={(e) => setEquipeNova(e.target.value)}
                    placeholder="Nova equipe (ex: Elétrica)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void criarEquipeAqui().catch(() => undefined);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    disabled={equipeNova.trim().length < 2 || criarEquipe.isPending}
                    onClick={() => void criarEquipeAqui().catch(() => undefined)}
                  >
                    {criarEquipe.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium text-slate-700">Acesso ao portal</p>
              {!editando && (
                <p className="text-xs text-slate-500">
                  Preencha a senha para o funcionário já sair daqui podendo entrar. Em branco,
                  ele fica cadastrado sem acesso.
                </p>
              )}
                <div className="space-y-1.5">
                  <Label htmlFor="f-login">E-mail de login</Label>
                  <Input id="f-login" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-senha">Nova senha</Label>
                  <Input
                    id="f-senha"
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder="deixe em branco para manter"
                  />
                </div>
              {editando && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.loginAtivo}
                    onChange={(e) => setForm({ ...form, loginAtivo: e.target.checked })}
                  />
                  Acesso ativo
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button onClick={salvarSemQuebrar} disabled={salvando}>
              {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ficha da equipe: nome, unidade e o time montado na mesma tela. */}
      <Dialog open={!!fichaEquipe} onOpenChange={(aberto) => !aberto && setFichaEquipe(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fichaEquipe?.id ? "Editar equipe" : "Nova equipe"}</DialogTitle>
            <DialogDescription>
              A equipe agrupa funcionários por frente de trabalho e recebe a O.S. designada.
            </DialogDescription>
          </DialogHeader>

          {fichaEquipe && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-nome">Nome da equipe</Label>
                <Input
                  id="e-nome"
                  value={fichaEquipe.nome}
                  onChange={(e) => setFichaEquipe({ ...fichaEquipe, nome: e.target.value })}
                  placeholder="Ex: Elétrica"
                />
              </div>

              {/* Unidades atendidas: é o que faz a mesma equipe aparecer na O.S.
                  de cada unidade que ela cobre. Uma equipe de rede marca todas;
                  a equipe da casa marca só a dela. */}
              {selecao.temEscolha && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>{v.unidade}s atendidas ({unidadesMarcadas.length})</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setFichaEquipe({
                          ...fichaEquipe,
                          unidades:
                            unidadesMarcadas.length === (organizacoes?.length ?? 0)
                              ? unidadesMarcadas.slice(0, 1)
                              : (organizacoes ?? []).map((o) => o.id),
                        })
                      }
                    >
                      {unidadesMarcadas.length === (organizacoes?.length ?? 0)
                        ? "Desmarcar todas"
                        : "Marcar todas"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {(organizacoes ?? []).map((o) => {
                      const marcada = unidadesMarcadas.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() =>
                            setFichaEquipe({
                              ...fichaEquipe,
                              unidades: marcada
                                ? unidadesMarcadas.filter((id) => id !== o.id)
                                : [...unidadesMarcadas, o.id],
                            })
                          }
                          className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                          <Checkbox checked={marcada} className="pointer-events-none" />
                          <span className="truncate">{o.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Funcionários desta equipe ({membrosMarcados.length})
                </p>
                {!pessoasDaUnidadeDaEquipe || !vinculosDaUnidadeDaEquipe ? (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando os funcionários…
                  </p>
                ) : pessoasDaUnidadeDaEquipe.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum funcionário nesta {v.unidade.toLowerCase()} ainda — cadastre alguém
                    na aba Funcionários e volte aqui.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto">
                    {pessoasDaUnidadeDaEquipe.map((f) => {
                      const marcado = membrosMarcados.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setFichaEquipe({
                              ...fichaEquipe,
                              membros: marcado
                                ? membrosMarcados.filter((id) => id !== f.id)
                                : [...membrosMarcados, f.id],
                            })
                          }
                          className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                          <Checkbox checked={marcado} className="pointer-events-none" />
                          <span className="truncate flex-1">{f.nome}</span>
                          {f.tipoFuncionario === "supervisor" && (
                            <span className="text-[11px] text-indigo-600">supervisor</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFichaEquipe(null)}>Cancelar</Button>
            <Button
              onClick={() => void salvarEquipe().catch(() => undefined)}
              // Enquanto as unidades gravadas não chegam, salvar mandaria uma
              // lista vazia e devolveria "marque ao menos uma unidade" numa
              // equipe que tem unidades. Sem unidade nenhuma escolhida a
              // consulta nem roda, e aí quem avisa é o próprio salvar.
              disabled={
                salvandoEquipe ||
                (!!fichaEquipe?.id && !unidadesGravadas) ||
                (unidadeDaEquipe > 0 && !vinculosDaUnidadeDaEquipe)
              }
            >
              {salvandoEquipe ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Equipes das unidades marcadas, com quem está em cada uma.
 *
 * Criar e montar o time acontece aqui e também na ficha da pessoa: são os dois
 * momentos em que o gestor pensa nisso — ao cadastrar alguém e ao organizar as
 * frentes de trabalho.
 */
function ListaDeEquipes({
  equipes,
  funcionarios,
  equipesPorFuncionario,
  onExcluir,
  onNova,
  onEditar,
}: {
  equipes: Equipe[];
  funcionarios: Funcionario[];
  equipesPorFuncionario: Map<number, { equipeId: number; nome: string; cor: string | null }[]>;
  onExcluir: (id: number, nome: string) => void;
  onNova: () => void;
  onEditar: (equipe: Equipe) => void;
}) {
  if (equipes.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Nenhuma equipe ainda.</p>
          <p className="text-sm text-slate-500 mt-1">
            A equipe agrupa funcionários por frente de trabalho e recebe a O.S. designada.
          </p>
          <Button className="mt-4" onClick={onNova}>
            <Plus className="w-4 h-4" /> Nova equipe
          </Button>
        </CardContent>
      </Card>
    );
  }

  /** Quem está na equipe sai do que a lista de funcionários já trouxe. */
  const membrosDe = (equipeId: number) =>
    funcionarios.filter((f) =>
      (equipesPorFuncionario.get(f.id) ?? []).some((e) => e.equipeId === equipeId),
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {equipes.map((equipe) => {
        const membros = membrosDe(equipe.id);
        return (
          <Card key={equipe.id}>
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                  style={{ background: equipe.cor ?? "#3b82f6" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">{equipe.nome}</p>
                  <p className="text-xs text-slate-500">
                    {/* Equipe de rede não tem uma unidade para nomear: o que
                        descreve ela é em quantas atende. */}
                    {Number(equipe.totalUnidades ?? 1) > 1
                      ? `${Number(equipe.totalUnidades)} unidades · `
                      : equipe.unidadeNome
                        ? `${equipe.unidadeNome} · `
                        : ""}
                    {Number(equipe.totalMembros)} membro(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditar(equipe)}
                  aria-label={`Editar equipe ${equipe.nome}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onExcluir(equipe.id, equipe.nome)}
                  aria-label={`Remover equipe ${equipe.nome}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {membros.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
                  {membros.map((m) => (
                    <Badge key={m.id} variant="outline" className="text-xs font-normal">
                      {m.nome}
                      {m.tipoFuncionario === "supervisor" ? " · supervisor" : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
