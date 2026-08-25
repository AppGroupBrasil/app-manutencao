import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCamposOcultosOs } from '@/components/CamposOcultosOs';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Wrench,
  ClipboardList,
  Eye,
  Camera,
  Hash,
  CheckCircle2
} from 'lucide-react';

export default function PublicoView() {
  const params = useParams<{ tipo: string; id: string }>();
  const tipo = params.tipo;
  const id = parseInt(params.id || '0');

  // Buscar dados baseado no tipo
  const { data: osData, isLoading: osLoading } = trpc.ordensServico.getById.useQuery(
    { id },
    { enabled: tipo === 'os' && id > 0 }
  );

  /**
   * Os blocos que o cliente escondeu da O.S. valem nesta ficha também.
   *
   * Pela unidade da própria ordem, e só quando a ficha é de uma — esta tela
   * também abre vistoria, manutenção e ocorrência, e a rota consultada é do
   * módulo de ordens de serviço.
   */
  const campos = useCamposOcultosOs(
    osData?.condominioId ?? 0,
    false,
    tipo === 'os' && !!osData?.condominioId,
  );

  const { data: vistoriaData, isLoading: vistoriaLoading } = trpc.vistoria.getById.useQuery(
    { id },
    { enabled: tipo === 'vistoria' && id > 0 }
  );

  const { data: manutencaoData, isLoading: manutencaoLoading } = trpc.manutencao.getById.useQuery(
    { id },
    { enabled: tipo === 'manutencao' && id > 0 }
  );

  const { data: ocorrenciaData, isLoading: ocorrenciaLoading } = trpc.ocorrencia.getById.useQuery(
    { id },
    { enabled: tipo === 'ocorrencia' && id > 0 }
  );

  const { data: checklistData, isLoading: checklistLoading } = trpc.checklist.getById.useQuery(
    { id },
    { enabled: tipo === 'checklist' && id > 0 }
  );

  const { data: registroData, isLoading: registroLoading } = trpc.registrosPersonalizados.obterPublico.useQuery(
    { id },
    { enabled: tipo === 'registro' && id > 0 }
  );

  const isLoading = osLoading || vistoriaLoading || manutencaoLoading || ocorrenciaLoading || checklistLoading || registroLoading;

  const getTipoIcon = () => {
    switch (tipo) {
      case 'os': return <Wrench className="h-6 w-6 text-orange-500" />;
      case 'vistoria': return <Eye className="h-6 w-6 text-blue-500" />;
      case 'manutencao': return <Wrench className="h-6 w-6 text-green-500" />;
      case 'ocorrencia': return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'checklist': return <ClipboardList className="h-6 w-6 text-purple-500" />;
      case 'registro': return <ClipboardList className="h-6 w-6 text-pink-500" />;
      default: return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };

  const getTipoLabel = () => {
    switch (tipo) {
      case 'os': return 'Ordem de Serviço';
      case 'vistoria': return 'Vistoria';
      case 'manutencao': return 'Manutenção';
      case 'ocorrencia': return 'Ocorrência';
      case 'checklist': return 'Checklist';
      case 'registro': return registroData?.funcao?.nome || 'Registro';
      default: return 'Registro';
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('conclu') || statusLower.includes('finaliz')) return 'bg-green-500';
    if (statusLower.includes('andamento') || statusLower.includes('execu')) return 'bg-blue-500';
    if (statusLower.includes('pendent') || statusLower.includes('abert')) return 'bg-yellow-500';
    if (statusLower.includes('cancel')) return 'bg-red-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Renderizar baseado no tipo
  const renderContent = () => {
    if (tipo === 'os' && osData) {
      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(osData.status?.nome || '')} text-white`}>
              {osData.status?.nome || 'N/A'}
            </Badge>
            <span className="text-sm text-gray-500">#{osData.protocolo}</span>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">{osData.titulo}</h2>

          {campos.visivel('descricao') && osData.descricao && (
            <p className="text-gray-600 mb-4">{osData.descricao}</p>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            {campos.visivel('classificacao') && osData.categoria && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Categoria:</span>
                <span className="font-medium">{osData.categoria?.nome || 'N/A'}</span>
              </div>
            )}

            {campos.visivel('classificacao') && osData.prioridade && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Prioridade:</span>
                <span className="font-medium">{osData.prioridade?.nome || 'N/A'}</span>
              </div>
            )}

            {campos.visivel('local') && osData.setor && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Local:</span>
                <span className="font-medium">{osData.setor?.nome || 'N/A'}</span>
              </div>
            )}

            {campos.visivel('dataAbertura') && osData.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Data:</span>
                <span className="font-medium">
                  {new Date(osData.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </>
      );
    }

    if (tipo === 'vistoria' && vistoriaData) {
      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(vistoriaData.status || '')} text-white`}>
              {vistoriaData.status}
            </Badge>
            <span className="text-sm text-gray-500">#{vistoriaData.protocolo}</span>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">{vistoriaData.titulo}</h2>
          
          {vistoriaData.descricao && (
            <p className="text-gray-600 mb-4">{vistoriaData.descricao}</p>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {vistoriaData.tipo && (
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium">{vistoriaData.tipo}</span>
              </div>
            )}
            
            {vistoriaData.localizacao && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Local:</span>
                <span className="font-medium">{vistoriaData.localizacao}</span>
              </div>
            )}
            
            {vistoriaData.responsavelNome && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Responsável:</span>
                <span className="font-medium">{vistoriaData.responsavelNome}</span>
              </div>
            )}
            
            {vistoriaData.dataAgendada && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Data:</span>
                <span className="font-medium">
                  {new Date(vistoriaData.dataAgendada).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </>
      );
    }

    if (tipo === 'manutencao' && manutencaoData) {
      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(manutencaoData.status || '')} text-white`}>
              {manutencaoData.status}
            </Badge>
            <span className="text-sm text-gray-500">#{manutencaoData.protocolo}</span>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">{manutencaoData.titulo}</h2>
          
          {manutencaoData.descricao && (
            <p className="text-gray-600 mb-4">{manutencaoData.descricao}</p>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {manutencaoData.tipo && (
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium">{manutencaoData.tipo}</span>
              </div>
            )}
            
            {manutencaoData.localizacao && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Local:</span>
                <span className="font-medium">{manutencaoData.localizacao}</span>
              </div>
            )}
            
            {manutencaoData.responsavelNome && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Responsável:</span>
                <span className="font-medium">{manutencaoData.responsavelNome}</span>
              </div>
            )}
          </div>
        </>
      );
    }

    if (tipo === 'ocorrencia' && ocorrenciaData) {
      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(ocorrenciaData.status || '')} text-white`}>
              {ocorrenciaData.status}
            </Badge>
            <span className="text-sm text-gray-500">#{ocorrenciaData.protocolo}</span>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">{ocorrenciaData.titulo}</h2>
          
          {ocorrenciaData.descricao && (
            <p className="text-gray-600 mb-4">{ocorrenciaData.descricao}</p>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {ocorrenciaData.categoria && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Categoria:</span>
                <span className="font-medium capitalize">{ocorrenciaData.categoria}</span>
              </div>
            )}
            
            {ocorrenciaData.localizacao && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Local:</span>
                <span className="font-medium">{ocorrenciaData.localizacao}</span>
              </div>
            )}
          </div>
        </>
      );
    }

    if (tipo === 'checklist' && checklistData) {
      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(checklistData.status || '')} text-white`}>
              {checklistData.status}
            </Badge>
            <span className="text-sm text-gray-500">#{checklistData.protocolo}</span>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">{checklistData.titulo}</h2>
          
          {checklistData.descricao && (
            <p className="text-gray-600 mb-4">{checklistData.descricao}</p>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {checklistData.localizacao && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Local:</span>
                <span className="font-medium">{checklistData.localizacao}</span>
              </div>
            )}
            
            {checklistData.responsavelNome && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Responsável:</span>
                <span className="font-medium">{checklistData.responsavelNome}</span>
              </div>
            )}
          </div>
        </>
      );
    }

    if (tipo === 'registro' && registroData) {
      const dados = typeof registroData.dados === 'string' ? JSON.parse(registroData.dados) : registroData.dados || {};
      const checklistItemsReg = registroData.checklistItems
        ? (typeof registroData.checklistItems === 'string' ? JSON.parse(registroData.checklistItems) : registroData.checklistItems)
        : null;
      const imagensReg = registroData.imagens
        ? (typeof registroData.imagens === 'string' ? JSON.parse(registroData.imagens) : registroData.imagens)
        : null;
      const statusLabel: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em Andamento', aguardando: 'Aguardando', concluido: 'Concluído', cancelado: 'Cancelado', pendente: 'Pendente' };

      const CAMPOS_LABEL: Record<string, string> = {
        titulo: 'Título', descricao: 'Descrição', local: 'Local / Item da Manutenção',
        localizacao: 'Localização', prioridade: 'Prioridade', nivelUrgencia: 'Nível de Urgência',
        responsavelId: 'Responsável', prazoConclusao: 'Prazo de Conclusão',
        custoEstimado: 'Custo Estimado', protocolo: 'Protocolo', qrcode: 'QR Code',
      };

      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(registroData.status || '')} text-white`}>
              {statusLabel[registroData.status || ''] || registroData.status}
            </Badge>
            {registroData.protocolo && (
              <span className="text-sm text-gray-500">#{registroData.protocolo}</span>
            )}
          </div>
          
          {registroData.funcao && (
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: registroData.funcao.cor || '#EC4899' }}
              >
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-600">{registroData.funcao.nome}</span>
            </div>
          )}

          <h2 className="text-xl font-semibold mb-2">{dados.titulo || dados.local || 'Registro'}</h2>
          
          {dados.descricao && (
            <p className="text-gray-600 mb-4">{dados.descricao}</p>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {Object.entries(dados).filter(([k]) => !k.startsWith('_') && !k.startsWith('assinatura') && k !== 'titulo' && k !== 'descricao').map(([key, val]) => {
              if (!val) return null;
              const label = CAMPOS_LABEL[key] || key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-500">{label}:</span>
                    <span className="font-medium ml-1">{String(val)}</span>
                  </div>
                </div>
              );
            })}
            
            {registroData.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Data:</span>
                <span className="font-medium">
                  {new Date(registroData.createdAt).toLocaleDateString('pt-BR')} às {new Date(registroData.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Checklist */}
          {Array.isArray(checklistItemsReg) && checklistItemsReg.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Checklist</p>
                {checklistItemsReg.map((it: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {it.checked ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <div className="w-4 h-4 border-2 border-gray-300 rounded shrink-0" />}
                    <span className={it.checked ? 'line-through text-gray-400' : 'text-gray-700'}>{it.texto}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fotos */}
          {Array.isArray(imagensReg) && imagensReg.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fotos ({imagensReg.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {imagensReg.map((img: any, i: number) => (
                    <img key={i} src={img.url} alt={img.legenda || ''} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      );
    }

    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Registro não encontrado</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <img 
            src="/logo-manutencao.png" 
            alt="App Manutenção" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">App Manutenção</h1>
            <p className="text-xs text-gray-500">Visualização Pública</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <Card className="shadow-lg border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getTipoIcon()}
              {getTipoLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Powered by App Manutenção
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Sistema Universal de Gestão de Manutenção
          </p>
        </div>
      </main>
    </div>
  );
}
