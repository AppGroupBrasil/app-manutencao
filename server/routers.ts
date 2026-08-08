import { checklistTemplateRouter } from "./modules/checklist/templateRouter";
import { fieldSettingsRouter } from "./modules/configuracao/fieldSettingsRouter";
import { historicoAtividadesRouter } from "./modules/administrativo/historicoRouter";
import { adminUsuariosRouter } from "./modules/administrativo/adminUsuariosRouter";
import { financeiroRouter as adminFinanceiroRouter } from "./modules/administrativo/financeiroRouter";
import { camposRapidosTemplatesRouter } from "./modules/administrativo/camposRapidosRouter";
import { statusPersonalizadosRouter } from "./modules/tarefas/statusRouter";
import { timelineRouter } from "./modules/timeline/router";
import { tarefasSimplesRouter } from "./modules/tarefas/router";
import { checklistModelosRouter } from "./modules/tarefas/checklistModelosRouter";
import { inscricaoRevistaRouter } from "./modules/revista/inscricaoRouter";
import { dicasSegurancaRouter } from "./modules/administrativo/dicasRouter";
import { regrasRouter as regrasAdminRouter } from "./modules/administrativo/regrasRouter";
import { funcoesRapidasRouter } from "./modules/administrativo/funcoesRapidasRouter";
import { relatorioConsolidadoRouter } from "./modules/administrativo/relatorioRouter";
import { valoresSalvosRouter } from "./modules/administrativo/valoresSalvosRouter";
import { funcoesCondominioRouter } from "./modules/administrativo/funcoesRouter";
import { tiposInfracaoRouter, notificacoesInfracaoRouter, respostasInfracaoRouter, relatorioInfracoesRouter } from "./modules/infracao/router";
import { leituraMedidoresRouter } from "./modules/leituraMedidores/router";
import { controlePragasRouter } from "./modules/controlePragas/router";
import { jardinagemRouter } from "./modules/jardinagem/router";
import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { appAcessoRouter } from "./appAcesso";
import { recuperacaoSenhaRouter } from "./recuperacaoSenha";

import { authRouter } from "./modules/auth/router";
import { condominioRouter } from "./modules/condominio/router";
import { osRouter } from "./modules/os/router";
import { destaqueRouter, paginaCustomRouter } from "./modules/comunicacao/destaqueRouter";

import { revistaRouter } from "./modules/revista/router";
import { avisoRouter } from "./modules/aviso/router";
import { funcionarioRouter } from "./modules/funcionario/router";
import { eventoRouter } from "./modules/evento/router";
import { votacaoRouter } from "./modules/votacao/router";
import { classificadoRouter } from "./modules/classificado/router";
import { caronaRouter } from "./modules/social/router";
import { achadoPerdidoRouter, imagemAchadoPerdidoRouter } from "./modules/achadoPerdido/router";
import { appsRouter } from "./modules/app/router";
import { comunicadoRouter } from "./modules/comunicacao/router";
import { albumRouter, fotoRouter } from "./modules/galeria/router";
import { classificadoCrudRouter, moderacaoRouter } from "./modules/classificado/router";
import { anuncianteRouter, anuncioRouter } from "./modules/anuncio/router";
import { vagaEstacionamentoRouter, imagemVagaRouter } from "./modules/estacionamento/router";
import { segurancaRouter, regrasRouter as regrasInstRouter } from "./modules/institucional/router";
import { imagemRealizacaoRouter, imagemMelhoriaRouter, imagemAquisicaoRouter, publicidadeRouter, realizacaoRouter, melhoriaRouter, aquisicaoRouter, antesDepoisRouter } from "./modules/gestao/router";
import { telefoneRouter, linkRouter } from "./modules/utilidade/router";
import { uploadRouter } from "./modules/upload/router";
import { moradorRouter } from "./modules/morador/router";
import { favoritoRouter } from "./modules/preferencia/router";
import { vistoriaRouter } from "./modules/vistoria/router";
import { manutencaoRouter } from "./modules/manutencao/router";
import { ocorrenciaRouter } from "./modules/ocorrencia/router";
import { checklistRouter } from "./modules/checklist/router";
import { painelControloRouter } from "./modules/administrativo/router";
import { equipeRouter } from "./modules/equipe/router";
import { equipesRouter } from "./modules/equipes/router";
import { financeiroRouter } from "./modules/financeiro/router";
import { pushNotificationsRouter, notificacaoRouter, preferenciaNotificacaoRouter } from "./modules/notificacao/router";
import { historicoNotificacoesRouter } from "./modules/notificacao/router";
import { configEmailRouter } from "./modules/administrativo/emailRouter";
import { configPushRouter } from "./modules/administrativo/pushRouter";
import { templatesNotificacaoRouter } from "./modules/notificacao/templateRouter";




