import { pgTable, pgEnum, serial, text, varchar, timestamp, boolean, json, integer, decimal } from "drizzle-orm/pg-core";


// ==================== ENUMS (PostgreSQL) ====================
export const roleEnum = pgEnum("role", ["user", "admin", "sindico", "morador", "master"]);
export const hierarquiaEnum = pgEnum("hierarquia", ["admin_master", "admin", "responsavel", "funcionario"]);
export const tipoContaEnum = pgEnum("tipoConta", ["sindico", "administradora", "admin"]);
export const tipoUsuarioEnum = pgEnum("tipoUsuario", ["usuario", "pequena_empresa", "media_empresa"]);
export const statusEnum = pgEnum("status", ["rascunho", "publicada", "arquivada"]);
export const tipoEnum = pgEnum("tipo", ["mensagem_sindico", "avisos", "comunicados", "dicas_seguranca", "regras", "links_uteis", "telefones_uteis", "realizacoes", "antes_depois", "melhorias", "aquisicoes", "funcionarios", "agenda_eventos", "eventos", "achados_perdidos", "caronas", "vagas_estacionamento", "classificados", "votacoes", "publicidade"]);
export const avisosTipoEnum = pgEnum("avisos_tipo", ["urgente", "importante", "informativo"]);
export const tipoFuncionarioEnum = pgEnum("tipoFuncionario", ["zelador", "porteiro", "supervisor", "gerente", "auxiliar", "sindico_externo"]);
export const tipoAcessoEnum = pgEnum("tipoAcesso", ["login", "logout", "recuperacao_senha", "alteracao_senha"]);
export const eventosTipoEnum = pgEnum("eventos_tipo", ["agendado", "realizado"]);
export const statusAntesdepoisEnum = pgEnum("status_antesdepois", ["pendente", "em_andamento", "concluido"]);
export const prioridadeAntesdepoisEnum = pgEnum("prioridade_antesdepois", ["baixa", "media", "alta"]);
export const achadosPerdidosTipoEnum = pgEnum("achadosPerdidos_tipo", ["achado", "perdido"]);
export const achadosPerdidosStatusEnum = pgEnum("achadosPerdidos_status", ["aberto", "resolvido"]);
export const caronasTipoEnum = pgEnum("caronas_tipo", ["oferece", "procura"]);
export const caronasStatusEnum = pgEnum("caronas_status", ["ativa", "concluida", "cancelada"]);
export const classificadosTipoEnum = pgEnum("classificados_tipo", ["produto", "servico"]);
export const classificadosStatusEnum = pgEnum("classificados_status", ["pendente", "aprovado", "rejeitado", "vendido"]);
export const votacoesTipoEnum = pgEnum("votacoes_tipo", ["funcionario_mes", "enquete", "decisao"]);
export const votacoesStatusEnum = pgEnum("votacoes_status", ["ativa", "encerrada"]);
export const vagasEstacionamentoTipoEnum = pgEnum("vagasEstacionamento_tipo", ["coberta", "descoberta", "moto"]);
export const publicidadesTipoEnum = pgEnum("publicidades_tipo", ["banner", "destaque", "lateral"]);
export const moradoresTipoEnum = pgEnum("moradores_tipo", ["proprietario", "inquilino", "familiar", "funcionario"]);
export const notificacoesTipoEnum = pgEnum("notificacoes_tipo", ["aviso", "evento", "votacao", "classificado", "carona", "geral"]);
export const melhoriasStatusEnum = pgEnum("melhorias_status", ["planejada", "em_andamento", "concluida"]);
export const categoriaEnum = pgEnum("categoria", ["comercio", "servicos", "profissionais", "alimentacao", "saude", "educacao", "outros"]);
export const statusAnuncianteEnum = pgEnum("statusAnunciante", ["ativo", "inativo"]);
export const posicaoEnum = pgEnum("posicao", ["capa", "contracapa", "pagina_interna", "rodape", "lateral"]);
export const tamanhoEnum = pgEnum("tamanho", ["pequeno", "medio", "grande", "pagina_inteira"]);
export const statusAnuncioEnum = pgEnum("statusAnuncio", ["ativo", "pausado", "expirado", "pendente"]);
export const albunsCategoriaEnum = pgEnum("albuns_categoria", ["eventos", "obras", "areas_comuns", "melhorias", "outros"]);
export const dicasSegurancaCategoriaEnum = pgEnum("dicasSeguranca_categoria", ["geral", "incendio", "roubo", "criancas", "idosos", "digital", "veiculos"]);
export const regrasNormasCategoriaEnum = pgEnum("regrasNormas_categoria", ["geral", "convivencia", "areas_comuns", "animais", "barulho", "estacionamento", "mudancas", "obras", "piscina", "salao_festas"]);
export const imagensVagasTipoEnum = pgEnum("imagensVagas_tipo", ["imagem", "anexo"]);
export const tipoItemEnum = pgEnum("tipoItem", ["aviso", "comunicado", "evento", "realizacao", "melhoria", "aquisicao", "votacao", "classificado", "carona", "achado_perdido", "funcionario", "galeria", "card_secao"]);
export const vistoriasStatusEnum = pgEnum("vistorias_status", ["pendente", "realizada", "acao_necessaria", "finalizada", "reaberta", "rascunho"]);
export const prioridadeEnum = pgEnum("prioridade", ["baixa", "media", "alta", "urgente"]);
export const vistoriaTimelineTipoEnum = pgEnum("vistoriaTimeline_tipo", ["abertura", "atualizacao", "status_alterado", "comentario", "imagem_adicionada", "responsavel_alterado", "fechamento", "reabertura"]);
export const manutencoesTipoEnum = pgEnum("manutencoes_tipo", ["preventiva", "corretiva", "emergencial", "programada"]);
export const ocorrenciasStatusEnum = pgEnum("ocorrencias_status", ["pendente", "realizada", "acao_necessaria", "finalizada", "reaberta"]);
export const ocorrenciasCategoriaEnum = pgEnum("ocorrencias_categoria", ["seguranca", "barulho", "manutencao", "convivencia", "animais", "estacionamento", "limpeza", "outros"]);
export const checklistTimelineTipoEnum = pgEnum("checklistTimeline_tipo", ["abertura", "atualizacao", "status_alterado", "comentario", "imagem_adicionada", "responsavel_alterado", "item_completo", "fechamento", "reabertura"]);
export const linksCompartilhaveisTipoEnum = pgEnum("linksCompartilhaveis_tipo", ["vistoria", "manutencao", "ocorrencia", "checklist", "ordem-servico"]);
export const itemTipoEnum = pgEnum("itemTipo", ["vistoria", "manutencao", "ocorrencia", "checklist"]);
export const vencimentosTipoEnum = pgEnum("vencimentos_tipo", ["contrato", "servico", "manutencao"]);
export const periodicidadeEnum = pgEnum("periodicidade", ["unico", "mensal", "bimestral", "trimestral", "semestral", "anual"]);
export const vencimentosStatusEnum = pgEnum("vencimentos_status", ["ativo", "vencido", "renovado", "cancelado"]);
export const tipoAlertaEnum = pgEnum("tipoAlerta", ["na_data", "um_dia_antes", "uma_semana_antes", "quinze_dias_antes", "um_mes_antes"]);
export const vencimentoNotificacoesStatusEnum = pgEnum("vencimentoNotificacoes_status", ["enviado", "erro", "pendente"]);
export const lembretesTipoEnum = pgEnum("lembretes_tipo", ["assembleia", "vencimento", "evento", "manutencao", "custom"]);
export const historicoNotificacoesTipoEnum = pgEnum("historicoNotificacoes_tipo", ["push", "email", "whatsapp", "sistema"]);
export const provedorEnum = pgEnum("provedor", ["resend", "sendgrid", "mailgun", "smtp"]);
export const templatesNotificacaoCategoriaEnum = pgEnum("templatesNotificacao_categoria", ["geral", "aviso", "evento", "manutencao", "assembleia", "vencimento", "custom"]);
export const statusNotificacaoInfracaoEnum = pgEnum("statusNotificacaoInfracao", ["pendente", "respondida", "resolvida", "arquivada"]);
export const autorTipoInfracaoEnum = pgEnum("autorTipoInfracao", ["sindico", "morador", "funcionario", "administradora"]);
export const valoresSalvosTipoEnum = pgEnum("valoresSalvos_tipo", ["responsavel", "categoria_vistoria", "categoria_manutencao", "categoria_checklist", "categoria_ocorrencia", "tipo_vistoria", "tipo_manutencao", "tipo_checklist", "tipo_ocorrencia", "fornecedor", "localizacao", "titulo_vistoria", "subtitulo_vistoria", "descricao_vistoria", "observacoes_vistoria", "titulo_manutencao", "subtitulo_manutencao", "descricao_manutencao", "observacoes_manutencao", "titulo_ocorrencia", "subtitulo_ocorrencia", "descricao_ocorrencia", "observacoes_ocorrencia", "titulo_antesdepois", "descricao_antesdepois"]);
export const solicitanteTipoEnum = pgEnum("solicitanteTipo", ["sindico", "morador", "funcionario", "administradora"]);
export const osTimelineTipoEnum = pgEnum("osTimeline_tipo", ["criacao", "status_alterado", "responsavel_adicionado", "responsavel_removido", "material_adicionado", "material_removido", "orcamento_adicionado", "orcamento_aprovado", "orcamento_rejeitado", "orcamento_removido", "inicio_servico", "fim_servico", "comentario", "foto_adicionada", "foto_removida", "localizacao_atualizada", "vinculo_manutencao", "anexo_adicionado", "anexo_removido"]);
export const remetenteTipoEnum = pgEnum("remetenteTipo", ["sindico", "morador", "funcionario", "visitante"]);
export const osImagensTipoEnum = pgEnum("osImagens_tipo", ["antes", "durante", "depois", "orcamento", "outro"]);
export const inscricoesRevistaStatusEnum = pgEnum("inscricoesRevista_status", ["pendente", "ativo", "inativo"]);
export const tarefasSimplesTipoEnum = pgEnum("tarefasSimples_tipo", ["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]);
export const nivelUrgenciaEnum = pgEnum("nivelUrgencia", ["baixo", "medio", "alto", "critico"]);
export const tarefasSimplesStatusEnum = pgEnum("tarefasSimples_status", ["rascunho", "enviado", "concluido"]);
export const tipoCampoEnum = pgEnum("tipoCampo", ["titulo", "descricao", "local", "observacao", "responsavel_os", "titulo_os"]);
export const permissaoEnum = pgEnum("permissao", ["visualizar", "editar", "administrar"]);
export const appAcessosLogTipoAcessoEnum = pgEnum("appAcessosLog_tipoAcesso", ["codigo", "email", "link_magico"]);
export const acaoEnum = pgEnum("acao", ["criar", "editar", "excluir", "ativar", "desativar", "promover", "rebaixar"]);
export const entidadeEnum = pgEnum("entidade", ["usuario", "condominio", "vistoria", "manutencao", "ordem_servico", "funcao", "configuracao"]);
export const entidadeTipoEnum = pgEnum("entidadeTipo", ["vistoria", "manutencao", "ocorrencia", "ordem_servico", "checklist", "antes_depois"]);
export const historicoAtividadesAcaoEnum = pgEnum("historicoAtividades_acao", ["criado", "editado", "status_alterado", "comentario_adicionado", "imagem_adicionada", "imagem_removida", "atribuido", "prioridade_alterada", "agendado", "iniciado", "pausado", "retomado", "concluido", "reaberto", "cancelado", "arquivado", "enviado", "compartilhado"]);
export const compartilhamentosEquipeTipoItemEnum = pgEnum("compartilhamentosEquipe_tipoItem", ["vistoria", "manutencao", "ocorrencia", "checklist", "antes_depois", "ordem_servico", "tarefa_simples"]);
export const canalEnvioEnum = pgEnum("canalEnvio", ["email", "whatsapp", "ambos"]);
export const estadoEnum = pgEnum("estado", ["rascunho", "enviado", "registado"]);
export const categorizacaoEnum = pgEnum("categorizacao", ["recebido", "encaminhado", "em_analise", "em_execucao", "aguardando_resposta", "finalizado", "reaberto"]);
export const permissaoPublicaEnum = pgEnum("permissaoPublica", ["visualizar", "adicionar", "editar"]);
export const timelineEventosTipoEnum = pgEnum("timeline_eventos_tipo", ["criacao", "edicao", "status", "comentario", "imagem", "compartilhamento", "visualizacao", "pdf", "registro", "categorizacao", "chat"]);
export const tipoEventoEnum = pgEnum("tipoEvento", ["mudanca_status", "atualizacao", "nova_imagem", "comentario", "compartilhamento", "criacao", "finalizacao"]);
export const osAnexosTipoEnum = pgEnum("osAnexos_tipo", ["pdf", "imagem", "documento", "outro"]);
export const temaEnum = pgEnum("tema", ["laranja", "azul", "verde", "roxo", "vermelho", "marrom", "cinza"]);
export const layoutEnum = pgEnum("layout", ["classico", "compacto", "moderno"]);
export const tamanhoFonteEnum = pgEnum("tamanhoFonte", ["pequeno", "medio", "grande"]);
export const tipoMedidorEnum = pgEnum("tipoMedidor", ["agua", "gas", "energia", "outro"]);
export const leituraMedidoresStatusEnum = pgEnum("leituraMedidores_status", ["pendente", "realizada", "conferida", "finalizada"]);
export const tipoServicoEnum = pgEnum("tipoServico", ["dedetizacao", "desratizacao", "descupinizacao", "desinfeccao", "outro"]);
export const controlePragasStatusEnum = pgEnum("controlePragas_status", ["agendada", "em_andamento", "realizada", "finalizada", "cancelada"]);
export const jardinagemTipoServicoEnum = pgEnum("jardinagem_tipoServico", ["poda", "plantio", "adubacao", "irrigacao", "limpeza", "paisagismo", "outro"]);
export const recorrenciaEnum = pgEnum("recorrencia", ["unica", "semanal", "quinzenal", "mensal", "bimestral", "trimestral"]);
export const pixTipoChaveEnum = pgEnum("pixTipoChave", ["cpf", "cnpj", "email", "telefone", "aleatoria"]);
export const modalTypeEnum = pgEnum("modalType", ["rapida", "completa"]);
export const functionTypeEnum = pgEnum("functionType", ["vistoria", "manutencao", "ocorrencia", "checklist", "antes_depois", "timeline", "inventario", "leitura_medidores", "inspecao_seguranca", "controle_pragas", "limpeza", "jardinagem", "orcamentos", "ordem_compra", "contratos", "vencimentos", "ordem_servico"]);

// ==================== USERS ====================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  phone: varchar("phone", { length: 20 }),
  apartment: varchar("apartment", { length: 20 }),
  // Campos para login local
  senha: varchar("senha", { length: 255 }),
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpira: timestamp("resetTokenExpira"),
  // Tipo de conta: sindico, administradora ou admin
  tipoConta: tipoContaEnum("tipoConta").default("sindico"),
  // Novos campos para gestão de usuários
  tipoUsuario: tipoUsuarioEnum("tipoUsuario").default("usuario"),
  diasUtilizacao: integer("diasUtilizacao").default(0),
  cidade: varchar("cidade", { length: 100 }),
  adimplente: boolean("adimplente").default(true),
  bloqueado: boolean("bloqueado").default(false),
  motivoBloqueio: text("motivoBloqueio"),
  // Campo para valor personalizado do plano
  valorPlano: decimal("valorPlano", { precision: 10, scale: 2 }),
  faixaPrecoId: integer("faixaPrecoId"), // Referência à faixa de preço selecionada
  // Hierarquia do sistema: admin_master > admin > responsavel > funcionario
  hierarquia: hierarquiaEnum("hierarquia").default("funcionario"),
  criadoPorUserId: integer("criadoPorUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== CONDOMINIOS ====================
export const condominios = pgTable("condominios", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 50 }),
  cnpj: varchar("cnpj", { length: 20 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 50 }),
  cep: varchar("cep", { length: 10 }),
  logoUrl: text("logoUrl"),
  bannerUrl: text("bannerUrl"),
  capaUrl: text("capaUrl"),
  corPrimaria: varchar("corPrimaria", { length: 20 }).default("#4F46E5"),
  corSecundaria: varchar("corSecundaria", { length: 20 }).default("#10B981"),
  cadastroToken: varchar("cadastroToken", { length: 32 }).unique(),
  assembleiaLink: text("assembleiaLink"),
  assembleiaData: timestamp("assembleiaData"),
  sindicoId: integer("sindicoId").references(() => users.id),
  // Campos de cabeçalho/rodapé personalizados
  cabecalhoLogoUrl: text("cabecalhoLogoUrl"),
  cabecalhoNomeCondominio: varchar("cabecalhoNomeCondominio", { length: 255 }),
  cabecalhoNomeSindico: varchar("cabecalhoNomeSindico", { length: 255 }),
  rodapeTexto: text("rodapeTexto"),
  rodapeContato: varchar("rodapeContato", { length: 255 }),
  // Telefone de contato para mensagem de bloqueio
  telefoneContato: varchar("telefoneContato", { length: 20 }),
  // Tema padrão da organização
  temaPadrao: varchar("temaPadrao", { length: 20 }).default("laranja"),
  layoutPadrao: varchar("layoutPadrao", { length: 20 }).default("classico"),
  tamanhoFontePadrao: varchar("tamanhoFontePadrao", { length: 20 }).default("medio"),
  modoEscuroPadrao: boolean("modoEscuroPadrao").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Condominio = typeof condominios.$inferSelect;
export type InsertCondominio = typeof condominios.$inferInsert;

// ==================== REVISTAS ====================
export const revistas = pgTable("revistas", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: text("subtitulo"),
  edicao: varchar("edicao", { length: 50 }),
  capaUrl: text("capaUrl"),
  templateId: varchar("templateId", { length: 50 }).default("default"),
  status: statusEnum("status").default("rascunho").notNull(),
  publicadaEm: timestamp("publicadaEm"),
  visualizacoes: integer("visualizacoes").default(0),
  shareLink: varchar("shareLink", { length: 100 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Revista = typeof revistas.$inferSelect;
export type InsertRevista = typeof revistas.$inferInsert;

// ==================== SECÇÕES DA REVISTA ====================
export const secoes = pgTable("secoes", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  tipo: tipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  config: json("config"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Secao = typeof secoes.$inferSelect;
export type InsertSecao = typeof secoes.$inferInsert;

// ==================== MENSAGEM DO SÍNDICO ====================
export const mensagensSindico = pgTable("mensagens_sindico", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  fotoSindicoUrl: text("fotoSindicoUrl"),
  nomeSindico: varchar("nomeSindico", { length: 255 }),
  titulo: varchar("titulo", { length: 255 }),
  mensagem: text("mensagem"),
  assinatura: varchar("assinatura", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MensagemSindico = typeof mensagensSindico.$inferSelect;
export type InsertMensagemSindico = typeof mensagensSindico.$inferInsert;

// ==================== AVISOS ====================
export const avisos = pgTable("avisos", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo"),
  tipo: avisosTipoEnum("tipo").default("informativo"),
  imagemUrl: text("imagemUrl"),
  destaque: boolean("destaque").default(false),
  dataExpiracao: timestamp("dataExpiracao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Aviso = typeof avisos.$inferSelect;
export type InsertAviso = typeof avisos.$inferInsert;

// ==================== FUNCIONÁRIOS ====================
export const funcionarios = pgTable("funcionarios", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  departamento: varchar("departamento", { length: 100 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  fotoUrl: text("fotoUrl"),
  descricao: text("descricao"),
  dataAdmissao: timestamp("dataAdmissao"),
  ativo: boolean("ativo").default(true),
  // Tipo de funcionário para controle de acesso
  tipoFuncionario: tipoFuncionarioEnum("tipoFuncionario").default("auxiliar"),
  // Hierarquia: admin_master > admin > responsavel > funcionario
  hierarquia: hierarquiaEnum("hierarquia").default("funcionario"),
  criadoPorId: integer("criadoPorId"),
  // Campos de login
  loginEmail: varchar("loginEmail", { length: 255 }),
  loginUsuario: varchar("loginUsuario", { length: 255 }),
  senha: varchar("senha", { length: 255 }),
  loginAtivo: boolean("loginAtivo").default(false),
  ultimoLogin: timestamp("ultimoLogin"),
  // Campos de recuperação de senha
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpira: timestamp("resetTokenExpira"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ==================== HISTÓRICO DE ACESSOS DE FUNCIONÁRIOS ====================
export const funcionarioAcessos = pgTable("funcionario_acessos", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  dataHora: timestamp("dataHora").defaultNow().notNull(),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  dispositivo: varchar("dispositivo", { length: 100 }),
  navegador: varchar("navegador", { length: 100 }),
  sistemaOperacional: varchar("sistemaOperacional", { length: 100 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  cidade: varchar("cidade", { length: 100 }),
  regiao: varchar("regiao", { length: 100 }),
  pais: varchar("pais", { length: 100 }),
  tipoAcesso: tipoAcessoEnum("tipoAcesso").default("login"),
  sucesso: boolean("sucesso").default(true),
  motivoFalha: text("motivoFalha"),
});

export type FuncionarioAcesso = typeof funcionarioAcessos.$inferSelect;
export type InsertFuncionarioAcesso = typeof funcionarioAcessos.$inferInsert;

// ==================== FUNÇÕES DE FUNCIONÁRIOS ====================
export const funcionarioFuncoes = pgTable("funcionario_funcoes", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id).notNull(),
  funcaoKey: varchar("funcaoKey", { length: 100 }).notNull(),
  habilitada: boolean("habilitada").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FuncionarioFuncao = typeof funcionarioFuncoes.$inferSelect;
export type InsertFuncionarioFuncao = typeof funcionarioFuncoes.$inferInsert;

export type Funcionario = typeof funcionarios.$inferSelect;
export type InsertFuncionario = typeof funcionarios.$inferInsert;

// ==================== VÍNCULO FUNCIONÁRIO <-> CONDOMÍNIOS (MULTI-CONDOMÍNIO) ====================
export const funcionarioCondominios = pgTable("funcionario_condominios", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FuncionarioCondominio = typeof funcionarioCondominios.$inferSelect;
export type InsertFuncionarioCondominio = typeof funcionarioCondominios.$inferInsert;

// ==================== VÍNCULO FUNCIONÁRIO <-> APPS ====================
export const funcionarioApps = pgTable("funcionario_apps", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id).notNull(),
  appId: integer("appId").references(() => apps.id).notNull(),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FuncionarioApp = typeof funcionarioApps.$inferSelect;
export type InsertFuncionarioApp = typeof funcionarioApps.$inferInsert;

// ==================== EVENTOS ====================
export const eventos = pgTable("eventos", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  dataEvento: timestamp("dataEvento"),
  horaInicio: varchar("horaInicio", { length: 10 }),
  horaFim: varchar("horaFim", { length: 10 }),
  local: varchar("local", { length: 255 }),
  imagemUrl: text("imagemUrl"),
  tipo: eventosTipoEnum("tipo").default("agendado"),
  nomeResponsavel: varchar("nomeResponsavel", { length: 255 }),
  whatsappResponsavel: varchar("whatsappResponsavel", { length: 20 }),
  lembreteAntecedencia: integer("lembreteAntecedencia").default(1), // dias de antecedência para lembrete
  lembreteEnviado: boolean("lembreteEnviado").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Evento = typeof eventos.$inferSelect;
export type InsertEvento = typeof eventos.$inferInsert;

// ==================== ANTES E DEPOIS (OBRAS) ====================
export const antesDepois = pgTable("antes_depois", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  fotoAntesUrl: text("fotoAntesUrl"),
  fotoDepoisUrl: text("fotoDepoisUrl"),
  dataRealizacao: timestamp("dataRealizacao"),
  responsavel: varchar("responsavel", { length: 255 }),
  status: statusAntesdepoisEnum("status_antesdepois").default("pendente"),
  prioridade: prioridadeAntesdepoisEnum("prioridade_antesdepois").default("media"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AntesDepois = typeof antesDepois.$inferSelect;
export type InsertAntesDepois = typeof antesDepois.$inferInsert;

// ==================== ACHADOS E PERDIDOS ====================
export const achadosPerdidos = pgTable("achados_perdidos", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  usuarioId: integer("usuarioId").references(() => users.id).notNull(),
  tipo: achadosPerdidosTipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  fotoUrl: text("fotoUrl"),
  localEncontrado: varchar("localEncontrado", { length: 255 }),
  dataOcorrencia: timestamp("dataOcorrencia"),
  status: achadosPerdidosStatusEnum("status").default("aberto"),
  contato: varchar("contato", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AchadoPerdido = typeof achadosPerdidos.$inferSelect;
export type InsertAchadoPerdido = typeof achadosPerdidos.$inferInsert;

// ==================== CARONAS ====================
export const caronas = pgTable("caronas", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  usuarioId: integer("usuarioId").references(() => users.id),
  moradorId: integer("moradorId").references(() => moradores.id),
  contato: varchar("contato", { length: 255 }),
  tipo: caronasTipoEnum("tipo").notNull(),
  origem: varchar("origem", { length: 255 }).notNull(),
  destino: varchar("destino", { length: 255 }).notNull(),
  dataCarona: timestamp("dataCarona"),
  horario: varchar("horario", { length: 10 }),
  vagasDisponiveis: integer("vagasDisponiveis").default(1),
  observacoes: text("observacoes"),
  status: caronasStatusEnum("status").default("ativa"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Carona = typeof caronas.$inferSelect;
export type InsertCarona = typeof caronas.$inferInsert;

// ==================== CLASSIFICADOS ====================
export const classificados = pgTable("classificados", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  usuarioId: integer("usuarioId").references(() => users.id),
  moradorId: integer("moradorId").references(() => moradores.id),
  tipo: classificadosTipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  preco: varchar("preco", { length: 50 }),
  fotoUrl: text("fotoUrl"),
  contato: varchar("contato", { length: 255 }),
  status: classificadosStatusEnum("status").default("pendente"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Classificado = typeof classificados.$inferSelect;
export type InsertClassificado = typeof classificados.$inferInsert;

// ==================== VOTAÇÕES ====================
export const votacoes = pgTable("votacoes", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: votacoesTipoEnum("tipo").notNull(),
  imagemUrl: text("imagemUrl"),
  arquivoUrl: text("arquivoUrl"),
  videoUrl: text("videoUrl"),
  dataInicio: timestamp("dataInicio"),
  dataFim: timestamp("dataFim"),
  status: votacoesStatusEnum("status").default("ativa"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Votacao = typeof votacoes.$inferSelect;
export type InsertVotacao = typeof votacoes.$inferInsert;

// ==================== OPÇÕES DE VOTAÇÃO ====================
export const opcoesVotacao = pgTable("opcoes_votacao", {
  id: serial("id").primaryKey(),
  votacaoId: integer("votacaoId").references(() => votacoes.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  imagemUrl: text("imagemUrl"),
  votos: integer("votos").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OpcaoVotacao = typeof opcoesVotacao.$inferSelect;
export type InsertOpcaoVotacao = typeof opcoesVotacao.$inferInsert;

// ==================== VOTOS ====================
export const votos = pgTable("votos", {
  id: serial("id").primaryKey(),
  votacaoId: integer("votacaoId").references(() => votacoes.id).notNull(),
  opcaoId: integer("opcaoId").references(() => opcoesVotacao.id).notNull(),
  usuarioId: integer("usuarioId").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Voto = typeof votos.$inferSelect;
export type InsertVoto = typeof votos.$inferInsert;

// ==================== VAGAS DE ESTACIONAMENTO ====================
export const vagasEstacionamento = pgTable("vagas_estacionamento", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  numero: varchar("numero", { length: 20 }).notNull(),
  apartamento: varchar("apartamento", { length: 20 }),
  bloco: varchar("bloco", { length: 20 }),
  tipo: vagasEstacionamentoTipoEnum("tipo").default("coberta"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VagaEstacionamento = typeof vagasEstacionamento.$inferSelect;
export type InsertVagaEstacionamento = typeof vagasEstacionamento.$inferInsert;

// ==================== LINKS ÚTEIS ====================
export const linksUteis = pgTable("links_uteis", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  url: text("url").notNull(),
  descricao: text("descricao"),
  icone: varchar("icone", { length: 50 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LinkUtil = typeof linksUteis.$inferSelect;
export type InsertLinkUtil = typeof linksUteis.$inferInsert;

// ==================== TELEFONES ÚTEIS ====================
export const telefonesUteis = pgTable("telefones_uteis", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  descricao: text("descricao"),
  categoria: varchar("categoria", { length: 100 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelefoneUtil = typeof telefonesUteis.$inferSelect;
export type InsertTelefoneUtil = typeof telefonesUteis.$inferInsert;

// ==================== PUBLICIDADE ====================
export const publicidades = pgTable("publicidades", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  anunciante: varchar("anunciante", { length: 255 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  imagemUrl: text("imagemUrl"),
  linkUrl: text("linkUrl"),
  telefone: varchar("telefone", { length: 20 }),
  tipo: publicidadesTipoEnum("tipo").default("banner"),
  ativo: boolean("ativo").default(true),
  dataInicio: timestamp("dataInicio"),
  dataFim: timestamp("dataFim"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Publicidade = typeof publicidades.$inferSelect;
export type InsertPublicidade = typeof publicidades.$inferInsert;

// ==================== MORADORES DO CONDOMÍNIO ====================
export const moradores = pgTable("moradores", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  usuarioId: integer("usuarioId").references(() => users.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  apartamento: varchar("apartamento", { length: 20 }).notNull(),
  bloco: varchar("bloco", { length: 20 }),
  andar: varchar("andar", { length: 10 }),
  tipo: moradoresTipoEnum("tipo").default("proprietario"),
  cpf: varchar("cpf", { length: 14 }),
  dataNascimento: timestamp("dataNascimento"),
  fotoUrl: text("fotoUrl"),
  observacoes: text("observacoes"),
  dataEntrada: timestamp("dataEntrada"),
  dataSaida: timestamp("dataSaida"),
  ativo: boolean("ativo").default(true),
  // Campos de autenticação do portal do morador
  senha: varchar("senha", { length: 255 }),
  loginToken: varchar("loginToken", { length: 64 }),
  loginTokenExpira: timestamp("loginTokenExpira"),
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpira: timestamp("resetTokenExpira"),
  ultimoLogin: timestamp("ultimoLogin"),
  // Campo para bloqueio de votação
  bloqueadoVotacao: boolean("bloqueadoVotacao").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Morador = typeof moradores.$inferSelect;
export type InsertMorador = typeof moradores.$inferInsert;


// ==================== NOTIFICAÇÕES ====================
export const notificacoes = pgTable("notificacoes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id),
  tipo: notificacoesTipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem"),
  link: varchar("link", { length: 500 }),
  referenciaId: integer("referenciaId"),
  lida: boolean("lida").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notificacao = typeof notificacoes.$inferSelect;
export type InsertNotificacao = typeof notificacoes.$inferInsert;

// ==================== REALIZAÇÕES ====================
export const realizacoes = pgTable("realizacoes", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  imagemUrl: text("imagemUrl"),
  dataRealizacao: timestamp("dataRealizacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Realizacao = typeof realizacoes.$inferSelect;
export type InsertRealizacao = typeof realizacoes.$inferInsert;

// ==================== MELHORIAS ====================
export const melhorias = pgTable("melhorias", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  imagemUrl: text("imagemUrl"),
  custo: varchar("custo", { length: 50 }),
  dataImplementacao: timestamp("dataImplementacao"),
  status: melhoriasStatusEnum("status").default("planejada"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Melhoria = typeof melhorias.$inferSelect;
export type InsertMelhoria = typeof melhorias.$inferInsert;

// ==================== AQUISIÇÕES ====================
export const aquisicoes = pgTable("aquisicoes", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  imagemUrl: text("imagemUrl"),
  valor: varchar("valor", { length: 50 }),
  fornecedor: varchar("fornecedor", { length: 255 }),
  dataAquisicao: timestamp("dataAquisicao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Aquisicao = typeof aquisicoes.$inferSelect;
export type InsertAquisicao = typeof aquisicoes.$inferInsert;

// ==================== PREFERÊNCIAS DE NOTIFICAÇÃO ====================
export const preferenciasNotificacao = pgTable("preferencias_notificacao", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  avisos: boolean("avisos").default(true),
  eventos: boolean("eventos").default(true),
  votacoes: boolean("votacoes").default(true),
  classificados: boolean("classificados").default(true),
  caronas: boolean("caronas").default(true),
  emailNotificacoes: boolean("emailNotificacoes").default(false),
  efeitoTransicao: varchar("efeitoTransicao", { length: 50 }).default("slide"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PreferenciaNotificacao = typeof preferenciasNotificacao.$inferSelect;
export type InsertPreferenciaNotificacao = typeof preferenciasNotificacao.$inferInsert;

// ==================== ANUNCIANTES ====================
export const anunciantes = pgTable("anunciantes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  categoria: categoriaEnum("categoria").default("outros").notNull(),
  logoUrl: text("logoUrl"),
  telefone: varchar("telefone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: text("website"),
  endereco: text("endereco"),
  instagram: varchar("instagram", { length: 100 }),
  facebook: varchar("facebook", { length: 100 }),
  horarioFuncionamento: text("horarioFuncionamento"),
  status: statusAnuncianteEnum("statusAnunciante").default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Anunciante = typeof anunciantes.$inferSelect;
export type InsertAnunciante = typeof anunciantes.$inferInsert;

// ==================== ANÚNCIOS ====================
export const anuncios = pgTable("anuncios", {
  id: serial("id").primaryKey(),
  anuncianteId: integer("anuncianteId").references(() => anunciantes.id).notNull(),
  revistaId: integer("revistaId").references(() => revistas.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  bannerUrl: text("bannerUrl"),
  linkDestino: text("linkDestino"),
  posicao: posicaoEnum("posicao").default("pagina_interna").notNull(),
  tamanho: tamanhoEnum("tamanho").default("medio").notNull(),
  dataInicio: timestamp("dataInicio"),
  dataFim: timestamp("dataFim"),
  status: statusAnuncioEnum("statusAnuncio").default("pendente").notNull(),
  visualizacoes: integer("visualizacoes").default(0),
  cliques: integer("cliques").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Anuncio = typeof anuncios.$inferSelect;
export type InsertAnuncio = typeof anuncios.$inferInsert;


// ==================== COMUNICADOS ====================
export const comunicados = pgTable("comunicados", {
  id: serial("id").primaryKey(),
  revistaId: integer("revistaId").references(() => revistas.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  anexoUrl: text("anexoUrl"),
  anexoNome: varchar("anexoNome", { length: 255 }),
  anexoTipo: varchar("anexoTipo", { length: 100 }),
  anexoTamanho: integer("anexoTamanho"),
  dataPublicacao: timestamp("dataPublicacao").defaultNow(),
  destaque: boolean("destaque").default(false),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Comunicado = typeof comunicados.$inferSelect;
export type InsertComunicado = typeof comunicados.$inferInsert;


// ==================== ÁLBUNS DE FOTOS ====================
export const albuns = pgTable("albuns", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  categoria: albunsCategoriaEnum("categoria").default("outros").notNull(),
  capaUrl: text("capaUrl"),
  dataEvento: timestamp("dataEvento"),
  destaque: boolean("destaque").default(false),
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Album = typeof albuns.$inferSelect;
export type InsertAlbum = typeof albuns.$inferInsert;

// ==================== FOTOS DOS ÁLBUNS ====================
export const fotos = pgTable("fotos", {
  id: serial("id").primaryKey(),
  albumId: integer("albumId").references(() => albuns.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 500 }),
  ordem: integer("ordem").default(0),
  largura: integer("largura"),
  altura: integer("altura"),
  tamanho: integer("tamanho"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Foto = typeof fotos.$inferSelect;
export type InsertFoto = typeof fotos.$inferInsert;


// ==================== DICAS DE SEGURANÇA ====================
export const dicasSeguranca = pgTable("dicas_seguranca", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  categoria: dicasSegurancaCategoriaEnum("categoria").default("geral"),
  icone: varchar("icone", { length: 50 }).default("shield"),
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DicaSeguranca = typeof dicasSeguranca.$inferSelect;
export type InsertDicaSeguranca = typeof dicasSeguranca.$inferInsert;

// ==================== REGRAS E NORMAS ====================
export const regrasNormas = pgTable("regras_normas", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  categoria: regrasNormasCategoriaEnum("categoria").default("geral"),
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RegraNorma = typeof regrasNormas.$inferSelect;
export type InsertRegraNorma = typeof regrasNormas.$inferInsert;

// ==================== IMAGENS DE REALIZAÇÕES ====================
export const imagensRealizacoes = pgTable("imagens_realizacoes", {
  id: serial("id").primaryKey(),
  realizacaoId: integer("realizacaoId").references(() => realizacoes.id).notNull(),
  imagemUrl: text("imagemUrl").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemRealizacao = typeof imagensRealizacoes.$inferSelect;
export type InsertImagemRealizacao = typeof imagensRealizacoes.$inferInsert;

// ==================== IMAGENS DE MELHORIAS ====================
export const imagensMelhorias = pgTable("imagens_melhorias", {
  id: serial("id").primaryKey(),
  melhoriaId: integer("melhoriaId").references(() => melhorias.id).notNull(),
  imagemUrl: text("imagemUrl").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemMelhoria = typeof imagensMelhorias.$inferSelect;
export type InsertImagemMelhoria = typeof imagensMelhorias.$inferInsert;

// ==================== IMAGENS DE AQUISIÇÕES ====================
export const imagensAquisicoes = pgTable("imagens_aquisicoes", {
  id: serial("id").primaryKey(),
  aquisicaoId: integer("aquisicaoId").references(() => aquisicoes.id).notNull(),
  imagemUrl: text("imagemUrl").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemAquisicao = typeof imagensAquisicoes.$inferSelect;
export type InsertImagemAquisicao = typeof imagensAquisicoes.$inferInsert;

// ==================== IMAGENS DE ACHADOS E PERDIDOS ====================
export const imagensAchadosPerdidos = pgTable("imagens_achados_perdidos", {
  id: serial("id").primaryKey(),
  achadoPerdidoId: integer("achadoPerdidoId").references(() => achadosPerdidos.id).notNull(),
  imagemUrl: text("imagemUrl").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemAchadoPerdido = typeof imagensAchadosPerdidos.$inferSelect;
export type InsertImagemAchadoPerdido = typeof imagensAchadosPerdidos.$inferInsert;

// ==================== IMAGENS E ANEXOS DE VAGAS ====================
export const imagensVagas = pgTable("imagens_vagas", {
  id: serial("id").primaryKey(),
  vagaId: integer("vagaId").references(() => vagasEstacionamento.id).notNull(),
  tipo: imagensVagasTipoEnum("tipo").default("imagem"),
  url: text("url").notNull(),
  nome: varchar("nome", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemVaga = typeof imagensVagas.$inferSelect;
export type InsertImagemVaga = typeof imagensVagas.$inferInsert;

// ==================== FAVORITOS ====================
export const favoritos = pgTable("favoritos", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id),
  tipoItem: tipoItemEnum("tipoItem").notNull(),
  itemId: integer("itemId"),
  cardSecaoId: varchar("cardSecaoId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorito = typeof favoritos.$inferSelect;
export type InsertFavorito = typeof favoritos.$inferInsert;


// ==================== VISTORIAS ====================
export const vistorias = pgTable("vistorias", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: varchar("subtitulo", { length: 255 }),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  responsavelId: integer("responsavelId").references(() => users.id),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataAgendada: timestamp("dataAgendada"),
  dataRealizada: timestamp("dataRealizada"),
  status: vistoriasStatusEnum("status").default("pendente").notNull(),
  prioridade: prioridadeEnum("prioridade").default("media"),
  tipo: varchar("tipo", { length: 100 }),
  assinaturaTecnico: text("assinaturaTecnico"),
  assinaturaSolicitante: text("assinaturaSolicitante"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Vistoria = typeof vistorias.$inferSelect;
export type InsertVistoria = typeof vistorias.$inferInsert;

// ==================== IMAGENS DE VISTORIAS ====================
export const vistoriaImagens = pgTable("vistoria_imagens", {
  id: serial("id").primaryKey(),
  vistoriaId: integer("vistoriaId").references(() => vistorias.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VistoriaImagem = typeof vistoriaImagens.$inferSelect;
export type InsertVistoriaImagem = typeof vistoriaImagens.$inferInsert;

// ==================== ANEXOS DE VISTORIAS ====================
export const vistoriaAnexos = pgTable("vistoria_anexos", {
  id: serial("id").primaryKey(),
  vistoriaId: integer("vistoriaId").references(() => vistorias.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  tamanho: integer("tamanho").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VistoriaAnexo = typeof vistoriaAnexos.$inferSelect;
export type InsertVistoriaAnexo = typeof vistoriaAnexos.$inferInsert;

// ==================== TIMELINE DE VISTORIAS ====================
export const vistoriaTimeline = pgTable("vistoria_timeline", {
  id: serial("id").primaryKey(),
  vistoriaId: integer("vistoriaId").references(() => vistorias.id).notNull(),
  tipo: vistoriaTimelineTipoEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  userId: integer("userId").references(() => users.id),
  userNome: varchar("userNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VistoriaTimelineEvento = typeof vistoriaTimeline.$inferSelect;
export type InsertVistoriaTimelineEvento = typeof vistoriaTimeline.$inferInsert;

// ==================== MANUTENÇÕES ====================
export const manutencoes = pgTable("manutencoes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: varchar("subtitulo", { length: 255 }),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  responsavelId: integer("responsavelId").references(() => users.id),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataAgendada: timestamp("dataAgendada"),
  dataRealizada: timestamp("dataRealizada"),
  status: vistoriasStatusEnum("status").default("pendente").notNull(),
  prioridade: prioridadeEnum("prioridade").default("media"),
  tipo: manutencoesTipoEnum("tipo").default("corretiva"),
  tempoEstimadoDias: integer("tempoEstimadoDias").default(0),
  tempoEstimadoHoras: integer("tempoEstimadoHoras").default(0),
  tempoEstimadoMinutos: integer("tempoEstimadoMinutos").default(0),
  fornecedor: varchar("fornecedor", { length: 255 }),
  assinaturaTecnico: text("assinaturaTecnico"),
  assinaturaSolicitante: text("assinaturaSolicitante"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Manutencao = typeof manutencoes.$inferSelect;
export type InsertManutencao = typeof manutencoes.$inferInsert;

// ==================== IMAGENS DE MANUTENÇÕES ====================
export const manutencaoImagens = pgTable("manutencao_imagens", {
  id: serial("id").primaryKey(),
  manutencaoId: integer("manutencaoId").references(() => manutencoes.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ManutencaoImagem = typeof manutencaoImagens.$inferSelect;
export type InsertManutencaoImagem = typeof manutencaoImagens.$inferInsert;

// ==================== ANEXOS DE MANUTENÇÕES ====================
export const manutencaoAnexos = pgTable("manutencao_anexos", {
  id: serial("id").primaryKey(),
  manutencaoId: integer("manutencaoId").references(() => manutencoes.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  tamanho: integer("tamanho").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ManutencaoAnexo = typeof manutencaoAnexos.$inferSelect;
export type InsertManutencaoAnexo = typeof manutencaoAnexos.$inferInsert;

// ==================== TIMELINE DE MANUTENÇÕES ====================
export const manutencaoTimeline = pgTable("manutencao_timeline", {
  id: serial("id").primaryKey(),
  manutencaoId: integer("manutencaoId").references(() => manutencoes.id).notNull(),
  tipo: vistoriaTimelineTipoEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  userId: integer("userId").references(() => users.id),
  userNome: varchar("userNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ManutencaoTimelineEvento = typeof manutencaoTimeline.$inferSelect;
export type InsertManutencaoTimelineEvento = typeof manutencaoTimeline.$inferInsert;

// ==================== OCORRÊNCIAS ====================
export const ocorrencias = pgTable("ocorrencias", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: varchar("subtitulo", { length: 255 }),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  reportadoPorId: integer("reportadoPorId").references(() => users.id),
  reportadoPorNome: varchar("reportadoPorNome", { length: 255 }),
  responsavelId: integer("responsavelId").references(() => users.id),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataOcorrencia: timestamp("dataOcorrencia"),
  status: ocorrenciasStatusEnum("status").default("pendente").notNull(),
  prioridade: prioridadeEnum("prioridade").default("media"),
  categoria: ocorrenciasCategoriaEnum("categoria").default("outros"),
  assinaturaTecnico: text("assinaturaTecnico"),
  assinaturaSolicitante: text("assinaturaSolicitante"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Ocorrencia = typeof ocorrencias.$inferSelect;
export type InsertOcorrencia = typeof ocorrencias.$inferInsert;

// ==================== IMAGENS DE OCORRÊNCIAS ====================
export const ocorrenciaImagens = pgTable("ocorrencia_imagens", {
  id: serial("id").primaryKey(),
  ocorrenciaId: integer("ocorrenciaId").references(() => ocorrencias.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OcorrenciaImagem = typeof ocorrenciaImagens.$inferSelect;
export type InsertOcorrenciaImagem = typeof ocorrenciaImagens.$inferInsert;

// ==================== ANEXOS DE OCORRÊNCIAS ====================
export const ocorrenciaAnexos = pgTable("ocorrencia_anexos", {
  id: serial("id").primaryKey(),
  ocorrenciaId: integer("ocorrenciaId").references(() => ocorrencias.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  tamanho: integer("tamanho").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OcorrenciaAnexo = typeof ocorrenciaAnexos.$inferSelect;
export type InsertOcorrenciaAnexo = typeof ocorrenciaAnexos.$inferInsert;

// ==================== TIMELINE DE OCORRÊNCIAS ====================
export const ocorrenciaTimeline = pgTable("ocorrencia_timeline", {
  id: serial("id").primaryKey(),
  ocorrenciaId: integer("ocorrenciaId").references(() => ocorrencias.id).notNull(),
  tipo: vistoriaTimelineTipoEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  userId: integer("userId").references(() => users.id),
  userNome: varchar("userNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OcorrenciaTimelineEvento = typeof ocorrenciaTimeline.$inferSelect;
export type InsertOcorrenciaTimelineEvento = typeof ocorrenciaTimeline.$inferInsert;

// ==================== CHECKLISTS ====================
export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: varchar("subtitulo", { length: 255 }),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  responsavelId: integer("responsavelId").references(() => users.id),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataAgendada: timestamp("dataAgendada"),
  dataRealizada: timestamp("dataRealizada"),
  status: vistoriasStatusEnum("status").default("pendente").notNull(),
  prioridade: prioridadeEnum("prioridade").default("media"),
  categoria: varchar("categoria", { length: 100 }),
  totalItens: integer("totalItens").default(0),
  itensCompletos: integer("itensCompletos").default(0),
  assinaturaTecnico: text("assinaturaTecnico"),
  assinaturaSolicitante: text("assinaturaSolicitante"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

// ==================== ITENS DO CHECKLIST ====================
export const checklistItens = pgTable("checklist_itens", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklistId").references(() => checklists.id).notNull(),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  completo: boolean("completo").default(false),
  observacao: text("observacao"),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChecklistItem = typeof checklistItens.$inferSelect;
export type InsertChecklistItem = typeof checklistItens.$inferInsert;

// ==================== IMAGENS DE CHECKLISTS ====================
export const checklistImagens = pgTable("checklist_imagens", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklistId").references(() => checklists.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistImagem = typeof checklistImagens.$inferSelect;
export type InsertChecklistImagem = typeof checklistImagens.$inferInsert;

// ==================== ANEXOS DE CHECKLISTS ====================
export const checklistAnexos = pgTable("checklist_anexos", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklistId").references(() => checklists.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  tamanho: integer("tamanho").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistAnexo = typeof checklistAnexos.$inferSelect;
export type InsertChecklistAnexo = typeof checklistAnexos.$inferInsert;

// ==================== TIMELINE DE CHECKLISTS ====================
export const checklistTimeline = pgTable("checklist_timeline", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklistId").references(() => checklists.id).notNull(),
  tipo: checklistTimelineTipoEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  userId: integer("userId").references(() => users.id),
  userNome: varchar("userNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistTimelineEvento = typeof checklistTimeline.$inferSelect;
export type InsertChecklistTimelineEvento = typeof checklistTimeline.$inferInsert;


// ==================== MEMBROS DA EQUIPE ====================
export const membrosEquipe = pgTable("membros_equipe", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
  descricao: text("descricao"),
  cargo: varchar("cargo", { length: 100 }),
  fotoUrl: text("fotoUrl"),
  // Campos para login e permissões
  email: varchar("email", { length: 320 }),
  senha: varchar("senha", { length: 255 }),
  acessoTotal: boolean("acessoTotal").default(false).notNull(),
  // JSON com lista de módulos permitidos: ["vistorias", "manutencoes", "ocorrencias", "checklists", "antes_depois", "ordens_servico", "agenda_vencimentos", "historico", "gestao_organizacao", "equipe_gestao"]
  permissoes: json("permissoes").$type<string[]>().default([]),
  // Token para reset de senha
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpira: timestamp("resetTokenExpira"),
  ultimoAcesso: timestamp("ultimoAcesso"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MembroEquipe = typeof membrosEquipe.$inferSelect;
export type InsertMembroEquipe = typeof membrosEquipe.$inferInsert;

// ==================== EQUIPES (Grupos de Funcionários) ====================
export const equipes = pgTable("equipes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  cor: varchar("cor", { length: 20 }).default("#3b82f6"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Equipe = typeof equipes.$inferSelect;
export type InsertEquipe = typeof equipes.$inferInsert;

// ==================== FUNCIONÁRIOS DAS EQUIPES (Junção) ====================
export const equipeFuncionarios = pgTable("equipe_funcionarios", {
  id: serial("id").primaryKey(),
  equipeId: integer("equipeId").references(() => equipes.id, { onDelete: "cascade" }).notNull(),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EquipeFuncionario = typeof equipeFuncionarios.$inferSelect;

// ==================== HISTÓRICO DE ACESSOS DE MEMBROS ====================
export const membroAcessos = pgTable("membro_acessos", {
  id: serial("id").primaryKey(),
  membroId: integer("membroId").references(() => membrosEquipe.id).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  dataHora: timestamp("dataHora").defaultNow().notNull(),
  ip: varchar("ip", { length: 45 }), // Suporta IPv6
  userAgent: text("userAgent"),
  dispositivo: varchar("dispositivo", { length: 100 }),
  navegador: varchar("navegador", { length: 100 }),
  sistemaOperacional: varchar("sistemaOperacional", { length: 100 }),
  localizacao: varchar("localizacao", { length: 255 }),
  tipoAcesso: tipoAcessoEnum("tipoAcesso").default("login"),
  sucesso: boolean("sucesso").default(true),
  motivoFalha: text("motivoFalha"),
});

export type MembroAcesso = typeof membroAcessos.$inferSelect;
export type InsertMembroAcesso = typeof membroAcessos.$inferInsert;

// ==================== LINKS COMPARTILHÁVEIS ====================
export const linksCompartilhaveis = pgTable("links_compartilhaveis", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  tipo: linksCompartilhaveisTipoEnum("tipo").notNull(),
  itemId: integer("itemId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  editavel: boolean("editavel").default(false).notNull(),
  expiracaoHoras: integer("expiracaoHoras").default(168), // 7 dias por padrão
  acessos: integer("acessos").default(0).notNull(),
  criadoPorId: integer("criadoPorId").references(() => users.id),
  criadoPorNome: varchar("criadoPorNome", { length: 255 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LinkCompartilhavel = typeof linksCompartilhaveis.$inferSelect;
export type InsertLinkCompartilhavel = typeof linksCompartilhaveis.$inferInsert;

// ==================== HISTÓRICO DE COMPARTILHAMENTOS ====================
export const historicoCompartilhamentos = pgTable("historico_compartilhamentos", {
  id: serial("id").primaryKey(),
  linkId: integer("linkId").references(() => linksCompartilhaveis.id).notNull(),
  membroId: integer("membroId").references(() => membrosEquipe.id),
  membroNome: varchar("membroNome", { length: 255 }),
  membroWhatsapp: varchar("membroWhatsapp", { length: 20 }),
  compartilhadoPorId: integer("compartilhadoPorId").references(() => users.id),
  compartilhadoPorNome: varchar("compartilhadoPorNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoCompartilhamento = typeof historicoCompartilhamentos.$inferSelect;
export type InsertHistoricoCompartilhamento = typeof historicoCompartilhamentos.$inferInsert;


// ==================== COMENTÁRIOS EM ITENS PARTILHADOS ====================
export const comentariosItem = pgTable("comentarios_item", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId").notNull(),
  itemTipo: itemTipoEnum("itemTipo").notNull(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  autorId: integer("autorId").references(() => users.id),
  autorNome: varchar("autorNome", { length: 255 }).notNull(),
  autorWhatsapp: varchar("autorWhatsapp", { length: 20 }),
  autorEmail: varchar("autorEmail", { length: 320 }),
  autorFoto: text("autorFoto"),
  texto: text("texto").notNull(),
  isInterno: boolean("isInterno").default(false).notNull(),
  lido: boolean("lido").default(false).notNull(),
  lidoPorId: integer("lidoPorId").references(() => users.id),
  lidoEm: timestamp("lidoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ComentarioItem = typeof comentariosItem.$inferSelect;
export type InsertComentarioItem = typeof comentariosItem.$inferInsert;

// ==================== ANEXOS DE COMENTÁRIOS ====================
export const anexosComentario = pgTable("anexos_comentario", {
  id: serial("id").primaryKey(),
  comentarioId: integer("comentarioId").references(() => comentariosItem.id).notNull(),
  url: text("url").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  tamanho: integer("tamanho"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnexoComentario = typeof anexosComentario.$inferSelect;
export type InsertAnexoComentario = typeof anexosComentario.$inferInsert;

// ==================== RESPOSTAS A COMENTÁRIOS ====================
export const respostasComentario = pgTable("respostas_comentario", {
  id: serial("id").primaryKey(),
  comentarioId: integer("comentarioId").references(() => comentariosItem.id).notNull(),
  autorId: integer("autorId").references(() => users.id),
  autorNome: varchar("autorNome", { length: 255 }).notNull(),
  autorFoto: text("autorFoto"),
  texto: text("texto").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RespostaComentario = typeof respostasComentario.$inferSelect;
export type InsertRespostaComentario = typeof respostasComentario.$inferInsert;


// ==================== DESTAQUES ====================
export const destaques = pgTable("destaques", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: varchar("subtitulo", { length: 255 }),
  descricao: text("descricao"),
  link: text("link"),
  arquivoUrl: text("arquivoUrl"),
  arquivoNome: varchar("arquivoNome", { length: 255 }),
  videoUrl: text("videoUrl"),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Destaque = typeof destaques.$inferSelect;
export type InsertDestaque = typeof destaques.$inferInsert;

// ==================== IMAGENS DE DESTAQUES ====================
export const imagensDestaques = pgTable("imagens_destaques", {
  id: serial("id").primaryKey(),
  destaqueId: integer("destaqueId").references(() => destaques.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemDestaque = typeof imagensDestaques.$inferSelect;
export type InsertImagemDestaque = typeof imagensDestaques.$inferInsert;


// ==================== PÁGINA 100% PERSONALIZADA ====================
export const paginasCustom = pgTable("paginas_custom", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  subtitulo: varchar("subtitulo", { length: 255 }),
  descricao: text("descricao"),
  link: text("link"),
  videoUrl: text("videoUrl"),
  arquivoUrl: text("arquivoUrl"),
  arquivoNome: varchar("arquivoNome", { length: 255 }),
  imagens: json("imagens").$type<Array<{url: string, legenda?: string}>>(),
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PaginaCustom = typeof paginasCustom.$inferSelect;
export type InsertPaginaCustom = typeof paginasCustom.$inferInsert;

// ==================== IMAGENS DE PÁGINAS PERSONALIZADAS ====================
export const imagensCustom = pgTable("imagens_custom", {
  id: serial("id").primaryKey(),
  paginaId: integer("paginaId").references(() => paginasCustom.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImagemCustom = typeof imagensCustom.$inferSelect;
export type InsertImagemCustom = typeof imagensCustom.$inferInsert;


// ==================== AGENDA DE VENCIMENTOS ====================
export const vencimentos = pgTable("vencimentos", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  tipo: vencimentosTipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  fornecedor: varchar("fornecedor", { length: 255 }),
  valor: decimal("valor", { precision: 10, scale: 2 }),
  dataInicio: timestamp("dataInicio"),
  dataVencimento: timestamp("dataVencimento").notNull(),
  ultimaRealizacao: timestamp("ultimaRealizacao"),
  proximaRealizacao: timestamp("proximaRealizacao"),
  periodicidade: periodicidadeEnum("periodicidade").default("unico"),
  status: vencimentosStatusEnum("status").default("ativo").notNull(),
  observacoes: text("observacoes"),
  arquivoUrl: text("arquivoUrl"),
  arquivoNome: varchar("arquivoNome", { length: 255 }),
  setor: varchar("setor", { length: 255 }),
  responsavel: varchar("responsavel", { length: 255 }),
  imagemUrl: text("imagemUrl"),
  emailsNotificacao: text("emailsNotificacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Vencimento = typeof vencimentos.$inferSelect;
export type InsertVencimento = typeof vencimentos.$inferInsert;

// ==================== CONFIGURAÇÃO DE ALERTAS DE VENCIMENTOS ====================
export const vencimentoAlertas = pgTable("vencimento_alertas", {
  id: serial("id").primaryKey(),
  vencimentoId: integer("vencimentoId").references(() => vencimentos.id).notNull(),
  tipoAlerta: tipoAlertaEnum("tipoAlerta").notNull(),
  ativo: boolean("ativo").default(true),
  enviado: boolean("enviado").default(false),
  dataEnvio: timestamp("dataEnvio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VencimentoAlerta = typeof vencimentoAlertas.$inferSelect;
export type InsertVencimentoAlerta = typeof vencimentoAlertas.$inferInsert;

// ==================== E-MAILS PARA NOTIFICAÇÃO DE VENCIMENTOS ====================
export const vencimentoEmails = pgTable("vencimento_emails", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  nome: varchar("nome", { length: 255 }),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VencimentoEmail = typeof vencimentoEmails.$inferSelect;
export type InsertVencimentoEmail = typeof vencimentoEmails.$inferInsert;

// ==================== HISTÓRICO DE NOTIFICAÇÕES ENVIADAS ====================
export const vencimentoNotificacoes = pgTable("vencimento_notificacoes", {
  id: serial("id").primaryKey(),
  vencimentoId: integer("vencimentoId").references(() => vencimentos.id).notNull(),
  alertaId: integer("alertaId").references(() => vencimentoAlertas.id),
  emailDestinatario: varchar("emailDestinatario", { length: 320 }).notNull(),
  assunto: varchar("assunto", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  status: vencimentoNotificacoesStatusEnum("status").default("pendente").notNull(),
  erroMensagem: text("erroMensagem"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VencimentoNotificacao = typeof vencimentoNotificacoes.$inferSelect;
export type InsertVencimentoNotificacao = typeof vencimentoNotificacoes.$inferInsert;


// ==================== PUSH SUBSCRIPTIONS (Web Push Notifications) ====================
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id),
  moradorId: integer("moradorId").references(() => moradores.id),
  userId: integer("userId").references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("userAgent"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ==================== LEMBRETES AGENDADOS ====================
export const lembretes = pgTable("lembretes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  tipo: lembretesTipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem"),
  dataAgendada: timestamp("dataAgendada").notNull(),
  antecedenciaHoras: integer("antecedenciaHoras").default(24),
  enviado: boolean("enviado").default(false),
  enviadoEm: timestamp("enviadoEm"),
  referenciaId: integer("referenciaId"),
  referenciaTipo: varchar("referenciaTipo", { length: 50 }),
  canais: json("canais").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Lembrete = typeof lembretes.$inferSelect;
export type InsertLembrete = typeof lembretes.$inferInsert;

// ==================== HISTÓRICO DE NOTIFICAÇÕES ENVIADAS ====================
export const historicoNotificacoes = pgTable("historico_notificacoes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  tipo: historicoNotificacoesTipoEnum("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem"),
  destinatarios: integer("destinatarios").default(0),
  sucessos: integer("sucessos").default(0),
  falhas: integer("falhas").default(0),
  lembreteId: integer("lembreteId").references(() => lembretes.id),
  enviadoPor: integer("enviadoPor").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoNotificacao = typeof historicoNotificacoes.$inferSelect;
export type InsertHistoricoNotificacao = typeof historicoNotificacoes.$inferInsert;

// ==================== CONFIGURAÇÕES DE EMAIL ====================
export const configuracoesEmail = pgTable("configuracoes_email", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull().unique(),
  provedor: provedorEnum("provedor").default("resend"),
  apiKey: text("apiKey"),
  emailRemetente: varchar("emailRemetente", { length: 255 }),
  nomeRemetente: varchar("nomeRemetente", { length: 255 }),
  ativo: boolean("ativo").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ConfiguracaoEmail = typeof configuracoesEmail.$inferSelect;
export type InsertConfiguracaoEmail = typeof configuracoesEmail.$inferInsert;

// ==================== CONFIGURAÇÕES PUSH (VAPID) ====================
export const configuracoesPush = pgTable("configuracoes_push", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  vapidPublicKey: text("vapidPublicKey"),
  vapidPrivateKey: text("vapidPrivateKey"),
  vapidSubject: varchar("vapidSubject", { length: 255 }),
  ativo: boolean("ativo").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ConfiguracaoPush = typeof configuracoesPush.$inferSelect;
export type InsertConfiguracaoPush = typeof configuracoesPush.$inferInsert;

// ==================== TEMPLATES DE NOTIFICAÇÃO ====================
export const templatesNotificacao = pgTable("templates_notificacao", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  titulo: varchar("titulo", { length: 100 }).notNull(),
  mensagem: text("mensagem").notNull(),
  categoria: templatesNotificacaoCategoriaEnum("categoria").default('custom'),
  icone: varchar("icone", { length: 50 }),
  cor: varchar("cor", { length: 20 }),
  urlDestino: varchar("urlDestino", { length: 255 }),
  ativo: boolean("ativo").default(true),
  usageCount: integer("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TemplateNotificacao = typeof templatesNotificacao.$inferSelect;
export type InsertTemplateNotificacao = typeof templatesNotificacao.$inferInsert;


// ==================== TIPOS DE INFRAÇÃO ====================
export const tiposInfracao = pgTable("tipos_infracao", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricaoPadrao: text("descricaoPadrao"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TipoInfracao = typeof tiposInfracao.$inferSelect;
export type InsertTipoInfracao = typeof tiposInfracao.$inferInsert;

// ==================== NOTIFICAÇÕES DE INFRAÇÃO ====================
export const notificacoesInfracao = pgTable("notificacoes_infracao", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  moradorId: integer("moradorId").references(() => moradores.id).notNull(),
  tipoInfracaoId: integer("tipoInfracaoId").references(() => tiposInfracao.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  imagens: json("imagens").$type<string[]>(),
  status: statusNotificacaoInfracaoEnum("status").default('pendente'),
  dataOcorrencia: timestamp("dataOcorrencia"),
  pdfUrl: text("pdfUrl"),
  linkPublico: varchar("linkPublico", { length: 64 }).notNull(),
  enviadoWhatsapp: boolean("enviadoWhatsapp").default(false),
  enviadoEmail: boolean("enviadoEmail").default(false),
  criadoPor: integer("criadoPor").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NotificacaoInfracao = typeof notificacoesInfracao.$inferSelect;
export type InsertNotificacaoInfracao = typeof notificacoesInfracao.$inferInsert;

// ==================== RESPOSTAS DE INFRAÇÃO (TIMELINE/CHAT) ====================
export const respostasInfracao = pgTable("respostas_infracao", {
  id: serial("id").primaryKey(),
  notificacaoId: integer("notificacaoId").references(() => notificacoesInfracao.id).notNull(),
  autorTipo: autorTipoInfracaoEnum("autorTipo").notNull(),
  autorId: integer("autorId"),
  autorNome: varchar("autorNome", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  imagens: json("imagens").$type<string[]>(),
  lidaPeloSindico: boolean("lidaPeloSindico").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RespostaInfracao = typeof respostasInfracao.$inferSelect;
export type InsertRespostaInfracao = typeof respostasInfracao.$inferInsert;


// ==================== FUNÇÕES HABILITADAS POR CONDOMÍNIO ====================
export const condominioFuncoes = pgTable("condominio_funcoes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  funcaoId: varchar("funcaoId", { length: 50 }).notNull(),
  habilitada: boolean("habilitada").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CondominioFuncao = typeof condominioFuncoes.$inferSelect;
export type InsertCondominioFuncao = typeof condominioFuncoes.$inferInsert;

// Lista de todas as funções disponíveis no sistema
export const FUNCOES_DISPONIVEIS = [
  { id: "avisos", nome: "Avisos", categoria: "comunicacao", descricao: "Publicar avisos e comunicados" },
  { id: "comunicados", nome: "Comunicados", categoria: "comunicacao", descricao: "Enviar comunicados oficiais" },
  { id: "notificacoes", nome: "Notificações", categoria: "comunicacao", descricao: "Sistema de notificações" },
  { id: "notificar-morador", nome: "Notificar Morador", categoria: "comunicacao", descricao: "Notificar moradores individualmente" },
  { id: "eventos", nome: "Eventos", categoria: "agenda", descricao: "Gestão de eventos do condomínio" },
  { id: "agenda-vencimentos", nome: "Agenda de Vencimentos", categoria: "agenda", descricao: "Controle de vencimentos" },
  { id: "reservas", nome: "Reservas", categoria: "agenda", descricao: "Reserva de áreas comuns" },
  { id: "vistorias", nome: "Vistorias", categoria: "operacional", descricao: "Registro de vistorias" },
  { id: "manutencoes", nome: "Manutenções", categoria: "operacional", descricao: "Controle de manutenções" },
  { id: "ocorrencias", nome: "Ocorrências", categoria: "operacional", descricao: "Registro de ocorrências" },
  { id: "checklists", nome: "Checklists", categoria: "operacional", descricao: "Listas de verificação" },
  { id: "antes-depois", nome: "Antes e Depois", categoria: "operacional", descricao: "Registro de melhorias" },
  { id: "ordens-servico", nome: "Ordens de Serviço", categoria: "operacional", descricao: "Gestão de ordens de serviço" },
  { id: "timeline", nome: "Timeline", categoria: "operacional", descricao: "Registro de eventos e atualizações" },
  { id: "leitura-medidores", nome: "Leitura de Medidores", categoria: "operacional", descricao: "Registro de leituras de água, gás e energia" },
  { id: "controle-pragas", nome: "Controle de Pragas", categoria: "operacional", descricao: "Registros de dedetização e controle de pragas" },
  { id: "jardinagem", nome: "Jardinagem", categoria: "operacional", descricao: "Serviços de jardinagem e áreas verdes" },
  { id: "votacoes", nome: "Votações", categoria: "interativo", descricao: "Sistema de votações" },
  { id: "classificados", nome: "Classificados", categoria: "interativo", descricao: "Classificados dos moradores" },
  { id: "achados-perdidos", nome: "Achados e Perdidos", categoria: "interativo", descricao: "Itens perdidos e encontrados" },
  { id: "caronas", nome: "Caronas", categoria: "interativo", descricao: "Sistema de caronas" },
  { id: "regras", nome: "Regras e Normas", categoria: "documentacao", descricao: "Regras do condomínio" },
  { id: "dicas-seguranca", nome: "Dicas de Segurança", categoria: "documentacao", descricao: "Dicas de segurança" },
  { id: "links-uteis", nome: "Links Úteis", categoria: "documentacao", descricao: "Links importantes" },
  { id: "telefones-uteis", nome: "Telefones Úteis", categoria: "documentacao", descricao: "Telefones de emergência" },
  { id: "galeria", nome: "Galeria de Fotos", categoria: "midia", descricao: "Fotos do condomínio" },
  { id: "realizacoes", nome: "Realizações", categoria: "midia", descricao: "Realizações da gestão" },
  { id: "melhorias", nome: "Melhorias", categoria: "midia", descricao: "Melhorias realizadas" },
  { id: "aquisicoes", nome: "Aquisições", categoria: "midia", descricao: "Novas aquisições" },
  { id: "publicidade", nome: "Publicidade", categoria: "publicidade", descricao: "Gestão de anunciantes" },
  { id: "revistas", nome: "Meus Projetos", categoria: "projetos", descricao: "Apps, revistas e relatórios" },
  { id: "moradores", nome: "Moradores", categoria: "gestao", descricao: "Gestão de moradores" },
  { id: "funcionarios", nome: "Funcionários", categoria: "gestao", descricao: "Gestão de funcionários" },
  { id: "vagas", nome: "Vagas de Estacionamento", categoria: "gestao", descricao: "Gestão de vagas" },
  { id: "equipe", nome: "Equipe de Gestão", categoria: "gestao", descricao: "Membros da equipe" },
  { id: "painel-controlo", nome: "Painel de Controlo", categoria: "relatorios", descricao: "Estatísticas e gráficos" },
  { id: "relatorios", nome: "Relatórios", categoria: "relatorios", descricao: "Relatórios detalhados" },
] as const;

export type FuncaoId = typeof FUNCOES_DISPONIVEIS[number]["id"];


// ==================== APPS PERSONALIZADOS ====================
export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  logoUrl: text("logoUrl"),
  corPrimaria: varchar("corPrimaria", { length: 20 }).default("#4F46E5"),
  corSecundaria: varchar("corSecundaria", { length: 20 }).default("#10B981"),
  shareLink: varchar("shareLink", { length: 50 }).unique(),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type App = typeof apps.$inferSelect;
export type InsertApp = typeof apps.$inferInsert;

// ==================== MÓDULOS DO APP ====================
export const appModulos = pgTable("app_modulos", {
  id: serial("id").primaryKey(),
  appId: integer("appId").references(() => apps.id).notNull(),
  moduloKey: varchar("moduloKey", { length: 50 }).notNull(),
  titulo: varchar("titulo", { length: 100 }).notNull(),
  icone: varchar("icone", { length: 50 }),
  cor: varchar("cor", { length: 50 }),
  bgCor: varchar("bgCor", { length: 100 }),
  ordem: integer("ordem").default(0),
  habilitado: boolean("habilitado").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppModulo = typeof appModulos.$inferSelect;
export type InsertAppModulo = typeof appModulos.$inferInsert;


// ==================== TEMPLATES DE CHECKLIST ====================
export const checklistTemplates = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  categoria: varchar("categoria", { length: 100 }),
  icone: varchar("icone", { length: 50 }),
  cor: varchar("cor", { length: 20 }),
  isPadrao: boolean("isPadrao").default(false),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof checklistTemplates.$inferInsert;

// ==================== ITENS DE TEMPLATES DE CHECKLIST ====================
export const checklistTemplateItens = pgTable("checklist_template_itens", {
  id: serial("id").primaryKey(),
  templateId: integer("templateId").references(() => checklistTemplates.id).notNull(),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistTemplateItem = typeof checklistTemplateItens.$inferSelect;
export type InsertChecklistTemplateItem = typeof checklistTemplateItens.$inferInsert;


// ==================== VALORES SALVOS (Responsáveis, Categorias, Tipos, Fornecedores) ====================
export const valoresSalvos = pgTable("valores_salvos", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  tipo: valoresSalvosTipoEnum("tipo").notNull(),
  valor: varchar("valor", { length: 255 }).notNull(),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ValorSalvo = typeof valoresSalvos.$inferSelect;
export type InsertValorSalvo = typeof valoresSalvos.$inferInsert;


// ==================== ORDENS DE SERVIÇO ====================

// Categorias de OS (personalizáveis)
export const osCategorias = pgTable("os_categorias", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  icone: varchar("icone", { length: 50 }),
  cor: varchar("cor", { length: 20 }),
  isPadrao: boolean("isPadrao").default(false),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsCategoria = typeof osCategorias.$inferSelect;
export type InsertOsCategoria = typeof osCategorias.$inferInsert;

// Prioridades de OS (personalizáveis)
export const osPrioridades = pgTable("os_prioridades", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  nivel: integer("nivel").default(1), // 1=baixa, 2=normal, 3=alta, 4=urgente
  cor: varchar("cor", { length: 20 }),
  icone: varchar("icone", { length: 50 }),
  isPadrao: boolean("isPadrao").default(false),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsPrioridade = typeof osPrioridades.$inferSelect;
export type InsertOsPrioridade = typeof osPrioridades.$inferInsert;

// Status de OS (personalizáveis)
export const osStatus = pgTable("os_status", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }),
  icone: varchar("icone", { length: 50 }),
  ordem: integer("ordem").default(0),
  isFinal: boolean("isFinal").default(false), // Se é status final (concluída/cancelada)
  isPadrao: boolean("isPadrao").default(false),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsStatus = typeof osStatus.$inferSelect;
export type InsertOsStatus = typeof osStatus.$inferInsert;

// Setores de OS (personalizáveis)
export const osSetores = pgTable("os_setores", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsSetor = typeof osSetores.$inferSelect;
export type InsertOsSetor = typeof osSetores.$inferInsert;

// Configurações de OS por condomínio
export const osConfiguracoes = pgTable("os_configuracoes", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull().unique(),
  habilitarOrcamentos: boolean("habilitarOrcamentos").default(true),
  habilitarAprovacaoOrcamento: boolean("habilitarAprovacaoOrcamento").default(true),
  habilitarGestaoFinanceira: boolean("habilitarGestaoFinanceira").default(true),
  habilitarRelatoriosGastos: boolean("habilitarRelatoriosGastos").default(true),
  habilitarVinculoManutencao: boolean("habilitarVinculoManutencao").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsConfiguracao = typeof osConfiguracoes.$inferSelect;
export type InsertOsConfiguracao = typeof osConfiguracoes.$inferInsert;

// Tabela principal de Ordens de Serviço
export const ordensServico = pgTable("ordens_servico", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  
  // Relacionamentos com tabelas personalizáveis
  categoriaId: integer("categoriaId").references(() => osCategorias.id),
  prioridadeId: integer("prioridadeId").references(() => osPrioridades.id),
  statusId: integer("statusId").references(() => osStatus.id),
  setorId: integer("setorId").references(() => osSetores.id),
  
  // Localização
  endereco: text("endereco"),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  localizacaoDescricao: varchar("localizacaoDescricao", { length: 255 }),
  
  // Tempo estimado (em minutos totais)
  tempoEstimadoDias: integer("tempoEstimadoDias").default(0),
  tempoEstimadoHoras: integer("tempoEstimadoHoras").default(0),
  tempoEstimadoMinutos: integer("tempoEstimadoMinutos").default(0),
  
  // Controle de tempo real
  dataInicio: timestamp("dataInicio"),
  dataFim: timestamp("dataFim"),
  tempoDecorridoMinutos: integer("tempoDecorridoMinutos"),
  
  // Financeiro
  valorEstimado: decimal("valorEstimado", { precision: 10, scale: 2 }),
  valorReal: decimal("valorReal", { precision: 10, scale: 2 }),
  
  // Vínculo com manutenção
  manutencaoId: integer("manutencaoId").references(() => manutencoes.id),
  
  // Chat
  chatToken: varchar("chatToken", { length: 64 }).unique(),
  chatAtivo: boolean("chatAtivo").default(true),
  
  // Responsável Principal (ID sem foreign key para evitar referência circular)
  responsavelPrincipalId: integer("responsavelPrincipalId"),
  responsavelPrincipalNome: varchar("responsavelPrincipalNome", { length: 255 }),
  
  // Solicitante
  solicitanteId: integer("solicitanteId").references(() => users.id),
  solicitanteNome: varchar("solicitanteNome", { length: 255 }),
  solicitanteTipo: solicitanteTipoEnum("solicitanteTipo").default("sindico"),
  
  // Compartilhamento
  shareToken: varchar("shareToken", { length: 64 }).unique(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

// Responsáveis da OS
export const osResponsaveis = pgTable("os_responsaveis", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id),
  principal: boolean("principal").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OsResponsavel = typeof osResponsaveis.$inferSelect;
export type InsertOsResponsavel = typeof osResponsaveis.$inferInsert;

// Materiais da OS
export const osMateriais = pgTable("os_materiais", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  quantidade: integer("quantidade").default(1),
  unidade: varchar("unidade", { length: 20 }),
  emEstoque: boolean("emEstoque").default(false),
  precisaPedir: boolean("precisaPedir").default(false),
  pedidoDescricao: text("pedidoDescricao"),
  valorUnitario: decimal("valorUnitario", { precision: 10, scale: 2 }),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsMaterial = typeof osMateriais.$inferSelect;
export type InsertOsMaterial = typeof osMateriais.$inferInsert;

// Orçamentos da OS
export const osOrcamentos = pgTable("os_orcamentos", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  fornecedor: varchar("fornecedor", { length: 255 }),
  descricao: text("descricao"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataOrcamento: timestamp("dataOrcamento").defaultNow(),
  dataValidade: timestamp("dataValidade"),
  aprovado: boolean("aprovado").default(false),
  aprovadoPor: integer("aprovadoPor").references(() => users.id),
  dataAprovacao: timestamp("dataAprovacao"),
  motivoRejeicao: text("motivoRejeicao"),
  anexoUrl: text("anexoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OsOrcamento = typeof osOrcamentos.$inferSelect;
export type InsertOsOrcamento = typeof osOrcamentos.$inferInsert;

// Timeline/Histórico da OS
export const osTimeline = pgTable("os_timeline", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  tipo: osTimelineTipoEnum("tipo").notNull(),
  descricao: text("descricao"),
  usuarioId: integer("usuarioId").references(() => users.id),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  dadosAnteriores: json("dadosAnteriores"),
  dadosNovos: json("dadosNovos"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OsTimeline = typeof osTimeline.$inferSelect;
export type InsertOsTimeline = typeof osTimeline.$inferInsert;

// Chat da OS
export const osChat = pgTable("os_chat", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  remetenteId: integer("remetenteId").references(() => users.id),
  remetenteNome: varchar("remetenteNome", { length: 255 }).notNull(),
  remetenteTipo: remetenteTipoEnum("remetenteTipo").default("visitante"),
  mensagem: text("mensagem"),
  anexoUrl: text("anexoUrl"),
  anexoNome: varchar("anexoNome", { length: 255 }),
  anexoTipo: varchar("anexoTipo", { length: 100 }),
  anexoTamanho: integer("anexoTamanho"),
  lida: boolean("lida").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OsChat = typeof osChat.$inferSelect;
export type InsertOsChat = typeof osChat.$inferInsert;

// Imagens da OS
export const osImagens = pgTable("os_imagens", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  url: text("url").notNull(),
  tipo: osImagensTipoEnum("tipo").default("outro"),
  descricao: varchar("descricao", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Tipos para osImagens
export type OsImagem = typeof osImagens.$inferSelect;
export type InsertOsImagem = typeof osImagens.$inferInsert;



// ==================== FUNÇÕES RÁPIDAS ====================
export const funcoesRapidas = pgTable("funcoes_rapidas", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  funcaoId: varchar("funcaoId", { length: 100 }).notNull(), // ID da função (ex: "avisos", "eventos", etc.)
  nome: varchar("nome", { length: 255 }).notNull(), // Nome da função
  path: varchar("path", { length: 255 }).notNull(), // Caminho/rota da função
  icone: varchar("icone", { length: 100 }).notNull(), // Nome do ícone Lucide
  cor: varchar("cor", { length: 20 }).notNull(), // Cor em hex (ex: "#EF4444")
  ordem: integer("ordem").default(0).notNull(), // Ordem de exibição (0-11)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FuncaoRapida = typeof funcoesRapidas.$inferSelect;
export type InsertFuncaoRapida = typeof funcoesRapidas.$inferInsert;


// ==================== INSCRIÇÕES PARA RECEBER REVISTA ====================
export const inscricoesRevista = pgTable("inscricoes_revista", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  revistaId: integer("revistaId").references(() => revistas.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  unidade: varchar("unidade", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  status: inscricoesRevistaStatusEnum("status").default("pendente").notNull(),
  ativadoPor: integer("ativadoPor").references(() => users.id),
  dataAtivacao: timestamp("dataAtivacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type InscricaoRevista = typeof inscricoesRevista.$inferSelect;
export type InsertInscricaoRevista = typeof inscricoesRevista.$inferInsert;


// ==================== TAREFAS SIMPLES ====================
// Sistema de registro rápido para vistorias, manutenções, ocorrências e antes/depois
export const tarefasSimples = pgTable("tarefas_simples", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  userId: integer("userId").references(() => users.id),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id),
  
  // Tipo da tarefa
  tipo: tarefasSimplesTipoEnum("tipo").notNull(),
  
  // Dados principais
  protocolo: varchar("protocolo", { length: 50 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }),
  descricao: text("descricao"),
  local: varchar("local", { length: 255 }),
  
  // Imagens (JSON array de objetos com URL e legenda opcional)
  // Compatível com formato antigo (string[]) - o backend normaliza para o novo formato
  imagens: json("imagens").$type<{ url: string; legenda?: string }[]>(),
  
  // Itens do checklist (JSON array de objetos)
  itensChecklist: json("itensChecklist").$type<{ id: string; titulo: string; concluido: boolean; temProblema: boolean; problema?: { titulo: string; descricao: string; imagens: string[]; } }[]>(),
  
  // Localização automática
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  endereco: text("endereco"),
  
  // Status personalizado pelo usuário
  statusPersonalizado: varchar("statusPersonalizado", { length: 100 }),
  
  // Prioridade e Responsável
  prioridade: prioridadeEnum("prioridade").default("media"),
  responsavelId: integer("responsavelId").references(() => membrosEquipe.id),
  
  // Campos extras para manutenção
  prazoConclusao: timestamp("prazoConclusao"),
  custoEstimado: varchar("custoEstimado", { length: 50 }),
  nivelUrgencia: nivelUrgenciaEnum("nivelUrgencia"),
  anexos: json("anexos").$type<{ nome: string; url: string }[]>(),
  qrcode: varchar("qrcode", { length: 500 }),
  assinaturaTecnico: text("assinaturaTecnico"),
  assinaturaSolicitante: text("assinaturaSolicitante"),
  
  // Controle de envio
  status: tarefasSimplesStatusEnum("status").default("rascunho").notNull(),
  enviadoEm: timestamp("enviadoEm"),
  concluidoEm: timestamp("concluidoEm"),
  
  // Metadados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TarefaSimples = typeof tarefasSimples.$inferSelect;
export type InsertTarefaSimples = typeof tarefasSimples.$inferInsert;

// ==================== STATUS PERSONALIZADOS ====================
// Permite ao usuário criar seus próprios status para as tarefas
export const statusPersonalizados = pgTable("status_personalizados", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  userId: integer("userId").references(() => users.id),
  
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#F97316"), // Laranja premium padrão
  icone: varchar("icone", { length: 50 }),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StatusPersonalizado = typeof statusPersonalizados.$inferSelect;
export type InsertStatusPersonalizado = typeof statusPersonalizados.$inferInsert;

// ==================== TEMPLATES DE CAMPOS RÁPIDOS ====================
// Permite ao usuário salvar valores frequentes para reutilização
export const camposRapidosTemplates = pgTable("campos_rapidos_templates", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  userId: integer("userId").references(() => users.id),
  
  // Tipo do campo: titulo, descricao, local, etc.
  tipoCampo: tipoCampoEnum("tipoCampo").notNull(),
  
  // Tipo da tarefa (opcional - para filtrar por contexto)
  tipoTarefa: tarefasSimplesTipoEnum("tipoTarefa"),
  
  // Valor salvo
  valor: text("valor").notNull(),
  
  // Nome amigável para identificação
  nome: varchar("nome", { length: 100 }),
  
  // Controle de uso
  vezesUsado: integer("vezesUsado").default(0),
  ultimoUso: timestamp("ultimoUso"),
  favorito: boolean("favorito").default(false),
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CampoRapidoTemplate = typeof camposRapidosTemplates.$inferSelect;
export type InsertCampoRapidoTemplate = typeof camposRapidosTemplates.$inferInsert;


// ==================== SISTEMA DE ACESSO AOS APPS ====================

// Códigos de acesso para apps (acesso rápido sem email/senha)
export const appCodigosAcesso = pgTable("app_codigos_acesso", {
  id: serial("id").primaryKey(),
  appId: integer("appId").references(() => apps.id).notNull(),
  
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descricao: varchar("descricao", { length: 255 }),
  
  // Controle de validade
  ativo: boolean("ativo").default(true),
  validoAte: timestamp("validoAte"), // null = sem expiração
  
  // Permissões do código
  permissao: permissaoEnum("permissao").default("visualizar"),
  
  // Estatísticas
  vezesUsado: integer("vezesUsado").default(0),
  ultimoUso: timestamp("ultimoUso"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AppCodigoAcesso = typeof appCodigosAcesso.$inferSelect;
export type InsertAppCodigoAcesso = typeof appCodigosAcesso.$inferInsert;

// Utilizadores de apps (acesso com email/senha)
export const appUsuarios = pgTable("app_usuarios", {
  id: serial("id").primaryKey(),
  appId: integer("appId").references(() => apps.id).notNull(),
  
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  senhaHash: varchar("senhaHash", { length: 255 }).notNull(),
  
  // Permissões
  permissao: permissaoEnum("permissao").default("visualizar"),
  
  // Controle de conta
  ativo: boolean("ativo").default(true),
  emailVerificado: boolean("emailVerificado").default(false),
  
  // Recuperação de senha
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpira: timestamp("resetTokenExpira"),
  
  // Estatísticas
  ultimoAcesso: timestamp("ultimoAcesso"),
  vezesAcesso: integer("vezesAcesso").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AppUsuario = typeof appUsuarios.$inferSelect;
export type InsertAppUsuario = typeof appUsuarios.$inferInsert;

// Sessões de acesso aos apps
export const appSessoes = pgTable("app_sessoes", {
  id: serial("id").primaryKey(),
  appId: integer("appId").references(() => apps.id).notNull(),
  
  // Pode ser vinculado a um usuário OU a um código de acesso
  usuarioId: integer("usuarioId").references(() => appUsuarios.id),
  codigoAcessoId: integer("codigoAcessoId").references(() => appCodigosAcesso.id),
  
  token: varchar("token", { length: 255 }).notNull().unique(),
  
  // Informações da sessão
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  
  // Controle de validade
  expiraEm: timestamp("expiraEm").notNull(),
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppSessao = typeof appSessoes.$inferSelect;
export type InsertAppSessao = typeof appSessoes.$inferInsert;

// Log de acessos aos apps (para auditoria)
export const appAcessosLog = pgTable("app_acessos_log", {
  id: serial("id").primaryKey(),
  appId: integer("appId").references(() => apps.id).notNull(),
  
  // Quem acessou
  usuarioId: integer("usuarioId").references(() => appUsuarios.id),
  codigoAcessoId: integer("codigoAcessoId").references(() => appCodigosAcesso.id),
  
  // Tipo de acesso
  tipoAcesso: appAcessosLogTipoAcessoEnum("tipoAcesso").notNull(),
  
  // Informações do acesso
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  sucesso: boolean("sucesso").default(true),
  motivoFalha: varchar("motivoFalha", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppAcessoLog = typeof appAcessosLog.$inferSelect;
export type InsertAppAcessoLog = typeof appAcessosLog.$inferInsert;


// ==================== ADMIN LOGS ====================
// Log de atividades administrativas (auditoria)
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  
  // Quem realizou a ação
  adminId: integer("adminId").references(() => users.id).notNull(),
  adminNome: varchar("adminNome", { length: 255 }),
  adminEmail: varchar("adminEmail", { length: 320 }),
  
  // Tipo de ação
  acao: acaoEnum("acao").notNull(),
  
  // Entidade afetada
  entidade: entidadeEnum("entidade").notNull(),
  entidadeId: integer("entidadeId"),
  entidadeNome: varchar("entidadeNome", { length: 255 }),
  
  // Detalhes da alteração (JSON com antes/depois)
  detalhes: text("detalhes"),
  
  // Informações da sessão
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;


// ==================== HISTÓRICO DE ATIVIDADES ====================
// Histórico unificado para todas as funções operacionais e ordens de serviço
export const historicoAtividades = pgTable("historico_atividades", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  
  // Tipo de entidade (vistoria, manutencao, ocorrencia, ordem_servico, checklist, antes_depois)
  entidadeTipo: entidadeTipoEnum("entidadeTipo").notNull(),
  entidadeId: integer("entidadeId").notNull(),
  entidadeProtocolo: varchar("entidadeProtocolo", { length: 50 }),
  entidadeTitulo: varchar("entidadeTitulo", { length: 255 }),
  
  // Tipo de ação realizada
  acao: historicoAtividadesAcaoEnum("acao").notNull(),
  
  // Detalhes da alteração
  descricao: text("descricao"),
  valorAnterior: text("valorAnterior"),
  valorNovo: text("valorNovo"),
  
  // Quem realizou a ação
  usuarioId: integer("usuarioId").references(() => users.id),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  
  // Metadados adicionais (JSON)
  metadados: text("metadados"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoAtividade = typeof historicoAtividades.$inferSelect;
export type InsertHistoricoAtividade = typeof historicoAtividades.$inferInsert;


// ==================== COMPARTILHAMENTOS COM EQUIPE ====================
// Regista compartilhamentos de itens com membros da equipe
export const compartilhamentosEquipe = pgTable("compartilhamentos_equipe", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  
  // Quem compartilhou
  remetenteId: integer("remetenteId").references(() => users.id),
  remetenteNome: varchar("remetenteNome", { length: 255 }),
  
  // Destinatário (membro da equipe)
  destinatarioId: integer("destinatarioId").references(() => membrosEquipe.id).notNull(),
  destinatarioNome: varchar("destinatarioNome", { length: 255 }),
  destinatarioEmail: varchar("destinatarioEmail", { length: 320 }),
  destinatarioTelefone: varchar("destinatarioTelefone", { length: 20 }),
  
  // Item compartilhado
  tipoItem: compartilhamentosEquipeTipoItemEnum("tipoItem").notNull(),
  itemId: integer("itemId").notNull(),
  itemProtocolo: varchar("itemProtocolo", { length: 50 }),
  itemTitulo: varchar("itemTitulo", { length: 255 }),
  
  // Token único para acesso
  token: varchar("token", { length: 64 }).notNull().unique(),
  
  // Canal de envio
  canalEnvio: canalEnvioEnum("canalEnvio").default("email"),
  
  // Status
  emailEnviado: boolean("emailEnviado").default(false),
  whatsappEnviado: boolean("whatsappEnviado").default(false),
  
  // Mensagem personalizada
  mensagem: text("mensagem"),
  
  // Validade
  expiraEm: timestamp("expiraEm"),
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompartilhamentoEquipe = typeof compartilhamentosEquipe.$inferSelect;
export type InsertCompartilhamentoEquipe = typeof compartilhamentosEquipe.$inferInsert;

// ==================== VISUALIZAÇÕES DE COMPARTILHAMENTOS ====================
// Regista quando um destinatário visualiza o item compartilhado
export const compartilhamentoVisualizacoes = pgTable("compartilhamento_visualizacoes", {
  id: serial("id").primaryKey(),
  compartilhamentoId: integer("compartilhamentoId").references(() => compartilhamentosEquipe.id).notNull(),
  
  // Data/hora da visualização
  dataVisualizacao: timestamp("dataVisualizacao").defaultNow().notNull(),
  
  // Informações do dispositivo
  ip: varchar("ip", { length: 45 }), // Suporta IPv6
  userAgent: text("userAgent"),
  dispositivo: varchar("dispositivo", { length: 100 }),
  navegador: varchar("navegador", { length: 100 }),
  sistemaOperacional: varchar("sistemaOperacional", { length: 100 }),
  
  // Duração da visualização (em segundos)
  duracaoSegundos: integer("duracaoSegundos"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompartilhamentoVisualizacao = typeof compartilhamentoVisualizacoes.$inferSelect;
export type InsertCompartilhamentoVisualizacao = typeof compartilhamentoVisualizacoes.$inferInsert;

// ==================== NOTIFICAÇÕES DE VISUALIZAÇÃO ====================
// Notificações enviadas ao remetente quando o destinatário visualiza
export const notificacoesVisualizacao = pgTable("notificacoes_visualizacao", {
  id: serial("id").primaryKey(),
  compartilhamentoId: integer("compartilhamentoId").references(() => compartilhamentosEquipe.id).notNull(),
  visualizacaoId: integer("visualizacaoId").references(() => compartilhamentoVisualizacoes.id).notNull(),
  
  // Destinatário da notificação (remetente original)
  usuarioId: integer("usuarioId").references(() => users.id).notNull(),
  
  // Status
  lida: boolean("lida").default(false),
  lidaEm: timestamp("lidaEm"),
  
  // Email de notificação
  emailEnviado: boolean("emailEnviado").default(false),
  emailEnviadoEm: timestamp("emailEnviadoEm"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificacaoVisualizacao = typeof notificacoesVisualizacao.$inferSelect;
export type InsertNotificacaoVisualizacao = typeof notificacoesVisualizacao.$inferInsert;


// ==================== TIMELINE - CONFIGURAÇÕES ====================

// Responsáveis da Timeline
export const timelineResponsaveis = pgTable("timeline_responsaveis", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineResponsavel = typeof timelineResponsaveis.$inferSelect;
export type InsertTimelineResponsavel = typeof timelineResponsaveis.$inferInsert;

// Locais/Itens da Timeline
export const timelineLocais = pgTable("timeline_locais", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineLocal = typeof timelineLocais.$inferSelect;
export type InsertTimelineLocal = typeof timelineLocais.$inferInsert;

// Status da Timeline
export const timelineStatus = pgTable("timeline_status", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#6B7280"),
  icone: varchar("icone", { length: 50 }).default("Circle"),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineStatusConfig = typeof timelineStatus.$inferSelect;
export type InsertTimelineStatusConfig = typeof timelineStatus.$inferInsert;

// Prioridades da Timeline
export const timelinePrioridades = pgTable("timeline_prioridades", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#6B7280"),
  icone: varchar("icone", { length: 50 }).default("Minus"),
  nivel: integer("nivel").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelinePrioridade = typeof timelinePrioridades.$inferSelect;
export type InsertTimelinePrioridade = typeof timelinePrioridades.$inferInsert;

// Títulos predefinidos da Timeline
export const timelineTitulos = pgTable("timeline_titulos", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricaoPadrao: text("descricaoPadrao"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineTitulo = typeof timelineTitulos.$inferSelect;
export type InsertTimelineTitulo = typeof timelineTitulos.$inferInsert;

// ==================== TIMELINE - REGISTOS PRINCIPAIS ====================

export const timelines = pgTable("timelines", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").notNull(),
  protocolo: varchar("protocolo", { length: 50 }).notNull(),
  
  // Campos obrigatórios
  responsavelId: integer("responsavelId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  
  // Campos opcionais
  localId: integer("localId"),
  statusId: integer("statusId"),
  prioridadeId: integer("prioridadeId"),
  tituloPredefId: integer("tituloPredefId"),
  descricao: text("descricao"),
  
  // Registo automático
  dataRegistro: timestamp("dataRegistro").defaultNow().notNull(),
  horaRegistro: varchar("horaRegistro", { length: 10 }),
  localizacaoGps: varchar("localizacaoGps", { length: 100 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  
  // Estado do registo
  estado: estadoEnum("estado").default("rascunho"),
  
  // Categorização do andamento
  categorizacao: categorizacaoEnum("categorizacao").default("recebido"),
  
  // Token para link público
  tokenPublico: varchar("tokenPublico", { length: 64 }).unique(),
  
  // Permissão padrão para quem acessa via link público
  permissaoPublica: permissaoPublicaEnum("permissaoPublica").default("visualizar"),
  
  // Membros da equipe associados a esta timeline (JSON array)
  membrosAssociados: text("membrosAssociados"),
  
  // Metadados
  criadoPor: integer("criadoPor"),
  criadoPorNome: varchar("criadoPorNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Timeline = typeof timelines.$inferSelect;
export type InsertTimeline = typeof timelines.$inferInsert;

// ==================== TIMELINE - IMAGENS ====================

export const timelineImagens = pgTable("timeline_imagens", {
  id: serial("id").primaryKey(),
  timelineId: integer("timelineId").notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineImagem = typeof timelineImagens.$inferSelect;
export type InsertTimelineImagem = typeof timelineImagens.$inferInsert;

// ==================== TIMELINE - EVENTOS/HISTÓRICO ====================

export const timelineEventos = pgTable("timeline_eventos", {
  id: serial("id").primaryKey(),
  timelineId: integer("timelineId").notNull(),
  tipo: timelineEventosTipoEnum("tipo").default("comentario"),
  descricao: text("descricao"),
  usuarioId: integer("usuarioId"),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  dadosAnteriores: text("dadosAnteriores"),
  dadosNovos: text("dadosNovos"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineEvento = typeof timelineEventos.$inferSelect;
export type InsertTimelineEvento = typeof timelineEventos.$inferInsert;

// ==================== TIMELINE - COMPARTILHAMENTOS ====================

export const timelineCompartilhamentos = pgTable("timeline_compartilhamentos", {
  id: serial("id").primaryKey(),
  timelineId: integer("timelineId").notNull(),
  membroEquipeId: integer("membroEquipeId"),
  membroNome: varchar("membroNome", { length: 255 }),
  membroEmail: varchar("membroEmail", { length: 320 }),
  membroTelefone: varchar("membroTelefone", { length: 20 }),
  canalEnvio: canalEnvioEnum("canalEnvio").default("email"),
  permissao: permissaoPublicaEnum("permissao").default("visualizar"),
  visualizado: boolean("visualizado").default(false),
  dataVisualizacao: timestamp("dataVisualizacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineCompartilhamento = typeof timelineCompartilhamentos.$inferSelect;
export type InsertTimelineCompartilhamento = typeof timelineCompartilhamentos.$inferInsert;

// ==================== TIMELINE - CHAT ====================

export const timelineChat = pgTable("timeline_chat", {
  id: serial("id").primaryKey(),
  timelineId: integer("timelineId").notNull(),
  autorNome: varchar("autorNome", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  categorizacaoNoMomento: varchar("categorizacaoNoMomento", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineChat = typeof timelineChat.$inferSelect;
export type InsertTimelineChat = typeof timelineChat.$inferInsert;

// ==================== TIMELINE - CONFIGURAÇÕES DE NOTIFICAÇÕES ====================

export const timelineNotificacoesConfig = pgTable("timeline_notificacoes_config", {
  id: serial("id").primaryKey(),
  timelineId: integer("timelineId").notNull(),
  // Destinatários
  notificarResponsavel: boolean("notificarResponsavel").default(true),
  notificarCriador: boolean("notificarCriador").default(true),
  emailsAdicionais: text("emailsAdicionais"), // JSON array de emails
  // Eventos que disparam notificação
  notificarMudancaStatus: boolean("notificarMudancaStatus").default(true),
  notificarAtualizacao: boolean("notificarAtualizacao").default(true),
  notificarNovaImagem: boolean("notificarNovaImagem").default(false),
  notificarComentario: boolean("notificarComentario").default(true),
  notificarCompartilhamento: boolean("notificarCompartilhamento").default(false),
  // Configurações
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TimelineNotificacoesConfig = typeof timelineNotificacoesConfig.$inferSelect;
export type InsertTimelineNotificacoesConfig = typeof timelineNotificacoesConfig.$inferInsert;

// ==================== TIMELINE - HISTÓRICO DE NOTIFICAÇÕES ====================

export const timelineNotificacoesHistorico = pgTable("timeline_notificacoes_historico", {
  id: serial("id").primaryKey(),
  timelineId: integer("timelineId").notNull(),
  tipoEvento: tipoEventoEnum("tipoEvento").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 100 }),
  statusNovo: varchar("statusNovo", { length: 100 }),
  descricaoEvento: text("descricaoEvento"),
  // Destinatários
  emailsEnviados: text("emailsEnviados"), // JSON array de emails
  totalEnviados: integer("totalEnviados").default(0),
  // Status do envio
  enviado: boolean("enviado").default(false),
  erroEnvio: text("erroEnvio"),
  // Quem disparou
  usuarioId: integer("usuarioId"),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelineNotificacoesHistorico = typeof timelineNotificacoesHistorico.$inferSelect;
export type InsertTimelineNotificacoesHistorico = typeof timelineNotificacoesHistorico.$inferInsert;

// ==================== ANEXOS DE ORDENS DE SERVIÇO ====================
export const osAnexos = pgTable("os_anexos", {
  id: serial("id").primaryKey(),
  ordemServicoId: integer("ordemServicoId").references(() => ordensServico.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  nomeOriginal: varchar("nomeOriginal", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipo: osAnexosTipoEnum("tipo").default("outro").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  tamanho: integer("tamanho"), // em bytes
  descricao: text("descricao"),
  uploadPor: integer("uploadPor").references(() => users.id),
  uploadPorNome: varchar("uploadPorNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OsAnexo = typeof osAnexos.$inferSelect;
export type InsertOsAnexo = typeof osAnexos.$inferInsert;

// ==================== PREFERÊNCIAS DE LAYOUT ====================
export const preferenciasLayout = pgTable("preferencias_layout", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  
  // Tema de cores
  tema: temaEnum("tema").default("laranja").notNull(),
  
  // Tipo de layout
  layout: layoutEnum("layout").default("classico").notNull(),
  
  // Modo escuro/claro
  modoEscuro: boolean("modoEscuro").default(false),
  
  // Tamanho da fonte
  tamanhoFonte: tamanhoFonteEnum("tamanhoFonte").default("medio"),
  
  // Sidebar expandida ou recolhida por padrão
  sidebarExpandida: boolean("sidebarExpandida").default(true),
  
  // Tema personalizado (se definido, sobrescreve o tema padrão)
  temaPersonalizadoId: integer("temaPersonalizadoId"),
  usarTemaPersonalizado: boolean("usarTemaPersonalizado").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PreferenciaLayout = typeof preferenciasLayout.$inferSelect;
export type InsertPreferenciaLayout = typeof preferenciasLayout.$inferInsert;

// ==================== HISTÓRICO DE TEMAS ====================
export const historicoTemas = pgTable("historico_temas", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  
  // Configurações do tema no momento da alteração
  tema: varchar("tema", { length: 50 }).notNull(),
  layout: varchar("layout", { length: 50 }).notNull(),
  modoEscuro: boolean("modoEscuro").default(false),
  tamanhoFonte: varchar("tamanhoFonte", { length: 20 }).default("medio"),
  
  // Metadados
  descricao: varchar("descricao", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoTema = typeof historicoTemas.$inferSelect;
export type InsertHistoricoTema = typeof historicoTemas.$inferInsert;

// ==================== TEMAS PERSONALIZADOS ====================
export const temasPersonalizados = pgTable("temas_personalizados", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  
  // Identificador único do tema
  slug: varchar("slug", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  
  // Cores personalizadas
  corPrimaria: varchar("corPrimaria", { length: 20 }).notNull(),
  corSecundaria: varchar("corSecundaria", { length: 20 }),
  corFundo: varchar("corFundo", { length: 20 }),
  corTexto: varchar("corTexto", { length: 20 }),
  corAcento: varchar("corAcento", { length: 20 }),
  
  // Configurações adicionais
  modoEscuro: boolean("modoEscuro").default(false),
  
  // Status
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TemaPersonalizado = typeof temasPersonalizados.$inferSelect;
export type InsertTemaPersonalizado = typeof temasPersonalizados.$inferInsert;

// ==================== LEITURA DE MEDIDORES ====================
export const leituraMedidores = pgTable("leitura_medidores", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoMedidor: tipoMedidorEnum("tipoMedidor").default("energia"),
  identificacaoMedidor: varchar("identificacaoMedidor", { length: 100 }),
  leituraAtual: decimal("leituraAtual", { precision: 15, scale: 3 }),
  leituraAnterior: decimal("leituraAnterior", { precision: 15, scale: 3 }),
  consumo: decimal("consumo", { precision: 15, scale: 3 }),
  unidadeMedida: varchar("unidadeMedida", { length: 20 }).default("kWh"),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataLeitura: timestamp("dataLeitura"),
  proximaLeitura: timestamp("proximaLeitura"),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  observacoes: text("observacoes"),
  status: leituraMedidoresStatusEnum("status").default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LeituraMedidor = typeof leituraMedidores.$inferSelect;
export type InsertLeituraMedidor = typeof leituraMedidores.$inferInsert;

// ==================== IMAGENS DE LEITURA DE MEDIDORES ====================
export const leituraMedidorImagens = pgTable("leitura_medidor_imagens", {
  id: serial("id").primaryKey(),
  leituraMedidorId: integer("leituraMedidorId").references(() => leituraMedidores.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeituraMedidorImagem = typeof leituraMedidorImagens.$inferSelect;
export type InsertLeituraMedidorImagem = typeof leituraMedidorImagens.$inferInsert;

// ==================== CONTROLE DE PRAGAS ====================
export const controlePragas = pgTable("controle_pragas", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoServico: tipoServicoEnum("tipoServico").default("dedetizacao"),
  tipoPraga: varchar("tipoPraga", { length: 100 }),
  produtosUtilizados: text("produtosUtilizados"),
  empresaFornecedor: varchar("empresaFornecedor", { length: 255 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataAplicacao: timestamp("dataAplicacao"),
  proximaAplicacao: timestamp("proximaAplicacao"),
  garantiaDias: integer("garantiaDias"),
  custo: decimal("custo", { precision: 10, scale: 2 }),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  observacoes: text("observacoes"),
  status: controlePragasStatusEnum("status").default("agendada").notNull(),
  prioridade: prioridadeEnum("prioridade").default("media"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ControlePraga = typeof controlePragas.$inferSelect;
export type InsertControlePraga = typeof controlePragas.$inferInsert;

// ==================== IMAGENS DE CONTROLE DE PRAGAS ====================
export const controlePragaImagens = pgTable("controle_praga_imagens", {
  id: serial("id").primaryKey(),
  controlePragaId: integer("controlePragaId").references(() => controlePragas.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ControlePragaImagem = typeof controlePragaImagens.$inferSelect;
export type InsertControlePragaImagem = typeof controlePragaImagens.$inferInsert;

// ==================== JARDINAGEM ====================
export const jardinagem = pgTable("jardinagem", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoServico: jardinagemTipoServicoEnum("tipoServico").default("poda"),
  plantasEspecies: text("plantasEspecies"),
  produtosUtilizados: text("produtosUtilizados"),
  areaMetrosQuadrados: decimal("areaMetrosQuadrados", { precision: 10, scale: 2 }),
  localizacao: varchar("localizacao", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  enderecoGeo: text("enderecoGeo"),
  dataRealizacao: timestamp("dataRealizacao"),
  proximaRealizacao: timestamp("proximaRealizacao"),
  recorrencia: recorrenciaEnum("recorrencia").default("unica"),
  custo: decimal("custo", { precision: 10, scale: 2 }),
  responsavelNome: varchar("responsavelNome", { length: 255 }),
  observacoes: text("observacoes"),
  status: controlePragasStatusEnum("status").default("agendada").notNull(),
  prioridade: prioridadeEnum("prioridade").default("media"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Jardinagem = typeof jardinagem.$inferSelect;
export type InsertJardinagem = typeof jardinagem.$inferInsert;

// ==================== IMAGENS DE JARDINAGEM ====================
export const jardinagemImagens = pgTable("jardinagem_imagens", {
  id: serial("id").primaryKey(),
  jardinagemId: integer("jardinagemId").references(() => jardinagem.id).notNull(),
  url: text("url").notNull(),
  legenda: varchar("legenda", { length: 255 }),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JardinagemImagem = typeof jardinagemImagens.$inferSelect;
export type InsertJardinagemImagem = typeof jardinagemImagens.$inferInsert;

// ==================== CONFIGURAÇÕES FINANCEIRAS (ADMIN) ====================
export const configuracoesFinanceiras = pgTable("configuracoes_financeiras", {
  id: serial("id").primaryKey(),
  
  // PIX
  pixAtivo: boolean("pixAtivo").default(false),
  pixTipoChave: pixTipoChaveEnum("pixTipoChave"),
  pixChave: varchar("pixChave", { length: 255 }),
  pixNomeBeneficiario: varchar("pixNomeBeneficiario", { length: 255 }),
  pixCidade: varchar("pixCidade", { length: 100 }),
  pixQrCodeUrl: text("pixQrCodeUrl"),
  
  // Boleto
  boletoAtivo: boolean("boletoAtivo").default(false),
  boletoInstrucoes: text("boletoInstrucoes"),
  boletoLinkPadrao: text("boletoLinkPadrao"),
  
  // Cartão de Crédito
  cartaoAtivo: boolean("cartaoAtivo").default(false),
  cartaoLinkPagamento: text("cartaoLinkPagamento"),
  cartaoDescricao: text("cartaoDescricao"),
  
  // Nota Fiscal
  notaFiscalAtivo: boolean("notaFiscalAtivo").default(false),
  notaFiscalInstrucoes: text("notaFiscalInstrucoes"),
  notaFiscalEmail: varchar("notaFiscalEmail", { length: 320 }),
  
  // Informações gerais (valor padrão quando não há faixa específica)
  valorMensalidade: decimal("valorMensalidade", { precision: 10, scale: 2 }),
  diaVencimento: integer("diaVencimento").default(10),
  observacoes: text("observacoes"),
  
  // Notificações
  emailNotificacaoCadastro: varchar("emailNotificacaoCadastro", { length: 320 }),
  notificarNovoCadastro: boolean("notificarNovoCadastro").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ConfiguracaoFinanceira = typeof configuracoesFinanceiras.$inferSelect;
export type InsertConfiguracaoFinanceira = typeof configuracoesFinanceiras.$inferInsert;

// ==================== FAIXAS DE PREÇO (BASEADO EM USUÁRIOS) ====================
export const faixasPreco = pgTable("faixas_preco", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(), // Ex: "Plano Básico", "Plano Profissional"
  usuariosMin: integer("usuariosMin").notNull(), // Quantidade mínima de usuários
  usuariosMax: integer("usuariosMax"), // Quantidade máxima (null = ilimitado)
  valorMensal: decimal("valorMensal", { precision: 10, scale: 2 }).notNull(),
  descricao: text("descricao"), // Descrição do plano
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0), // Para ordenação na exibição
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FaixaPreco = typeof faixasPreco.$inferSelect;
export type InsertFaixaPreco = typeof faixasPreco.$inferInsert;

// ==================== CONFIGURAÇÃO DE CAMPOS POR FUNÇÃO ====================
// Permite ao usuário habilitar/desabilitar campos específicos em cada tipo de função
export const userFieldSettings = pgTable("user_field_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  // Tipo: rapida ou completa
  modalType: modalTypeEnum("modalType").notNull(),
  // Função: funções operacionais e financeiras
  functionType: functionTypeEnum("functionType").notNull(),
  // Configuração dos campos como JSON: { "titulo": true, "descricao": true, "local": false, "gps": false, ... }
  fieldsConfig: json("fieldsConfig").$type<Record<string, boolean>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserFieldSettings = typeof userFieldSettings.$inferSelect;
export type InsertUserFieldSettings = typeof userFieldSettings.$inferInsert;

// ==================== MODELOS DE CHECKLIST ====================
// Permite salvar checklists como modelos/templates para reutilização
export const checklistModelos = pgTable("checklist_modelos", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  userId: integer("userId").references(() => users.id),
  
  // Nome do modelo
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  
  // Itens do checklist (JSON array - apenas os títulos dos itens)
  itens: json("itens").$type<{ id: string; titulo: string }[]>().notNull(),
  
  // Metadados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChecklistModelo = typeof checklistModelos.$inferSelect;
export type InsertChecklistModelo = typeof checklistModelos.$inferInsert;

// ==================== FUNÇÕES PERSONALIZADAS ====================
// Permite ao usuário criar funções customizadas com campos selecionáveis
export const funcoesPersonalizadas = pgTable("funcoes_personalizadas", {
  id: serial("id").primaryKey(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  userId: integer("userId").references(() => users.id),
  
  // Identificação da função
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  icone: varchar("icone", { length: 100 }).notNull().default("ClipboardList"),
  cor: varchar("cor", { length: 50 }).notNull().default("#3B82F6"),
  
  // Campos ativos e obrigatórios (JSON)
  // Ex: { "titulo": true, "descricao": true, "local": true, "imagens": true, ... }
  camposAtivos: json("camposAtivos").$type<Record<string, boolean>>().notNull(),
  // Ex: { "titulo": true, "descricao": false, "local": false, ... }
  camposObrigatorios: json("camposObrigatorios").$type<Record<string, boolean>>().notNull(),
  
  // Controle
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0),
  
  // Token público para compartilhamento (QR Code)
  shareToken: varchar("shareToken", { length: 64 }),
  
  // Metadados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FuncaoPersonalizada = typeof funcoesPersonalizadas.$inferSelect;
export type InsertFuncaoPersonalizada = typeof funcoesPersonalizadas.$inferInsert;

// ========== REGISTROS PERSONALIZADOS ==========
export const registrosPersonalizados = pgTable("registros_personalizados", {
  id: serial("id").primaryKey(),
  funcaoId: integer("funcaoId").references(() => funcoesPersonalizadas.id, { onDelete: "cascade" }).notNull(),
  condominioId: integer("condominioId").references(() => condominios.id).notNull(),
  userId: integer("userId").references(() => users.id),
  
  protocolo: varchar("protocolo", { length: 50 }),
  dados: json("dados").$type<Record<string, any>>().notNull(),
  imagens: json("imagens").$type<{ url: string; legenda: string }[]>(),
  checklistItems: json("checklistItems").$type<{ texto: string; checked: boolean }[]>(),
  assinaturas: json("assinaturas").$type<Record<string, string>>(),
  
  status: varchar("status", { length: 50 }).default("aberto"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RegistroPersonalizado = typeof registrosPersonalizados.$inferSelect;
export type InsertRegistroPersonalizado = typeof registrosPersonalizados.$inferInsert;

// ==================== PERMISSÕES DE MÓDULOS POR FUNCIONÁRIO ====================
export const funcionarioPermissoes = pgTable("funcionario_permissoes", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionarioId").references(() => funcionarios.id, { onDelete: "cascade" }).notNull(),
  modulo: varchar("modulo", { length: 50 }).notNull(), // 'funcionarios','equipe','manutencao','qrcode','documentos','agenda','localizacao','vistoria','timeline'
  habilitado: boolean("habilitado").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FuncionarioPermissao = typeof funcionarioPermissoes.$inferSelect;
export type InsertFuncionarioPermissao = typeof funcionarioPermissoes.$inferInsert;

// ==================== TEMPLATES POR SEGMENTO (INFRAESTRUTURA PREPARADA) ====================
export const templatesCategorias = pgTable("templates_categorias", {
  id: serial("id").primaryKey(),
  segmento: varchar("segmento", { length: 100 }).notNull(), // 'academia','condominio','oficina_mecanica','eletricista', etc.
  tipo: varchar("tipo", { length: 50 }).notNull(),           // 'manutencao','vistoria','checklist'
  nome: varchar("nome", { length: 255 }).notNull(),
  campos: json("campos").$type<Record<string, any>>(),
  ativo: boolean("ativo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplateCategoria = typeof templatesCategorias.$inferSelect;
export type InsertTemplateCategoria = typeof templatesCategorias.$inferInsert;
