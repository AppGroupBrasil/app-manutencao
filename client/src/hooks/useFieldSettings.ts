import { trpc } from "@/lib/trpc";

type ModalType = "rapida" | "completa";
type FunctionType = 
  | "vistoria" | "manutencao" | "ocorrencia" | "checklist" | "antes_depois"
  | "timeline" | "ordem_servico"
  | "inventario" | "leitura_medidores" | "inspecao_seguranca" | "controle_pragas"
  | "limpeza" | "jardinagem" | "orcamentos" | "ordem_compra" | "contratos"
  | "vencimentos";

interface UseFieldSettingsOptions {
  condominioId: number;
  modalType: ModalType;
  functionType: FunctionType;
  enabled?: boolean;
}

/**
 * Hook para verificar se um campo está habilitado nas configurações do usuário
 * 
 * @example
 * const { isFieldEnabled, isLoading } = useFieldSettings({
 *   condominioId: 1,
 *   modalType: "rapida",
 *   functionType: "vistoria",
 * });
 * 
 * // Uso no JSX:
 * {isFieldEnabled("gps") && (
 *   <LocalizacaoSection />
 * )}
 */
export function useFieldSettings({
  condominioId,
  modalType,
  functionType,
  enabled = true,
}: UseFieldSettingsOptions) {
  const { data, isLoading, refetch } = trpc.fieldSettings.get.useQuery(
    { condominioId, modalType, functionType },
    { 
      enabled: enabled && condominioId > 0,
      staleTime: 0, // Sempre revalidar para pegar alterações imediatas
    }
  );

  /**
   * Verifica se um campo específico está habilitado
   * Se não houver configuração salva, retorna true (padrão = habilitado)
   * Exceção: para checklist, o padrão é somente titulo e itensChecklist habilitados
   */
  const isFieldEnabled = (fieldKey: string): boolean => {
    if (isLoading) return true; // Mostra enquanto carrega
    
    // Se temos a lista de campos disponíveis para esta função, verificar se o campo existe
    // Campos que não estão na lista de CAMPOS_DISPONIVEIS para esta função NÃO devem aparecer
    if (data?.campos && data.campos.length > 0) {
      const fieldExistsForFunction = data.campos.some((c: any) => c.key === fieldKey);
      if (!fieldExistsForFunction) return false;
    }
    
    // Se tem config salva, usa ela
    if (data?.config && data.config[fieldKey] !== undefined) {
      return data.config[fieldKey];
    }
    
    // Padrão para checklist: apenas titulo e itensChecklist habilitados
    if (functionType === "checklist" && !data?.config) {
      const checklistDefaults: Record<string, boolean> = {
        titulo: true,
        itensChecklist: true,
        descricao: false,
        local: false,
        imagens: false,
        gps: false,
        status: false,
        prioridade: false,
        responsavel: false,
        prazo_conclusao: false,
        qrcode: false,
        assinatura_digital: false,
        anexos: false,
        nivel_urgencia: false,
      };
      return checklistDefaults[fieldKey] ?? false;
    }
    
    // Padrão para antes_depois: apenas titulo habilitado (fotos antes/depois são sempre visíveis)
    if (functionType === "antes_depois" && !data?.config) {
      const antesDepoisDefaults: Record<string, boolean> = {
        titulo: true,
        descricao: false,
        imagens_antes: true,
        imagens_depois: true,
        geolocalizacao: false,
        status: false,
        prioridade: false,
        responsavel: false,
        local: false,
        nivel_urgencia: false,
        assinatura_digital: false,
      };
      return antesDepoisDefaults[fieldKey] ?? false;
    }
    
    // Padrão para ocorrencia: titulo, imagens, descricao e status
    if (functionType === "ocorrencia" && !data?.config) {
      const ocorrenciaDefaults: Record<string, boolean> = {
        titulo: true,
        imagens: true,
        descricao: true,
        status: true,
        subtitulo: false,
        tipo: false,
        categoria: false,
        localizacao_texto: false,
        data_agendada: false,
        prioridade: false,
        responsavel: false,
        observacoes: false,
        edicao_imagem: false,
        geolocalizacao: false,
        prazo_conclusao: false,
        nivel_urgencia: false,
        anexos: false,
        qrcode: false,
        assinatura_digital: false,
      };
      return ocorrenciaDefaults[fieldKey] ?? false;
    }
    
    // Padrão para manutencao: titulo, imagens, descricao, prioridade, nivel_urgencia
    if (functionType === "manutencao" && !data?.config) {
      const manutencaoDefaults: Record<string, boolean> = {
        titulo: true,
        descricao: true,
        imagens: true,
        subtitulo: false,
        tipo: false,
        categoria: false,
        localizacao_texto: false,
        fornecedor: false,
        data_agendada: false,
        status: false,
        prioridade: true,
        responsavel: false,
        observacoes: false,
        edicao_imagem: false,
        controle_tempo: false,
        geolocalizacao: false,
        prazo_conclusao: false,
        nivel_urgencia: true,
        anexos: false,
        qrcode: false,
        assinatura_digital: false,
      };
      return manutencaoDefaults[fieldKey] ?? false;
    }
    
    // Padrão para vistoria: titulo, status, imagens, descricao
    if (functionType === "vistoria" && !data?.config) {
      const vistoriaDefaults: Record<string, boolean> = {
        titulo: true,
        descricao: true,
        imagens: true,
        status: true,
        subtitulo: false,
        tipo: false,
        categoria: false,
        localizacao_texto: false,
        data_agendada: false,
        prioridade: false,
        responsavel: false,
        observacoes: false,
        edicao_imagem: false,
        controle_tempo: false,
        geolocalizacao: false,
        prazo_conclusao: false,
        anexos: false,
        qrcode: false,
        assinatura_digital: false,
      };
      return vistoriaDefaults[fieldKey] ?? false;
    }
    
    return true; // Padrão para os demais tipos
  };

  /**
   * Verifica se múltiplos campos estão habilitados
   * Retorna true se QUALQUER um dos campos estiver habilitado
   */
  const isAnyFieldEnabled = (...fieldKeys: string[]): boolean => {
    return fieldKeys.some(key => isFieldEnabled(key));
  };

  /**
   * Verifica se todos os campos especificados estão habilitados
   */
  const areAllFieldsEnabled = (...fieldKeys: string[]): boolean => {
    return fieldKeys.every(key => isFieldEnabled(key));
  };

  /**
   * Retorna a lista de campos habilitados
   */
  const getEnabledFields = (): string[] => {
    if (!data?.config) return [];
    return Object.entries(data.config)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  };

  /**
   * Retorna a lista de campos desabilitados
   */
  const getDisabledFields = (): string[] => {
    if (!data?.config) return [];
    return Object.entries(data.config)
      .filter(([_, enabled]) => !enabled)
      .map(([key]) => key);
  };

  /**
   * Conta quantos campos estão habilitados
   */
  const countEnabledFields = (): number => {
    if (!data?.config) return 0;
    return Object.values(data.config).filter(Boolean).length;
  };

  /**
   * Retorna a configuração completa
   */
  const getConfig = (): Record<string, boolean> => {
    return data?.config || {};
  };

  /**
   * Retorna a lista de campos disponíveis com metadata
   */
  const getAvailableFields = () => {
    return data?.campos || [];
  };

  return {
    isFieldEnabled,
    isAnyFieldEnabled,
    areAllFieldsEnabled,
    getEnabledFields,
    getDisabledFields,
    countEnabledFields,
    getConfig,
    getAvailableFields,
    isLoading,
    refetch,
  };
}

/**
 * Tipo helper para campos de função rápida
 */
export type CamposRapidos = 
  | "titulo"
  | "descricao"
  | "local"
  | "imagens"
  | "gps"
  | "status"
  | "prioridade"
  | "responsavel"
  | "itensChecklist";

/**
 * Tipo helper para campos de função completa
 */
export type CamposCompletos = 
  | "titulo"
  | "subtitulo"
  | "tipo"
  | "categoria"
  | "responsavel"
  | "localizacao_texto"
  | "data_agendada"
  | "prioridade"
  | "descricao"
  | "observacoes"
  | "imagens"
  | "edicao_imagem"
  | "controle_tempo"
  | "geolocalizacao"
  | "imagens_antes"
  | "imagens_depois";