import { lembreteRouter } from "./modules/lembrete/router";



import { linkCompartilhavelRouter, itemCompartilhadoRouter, comentarioRouter } from "./modules/compartilhamento/router";
import { funcoesPersonalizadasRouter } from "./modules/funcoesPersonalizadas/router";
import { registrosPersonalizadosRouter } from "./modules/funcoesPersonalizadas/registrosRouter";
import { permissoesRouter } from "./modules/funcionario/permissoesRouter";
import { templatesCategoriasRouter } from "./modules/configuracao/templatesRouter";
import { hierarquiaRouter } from "./modules/hierarquia/router";
import { gestoresRouter } from "./modules/gestores/router";



export const appRouter = router({
  system: systemRouter,
  appAcesso: appAcessoRouter,
  recuperacaoSenha: recuperacaoSenhaRouter,
  
  auth: authRouter,

  // ==================== CONDOMÍNIOS ====================
  condominio: condominioRouter,

    // ==================== REVISTAS ====================
  revista: revistaRouter,

  // ==================== AVISOS ====================
  aviso: avisoRouter,

  // ==================== FUNCIONÁRIOS ====================
  funcionario: funcionarioRouter,

  // ==================== EVENTOS ====================
  evento: eventoRouter,

  // ==================== VOTAÇÕES ====================
  votacao: votacaoRouter,

  // ==================== CLASSIFICADOS ====================
  classificado: classificadoRouter,

  // ==================== CARONAS ====================
  carona: caronaRouter,

  // ==================== ACHADOS E PERDIDOS ====================
  achadoPerdido: achadoPerdidoRouter,

  // ==================== APPS PERSONALIZADOS ====================
  apps: appsRouter,

  // ==================== MORADORES ====================
  morador: moradorRouter,

  // ==================== TELEFONES ÚTEIS ====================
  telefone: telefoneRouter,

  // ==================== LINKS ÚTEIS ====================
  link: linkRouter,

  // ==================== PUBLICIDADE ====================
  publicidade: publicidadeRouter,

  // ==================== UPLOAD DE IMAGENS ====================
  upload: uploadRouter,

  // ==================== NOTIFICAÇÕES ====================
  notificacao: notificacaoRouter,

  // ==================== PREFERÊNCIAS DE NOTIFICAÇÃO ====================
  preferenciaNotificacao: preferenciaNotificacaoRouter,

  // ==================== REALIZAÇÕES ====================
  realizacao: realizacaoRouter,

  // ==================== MELHORIAS ====================
  melhoria: melhoriaRouter,

  // ==================== AQUISIÇÕES ====================
  aquisicao: aquisicaoRouter,

  // ==================== ANTES E DEPOIS ====================
  antesDepois: antesDepoisRouter,



  // ==================== CLASSIFICADOS (CRUD COMPLETO) ====================
  classificadoCrud: classificadoCrudRouter,

  // ==================== ANUNCIANTES ====================
  anunciante: anuncianteRouter,

  // ==================== ANÚCIOS ====================
  anuncio: anuncioRouter,

  // ==================== VAGAS DE ESTACIONAMENTO ====================
  vagaEstacionamento: vagaEstacionamentoRouter,

  // ==================== MODERAÇÃO DE CLASSIFICADOS ====================
  moderacao: moderacaoRouter,

  // ==================== COMUNICADOS ====================
  comunicado: comunicadoRouter,

  // ==================== GALERIA DE FOTOS ====================
  album: albumRouter,

  foto: fotoRouter,

  // ==================== DICAS DE SEGURANÇA ====================
  seguranca: segurancaRouter,

  // ==================== REGRAS E NORMAS ====================
  regras: regrasInstRouter,

  // ==================== IMAGENS DE REALIZAÇÕES ====================
  imagemRealizacao: imagemRealizacaoRouter,

  // ==================== IMAGENS DE MELHORIAS ====================
  imagemMelhoria: imagemMelhoriaRouter,

  // ==================== IMAGENS DE AQUISIÇÕES ====================
  imagemAquisicao: imagemAquisicaoRouter,

  // ==================== IMAGENS DE ACHADOS E PERDIDOS ====================
  imagemAchadoPerdido: imagemAchadoPerdidoRouter,

  // ==================== IMAGENS E ANEXOS DE VAGAS ====================
  imagemVaga: imagemVagaRouter,

  // ==================== FAVORITOS ====================
  favorito: favoritoRouter,

  // ==================== VISTORIAS ====================
  vistoria: vistoriaRouter,

  // ==================== MANUTENÇÕES ====================
  manutencao: manutencaoRouter,

  // ==================== OCORRÊNCIAS ====================
  ocorrencia: ocorrenciaRouter,

  // ==================== CHECKLISTS ====================
  checklist: checklistRouter,

  // Painel de Controlo - Estatísticas Agregadas
  painelControlo: painelControloRouter,

  // ==================== MEMBROS DA EQUIPE ====================
  membroEquipe: equipeRouter,

  // ==================== EQUIPES (Grupos de Funcionários) ====================
  equipes: equipesRouter,

  // ==================== LINKS COMPARTILHÁVEIS ====================
  linkCompartilhavel: linkCompartilhavelRouter,

  // ==================== ACESSO PÚBLICO A ITENS COMPARTILHADOS ====================
  itemCompartilhado: itemCompartilhadoRouter,

  // ==================== COMENTÁRIOS EM ITENS PARTILHADOS ====================
  comentario: comentarioRouter,

  // ==================== DESTAQUES ====================
  destaque: destaqueRouter,

  // ==================== PÁGINAS 100% PERSONALIZADAS ====================
  paginaCustom: paginaCustomRouter,

  // ==================== AGENDA DE VENCIMENTOS ====================
  vencimentos: financeiroRouter.vencimentos,

  // ==================== E-MAILS DE VENCIMENTOS ====================
  vencimentoEmails: financeiroRouter.vencimentoEmails,

  // ==================== NOTIFICAÇÕES DE VENCIMENTOS ====================
  vencimentoNotificacoes: financeiroRouter.vencimentoNotificacoes,

  // ==================== DISPARO AUTOMÁTICO DE E-MAILS ====================
  alertasAutomaticos: financeiroRouter.alertasAutomaticos,

  // ==================== RELATÓRIO DE VENCIMENTOS EM PDF ====================
  vencimentosRelatorio: financeiroRouter.vencimentosRelatorio,

  // Dashboard de Vencimentos com gráficos
  vencimentosDashboard: financeiroRouter.vencimentosDashboard,

  // ==================== NOTIFICAÇÕES PUSH ====================
  pushNotifications: pushNotificationsRouter,

  // ==================== LEMBRETES AGENDADOS ====================
  lembretes: lembreteRouter,

  // ==================== HISTÓRICO DE NOTIFICAÇÕES ====================
  historicoNotificacoes: historicoNotificacoesRouter,

  // ==================== CONFIGURAÇÕES DE EMAIL ====================
  configEmail: configEmailRouter,
  
  // ==================== CONFIGURAÇÕES PUSH (VAPID) ====================
  configPush: configPushRouter,
  
  // ==================== TEMPLATES DE NOTIFICAÇÃO ====================
  templatesNotificacao: templatesNotificacaoRouter,

  // ==================== TIPOS DE INFRAÇÃO ====================
  tiposInfracao: tiposInfracaoRouter,

  // ==================== NOTIFICAÇÕES DE INFRAÇÃO ====================
  notificacoesInfracao: notificacoesInfracaoRouter,

  // ==================== RESPOSTAS DE INFRAÇÃO (TIMELINE) ====================
  respostasInfracao: respostasInfracaoRouter,
  
  // ==================== RELATÓRIO DE INFRAÇÕES ====================
  relatorioInfracoes: relatorioInfracoesRouter,

  // ==================== FUNÇÕES POR CONDOMÍNIO (ADMIN) ====================
  funcoesCondominio: funcoesCondominioRouter,

  // ==================== VALORES SALVOS ====================
  valoresSalvos: valoresSalvosRouter,

  // Router de Relatório Consolidado Profissional
  relatorioConsolidado: relatorioConsolidadoRouter,

  // ==================== ORDENS DE SERVIÇO ====================
  ordensServico: osRouter,

  // ==================== FUNÇÕES RÁPIDAS ====================
  funcoesRapidas: funcoesRapidasRouter,

  // ==================== REGRA (ALIAS PARA REGRAS) ====================
  regra: regrasAdminRouter,

  // ==================== DICA DE SEGURANÇA (ALIAS) ====================
  dicaSeguranca: dicasSegurancaRouter,

  // ==================== INSCRIÇÃO REVISTA ====================
  inscricaoRevista: inscricaoRevistaRouter,

  // ==================== TAREFAS SIMPLES ====================
  tarefasSimples: tarefasSimplesRouter,

  // ==================== STATUS PERSONALIZADOS ====================
  statusPersonalizados: statusPersonalizadosRouter,

  // ==================== CAMPOS RÁPIDOS TEMPLATES ====================
  // Permite salvar valores frequentes para reutilização nos formulários
  camposRapidosTemplates: camposRapidosTemplatesRouter,

  // ==================== ADMINISTRAÇÃO DE USUÁRIOS ====================
  adminUsuarios: adminUsuariosRouter,

  // ==================== HISTÓRICO DE ATIVIDADES ====================
  historicoAtividades: historicoAtividadesRouter,

  timeline: timelineRouter,

  // ==================== TEMPLATES DE CHECKLIST ====================
  checklistTemplate: checklistTemplateRouter,
  // ==================== MÓDULO FINANCEIRO (VENCIMENTOS) ====================
  financeiro: financeiroRouter,

  // ==================== CONFIG FINANCEIRO (ADMIN - PAGAMENTOS) ====================
  adminFinanceiro: adminFinanceiroRouter,

  // ==================== CONFIGURAÇÃO DE CAMPOS POR FUNÇÃO ====================
  fieldSettings: fieldSettingsRouter,

  // ==================== LEITURA DE MEDIDORES ====================
  leituraMedidores: leituraMedidoresRouter,

  // ==================== CONTROLE DE PRAGAS ====================
  controlePragas: controlePragasRouter,

  // ==================== JARDINAGEM ====================
  jardinagem: jardinagemRouter,

  // ==================== MODELOS DE CHECKLIST ====================
  // Permite salvar checklists como modelos/templates para reutilização
  checklistModelos: checklistModelosRouter,

  // ==================== FUNÇÕES PERSONALIZADAS ====================
  funcoesPersonalizadas: funcoesPersonalizadasRouter,
  registrosPersonalizados: registrosPersonalizadosRouter,

  // ==================== PERMISSÕES DE MÓDULOS POR FUNCIONÁRIO ====================
  permissoes: permissoesRouter,

  // ==================== TEMPLATES POR SEGMENTO ====================
  templatesCategorias: templatesCategoriasRouter,

  // ==================== HIERARQUIA DE USUÁRIOS ====================
  hierarquia: hierarquiaRouter,

  // Gestores das unidades (users + usuario_condominios), com escopo de tenant.
  gestores: gestoresRouter,
});

export type AppRouter = typeof appRouter;
