import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, FileText, Settings, Wrench, Calendar } from "lucide-react";

type TipoVencimento = 'contrato' | 'servico' | 'manutencao';

interface Vencimento {
  id: number;
  titulo: string;
  tipo: TipoVencimento;
  dataVencimento: string | Date;
  fornecedor?: string | null;
  valor?: string | null;
  status: string;
}

interface CalendarioVencimentosProps {
  vencimentos: Vencimento[];
  onVencimentoClick?: (vencimento: Vencimento) => void;
}

const tipoConfig: Record<TipoVencimento, { label: string; color: string; bgColor: string; icon: typeof FileText }> = {
  contrato: { label: 'Contrato', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: FileText },
  servico: { label: 'Serviço', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Settings },
  manutencao: { label: 'Manutenção', color: 'text-green-600', bgColor: 'bg-green-100', icon: Wrench },
};

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function CalendarioVencimentos({ vencimentos, onVencimentoClick }: CalendarioVencimentosProps) {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  
  // Filtros por tipo
  const [filtros, setFiltros] = useState<Record<TipoVencimento, boolean>>({
    contrato: true,
    servico: true,
    manutencao: true,
  });
  
  // Toggle filtro
  const toggleFiltro = (tipo: TipoVencimento) => {
    setFiltros(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  };
  
  // Vencimentos filtrados
  const vencimentosFiltrados = useMemo(() => {
    return vencimentos.filter(v => filtros[v.tipo]);
  }, [vencimentos, filtros]);

  // Navegar entre meses
  const mesAnterior = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  };

  const proximoMes = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));
  };

  const irParaHoje = () => {
    setMesAtual(new Date());
  };

  // Calcular dias do mês
  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    
    const dias: (Date | null)[] = [];
    
    // Adicionar dias vazios no início
    for (let i = 0; i < primeiroDia.getDay(); i++) {
      dias.push(null);
    }
    
    // Adicionar dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      dias.push(new Date(ano, mes, dia));
    }
    
    return dias;
  }, [mesAtual]);

  // Agrupar vencimentos por data (usando vencimentos filtrados)
  const vencimentosPorDia = useMemo(() => {
    const mapa: Record<string, Vencimento[]> = {};
    
    vencimentosFiltrados.forEach(v => {
      const data = new Date(v.dataVencimento);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
      
      if (!mapa[chave]) {
        mapa[chave] = [];
      }
      mapa[chave].push(v);
    });
    
    return mapa;
  }, [vencimentosFiltrados]);

  // Obter vencimentos de um dia específico
  const getVencimentosDoDia = (data: Date | null): Vencimento[] => {
    if (!data) return [];
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    return vencimentosPorDia[chave] || [];
  };

  // Verificar se é hoje
  const isHoje = (data: Date | null): boolean => {
    if (!data) return false;
    const hoje = new Date();
    return data.getDate() === hoje.getDate() &&
           data.getMonth() === hoje.getMonth() &&
           data.getFullYear() === hoje.getFullYear();
  };

  // Verificar se está vencido
  const isVencido = (data: Date | null): boolean => {
    if (!data) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return data < hoje;
  };

  // Abrir modal com vencimentos do dia
  const abrirDia = (data: Date) => {
    const vencimentosDoDia = getVencimentosDoDia(data);
    if (vencimentosDoDia.length > 0) {
      setDiaSelecionado(data);
      setModalAberto(true);
    }
  };

  // Vencimentos do dia selecionado
  const vencimentosDiaSelecionado = diaSelecionado ? getVencimentosDoDia(diaSelecionado) : [];

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Calendário de Vencimentos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={irParaHoje}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={mesAnterior}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[150px] text-center font-medium">
                {meses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
              </span>
              <Button variant="outline" size="icon" onClick={proximoMes}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legenda com Filtros */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            {(Object.entries(tipoConfig) as [TipoVencimento, typeof tipoConfig.contrato][]).map(([tipo, config]) => (
              <label 
                key={tipo} 
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full border transition-all ${
                  filtros[tipo] 
                    ? `${config.bgColor} border-current ${config.color}` 
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={filtros[tipo]}
                  onChange={() => toggleFiltro(tipo)}
                  className="sr-only"
                />
                <div className={`w-3 h-3 rounded-full ${filtros[tipo] ? config.bgColor.replace('100', '500') : 'bg-gray-300'}`} />
                <span>{config.label}</span>
                <span className="text-xs opacity-70">
                  ({vencimentos.filter(v => v.tipo === tipo).length})
                </span>
              </label>
            ))}
            <button
              onClick={() => setFiltros({ contrato: true, servico: true, manutencao: true })}
              className="text-xs text-orange-600 hover:text-orange-700 underline ml-2"
            >
              Mostrar todos
            </button>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {diasSemana.map(dia => (
              <div key={dia} className="text-center text-sm font-medium text-gray-500 py-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-1">
            {diasDoMes.map((data, index) => {
              const vencimentosDoDia = getVencimentosDoDia(data);
              const temVencimentos = vencimentosDoDia.length > 0;
              const hoje = isHoje(data);
              const vencido = data && isVencido(data) && temVencimentos;

              return (
                <div
                  key={index}
                  className={`
                    min-h-[80px] p-1 border rounded-lg transition-all
                    ${data ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'}
                    ${hoje ? 'border-orange-500 border-2' : 'border-gray-200'}
                    ${vencido ? 'bg-red-50' : ''}
                  `}
                  onClick={() => data && abrirDia(data)}
                >
                  {data && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${hoje ? 'text-orange-600' : 'text-gray-700'}`}>
                        {data.getDate()}
                      </div>
                      <div className="space-y-1">
                        {vencimentosDoDia.slice(0, 3).map((v, i) => {
                          const config = tipoConfig[v.tipo];
                          return (
                            <div
                              key={i}
                              className={`text-xs truncate px-1 py-0.5 rounded ${config.bgColor} ${config.color}`}
                              title={v.titulo}
                            >
                              {v.titulo}
                            </div>
                          );
                        })}
                        {vencimentosDoDia.length > 3 && (
                          <div className="text-xs text-gray-500 px-1">
                            +{vencimentosDoDia.length - 3} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes do dia */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Vencimentos em {diaSelecionado?.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {vencimentosDiaSelecionado.map((v) => {
              const config = tipoConfig[v.tipo];
              const Icon = config.icon;
              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-lg border ${config.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => {
                    setModalAberto(false);
                    onVencimentoClick?.(v);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-white ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{v.titulo}</div>
                      <div className="text-sm text-gray-600">{config.label}</div>
                      {v.fornecedor && (
                        <div className="text-sm text-gray-500">{v.fornecedor}</div>
                      )}
                    </div>
                    <Badge variant={v.status === 'ativo' ? 'default' : 'secondary'}>
                      {v.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
