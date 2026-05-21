import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TarefasSimplesModal } from "@/components/TarefasSimplesModal";
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Wrench,
  AlertTriangle,
  ArrowLeftRight,
  MapPin,
  Calendar,
  FileText,
  Image as ImageIcon,
  Eye,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  Edit,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TipoTarefa = "vistoria" | "manutencao" | "ocorrencia" | "antes_depois";
type StatusTarefa = "rascunho" | "enviado" | "concluido";

const tipoConfig = {
  vistoria: {
    label: "Vistoria",
    icon: ClipboardList,
    cor: "#3B82F6",
    corClara: "#EFF6FF",
  },
  manutencao: {
    label: "Manutenção",
    icon: Wrench,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  ocorrencia: {
    label: "Ocorrência",
    icon: AlertTriangle,
    cor: "#EF4444",
    corClara: "#FEF2F2",
  },
  antes_depois: {
    label: "Antes/Depois",
    icon: ArrowLeftRight,
    cor: "#10B981",
    corClara: "#ECFDF5",
  },
};

const statusConfig = {
  rascunho: {
    label: "Rascunho",
    icon: Edit,
    cor: "#6B7280",
    corClara: "#F3F4F6",
  },
  enviado: {
    label: "Enviado",
    icon: Send,
    cor: "#F97316",
    corClara: "#FFF7ED",
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle2,
    cor: "#10B981",
    corClara: "#ECFDF5",
  },
};

export default function HistoricoTarefasSimples() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoTarefa | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [tipoModalNova, setTipoModalNova] = useState<TipoTarefa>("vistoria");
  const [tarefaSelecionada, setTarefaSelecionada] = useState<any>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

  const utils = trpc.useUtils();

  // Buscar organizações do usuário
  const { data: condominios } = trpc.condominio.list.useQuery();

  // Selecionar primeiro condomínio automaticamente
  useMemo(() => {
    if (condominios && condominios.length > 0 && !condominioId) {
      setCondominioId(condominios[0].id);
    }
  }, [condominios, condominioId]);

  // Buscar tarefas simples
  const { data: tarefas, isLoading } = trpc.tarefasSimples.listar.useQuery(
    {
      condominioId: condominioId!,
      tipo: filtroTipo !== "todos" ? filtroTipo : undefined,
      status: filtroStatus !== "todos" ? filtroStatus : undefined,
      limite: 100,
    },
    { enabled: !!condominioId }
  );

  // Mutations
  const enviarMutation = trpc.tarefasSimples.enviar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa enviada com sucesso!");
      utils.tarefasSimples.listar.invalidate({ condominioId: condominioId! });
    },
  });

  const concluirMutation = trpc.tarefasSimples.concluir.useMutation({
    onSuccess: () => {
      toast.success("Tarefa concluída com sucesso!");
      utils.tarefasSimples.listar.invalidate({ condominioId: condominioId! });
    },
  });

  const deletarMutation = trpc.tarefasSimples.deletar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa removida com sucesso!");
      utils.tarefasSimples.listar.invalidate({ condominioId: condominioId! });
    },
  });

  // Filtrar por busca
  const tarefasFiltradas = useMemo(() => {
    if (!tarefas) return [];
    if (!busca.trim()) return tarefas;
    
    const termoBusca = busca.toLowerCase();
    return tarefas.filter(
      (t) =>
        t.protocolo?.toLowerCase().includes(termoBusca) ||
        t.titulo?.toLowerCase().includes(termoBusca) ||
        t.descricao?.toLowerCase().includes(termoBusca) ||
        t.statusPersonalizado?.toLowerCase().includes(termoBusca)
    );
  }, [tarefas, busca]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!tarefas) return { total: 0, rascunhos: 0, enviados: 0, concluidos: 0 };
    return {
      total: tarefas.length,
      rascunhos: tarefas.filter((t) => t.status === "rascunho").length,
      enviados: tarefas.filter((t) => t.status === "enviado").length,
      concluidos: tarefas.filter((t) => t.status === "concluido").length,
    };
  }, [tarefas]);

  const abrirNovaComTipo = (tipo: TipoTarefa) => {
    setTipoModalNova(tipo);
    setModalNovaAberto(true);
  };

  const verDetalhes = (tarefa: any) => {
    setTarefaSelecionada(tarefa);
    setModalDetalhesAberto(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Funções Simples
            </h1>
            <p className="text-gray-500 mt-1">
              Histórico de vistorias, manutenções, ocorrências e antes/depois
            </p>
          </div>

          {/* Seletor de Organização */}
          {condominios && condominios.length > 1 && (
            <Select
              value={condominioId?.toString()}
              onValueChange={(v) => setCondominioId(Number(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a organização" />
              </SelectTrigger>
              <SelectContent>
                {condominios.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-xl">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rascunhos</p>
                  <p className="text-2xl font-bold text-gray-600">{estatisticas.rascunhos}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-xl">
                  <Edit className="h-5 w-5 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Enviados</p>
                  <p className="text-2xl font-bold text-orange-600">{estatisticas.enviados}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Send className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Concluídos</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(tipoConfig) as TipoTarefa[]).map((tipo) => {
            const config = tipoConfig[tipo];
            const Icon = config.icon;
            return (
              <Button
                key={tipo}
                onClick={() => abrirNovaComTipo(tipo)}
                className="h-auto py-4 flex flex-col items-center gap-2 text-white shadow-lg hover:shadow-xl transition-all"
                style={{
                  background: `linear-gradient(135deg, ${config.cor} 0%, ${config.cor}dd 100%)`,
                }}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs opacity-80">+ Nova</span>
              </Button>
            );
          })}
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por protocolo, título ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtro por Tipo */}
              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {(Object.keys(tipoConfig) as TipoTarefa[]).map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tipoConfig[tipo].cor }}
                        />
                        {tipoConfig[tipo].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Status */}
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {(Object.keys(statusConfig) as StatusTarefa[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: statusConfig[status].cor }}
                        />
                        {statusConfig[status].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botão Atualizar */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => utils.tarefasSimples.listar.invalidate({ condominioId: condominioId! })}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tarefas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : tarefasFiltradas.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum registro encontrado
              </h3>
              <p className="text-gray-500">
                Comece criando uma nova vistoria, manutenção, ocorrência ou antes/depois usando os botões acima.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tarefasFiltradas.map((tarefa) => {
              const configTipo = tipoConfig[tarefa.tipo as TipoTarefa];
              const configStatus = statusConfig[tarefa.status as StatusTarefa];
              const IconTipo = configTipo?.icon || FileText;
              const IconStatus = configStatus?.icon || Clock;

              return (
                <Card
                  key={tarefa.id}
                  className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => verDetalhes(tarefa)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Ícone do Tipo */}
                      <div
                        className="p-3 rounded-xl shrink-0"
                        style={{ backgroundColor: configTipo?.corClara || "#F3F4F6" }}
                      >
                        <IconTipo
                          className="h-6 w-6"
                          style={{ color: configTipo?.cor || "#6B7280" }}
                        />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 truncate">
                              {tarefa.titulo || configTipo?.label || "Sem título"}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono">
                              {tarefa.protocolo}
                            </p>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: configStatus?.cor,
                                color: configStatus?.cor,
                                backgroundColor: configStatus?.corClara,
                              }}
                            >
                              <IconStatus className="h-3 w-3 mr-1" />
                              {configStatus?.label}
                            </Badge>
                            {tarefa.statusPersonalizado && (
                              <Badge
                                variant="outline"
                                className="text-xs border-orange-300 text-orange-600 bg-orange-50"
                              >
                                {tarefa.statusPersonalizado}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Descrição */}
                        {tarefa.descricao && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {tarefa.descricao}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                          {tarefa.endereco && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{tarefa.endereco}</span>
                            </span>
                          )}
                          {tarefa.imagens && (tarefa.imagens as string[]).length > 0 && (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {(tarefa.imagens as string[]).length} imagem(ns)
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(tarefa.createdAt!), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        {tarefa.status === "rascunho" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              enviarMutation.mutate({ id: tarefa.id });
                            }}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {tarefa.status === "enviado" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              concluirMutation.mutate({ id: tarefa.id });
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Tem certeza que deseja remover este registro?")) {
                              deletarMutation.mutate({ id: tarefa.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal Nova Tarefa */}
        {condominioId && (
          <TarefasSimplesModal
            open={modalNovaAberto}
            onOpenChange={setModalNovaAberto}
            condominioId={condominioId}
            tipoInicial={tipoModalNova}
            onSuccess={() => {
              utils.tarefasSimples.listar.invalidate({ condominioId });
            }}
          />
        )}

        {/* Modal Detalhes */}
        <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {tarefaSelecionada && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {(() => {
                      const config = tipoConfig[tarefaSelecionada.tipo as TipoTarefa];
                      const Icon = config?.icon || FileText;
                      return (
                        <>
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: config?.corClara }}
                          >
                            <Icon className="h-5 w-5" style={{ color: config?.cor }} />
                          </div>
                          <div>
                            <span>{tarefaSelecionada.titulo || config?.label}</span>
                            <p className="text-sm font-normal text-gray-500 font-mono">
                              {tarefaSelecionada.protocolo}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Status */}
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const config = statusConfig[tarefaSelecionada.status as StatusTarefa];
                      const Icon = config?.icon || Clock;
                      return (
                        <Badge
                          className="text-sm px-3 py-1"
                          style={{
                            backgroundColor: config?.corClara,
                            color: config?.cor,
                            border: `1px solid ${config?.cor}`,
                          }}
                        >
                          <Icon className="h-4 w-4 mr-1" />
                          {config?.label}
                        </Badge>
                      );
                    })()}
                    {tarefaSelecionada.statusPersonalizado && (
                      <Badge className="text-sm px-3 py-1 bg-orange-100 text-orange-700 border border-orange-300">
                        {tarefaSelecionada.statusPersonalizado}
                      </Badge>
                    )}
                  </div>

                  {/* Descrição */}
                  {tarefaSelecionada.descricao && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Descrição</h4>
                      <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                        {tarefaSelecionada.descricao}
                      </p>
                    </div>
                  )}

                  {/* Imagens */}
                  {tarefaSelecionada.imagens &&
                    (tarefaSelecionada.imagens as string[]).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Imagens</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {(tarefaSelecionada.imagens as string[]).map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt={`Imagem ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Localização */}
                  {tarefaSelecionada.endereco && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Localização</h4>
                      <div className="flex items-start gap-2 bg-gray-50 p-4 rounded-lg">
                        <MapPin className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-600">{tarefaSelecionada.endereco}</p>
                          {tarefaSelecionada.latitude && tarefaSelecionada.longitude && (
                            <p className="text-xs text-gray-400 mt-1 font-mono">
                              {tarefaSelecionada.latitude}, {tarefaSelecionada.longitude}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Datas */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-500">Criado em</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(tarefaSelecionada.createdAt!), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {tarefaSelecionada.enviadoEm && (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-orange-600">Enviado em</p>
                        <p className="font-medium text-orange-700">
                          {format(new Date(tarefaSelecionada.enviadoEm), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    )}
                    {tarefaSelecionada.concluidoEm && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-green-600">Concluído em</p>
                        <p className="font-medium text-green-700">
                          {format(
                            new Date(tarefaSelecionada.concluidoEm),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-4 border-t">
                    {tarefaSelecionada.status === "rascunho" && (
                      <Button
                        onClick={() => {
                          enviarMutation.mutate({ id: tarefaSelecionada.id });
                          setModalDetalhesAberto(false);
                        }}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </Button>
                    )}
                    {tarefaSelecionada.status === "enviado" && (
                      <Button
                        onClick={() => {
                          concluirMutation.mutate({ id: tarefaSelecionada.id });
                          setModalDetalhesAberto(false);
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Concluir
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja remover este registro?")) {
                          deletarMutation.mutate({ id: tarefaSelecionada.id });
                          setModalDetalhesAberto(false);
                        }
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
