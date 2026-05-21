# App Manutenção - TODO

## Fase 1: Setup Inicial
- [x] Inicializar projeto com scaffold web-db-user
- [x] Copiar componentes UI do AppSindico
- [x] Configurar tema premium (cores, fontes, sombras)
- [x] Configurar DashboardLayout

## Fase 2: Schema da Base de Dados
- [x] Criar tabela organizacoes (universal, substitui condominios)
- [x] Criar tabelas de Ordens de Serviço (OS)
- [x] Criar tabelas de Vistorias
- [x] Criar tabelas de Manutenções
- [x] Criar tabelas de Ocorrências
- [x] Criar tabelas de Checklists
- [x] Criar tabelas de Vencimentos
- [x] Criar tabelas de Realizações/Melhorias/Aquisições
- [x] Criar tabelas de Revistas
- [x] Criar tabelas de Relatórios

## Fase 3: Módulos Core
- [x] Dashboard principal com estatísticas
- [x] Gestão de Organizações (universal)
- [x] Sistema de Ordens de Serviço completo
- [x] Configurações de OS (categorias, status, prioridades)

## Fase 4: Módulos Operacionais
- [x] Vistorias
- [x] Manutenções preventivas/corretivas
- [x] Ocorrências
- [x] Checklists
- [x] Agenda de Vencimentos

## Fase 5: Módulos de Documentação
- [x] Antes e Depois
- [x] Realizações
- [x] Melhorias
- [x] Aquisições

## Fase 6: Relatórios e Revistas
- [x] Sistema de Relatórios
- [x] Construtor de Relatórios
- [x] Editor de Revistas Digitais
- [x] Visualizador de Revistas
- [x] Exportação PDF

## Fase 7: Personalização
- [x] Configurações do sistema
- [x] Personalização de cores/logo
- [x] Páginas customizadas

## Fase 8: Compatibilidade
- [ ] Configurar para Vercel
- [ ] Integrar Capacitor
- [ ] Testes em mobile

## Bugs Reportados
(nenhum até agora)

## Testes Realizados
- [x] Cadastro de organização (Empresa Teste Manutenção)
- [x] Criação de Ordem de Serviço (#891947)
- [x] Visualização de Checklists
- [x] Sistema de Relatórios com gráficos
- [x] Navegação pelo menu lateral
- [x] Funções rápidas no dashboard

## Notas
- Todas as referências a "condomínio" devem ser substituídas por "organização" (tarefa futura)
- Layout premium consistente em todos os módulos
- Sistema universal para qualquer tipo de organização
- Capacitor será configurado após validação do sistema base

## Fase 9: Personalização da Logo
- [x] Copiar nova logo para pasta public
- [x] Atualizar logo no header
- [x] Atualizar favicon
- [x] Atualizar referências no sidebar/dashboard

## Fase 10: Universalização Completa
- [x] Substituir "condomínio" por "organização" em todos os ficheiros
- [x] Substituir "síndico" por "gestor" em todos os ficheiros
- [x] Substituir "morador" por "equipa" onde aplicável
- [x] Atualizar nome da aplicação de "App Síndico" para "App Manutenção"

## Fase 11: Capacitor
- [ ] Instalar Capacitor
- [ ] Configurar capacitor.config.ts
- [ ] Adicionar plataformas iOS e Android

## Fase 12: Personalização de Cores (Laranja, Branco, Preto)
- [x] Atualizar variáveis CSS no index.css
- [x] Ajustar cor primária para laranja (oklch 0.65 0.2 45)
- [x] Ajustar backgrounds para branco/preto
- [x] Atualizar botões e elementos de destaque
- [x] Testar contraste e legibilidade
- [x] Verificar consistência em todas as páginas
- [x] Atualizar gradientes para tons de laranja

## Fase 13: Redesign da Página Inicial - Manutenção Universal
- [x] Redesenhar hero section com foco em manutenção universal
- [x] Criar secção de setores atendidos (predial, industrial, comercial, hospitalar, escolar, máquinas)
- [x] Adicionar ícones representativos para cada setor
- [x] Atualizar textos e descrições para refletir versatilidade
- [x] Criar secção de funcionalidades principais (OS, Vistorias, Checklists, Relatórios)
- [x] Atualizar título da secção de features
- [x] Testar visual no browser

## Fase 14: Filtro por Setores na Página Inicial
- [ ] Tornar os cards de setores clicáveis/selecionáveis
- [ ] Adicionar estado de seleção visual (borda, cor de fundo)
- [ ] Criar mapeamento de módulos por setor
- [ ] Filtrar lista de funcionalidades baseado no setor selecionado
- [ ] Adicionar opção "Todos os Setores" para mostrar tudo
- [ ] Testar interatividade e responsividade

## Fase 15: Redesign Completo da Página Inicial - Premium
- [x] Criar novo layout premium do zero
- [x] Aplicar cores branco, laranja e preto
- [x] Incluir preço R$99,00 em destaque
- [x] Design moderno e profissional
- [x] Destacar setores atendidos (predial, industrial, comercial, hospitalar, escolar, máquinas)
- [x] Cards de setores com design premium interativo
- [x] Botões "Acessar Plataforma" e "Ver Demonstração" estilizados
- [x] Testar visual no browser

## Fase 16: Redesign Completo da Página Inicial do Zero
- [x] Manter Hero section (título, descrição, preço R$99, botões, card de setores)
- [x] Remover todo conteúdo herdado do template de condomínios
- [x] Criar nova secção de Funcionalidades (8 cards focados em manutenção)
- [x] Criar nova secção de Benefícios (lista + 4 cards)
- [x] Criar secção de Preço com card premium R$99/mês
- [x] Criar CTA final "Pronto para transformar sua gestão?"
- [x] Criar novo Footer simples e profissional
- [x] Header fixo com navegação por âncoras
- [x] Design 100% focado em gestão de manutenção universal

## Fase 17: Limpeza do Menu Lateral do Dashboard
- [x] Remover seção "Interativo / Comunidade" (Votações, Classificados, Achados e Perdidos, Caronas)
- [x] Remover seção "Documentação e Regras" (Regras e Normas, Dicas de Segurança, Links Úteis, Telefones Úteis)
- [x] Remover seção "Publicidade" (Anunciantes, Campanhas)
- [x] Remover seção "Configurações" (Perfil do Usuário, Config. Notificações, Preferências)
- [x] Remover seção "Eventos e Agenda" (Eventos, Reservas)
- [x] Remover "Vagas de Estacionamento" da seção Gestão da Organização
- [x] Mover "Agenda de Vencimentos" para seção Operacional / Manutenção
- [x] Alterar "Moradores" para "Moradores (Exclusivo p/ condomínios)"
- [x] Testar menu lateral no navegador

## Bugs Corrigidos - Fase 17
- [x] Corrigir erro de chave duplicada "revista" no menuSections do Dashboard.tsx

## Fase 18: Limpeza das Funções Rápidas
- [x] Remover "Eventos" das funções rápidas disponíveis
- [x] Remover "Votações" das funções rápidas disponíveis
- [x] Remover "Avisos" das funções rápidas disponíveis
- [x] Remover "Notificações" das funções rápidas disponíveis
- [x] Testar funções rápidas no navegador

## Fase 19: Atualização de Textos - Cadastro de Organização
- [x] Alterar "Meu Condomínio" para "Cadastro de locais e itens para manutenção"
- [x] Alterar botão "Novo Condomínio" para "Novo Local"
- [x] Testar alterações no navegador


## Fase 20: Atualização de Textos dos Cards do Dashboard
- [x] Alterar "Apps Criados" para "App de Manutenção" e "Crie seu app de manutenção personalizado"
- [x] Alterar "Revistas Criadas" para "Livro de Manutenções"
- [x] Alterar descrição de revistas para "Registre todas as manutenções para apresentar aos seus clientes e gestores"
- [x] Testar alterações no navegador


## Fase 21: Atualização da Logo do Dashboard
- [x] Copiar nova logo para pasta public
- [x] Logo já referenciada como /logo-manutencao.png (atualizada)
- [x] Testar alterações no navegador

## Fase 22: Remover Logo Duplicada
- [x] Remover segunda tag img da logo no Dashboard.tsx (desktop e mobile)
- [x] Testar alterações no navegador

## Fase 23: Atualização do Favicon
- [x] Criar favicon a partir da logo de engrenagem
- [x] Configurar favicon no index.html
- [x] Testar alterações no navegador

## Fase 24: Renomear Botão Criar Revista
- [x] Alterar "Criar Revista" para "Criar Livro" no Dashboard.tsx (4 ocorrências)
- [x] Testar alterações no navegador

## Fase 25: Atualizar Modal de Criação de Livro
- [x] Alterar "Criar Nova Revista" para "Criar Livro de Manutenções"
- [x] Alterar "Título da Revista" para "Título do Livro"
- [x] Alterar descrição do modal
- [x] Alterar botão "Criar Livro" para "Criar Livro de Manutenções"
- [x] Testar alterações no navegador

## Fase 26: Limpar Funções do Relatório
- [x] Identificar funções disponíveis no menu do sistema
- [x] Identificar funções listadas no relatório
- [x] Remover funções do relatório que não existem no menu (Avisos, Notificações, Eventos, Votações, Segurança, Comunidade, Áreas, Informações, Publicidade)
- [x] Testar alterações no navegador

## Fase 27: Adicionar Ordens de Serviço ao Relatório
- [x] Adicionar "Ordens de Serviço" ao availableSections
- [x] Testar alterações no navegador

## Fase 28: Universalizar Terminologia - Condomínio para Organização
- [x] Identificar arquivos com referências a "Condomínio" (163 referências em 20 arquivos)
- [x] Substituir referências nos arquivos do frontend (DashboardLayout, Dashboard, CondominioForm, AssistenteCriacao)
- [x] Testar alterações no navegador

## Fase 29: Renomear Revista Digital para Livro de Manutenções
- [x] Alterar "Revista Digital" para "Livro de Manutenções" no DashboardLayout.tsx
- [x] Alterar "Revista Digital" para "Livro de Manutenções" no Dashboard.tsx e AssistenteCriacao.tsx
- [x] Testar alterações no navegador

## Fase 30: Atualizar Passo 3 dos Primeiros Passos
- [x] Alterar "App, revista ou relatório" para "App, livro ou relatório"
- [x] Testar alterações no navegador

## Fase 31: Funções Simples - Sistema de Registro Rápido
### Schema e Backend
- [x] Criar tabela tarefas_simples no schema.ts
- [x] Criar tabela status_personalizados para status customizáveis
- [x] Criar rotas tRPC para CRUD de tarefas simples
- [x] Implementar geração automática de protocolo

### Frontend - Modal de Registro
- [x] Criar componente TarefasSimplesModal.tsx
- [x] Implementar design premium laranja clean
- [x] Campo título com botão "+" para salvar e adicionar
- [x] Upload de imagens (opcional)
- [x] Captura de localização automática GPS
- [x] Geração de protocolo automático
- [x] Campo descrição (opcional)
- [x] Status personalizável pelo usuário
- [x] Botão "Registrar e Adicionar Outra"
- [x] Botão "Enviar" para enviar todos os rascunhos
- [x] Salvamento automático como rascunho

### Frontend - Histórico
- [x] Criar página HistoricoTarefasSimples.tsx
- [x] Listar todas as tarefas simples
- [x] Filtro por tipo (Vistoria, Manutenção, Ocorrência, Antes/Depois)
- [x] Filtro por status
- [x] Visualização de detalhes
### Integração
- [x] Adicionar funções simples ao menu lateral
- [x] Adicionar às funções rápidas disponíveis
- [x] Integrar ao construtor de relatórios

### Exportação
- [x] Criar pasta com arquivos para exportar ao outro sistema
- [x] Documentar instruções de implementação

## Ajustes

- [x] Mover Funções Simples para dentro do menu Operacional/Manutenção existente

- [x] Criar seção separada "Funções Simples" no menu lateral (Opção 2)

- [x] Bug: Seção Funções Simples não aparece no menu publicado - resolvido (problema de cache)


## Fase 32: Integrar Revista Digital de Condomínios
- [ ] Extrair arquivos do ZIP
- [ ] Analisar estrutura dos componentes
- [ ] Integrar ao menu do sistema acima da opção MENU
- [ ] Testar funcionamento


## Fase 33: Botões "+" para Salvar Templates nos Campos
- [x] Criar tabela campos_rapidos_templates no banco de dados
- [x] Criar rotas tRPC para CRUD de templates (listar, criar, usar, toggleFavorito, deletar)
- [x] Atualizar TarefasSimplesModal com componente TemplateSelector
- [x] Adicionar botão "+" ao lado do campo Título
- [x] Adicionar botão "+" ao lado do campo Descrição
- [x] Implementar popover com lista de valores salvos
- [x] Implementar funcionalidade de salvar valor atual
- [x] Implementar contador de uso e ordenação por frequência
- [x] Implementar favoritos com estrela
- [x] Implementar soft delete de templates
- [x] Criar testes Vitest para camposRapidosTemplates (14 testes passando)
- [x] Todos os 30 testes passando (tarefasSimples + camposRapidosTemplates + auth)


## Bugs Reportados - Fase 33
- [x] Página de Vistorias não carrega conteúdo (área principal em branco) - Corrigido: adicionado fallback SemOrganizacaoMessage

- [x] Adicionar botões "+" para personalizar campos na página VistoriasPage (formulário de Nova Vistoria) - Todos os 8 campos agora têm botão "+"

## Fase 34: Botões Função Rápida e Botões "+" nas Páginas
### Manutenções
- [x] Adicionar botão ⚡ Manutenção Rápida
- [x] Adicionar botões "+" em todos os campos do formulário
- [x] Adicionar novos tipos ao schema (titulo_manutencao, subtitulo_manutencao, descricao_manutencao, observacoes_manutencao)

### Ocorrências
- [x] Adicionar botão ⚡ Ocorrência Rápida
- [x] Adicionar botões "+" em todos os campos do formulário
- [x] Adicionar novos tipos ao schema (titulo_ocorrencia, subtitulo_ocorrencia, descricao_ocorrencia, observacoes_ocorrencia)

### Antes e Depois
- [x] Adicionar botão ⚡ Antes/Depois Rápido
- [x] Adicionar novos tipos ao schema (titulo_antesdepois, descricao_antesdepois)

## Fase 35: Campo Local no Modal de Funções Rápidas
- [x] Adicionar campo "Local" ao TarefasSimplesModal
- [x] Integrar com TemplateSelector para salvar locais frequentes
- [x] Salvar localização no banco de dados

## Bug: Botões "+" faltando nos modais de Funções Rápidas
- [ ] Verificar modal de Manutenção Rápida
- [ ] Verificar modal de Ocorrência Rápida
- [ ] Verificar modal de Antes/Depois Rápido
- [ ] Corrigir botões "+" que estão faltando

## Bug: Botões "+" ocultos no modal de Funções Rápidas
- [x] Ajustar layout do modal para que os botões "+" fiquem visíveis ao lado dos campos - Corrigido: botões movidos para a linha do label

## Fase 36: Repositório GitHub
- [x] Criar repositório no GitHub para o sistema App Manutenção - https://github.com/niggl1/app-manutencao

## Fase 37: GitHub Actions CI/CD
- [ ] Criar workflow de CI (testes automatizados)
- [ ] Criar workflow de lint e type-check
- [ ] Fazer push dos workflows para o GitHub
## Fase 38: Limpeza - Sistema de Manutenções Universal

### Alterações Realizadas:
- [x] Remover seções Comunicação, Livro de Manutenções e Relatórios do menu
- [x] Remover botões Criar App, Criar Relatório e Criar Livro do dropdown
- [x] Atualizar cards da página inicial para Vistorias, Manutenções e Ocorrências
- [x] Atualizar mensagem de boas vindas para focar em manutenções
- [x] Atualizar Primeiros Passos para focar em manutenções
- [x] Limpar menu lateral no DashboardLayout
- [x] Limpar menuSections no Dashboard.tsx

### Funções Mantidas:
- Vistorias
- Manutenções
- Ocorrências
- Checklists
- Antes e Depois
- Ordens de Serviço
- Agenda de Vencimentos
- Funções Rápidas
- Galeria e Mídia (Realizações, Melhorias, Aquisições)
- Gestão da Organização (Cadastro, Equipe)


## Fase 39: Ajustar Modais - Botões e Textos Cortados
- [x] Identificar todos os modais com problemas de layout (81 modais encontrados)
- [x] Ajustar TarefasSimplesModal (Funções Rápidas)
- [x] Ajustar modais de Nova Vistoria, Nova Manutenção, Nova Ocorrência
- [x] Ajustar outros modais do sistema (adicionado w-[95vw] a todos)
- [x] Testar todos os modais no navegador


## Fase 40: Renomear botões de "Simples" para "Rápida/Rápido"
- [x] Vistoria Simples → Vistoria Rápida
- [x] Ocorrência Simples → Ocorrência Rápida
- [x] Manutenção Simples → Manutenção Rápida
- [x] Antes e Depois Simples → Antes e Depois Rápido


## Fase 41: Atalho Funções Rápidas no Menu
- [x] Adicionar seção "REGISTRO RÁPIDO" no menu lateral acima de "ATALHOS"
- [x] Incluir botões: Vistoria, Manutenção, Ocorrência, Antes/Depois
- [x] Botões abrem modais de Registro Rápido


## Fase 42: Limpeza do Construtor de App - Foco em Manutenção

### Categorias a MANTER:
- [x] Operacional (Manutenções, Vistorias, Ocorrências, Checklists, Melhorias, Aquisições)
- [x] Eventos e Agenda (apenas Agenda de Vencimentos)
- [x] Galeria e Mídia (Galeria de Fotos, Antes e Depois, Vídeos)
- [x] Estatísticas (Painel de Controlo, Relatórios Gráficos, Métricas)

### Categorias a REMOVER:
- [x] Comunicação (Avisos, Comunicados, Notificações, Mensagem do Gestor)
- [x] Votações e Decisões (Votações, Enquetes, Funcionário do Mês)
- [x] Comunidade (Classificados, Achados e Perdidos, Caronas, Pets)
- [x] Moradores e Funcionários (Moradores, Funcionários, Equipe de Gestão)
- [x] Áreas e Espaços (Vagas, Reservas, Piscina, Academia, Salão, Churrasqueira, Playground, Quadra)
- [x] Documentação (Regras e Normas, Dicas de Segurança, Documentos, Atas)
- [x] Informações (Telefones Úteis, Links Úteis, Sobre a Organização)
- [x] Publicidade e Parceiros (Anúncios, Parceiros, Promoções)

### Arquivos a Modificar:
- [x] AssistenteCriacao.tsx - Remover categorias e módulos não relacionados
- [x] QuickFunctionsEditor.tsx - Remover funções não relacionadas
- [x] AppBuilder.tsx - Remover módulos não relacionados (de 42 para 11)
- [x] Testar Construtor de App no navegador
- [x] Salvar checkpoint


## Fase 43: Limpeza do Sistema de Relatórios - Foco em Manutenção

### Seções a MANTER:
- [x] Operacional (Manutenções, Vistorias, Ocorrências, Checklists, Antes e Depois, Ordens de Serviço, Agenda de Vencimentos)
- [x] Funções Rápidas (Vistorias, Manutenções, Ocorrências, Antes/Depois)
- [x] Galeria e Mídia (Álbuns de Fotos, Realizações, Melhorias, Aquisições)

### Seções a REMOVER:
- [x] Gestão (Moradores, Funcionários, Organização)
- [x] Comunicação (Comunicados, Mensagens do Gestor)
- [x] Destaques

### Arquivos a Modificar:
- [x] RelatorioBuilder.tsx - Remover seções não relacionadas (de 21 para 16 seções, de 5 para 3 categorias)
- [x] Testar geração de relatórios
- [x] Salvar checkpoint


## Fase 44: Limpeza da Revista/Livro de Manutenção - Foco em Manutenção

### Seções antigas REMOVIDAS:
- [x] Mensagem do Síndico
- [x] Avisos
- [x] Eventos
- [x] Funcionários
- [x] Votações
- [x] Telefones Úteis
- [x] Links Úteis
- [x] Classificados
- [x] Caronas
- [x] Achados e Perdidos

### Seções ADICIONADAS (relacionadas a manutenção):
- [x] Resumo do Período (estatísticas gerais)
- [x] Manutenções
- [x] Vistorias
- [x] Ocorrências
- [x] Checklists
- [x] Antes e Depois
- [x] Agenda de Vencimentos
- [x] Realizações
- [x] Melhorias
- [x] Aquisições

### Arquivos Modificados:
- [x] RevistaEditor.tsx - Completamente reescrito com 10 seções de manutenção
- [x] Testar a função Livro de Manutenção
- [x] Salvar checkpoint (versão 19ef2c19)


## Fase 45: Atualizar Modelo do Livro de Manutenção

### Tarefas:
- [x] Analisar os modelos/templates existentes
- [x] Atualizar MagazineWithTemplate.tsx - Páginas de manutenção (Resumo, Manutenções, Vistorias, Ocorrências, Checklists, Antes/Depois)
- [x] Atualizar TemplateSelector.tsx - Preview com seções de manutenção
- [x] Atualizar RevistaForm.tsx - Descrições dos templates
- [x] Atualizar MagazineViewer.tsx - demoMagazine com dados de manutenção
- [x] Adicionar função getPageTitle para novos tipos de página
- [x] Criar componentes ResumoPeriodoPage, ManutencoesPage, VistoriasPage, OcorrenciasPage, ChecklistsPage
- [x] Testar as alterações
- [x] Salvar checkpoint (versão 42b62eea)


## Fase 46: Interatividade do Livro de Manutenção

### 1. Navegação Cruzada entre Seções
- [x] Clicar em Manutenção → Abre detalhes completos
- [x] Clicar em Vistoria → Mostra ocorrências e manutenções relacionadas
- [x] Clicar em Ocorrência → Exibe manutenção que a resolveu
- [x] Links entre seções relacionadas

### 2. Filtros Interativos
- [x] Filtrar por status (Concluída, Em Andamento, Pendente)
- [x] Filtrar por período (semana, mês, trimestre)
- [x] Filtrar por local ou equipamento
- [x] Barra de filtros no topo de cada seção

### 3. Visualização de Detalhes (Modal/Popup)
- [x] Modal com informações completas ao clicar em item
- [x] Galeria de fotos expandida
- [x] Histórico de alterações
- [x] Comentários e observações

### 4. Gráficos Interativos
- [x] Gráfico de pizza clicável (filtrar por status)
- [x] Gráfico de barras por mês (filtrar por período)
- [x] Timeline visual de manutenções
- [x] Integrar Chart.js ou Recharts

### 5. Ações Rápidas
- [x] Botão "Gerar PDF" em cada seção
- [x] Botão "Partilhar" para enviar link específico
- [x] Botão "Exportar" para Excel/CSV
- [x] Botão "Imprimir" otimizado

### Arquivos a Modificar:
- [x] MagazineViewer.tsx - Adicionar interatividade às páginas
- [x] Criar componentes de filtro e modal
- [x] Testar todas as funcionalidades
- [x] Salvar checkpoint


## Fase 47: Sistema de Acesso Híbrido para Apps Criados

### Schema da Base de Dados
- [x] Criar tabela app_usuarios (email, senha_hash, app_id, permissoes)
- [x] Criar tabela app_codigos_acesso (codigo, app_id, ativo, validade)
- [x] Criar tabela app_sessoes (token, usuario_id, app_id, expira_em)
- [x] Criar tabela app_acessos_log (para auditoria)

### Backend (tRPC)
- [x] Criar rota appAcesso.loginComCodigo
- [x] Criar rota appAcesso.loginComEmail
- [x] Criar rota appAcesso.gerarCodigo
- [x] Criar rota appAcesso.cadastrarUsuario
- [x] Criar rota appAcesso.validarSessao
- [x] Criar rota appAcesso.logout
- [ ] Criar rota appAcesso.registarUsuario
- [ ] Criar rota appAcesso.recuperarSenha
- [ ] Criar rota appAcesso.listarUsuarios
- [ ] Criar rota appAcesso.removerUsuario
- [ ] Criar rota appAcesso.gerarCodigo
- [ ] Criar rota appAcesso.validarSessao

### Frontend - Construtor de App (CONCLUÍDO)
- [x] Adicionar aba "Configurar Acesso" no AppBuilder
- [x] Campo para definir código de acesso único
- [x] Lista de utilizadores cadastrados
- [x] Formulário para adicionar novo utilizador (email + senha) (email + senha)
- [x] Opção de permissões (visualizar, editar, administrar) (visualizar, editar, administrar)
- [x] Botão para gerar novo código de acesso

### Frontend - Página Inicial (CONCLUÍDO)
- [x] Criar secção "Aceder ao Meu App" na Home na Home
- [x] Campo para código do app
- [x] Campos email + senha (alternativa) (alternativa)
- [x] Botão "Entrar no App"
- [x] Link "Esqueceu a senha?"
- [x] Link "Primeiro acesso?"

### Autenticação (CONCLUÍDO)
- [x] Implementar hash de senhas (bcrypt) (bcrypt)
- [x] Implementar geração de tokens para apps para apps
- [x] Implementar middleware de validação de sessão de sessão
- [x] Implementar logout

### Testes (CONCLUÍDO)
- [x] Criar testes Vitest para appAcesso (8 testes)
- [x] Testar login com código APP-2026-CNVZ3O
- [x] Testar login com email/senha
- [ ] Testar recuperação de senha (pendente)
- [x] Salvar checkpoint



## Fase 48: Recuperação de Senha por Email para Apps Criados

### Schema da Base de Dados
- [ ] Criar tabela app_tokens_recuperacao (token, usuario_id, app_id, expira_em, usado)

### Backend (tRPC)
- [ ] Criar rota appAcesso.solicitarRecuperacaoSenha
- [ ] Criar rota appAcesso.validarTokenRecuperacao
- [ ] Criar rota appAcesso.redefinirSenha

### Envio de Email
- [ ] Integrar serviço de email (Resend, SendGrid ou similar)
- [ ] Criar template de email de recuperação
- [ ] Implementar função de envio de email

### Frontend - Modal de Login
- [ ] Adicionar link "Esqueceu a senha?" no modal de login
- [ ] Criar modal/página de solicitação de recuperação
- [ ] Campo para inserir email
- [ ] Mensagem de confirmação após envio

### Frontend - Página de Redefinição
- [ ] Criar página /app/recuperar-senha/:token
- [ ] Campo para nova senha
- [ ] Campo para confirmar senha
- [ ] Validação de força de senha
- [ ] Botão "Redefinir Senha"
- [ ] Mensagem de sucesso/erro

### Testes
- [ ] Criar testes para solicitarRecuperacaoSenha
- [ ] Criar testes para validarTokenRecuperacao
- [ ] Criar testes para redefinirSenha
- [ ] Testar fluxo completo no navegador
- [ ] Salvar checkpoint


## Fase 45: Implementação de Exportação PDF para Relatórios

- [x] Verificar bibliotecas de PDF existentes no projeto
- [x] Criar funções de exportação de PDF para Manutenções
- [x] Criar funções de exportação de PDF para Ocorrências
- [x] Criar funções de exportação de PDF para Vistorias
- [x] Criar funções de exportação de PDF para Checklists
- [x] Integrar funções de exportação na página RelatoriosManutencaoPage
- [x] Testar exportações de PDF
- [x] Salvar checkpoint final


## Fase 46: Adicionar Gráficos aos PDFs de Relatórios

- [x] Verificar bibliotecas de gráficos (Chart.js) no projeto
- [x] Instalar dependências necessárias (chartjs-node-canvas ou similar)
- [x] Criar funções para gerar gráficos de distribuição por status
- [x] Criar funções para gerar gráficos de distribuição por responsável
- [x] Criar funções para gerar gráficos de distribuição por prioridade
- [x] Integrar gráficos nas funções de exportação PDF de Manutenções
- [x] Integrar gráficos nas funções de exportação PDF de Ocorrências
- [x] Integrar gráficos nas funções de exportação PDF de Vistorias
- [x] Testar exportações com gráficos
- [x] Salvar checkpoint final


## Fase 47: Implementar Exportação para Excel/CSV

- [x] Verificar bibliotecas de Excel (xlsx, papaparse) no projeto
- [x] Instalar dependências necessárias
- [x] Criar função de exportação Excel para Manutenções
- [x] Criar função de exportação Excel para Ocorrências
- [x] Criar função de exportação Excel para Vistorias
- [x] Criar função de exportação Excel para Checklists
- [x] Adicionar botões de exportação Excel na página RelatoriosManutencaoPage
- [x] Testar exportações Excel
- [x] Salvar checkpoint final


## Fase 48: Melhorias na Agenda de Vencimentos

### Cron Job Automático
- [x] Criar endpoint para processar alertas automaticamente
- [x] Configurar scheduler para executar diariamente às 8h
- [x] Adicionar logs de execução do cron job
- [x] Implementar retry em caso de falha

### Calendário Visual
- [ ] Criar componente de calendário mensal
- [ ] Mostrar vencimentos por dia com cores por tipo
- [ ] Adicionar navegação entre meses
- [ ] Implementar clique para ver detalhes do vencimento

### Upload de Arquivos
- [ ] Adicionar campo de upload no formulário de vencimento
- [ ] Integrar com S3 para armazenar arquivos
- [ ] Mostrar arquivos anexados na visualização
- [ ] Permitir download e exclusão de arquivos

### Exportação Excel
- [ ] Criar função de exportação para Excel
- [ ] Adicionar filtros (tipo, status, período)
- [ ] Incluir todas as colunas relevantes
- [ ] Adicionar botão de exportação na interface



## Fase 49: Sistema de Email - Zoho SMTP
- [ ] Criar serviço de email com Zoho SMTP
- [ ] Integrar envio de email no processamento de alertas de vencimento
- [ ] Configurar credenciais do Zoho (SMTP_USER, SMTP_PASSWORD)
- [ ] Testar envio de emails de alerta


## Fase 49: Sistema de Email - Resend API
- [x] Instalar SDK do Resend
- [x] Criar serviço de email com Resend
- [x] Testar conexão com Resend API
- [x] Verificar domínio appmanutencao.com.br no Resend
- [x] Enviar email de teste com sucesso
- [x] Integrar Resend no processamento de alertas de vencimento
- [x] Remover código SMTP/Zoho desnecessário
- [x] Testar envio de alerta de vencimento real


## Bug: Segundo Menu Duplicado
- [ ] Identificar segundo menu nas páginas de Ordem de Serviço e Agenda de Vencimentos
- [ ] Remover menu duplicado
- [ ] Testar correção


## Fase 50: Configuração do Capacitor
- [x] Instalar @capacitor/core e @capacitor/cli
- [x] Criar capacitor.config.ts
- [x] Fazer build da aplicação
- [x] Adicionar plataforma Android
- [x] Adicionar plataforma iOS
- [x] Testar configuração


## Fase 51: Atualização do Logotipo
- [ ] Remover ícones duplicados das páginas de Ordens de Serviço e Agenda de Vencimentos
- [ ] Adicionar novo logotipo (LogoManutenção2.png) ao projeto
- [ ] Testar alterações


## Bug: Agenda de Vencimentos não carrega conteúdo
- [ ] Investigar erro na página de Agenda de Vencimentos
- [ ] Corrigir o problema
- [ ] Testar a correção


## Bug: Formulário de cadastro de vencimentos não aparece
- [ ] Investigar onde está o formulário de cadastro na página de Agenda de Vencimentos
- [ ] Corrigir a exibição do formulário
- [ ] Testar a correção


## Melhoria: Botões de cadastro na Agenda de Vencimentos
- [ ] Adicionar botões de cadastro de Contratos, Serviços e Manutenções no espaço vazio
- [ ] Testar a funcionalidade


## Bug Corrigido: Erro de validação do campo tipo na Agenda de Vencimentos
- [x] Identificar erro: tipo undefined não aceite na query vencimentos.list
- [x] Tornar campo tipo opcional no backend (routers.ts)
- [x] Remover "undefined as any" do frontend (AgendaVencimentos.tsx)
- [x] Testar correção


## Reorganização da Logo
- [x] Substituir as duas logos do menu lateral pela logo completa "APP MANUTENÇÃO"
- [x] Remover logo da área de conteúdo (Agenda de Vencimentos e Ordens de Serviço)
- [x] Testar alterações


## Bug: Ícone pequeno duplicado no menu lateral
- [ ] Remover ícone pequeno que aparece ao lado da nova logo
- [ ] Testar alteração


## Fase 52: Página de Administração de Usuários

### Análise do Sistema Atual
- [x] Tabela users com campos: id, openId, name, email, loginMethod, role (user/admin/sindico/morador), tipoConta (sindico/administradora/admin)
- [x] adminProcedure já existe para proteger rotas de admin
- [x] Página AdminFuncoes.tsx existe como referência de padrão

### Backend (tRPC)
- [x] Criar rota admin.listarUsuarios (listar todos os usuários com filtros)
- [x] Criar rota admin.atualizarUsuario (alterar role, tipoConta, ativo)
- [x] Criar rota admin.excluirUsuario (soft delete ou hard delete)
- [x] Criar rota admin.estatisticasUsuarios (contagem por role, por mês)

### Frontend
- [x] Criar página AdminUsuarios.tsx
- [x] Tabela com lista de usuários (nome, email, role, tipoConta, último login)
- [x] Filtros por role, tipoConta, período de cadastro
- [x] Ações: Editar role, Desativar, Excluir
- [x] Modal de edição de usuário
- [x] Gráficos de estatísticas (usuários por mês, por role)

### Integração
- [x] Adicionar rota /admin/usuarios no App.tsx
- [x] Adicionar link no menu lateral (apenas para admins)
- [x] Testar funcionalidades
- [x] Salvar checkpoint

## Fase 53: Correção do Menu de Administração

### Bug
- [x] Links Admin Usuários e Admin Funções não aparecem no menu para usuários admin
- [x] Verificar se o menu está sendo renderizado corretamente
- [x] Garantir que o role do usuário está sendo lido corretamente
- [x] Mover menu de admin para o SidebarFooter para evitar sobreposição

## Fase 54: Investigar inconsistências entre menus

### Problema real identificado
- [x] Menu de admin só aparece em algumas páginas (Agenda de Vencimentos, Ordens de Serviço)
- [x] Funções Rápidas diferentes entre os dois menus
- [x] Possivelmente existem dois layouts diferentes sendo usados
- [x] Investigar quais páginas usam qual layout
- [x] Unificar os menus para consistência
- [x] Adicionado Admin Usuários e Admin Funções no Dashboard.tsx

## Fase 55: Unificação dos Layouts de Dashboard

### Objetivo
Remover DashboardLayout das páginas e fazer todas usarem o menu do Dashboard.tsx (menu do síndico).

### Páginas que usam DashboardLayout (9 páginas)
- [x] AgendaVencimentos.tsx (migrada)
- [ ] HistoricoAcessosPage.tsx
- [ ] HistoricoInfracoesPage.tsx
- [ ] HistoricoTarefasSimples.tsx
- [ ] NotificarMoradorPage.tsx
- [ ] OrdemServicoDetalhe.tsx
- [x] OrdensServico.tsx (migrada)
- [ ] OrdensServicoConfig.tsx
- [ ] AdminUsuarios.tsx

### Implementação
- [ ] Migrar páginas para serem renderizadas dentro do Dashboard.tsx
- [ ] Remover DashboardLayout.tsx (ou manter apenas para casos específicos)
- [ ] Testar todas as páginas afetadas


### Conclusão Fase 55
- [x] Todas as 9 páginas migradas com sucesso para o menu unificado do Dashboard.tsx
- [x] OrdensServico.tsx
- [x] AgendaVencimentos.tsx
- [x] HistoricoAcessosPage.tsx
- [x] HistoricoInfracoesPage.tsx
- [x] HistoricoTarefasSimples.tsx
- [x] NotificarMoradorPage.tsx
- [x] OrdemServicoDetalhe.tsx
- [x] OrdensServicoConfig.tsx
- [x] AdminUsuarios.tsx


## Fase 56: Limpeza - Remover DashboardLayout.tsx
- [x] Remover arquivo DashboardLayout.tsx
- [x] Remover arquivo DashboardLayoutSkeleton.tsx
- [x] Atualizar FuncoesRapidasGrid.tsx para importar de QuickFunctionsEditor


## Fase 57: Log de Atividades de Admin
### Backend
- [x] Criar tabela admin_logs no schema.ts (implementado na Fase 60)
- [x] Criar rotas tRPC para registrar e listar logs (implementado na Fase 60)
- [x] Integrar registro de log nas ações de editar e excluir usuários (implementado na Fase 60)

### Frontend
- [x] Criar aba/seção de logs na página AdminUsuarios (implementado como página separada AdminLogs.tsx)
- [x] Exibir histórico de ações com filtros (implementado na Fase 60)

## Fase 60: Sistema de Logs de Auditoria
- [x] Criar tabela admin_logs no schema.ts
- [x] Executar migração do banco de dados (pnpm db:push)
- [x] Importar adminLogs no routers.ts
- [x] Adicionar registro de log na rota de atualizar usuário
- [x] Adicionar registro de log na rota de excluir usuário
- [x] Criar rota listarLogs para consultar histórico de atividades
- [x] Criar página AdminLogs.tsx com interface de visualização
- [x] Adicionar link "Logs de Auditoria" no menu de administração
- [x] Adicionar rota /admin/logs no App.tsx
- [x] Corrigir erros de TypeScript no AdminLogs.tsx


## Fase 61: Substituir Logo na Página de Login
- [x] Copiar nova logo para pasta public
- [x] Identificar página de login e substituir logo APP SÍNDICO
- [x] Testar alterações


## Fase 62: Excluir Assistente de Criação
- [x] Analisar dependências do AssistenteCriacao.tsx
- [x] Remover referências no Dashboard.tsx
- [x] Remover arquivo AssistenteCriacao.tsx
- [x] Testar que não há erros


## Fase 63: Novos Campos na Tabela de Usuários
### Schema
- [ ] Adicionar campo tipoUsuario (usuario/pequena_empresa/media_empresa)
- [ ] Adicionar campo diasUtilizacao
- [ ] Adicionar campo cidade
- [ ] Adicionar campo adimplente (boolean)
- [ ] Adicionar campo bloqueado (boolean)
- [ ] Executar migração do banco de dados

### Backend
- [ ] Atualizar rotas de listar/atualizar usuários para incluir novos campos
- [ ] Criar rota para bloquear/desbloquear usuário

### Frontend
- [ ] Adicionar colunas na tabela de AdminUsuarios
- [ ] Implementar seletor de tipo de usuário
- [ ] Implementar indicador visual de adimplência (verde/vermelho)
- [ ] Implementar botão de bloqueio
- [ ] Criar modal de bloqueio com mensagem

### Sistema de Bloqueio
- [ ] Verificar status de bloqueio no login
- [ ] Exibir mensagem "Para continuar a utilizar escolha um dos planos pagos"


## Fase 63: Novos Campos na Tabela de Usuários
### Backend
- [x] Adicionar campos tipoUsuario, diasUtilizacao, cidade, adimplente, bloqueado, motivoBloqueio no schema
- [x] Executar migração do banco de dados
- [x] Atualizar rotas tRPC para suportar novos campos

### Frontend
- [x] Atualizar tabela AdminUsuarios com novas colunas
- [x] Adicionar seletor de tipo de usuário (Usuário/Pequena Empresa/Média Empresa)
- [x] Exibir dias de utilização
- [x] Exibir cidade
- [x] Exibir status de adimplência (verde/vermelho)
- [x] Implementar funcionalidade de bloqueio com mensagem
- [x] Exibir mensagem de bloqueio na tela de login


## Fase 64: Integrar Checklist Rápido nas Funções Simples
### Backend
- [x] Adicionar tipo "checklist" no enum de tarefas simples
- [x] Adicionar campo itensChecklist na tabela tarefas_simples
- [x] Executar migração do banco de dados

### Frontend
- [x] Adicionar configuração do tipo checklist em HistoricoTarefasSimples
- [x] Atualizar TarefasSimplesModal para suportar checklist
- [x] Adicionar interface de itens do checklist no modal
- [x] Testar integração completa


## Correção - Botão Novo Livro
- [x] Corrigir botão "Novo Livro" que redirecionava para /dashboard/criar-projeto (rota removida)
- [x] Atualizar redirecionamento para /dashboard/revistas onde o usuário pode criar livros de manutenção
- [x] Corrigir dropdown "Novo Projeto" no menu lateral para mesma rota


## Correção - Modal de Tarefas Simples
- [ ] Ajustar modal para não precisar de scroll horizontal
- [ ] Garantir que botões fiquem sempre visíveis
- [ ] Melhorar responsividade do modal em telas menores


## Correção - Modais Compactos (15/01/2026)
- [x] Reduzir tamanho dos campos em TarefasSimplesModal
- [x] Reduzir tamanho dos campos em ChecklistRapidoModal
- [x] Reduzir tamanho dos campos em ShareModal
- [x] Reduzir tamanho dos campos em EnvioMulticanalModal
- [x] Reduzir tamanho dos campos em AppLoginModal
- [x] Reduzir tamanho de todos os modais no Dashboard.tsx

- [x] Corrigir texto do endereço para não expandir o modal (break-words, line-clamp-2)

- [x] Adicionar mapa miniatura no modal de Tarefas Simples para mostrar localização


## Histórico para Funções Operacionais e OS (15/01/2026)
- [x] Criar tabela de histórico no schema
- [x] Adicionar histórico para Manutenções
- [x] Adicionar histórico para Vistorias
- [x] Adicionar histórico para Ocorrências
- [x] Adicionar histórico para Ordens de Serviço
- [x] Criar componente de visualização de histórico
- [x] Adicionar item de menu em destaque para Histórico
- [x] Busca inteligente por tipo, status, protocolo, funcionário e intervalo de datas


## Correção - Erro ResizeObserver (15/01/2026)
- [x] Corrigir erro "ResizeObserver loop completed with undelivered notifications"


## Histórico Unificado - Todas as Funções (15/01/2026)
- [ ] Criar página de Histórico Unificado que busque dados de todas as tabelas (vistorias, manutencoes, ocorrencias, tarefas_simples, ordens_servico, checkl- [x] Criar página de histórico unificado
- [x] Implementar busca por protocolo, nome, descrição, tipo, status
- [x] Implementar filtro por intervalo de datas (de tal a tal data)
- [x] Colocar item em destaque no menu Operacional/Manutenção

## Melhoria: Expandir Lista de Tipos no Histórico (15/01/2026)
- [x] Adicionar todas as funções completas ao filtro de tipos
- [x] Adicionar todas as funções rápidas ao filtro de tipos
- [x] Adicionar Ordem de Serviço ao filtro de tipos


## Remoção: Botão Novo Projeto (15/01/2026)
- [x] Remover botão "+ Novo Projeto" da página Meus Projetos


## Verificação: Rotas e Funções dos Módulos (15/01/2026)
- [x] Verificar rotas do App.tsx
- [x] Verificar se todas as páginas existem
- [x] Verificar se todas as funções estão implementadas
- [x] Todas as rotas estão corretas e funcionando


## Ajuste de Textos - Títulos das Páginas (15/01/2026)
- [x] Alterar "Antes e Depois" para "Antes e Depois Completa"
- [x] Alterar "Ocorrências" para "Ocorrências Completas"
- [x] Alterar "Vistorias" para "Vistorias Completas"


## Ajuste de Textos - Módulos "Adicionar Módulos" (15/01/2026)
- [x] Alterar "Antes e Depois" para "Antes e Depois Completa"
- [x] Alterar "Ocorrências" para "Ocorrências Completas"
- [x] Alterar "Vistorias" para "Vistorias Completas"
- [x] Alterar "Manutenções" para "Manutenções Completas"
- [x] Alterar "Checklists" para "Checklists Completos"


## Adicionar Módulos de Funções Rápidas (15/01/2026)
- [x] Adicionar Vistoria Rápida
- [x] Adicionar Manutenção Rápida
- [x] Adicionar Ocorrência Rápida
- [x] Adicionar Checklist Rápido
- [x] Adicionar Antes/Depois Rápido


## Melhoria Visual AppBuilder (15/01/2026)
- [ ] Ordenar módulos em ordem alfabética
- [ ] Adicionar cores em degradê aos módulos
- [ ] Melhorar estilo visual dos módulos
- [ ] Deixar visual mais profissional


## Melhoria Visual AppBuilder (15/01/2026)
- [x] Organizar módulos em ordem alfabética
- [x] Adicionar cores em degradê nos módulos
- [x] Melhorar estilo visual dos cards de módulos
- [x] Deixar visual profissional
- [x] Separar Funções Completas e Funções Rápidas em categorias
- [x] Adicionar 5 módulos de funções rápidas (Vistoria, Manutenção, Ocorrência, Checklist, Antes/Depois)


## Correção: Modal de Equipe de Gestão Cortado (15/01/2026)
- [x] Ajustar modal de Equipe de Gestão que está cortado em cima e em baixo

- [x] Melhorar visual do modal de Equipe para design premium


## Sistema de Permissões por Membro da Equipe (15/01/2026)
- [x] Atualizar schema com campos: email, senha, permissoes, acessoTotal
- [x] Criar rotas de autenticação para membros da equipe
- [x] Criar rotas de gestão de permissões
- [x] Atualizar modal de cadastro de membros com opções de permissões
- [x] Criar página de login para membros da equipe (/equipe/login)
- [x] Implementar filtro de menu baseado em permissões
- [x] Bloquear acesso a rotas não autorizadas
- [x] Testar sistema completo de permissões


## Recuperação de Senha para Membros da Equipe (15/01/2026)
- [x] Criar rota tRPC para solicitar recuperação de senha
- [x] Criar rota tRPC para validar token e redefinir senha
- [x] Criar template de email para recuperação de senha
- [x] Criar página de solicitação de recuperação (/equipe/esqueci-senha)
- [x] Criar página de redefinição de senha (/equipe/redefinir-senha)
- [x] Adicionar link "Esqueci minha senha" na página de login
- [x] Testar fluxo completo de recuperação


## Histórico de Acessos para Membros da Equipe (15/01/2026)
- [x] Criar tabela membroAcessos no schema do banco de dados
- [x] Criar rotas tRPC para registar e listar acessos
- [x] Implementar captura de IP e dispositivo no login
- [x] Criar interface de visualização do histórico de acessos
- [x] Adicionar opção no modal de equipe para ver histórico
- [x] Testar fluxo completo (96 testes passando)


## Exportação do Histórico de Acessos (15/01/2026)
- [x] Criar rota tRPC para exportar histórico em PDF
- [x] Criar rota tRPC para exportar histórico em Excel
- [x] Adicionar botões de exportação no modal de histórico
- [x] Testar exportação PDF
- [x] Testar exportação Excel (102 testes passando)


## Bug: Erro API na página de Equipe (15/01/2026)
- [ ] Corrigir erro "Unexpected token '<'" - API retorna HTML em vez de JSON


## Compartilhar Funções com Equipe (16/01/2026)
- [x] Criar componente CompartilharComEquipe reutilizável
- [x] Criar modal com lista de membros da equipe
- [x] Adicionar opção de compartilhar via WhatsApp
- [x] Adicionar opção de compartilhar via email
- [x] Criar rota tRPC para enviar email de compartilhamento
- [x] Integrar botão nas páginas de Vistorias
- [x] Integrar botão nas páginas de Manutenções
- [x] Integrar botão nas páginas de Ocorrências
- [x] Integrar botão nas páginas de Checklists
- [ ] Integrar botão nas páginas de Antes e Depois
- [x] Testar fluxo completo (102 testes passando)


## Sistema de Notificações de Visualização de Compartilhamentos (16/01/2026)
- [x] Criar tabela compartilhamentos_equipe no schema (remetente, destinatário, tipo, itemId, token)
- [x] Criar tabela compartilhamento_visualizacoes (compartilhamentoId, dataVisualizacao, ip, dispositivo)
- [x] Criar tabela notificacoes_visualizacao para notificar remetentes
- [x] Criar rota tRPC para criar compartilhamento com token
- [x] Criar rota tRPC para registar visualização
- [x] Criar rota tRPC para listar compartilhamentos do usuário
- [x] Criar página pública /compartilhado/:token para visualizar item
- [x] Registar visualização quando página for aberta
- [x] Enviar email ao remetente quando destinatário visualizar
- [x] Atualizar componente CompartilharComEquipe com opção de rastreamento
- [x] Testar fluxo completo (102 testes passando)


## Página de Histórico de Compartilhamentos (16/01/2026)
- [x] Criar página CompartilhamentosPage.tsx
- [x] Listar todos os compartilhamentos enviados pelo usuário
- [x] Mostrar status de visualização (visualizado/não visualizado)
- [x] Mostrar detalhes de cada visualização (data, hora, dispositivo, navegador)
- [x] Adicionar filtros por tipo, status e busca
- [x] Adicionar estatísticas gerais (total enviados, visualizados, pendentes, taxa)
- [x] Adicionar rota no App.tsx (/dashboard/compartilhamentos)
- [x] Adicionar entrada no menu lateral (Gestão da Organização > Compartilhamentos)
- [x] Testar funcionalidade completa (102 testes passando)


## Exportação de Relatório de Compartilhamentos (16/01/2026)
- [x] Criar rota tRPC para exportar compartilhamentos em PDF
- [x] Criar rota tRPC para exportar compartilhamentos em Excel
- [x] Adicionar botões de exportação na página de compartilhamentos
- [x] Incluir estatísticas e lista de compartilhamentos nos relatórios
- [x] Testar exportação PDF
- [x] Testar exportação Excel (102 testes passando)


## Função Timeline - Operacional/Manutenção (16/01/2026)
- [ ] Criar tabelas no schema: timeline, timeline_responsaveis, timeline_locais, timeline_status, timeline_prioridades, timeline_titulos
- [ ] Criar rotas tRPC para CRUD de Timeline e configurações (responsáveis, locais, status, prioridades, títulos)
- [ ] Criar página de criação de Timeline com formulário
  - [ ] Dropdown Responsável (obrigatório) com botão "+"
  - [ ] Dropdown Local/Item com botão "+"
  - [ ] Dropdown Status com botão "+"
  - [ ] Dropdown Prioridade com botão "+"
  - [ ] Dropdown Título (obrigatório) com botão "+"
  - [ ] Upload de imagens
  - [ ] Campo de descrição
  - [ ] Registo automático de data, horário e localização
  - [ ] Botão "Salvar e continuar depois" (rascunho)
  - [ ] Botão "Compartilhar com equipe"
  - [ ] Botão "Enviar"
- [ ] Criar página de visualização premium da Timeline
  - [ ] Link público bonito
  - [ ] Botão para gerar PDF
  - [ ] Botão para registar/confirmar
- [ ] Criar página de histórico de Timelines
  - [ ] Lista de todas as timelines
  - [ ] Filtros por status, responsável, data
  - [ ] Ações de editar, excluir, visualizar
- [ ] Adicionar entrada no menu lateral (Operacional/Manutenção > Timeline)
- [ ] Testar fluxo completo


## Função Timeline - Operacional/Manutenção (16/01/2026)
- [x] Criar tabelas no schema (timelines, timeline_responsaveis, timeline_locais, timeline_status, timeline_prioridades, timeline_titulos, timeline_imagens, timeline_eventos, timeline_compartilhamentos)
- [x] Criar rotas tRPC para CRUD de configurações (responsáveis, locais, status, prioridades, títulos)
- [x] Criar rotas tRPC para CRUD de timelines
- [x] Criar página de criação com formulário completo
- [x] Implementar dropdowns com botão + para adicionar novos itens
- [x] Implementar upload de múltiplas imagens com compressão
- [x] Implementar ações: Salvar rascunho, Compartilhar com equipe, Enviar
- [x] Criar página de visualização premium com link público (/timeline/:token)
- [x] Implementar geração de PDF
- [x] Criar página de histórico com filtros e estatísticas
- [x] Adicionar entrada no menu lateral (Operacional/Manutenção > Timeline e Histórico Timeline)
- [x] Testar fluxo completo (102 testes passando)


## Sistema de Notificações por Email para Timelines (16/01/2026)
- [ ] Criar tabela timeline_notificacoes_config (configurações por timeline)
- [ ] Criar tabela timeline_notificacoes_historico (histórico de envios)
- [ ] Criar rotas tRPC para configurar notificações
- [ ] Criar rota tRPC para enviar notificação
- [ ] Integrar envio automático na mudança de status
- [ ] Integrar envio automático em atualizações
- [ ] Criar template de email para notificações
- [ ] Criar interface de configuração de notificações na timeline
- [ ] Testar fluxo completo


## Sistema de Notificações por Email para Timelines (16/01/2026) - CONCLUÍDO
- [x] Criar tabela timeline_notificacoes_config no banco de dados
- [x] Criar tabela timeline_notificacoes_historico para registar envios
- [x] Criar rotas tRPC para configurar notificações (salvar, obter, enviar)
- [x] Criar rota tRPC para enviar notificações manualmente
- [x] Integrar envio automático de notificações nas ações de timeline (atualizar)
- [x] Criar template de email para notificações de timeline (notificacaoTimeline)
- [x] Criar componente de configuração de notificações (TimelineNotificacoesConfig.tsx)
- [x] Adicionar botão de configuração de notificações na página de histórico
- [x] Opções configuráveis: mudança de status, atualizações, novas imagens, comentários
- [x] Destinatários configuráveis: responsável, criador, emails adicionais


## Bug: Timeline não aparece no menu lateral (16/01/2026)
- [x] Adicionar Timeline e Histórico Timeline ao menu lateral (adicionado à lista FUNCOES_DISPONIVEIS)


## Painel de Controle de Timelines (16/01/2026)
- [ ] Criar rotas tRPC para estatísticas de timelines (total, por status, por prioridade)
- [ ] Criar rota para alertas de timelines pendentes/atrasadas
- [ ] Criar rota para estatísticas por período (últimos 7, 30, 90 dias)
- [ ] Criar página TimelineDashboardPage.tsx com gráficos
- [ ] Implementar gráfico de pizza para status
- [ ] Implementar gráfico de barras para prioridades
- [ ] Implementar gráfico de linha para evolução temporal
- [ ] Criar seção de alertas com timelines pendentes
- [ ] Adicionar filtros por período e responsável
- [ ] Adicionar entrada no menu lateral
- [ ] Testar funcionalidade completa


## Painel de Controle de Timelines (16/01/2026)
- [x] Criar rotas tRPC para estatísticas de timelines
- [x] Criar rota para alertas e pendências
- [x] Criar rota para resumo rápido
- [x] Criar página TimelineDashboardPage.tsx
- [x] Implementar cards de resumo (total, pendentes, em andamento, finalizadas, urgentes)
- [x] Implementar gráfico de pizza para distribuição por status
- [x] Implementar gráfico de barras para distribuição por prioridade
- [x] Implementar gráfico de linha para evolução temporal
- [x] Implementar lista de alertas e pendências
- [x] Adicionar filtro por período
- [x] Adicionar entrada no menu lateral (Operacional/Manutenção > Dashboard Timeline)
- [x] Testar funcionalidade completa


## Próximas Funcionalidades - Timeline (Pendente para 17/01/2026)
- [ ] Adicionar eventos à timeline - Permitir registar múltiplos eventos/atualizações numa mesma timeline para acompanhar a evolução ao longo do tempo
- [ ] Relatório consolidado de timelines - Criar exportação de múltiplas timelines num único PDF para apresentação a gestores


## Novos Planos de Preço (17/01/2026)
- [x] Adicionar plano de R$199 (Plano Profissional) na página inicial
- [x] Adicionar plano de R$299 (Plano Enterprise) na página inicial
- [x] Manter as mesmas vantagens para todos os planos
- [x] Plano Profissional marcado como "Recomendado" com destaque visual


## Renomear Planos de Preço (17/01/2026)
- [x] Renomear "Plano Básico" para "1 Usuário"
- [x] Renomear "Plano Profissional" para "3 Usuários"
- [x] Renomear "Plano Enterprise" para "5 Usuários"


## Unificar Design dos Planos (17/01/2026)
- [x] Deixar os 3 planos com design laranja uniforme
- [x] Remover selo "Recomendado" do plano de 3 usuários
- [x] Remover scale-105 do plano de 3 usuários


## Renomear Planos com Novos Nomes (17/01/2026)
- [x] Renomear "1 Usuário" para "Individual"
- [x] Renomear "3 Usuários" para "Pequenas Equipes"
- [x] Renomear "5 Usuários" para "Equipes Médias"


## Adicionar Retângulo de Contato para Equipes Maiores (17/01/2026)
- [x] Adicionar retângulo com cantos arredondados embaixo dos planos
- [x] Adicionar mensagem "Para equipes maiores entre em contato com o nosso suporte"
- [x] Adicionar botão de contato/suporte


## Unificar Suporte Técnico em Todos os Planos (17/01/2026)
- [x] Alterar "Suporte técnico prioritário" para "Suporte técnico" no plano Pequenas Equipes
- [x] Alterar "Suporte técnico 24/7" para "Suporte técnico" no plano Equipes Médias


## Substituir Logo do Cabeçalho (17/01/2026)
- [x] Copiar nova logo para pasta public
- [x] Atualizar referência da logo no cabeçalho da página inicial


## Substituir Logo do Rodapé (17/01/2026)
- [x] Substituir logo do rodapé pela nova logo
- [x] Remover texto "App Manutenção" do rodapé


## Criar Seção "Conheça nosso contrato" (17/01/2026)
- [x] Criar nova seção antes da seção CTA final
- [x] Adicionar 3 cards com características do contrato
- [x] Aplicar design com gradiente laranja


## Adicionar Botão "Baixar o contrato" (17/01/2026)
- [x] Adicionar botão de download na seção "Conheça nosso contrato"
- [x] Configurar link para arquivo /contrato.pdf
- [x] Aplicar estilo com gradiente laranja


## Criar Página de Contrato com Campos Preenchíveis (17/01/2026)
- [x] Criar página Contrato.tsx com formulário
- [x] Adicionar campos para nome, CNPJ, plano e data
- [x] Integrar dados da empresa (APP GROUP LTDA)
- [x] Criar visualização do contrato com dados preenchidos
- [x] Adicionar botão de impressão
- [x] Adicionar botão de geração de PDF
- [x] Adicionar botão de compartilhamento
- [x] Alterar botão da página inicial para "Visualizar Contrato"
- [x] Instalar pacote html2pdf.js


## Expandir Contrato com Informações Completas (17/01/2026)
- [x] Adicionar dados completos do App Group (CNPJ, endereço, etc)
- [x] Adicionar formas de reajuste do contrato
- [x] Adicionar período de 1 ano renovável até manifestação contrária
- [x] Adicionar bloqueio do sistema após 5 dias corridos de atraso
- [x] Adicionar cancelamento com aviso prévio de 30 dias
- [x] Adicionar penalidade de 1 mês se aviso não for respeitado
- [x] Adicionar campo editável para data do contrato
- [x] Adicionar campo editável para local do contrato
- [x] Adicionar campos para responsável (nome, CPF, cargo)


## Criar Apresentação em PDF (17/01/2026)
- [x] Remover seção premium do site
- [x] Criar arquivo Markdown com apresentação
- [x] Converter para PDF


## Criar Apresentação em Slides HTML (17/01/2026)
- [x] Criar página de slides HTML interativos
- [x] Adicionar navegação entre slides
- [x] Adicionar animações e transições
- [x] Integrar à navegação do site


## Criar Apresentação com Imagens do Sistema (17/01/2026)
- [x] Gerar imagens bonitas do dashboard
- [x] Gerar imagens da seção de ordens de serviço
- [x] Gerar imagens de relatórios
- [x] Gerar imagens do app mobile
- [x] Integrar imagens aos slides


## Otimizar Apresentação para Impressão em PDF (17/01/2026)
- [x] Adicionar estilos CSS para impressão
- [x] Implementar funcionalidade de impressão/PDF
- [x] Testar e validar saída em PDF


## Adicionar Seção de Apresentação do Sistema (17/01/2026)
- [x] Criar seção "APRESENTAÇÃO DO SISTEMA" na página inicial
- [x] Adicionar botão de impressão
- [x] Adicionar botão de gerar PDF
- [x] Adicionar botão de compartilhamento


## Bug: Erro ao Criar Nova Ordem de Serviço (17/01/2026)
- [x] Investigar erro "Ordem de serviço não encontrada" ao clicar em +nova ordem de serviço
- [x] Corrigir rota ou lógica de criação de nova ordem
- [x] Testar funcionalidade de criação


## Melhorias no Modal de Ordem de Serviço (17/01/2026)
- [x] Adicionar espaço para responsável acima do título
- [x] Adicionar botão de + em categorias
- [x] Adicionar botão de + em prioridade
- [x] Adicionar botão de + em setor
- [x] Criar campo para protocolo
- [x] Adicionar campo de material necessário abaixo de tempo estimado
- [x] Adicionar botão de + para adicionar materiais
- [x] Adicionar campo de quantidade no modal de material


## Bug: Campos Não Aparecem no Formulário de Nova Ordem (17/01/2026)
- [x] Verificar por que os campos responsável e protocolo não aparecem
- [x] Verificar por que os botões de + não aparecem
- [x] Verificar por que o campo de material não aparece
- [x] Corrigir formulário de nova ordem de serviço


## Bug: Formulário de Nova Ordem Não Renderiza (17/01/2026)
- [x] Adicionar botão de teste no modal para debugar
- [x] Adicionar botões de + em categorias, prioridades e setores
- [x] Adicionar campo de lista de material com botão de +
- [x] Adicionar campo de responsável acima do título
- [x] Adicionar campo de protocolo


## Implementar Modais para Criar Novos Itens (17/01/2026)
- [x] Criar modal para adicionar nova categoria
- [x] Criar modal para adicionar nova prioridade
- [x] Criar modal para adicionar novo setor
- [x] Integrar mutations de criação com os modais
- [x] Atualizar lista após criar novo item


## Bug: Procedures Faltando no Backend (17/01/2026)
- [x] Corrigir nomes das queries no frontend para usar nomes corretos das procedures
- [x] Usar ordensServico.getCategorias em vez de categorias.list
- [x] Usar ordensServico.getPrioridades em vez de prioridades.list
- [x] Usar ordensServico.getSetores em vez de setores.list
- [x] Usar ordensServico.getConfiguracoes em vez de configuracoes.get


## Adicionar Campo 'responsavelPrincipal' ao Schema (17/01/2026)
- [x] Adicionar campo responsavelPrincipal à tabela ordensServico no schema
- [x] Executar migração do banco de dados
- [x] Atualizar tipos TypeScript


## Refazer Modal de Nova Ordem com Design Premium (17/01/2026)
- [x] Reorganizar campos com melhor espaçamento
- [x] Melhorar visual dos botões
- [x] Definir seções claras no formulário
- [x] Adicionar ícones e visual premium
- [x] Testar responsividade


## Adicionar Upload de Imagens no Modal de Nova OS (17/01/2026)
- [x] Criar tabela para armazenar imagens de ordens de serviço
- [x] Implementar upload de imagens com compressão
- [x] Adicionar validação de tamanho (máx 100MB)
- [ ] Adicionar campo de upload no modal com drag-and-drop
- [ ] Exibir preview das imagens selecionadas
- [ ] Permitir remover imagens antes de salvar
- [ ] Integrar imagens ao criar nova OS

## Fase 50: Upload de Imagens em Ordens de Serviço
- [x] Corrigir schema osImagens removendo campos não existentes
- [x] Corrigir mutation uploadImagem no backend
- [x] Adicionar campo imagens ao estado novaOS
- [x] Implementar funções handleFilesSelected e handleRemoveImage
- [x] Adicionar seção de upload com drag-and-drop no modal
- [x] Implementar preview de imagens selecionadas
- [x] Integrar upload automático ao criar ordem de serviço
- [ ] Testar upload de imagens com múltiplos arquivos
- [ ] Testar validação de tipo de arquivo
- [ ] Testar validação de tamanho máximo (100MB)
- [ ] Testar drag-and-drop functionality
- [ ] Testar preview e remoção de imagens

## Fase 51: Melhorias no Modal de Nova Ordem de Serviço
- [x] Implementar geração automática de protocolo (6 dígitos)
- [x] Implementar localização automática (GPS/Geolocalização)
- [x] Implementar compartilhamento com equipe (usando ShareModal)
- [x] Adicionar campo de protocolo com botão de geração manual
- [x] Adicionar seção de localização com captura GPS
- [x] Adicionar botão de compartilhamento após criar OS
- [x] Adicionar descrição de localização
- [x] Corrigir erros de JSX e estrutura do modal
- [x] Executar testes (107 testes passando)

## Fase 52: Geração de Relatório em PDF
- [x] Implementar função de geração de PDF com PDFKit
- [x] Integrar imagens da OS no PDF (URLs incluídas)
- [x] Adicionar mapa com localização GPS (link para Google Maps)
- [x] Incluir informações da OS (protocolo, responsável, materiais, descrição do serviço, prazo para conclusão)
- [x] Criar botão de download de PDF na página de detalhe
- [x] Implementar mutation tRPC generatePDF
- [x] Criar rota HTTP /api/ordens-servico/:id/pdf
- [x] Testar geração de PDF com múltiplas imagens (5 testes passando)
- [x] Testar geração de PDF sem imagens
- [x] Testar localização GPS no PDF
- [x] Testar com caracteres especiais
- [x] Testar com muitos materiais

## Fase 53: Compressão Automática de Imagens
- [x] Implementar função de compressão de imagens (Sharp)
- [x] Redimensionar para 1/4 de página A4 (600x840px)
- [x] Manter qualidade boa (85% JPEG com mozjpeg)
- [x] Integrar compressão no upload de imagens
- [x] Testar tamanho final (redução de ~70-80%)
- [x] Testar qualidade visual (9 testes passando)
- [x] Adicionar validação de dimensões e tamanho máximo (100MB)
- [x] Criar testes vitest para compressão (9 testes)
- [x] Criar funções auxiliares (thumbnail, validação, info)
- [x] Integração automática no upload (mutation uploadImagem)
- [x] Total de 121 testes passando (112 anteriores + 9 novos)

## Fase 54: Botão de Compartilhamento no Detalhe da OS
- [x] Adicionar botão de compartilhamento na página de detalhe
- [x] Integrar ShareModal no detalhe da OS
- [x] Testar compartilhamento de OS
- [x] Adicionar import do ShareModal
- [x] Adicionar estado showShareModal
- [x] Todos os 121 testes passando

## Fase 55: Corrigir Visibilidade do Botão de Compartilhamento
- [x] Diagnosticar por que o botão não aparecia na página de detalhe
- [x] Identificar duplicação de botões "Compartilhar"
- [x] Renomear novo botão para "Compartilhar com Equipe"
- [x] Adicionar ícone Users para diferenciar
- [x] Testar visibilidade em diferentes resoluções
- [x] Todos os 121 testes passando

## Fase 56: Corrigir Botao de Compartilhamento no Modal de Criacao
- [x] Identificar que osIdCriada nunca era setado
- [x] Adicionar logica para setar osIdCriada apos criar OS
- [x] Nao fechar modal para deixar botao visivel
- [x] Testar funcionalidade (121 testes passando)
- [x] Botao Compartilhar com Equipe agora visivel no modal apos criar

## Fase 57: Funcionalidade dos Botoes + para Responsaveis e Titulos
- [x] Criar modal de selecao de responsaveis (lista de funcionarios)
- [x] Criar modal de selecao de titulos de templates (10 titulos pre-configurados)
- [x] Integrar modais com botoes +
- [x] Testar funcionalidade completa (121 testes passando)

## Fase 58: Corrigir Modal de Seleção de Responsável
- [ ] Diagnosticar problema de listagem de funcionários
- [ ] Verificar query trpc.funcionario.list
- [ ] Corrigir modal para mostrar funcionários cadastrados
- [ ] Testar funcionalidade completa

## Fase 59: Checkup Completo da Função Ordem de Serviço
- [x] Verificar erros TypeScript e sintaxe JSX
- [x] Verificar schema do banco de dados (tabelas OS)
- [x] Verificar routers/procedures do backend
- [x] Verificar componentes do frontend
- [x] Executar testes e identificar falhas
- [x] Rollback para versão estável (d7e3e077)
- [x] Corrigir referência circular no schema (ordensServico/osResponsaveis)
- [x] Corrigir erro de tipo Buffer no routers.ts
- [x] Corrigir erro de createContext no index.ts
- [x] Corrigir erro de quantidade null no PDF
- [x] Todos os 121 testes passando
- [x] Zero erros TypeScript

## Fase 60: Corrigir Modal de Seleção de Responsáveis
- [x] Diagnosticar problema de listagem de funcionários (não havia cadastrados)
- [x] Verificar query trpc.funcionario.list (funcionando corretamente)
- [x] Adicionar query de moradores como alternativa
- [x] Melhorar modal com seções separadas (Funcionários/Moradores)
- [x] Adicionar mensagem informativa quando não há cadastros
- [x] Adicionar botão "Digitar nome manualmente"
- [x] Todos os 121 testes passando

## Fase 61: Substituir Modais de Seleção por Cadastro Simples
- [ ] Remover modal de seleção de Responsável atual
- [ ] Remover modal de seleção de Título atual
- [ ] Criar modal de cadastro simples para Responsável (igual Nova Categoria)
- [ ] Criar modal de cadastro simples para Título (igual Nova Categoria)
- [ ] Testar funcionalidade de cadastro


## Fase 50: Botões "+" com Modais de Cadastro Simples
- [x] Substituir modal de seleção de Responsável por modal de cadastro simples
- [x] Substituir modal de seleção de Título por modal de cadastro simples
- [x] Design similar ao modal "Nova Categoria" (campo de texto + botões Cancelar/Criar)
- [x] Todos os 121 testes passando


## Fase 51: Botões "+" com Dropdown e Templates Personalizados na OS
- [x] Analisar componente TemplateSelector existente
- [x] Adicionar tipos de template para OS (responsavel_os, titulo_os)
- [x] Integrar TemplateSelector no campo Responsável Principal
- [x] Integrar TemplateSelector no campo Título
- [x] Testar salvamento e busca de templates personalizados


## Fase 52: Remover opção Nova OS do menu lateral
- [x] Remover item "+ Nova OS" do submenu de Ordens de Serviço


## Fase 53: Corrigir erro Map container not found
- [x] Corrigir erro do mapa na página de Funções Simples (checklist)


## Fase 54: Renomear Funções Simples para Funções Rápidas + Container Premium
- [x] Renomear "Funções Simples" para "Funções Rápidas" em todos os ficheiros
- [x] Criar container premium bonito para a página de Funções Rápidas
- [x] Testar alterações no navegador


## Fase 55: Sistema de Anexos para Ordens de Serviço
- [x] Criar tabela os_anexos no banco de dados
- [x] Criar endpoints de upload, listagem e exclusão de anexos
- [x] Atualizar modal de OS com seção de anexos (PDF e fotos)
- [x] Implementar limite de 100MB por arquivo
- [x] Testar funcionalidade completa


## Fase 56: Visualização e Download de Anexos na OS
- [x] Localizar página de detalhes da OS
- [x] Adicionar query para buscar anexos da OS
- [x] Criar seção de anexos com ícones e botões de download
- [x] Testar funcionalidade de visualização e download


## Fase 57: Documentação e CI/CD
- [x] Criar README.md completo com documentação
- [x] Configurar CI/CD com GitHub Actions
- [x] Preparar projeto para geração de APK Android
- [x] Sincronizar alterações com GitHub


## Fase 58: Deploy Híbrido (Vercel + Manus)
- [x] Preparar projeto para deploy híbrido (ajustar CORS)
- [ ] Conectar repositório GitHub à Vercel
- [ ] Configurar variáveis de ambiente na Vercel
- [ ] Fazer deploy e configurar domínio www.appmanutencao.com.br
- [ ] Testar funcionamento completo


## Fase 59: Dashboard com Gráficos Interativos
- [ ] Criar componente de gráfico de OS por status (últimos 30 dias)
- [ ] Criar componente de gráfico de manutenções por tipo
- [ ] Criar componente de KPIs (indicadores de performance)
- [ ] Integrar gráficos no Dashboard principal
- [ ] Testar responsividade dos gráficos

## Fase 60: Sistema de Comentários nas OS
- [ ] Criar tabela os_comentarios no schema.ts
- [ ] Criar endpoints tRPC para CRUD de comentários
- [ ] Criar componente de timeline de comentários
- [ ] Integrar na página de detalhe da OS
- [ ] Permitir anexos nos comentários
- [ ] Testar funcionalidade completa

## Fase 61: Templates de Checklist
- [ ] Criar tabela checklist_templates no schema.ts
- [ ] Criar endpoints tRPC para CRUD de templates
- [ ] Criar biblioteca de templates por setor (predial, industrial, etc.)
- [ ] Criar interface de gerenciamento de templates
- [ ] Permitir criar checklist a partir de template
- [ ] Testar funcionalidade completa

## Fase 62: Sistema de Notificações Push
- [ ] Configurar Service Worker para PWA
- [ ] Implementar registro de dispositivos
- [ ] Criar sistema de envio de notificações
- [ ] Notificar sobre vencimentos próximos
- [ ] Notificar sobre novas OS atribuídas
- [ ] Testar em diferentes navegadores

## Fase 63: Modo Offline Básico
- [ ] Configurar Service Worker com cache
- [ ] Implementar cache de dados essenciais
- [ ] Criar indicador de status de conexão
- [ ] Implementar fila de sincronização
- [ ] Testar funcionamento offline


## Fase 59: Dashboard com Gráficos e Melhorias
- [x] Dashboard com Gráficos Interativos (KPIs, gráfico de rosca OS por Status, gráfico de barras OS mensal)
- [x] Templates de Checklist (componente, router, página)
- [x] Rota de estatísticas de OS no backend
- [x] Link para Templates de Checklist no menu lateral
- [ ] Notificações Push (PWA)
- [ ] Modo Offline básico


## Fase 60: Novas Melhorias Implementadas (17/01/2026)
- [x] Dashboard com Gráficos Interativos (KPIs, gráfico de rosca OS por Status, gráfico de barras OS mensal)
- [x] Templates de Checklist (componente, router, página com CRUD completo)
- [x] Notificações Push (componente de prompt, service worker atualizado)
- [x] Modo Offline básico (service worker com cache, página offline)
- [x] Link para Templates de Checklist no menu do Dashboard


## Fase 61: Melhorias Avançadas (17/01/2026)
### Calendário Visual na Agenda de Vencimentos
- [ ] Criar componente de calendário mensal
- [ ] Adicionar navegação entre meses (anterior/próximo)
- [ ] Mostrar vencimentos com cores por tipo/status
- [ ] Permitir clique no dia para ver detalhes
- [ ] Integrar com a página de Agenda de Vencimentos existente

### Upload de Arquivos nos Vencimentos
- [ ] Adicionar campo de upload no formulário de vencimentos
- [ ] Integrar com S3 para armazenamento
- [ ] Permitir múltiplos arquivos (contratos, certificados)
- [ ] Mostrar lista de arquivos anexados
- [ ] Permitir download e exclusão de arquivos

### Sistema de Comentários nas OS
- [ ] Criar componente de timeline de comentários
- [ ] Adicionar formulário para novo comentário
- [ ] Mostrar histórico de comentários com data/hora/autor
- [ ] Integrar na página de detalhes da OS
- [ ] Permitir edição e exclusão de comentários próprios


## Fase 62: Verificação de Funcionalidades Existentes
- [x] Calendário Visual na Agenda de Vencimentos (já existia - funcionando)
- [x] Upload de Arquivos nos Vencimentos (já existia - funcionando)
- [x] Sistema de Comentários/Chat nas OS (já existia - testado e funcionando)
- [x] Dashboard com Gráficos Interativos (implementado)
- [x] Templates de Checklist (implementado)
- [x] Notificações Push (implementado)
- [x] Modo Offline com Service Worker (implementado)


## Fase 63: Novas Melhorias - PDF, Filtros e Notificações

### Exportação de Relatórios em PDF
- [ ] Adicionar botão "Exportar PDF" na página de detalhes da OS
- [ ] Criar função para gerar PDF com histórico de chat
- [ ] Incluir timeline da OS no PDF
- [ ] Incluir informações básicas da OS no cabeçalho

### Filtros Avançados no Calendário
- [ ] Adicionar checkboxes para filtrar por tipo (Contrato, Serviço, Manutenção)
- [ ] Implementar lógica de filtro no componente CalendarioVencimentos
- [ ] Manter estado dos filtros entre navegações

### Notificações por Email
- [ ] Criar rota para processar vencimentos próximos
- [ ] Implementar envio de email usando Resend API
- [ ] Criar template de email para alertas de vencimento
- [ ] Adicionar configuração de dias de antecedência para alertas


## Fase 64: Melhorias Avançadas - Janeiro 2026
- [x] Exportação de Relatórios em PDF (inclui chat e timeline)
- [x] Filtros Avançados no Calendário (checkboxes por tipo com contadores)
- [x] Notificações por Email (nova aba Alertas com envio de resumo)
- [x] Testar todas as funcionalidades no navegador


## Fase 65: Funcionalidades Offline Completas
### Sistema de Armazenamento Offline (IndexedDB)
- [ ] Criar lib/offlineStorage.ts com IndexedDB
- [ ] Definir stores para: vistorias, manutencoes, ocorrencias, checklists, antesDepois, ordensServico, vencimentos, timeline, organizacoes
- [ ] Implementar CRUD offline para cada store
- [ ] Implementar sistema de versioning para sincronização

### Service Worker Avançado
- [ ] Atualizar sw.js com cache de todas as rotas
- [ ] Implementar estratégia Network First com fallback para cache
- [ ] Cache de assets estáticos (JS, CSS, imagens)
- [ ] Cache de respostas de API

### Hooks de Sincronização
- [ ] Criar hook useOnlineStatus para detectar conexão
- [ ] Criar hook useOfflineData para gerenciar dados offline
- [ ] Criar hook useSyncQueue para fila de operações pendentes

### Fila de Operações Pendentes
- [ ] Criar sistema de queue para operações offline
- [ ] Implementar retry automático quando voltar online
- [ ] Resolver conflitos de dados (última modificação ganha)

### Indicadores Visuais
- [ ] Criar componente OfflineIndicator
- [ ] Mostrar badge com número de operações pendentes
- [ ] Notificação quando sincronização completar

### Integração nas Páginas
- [ ] Integrar offline em Vistorias
- [ ] Integrar offline em Manutenções
- [ ] Integrar offline em Ocorrências
- [ ] Integrar offline em Checklists
- [ ] Integrar offline em Antes/Depois
- [ ] Integrar offline em Ordens de Serviço
- [ ] Integrar offline em Agenda de Vencimentos
- [ ] Integrar offline em Timeline
- [ ] Integrar offline em Histórico Geral
- [ ] Integrar offline em Gestão da Organização


## Fase 65: Funcionalidades Offline Completas
- [x] Sistema de armazenamento offline (IndexedDB) - offlineStorage.ts
- [x] Service Worker avançado com cache completo - sw.js
- [x] Hooks de sincronização online/offline - useOffline.ts
- [x] Fila de operações pendentes - integrado nos hooks
- [x] Indicadores visuais de status offline - OfflineIndicator.tsx
- [x] Integração no Dashboard (header mobile e banner)
- [x] Cache de páginas e APIs para funcionamento offline
- [x] Sincronização automática quando voltar online


## Fase 66: PWA Completo e Notificações de Sincronização
- [ ] Configurar manifest.json com ícones para instalação como app nativo
- [ ] Criar ícones em múltiplos tamanhos (192x192, 512x512)
- [ ] Implementar notificações de sincronização com alertas sonoros
- [ ] Testar modo offline no navegador
- [ ] Verificar instalação como PWA


## Fase 66: PWA Completo e Notificações de Sincronização (CONCLUÍDO)
- [x] Configurar PWA completo com manifest.json e ícones (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512)
- [x] Adicionar meta tags para PWA no index.html (theme-color, apple-mobile-web-app, etc)
- [x] Criar sistema de sons de sincronização (success, error, pending, online, offline, notification)
- [x] Integrar sons nos hooks de sincronização online/offline
- [x] Criar componente SyncSoundSettings para configuração de sons
- [x] Adicionar configuração de sons na aba Geral das Configurações de OS
- [x] Testar funcionalidades no navegador


## Fase 67: QR Code e Backup em Nuvem
- [ ] Sistema de QR Code para acesso rápido às OS/vistorias
- [ ] Geração de QR Code único para cada OS
- [ ] Geração de QR Code único para cada vistoria
- [ ] Página de visualização pública via QR Code
- [ ] Backup automático em nuvem (Google Drive/Dropbox)
- [ ] Interface de configuração de backup
- [ ] Exportação de dados em formato JSON/CSV


## Fase 61: QR Code para Acesso Rápido às OS
- [x] Criar componente QRCodeGenerator.tsx
- [x] Implementar geração de QR Code com link direto para OS
- [x] Adicionar botão de QR Code na página de detalhes da OS
- [x] Permitir download do QR Code como imagem
- [x] Permitir compartilhamento do QR Code

## Fase 62: Backup em Nuvem
- [x] Criar componente BackupNuvem.tsx
- [x] Criar página BackupPage.tsx
- [x] Adicionar rota /dashboard/backup
- [x] Implementar exportação de dados em JSON
- [x] Implementar exportação de dados em CSV
- [x] Implementar importação de backup JSON
- [x] Adicionar seção "Backup e Dados" no menu do Dashboard
- [x] Criar endpoints de API para backup (/api/backup/export, /api/backup/export-csv)

## Correções TypeScript
- [x] Corrigir campos na PublicoView.tsx (localizacao, responsavelNome, categoria)
- [x] Corrigir nome do router de condominios para condominio no index.ts

## Fase 63: Exportação Simplificada para Nuvem
### Exportação de Vistorias
- [x] Criar endpoint para exportar vistoria em PDF
- [x] Criar endpoint para exportar vistoria em JSON
- [x] Adicionar botão "Exportar para Nuvem" na página de vistorias

### Exportação de Checklists
- [x] Criar endpoint para exportar checklist em PDF
- [x] Criar endpoint para exportar checklist em JSON
- [x] Adicionar botão "Exportar para Nuvem" na página de checklists

### Exportação de Manutenções e Ocorrências
- [x] Criar endpoint para exportar manutenção em PDF
- [x] Criar endpoint para exportar ocorrência em PDF
- [x] Adicionar botões de exportação nas páginas

### Página Central de Exportação
- [x] Criar página ExportarNuvem.tsx
- [x] Listar todos os itens exportáveis por categoria
- [x] Permitir exportação em lote (JSON)
- [x] Mostrar instruções para upload em Google Drive, Dropbox, OneDrive

## Fase 64: Sistema de Personalização de Layout
### Backend
- [ ] Criar tabela preferenciasLayout no schema
- [ ] Criar endpoints para salvar/buscar preferências
- [ ] Migrar schema para o banco

### Temas de Cores
- [ ] Tema Laranja (padrão atual)
- [ ] Tema Azul Corporativo
- [ ] Tema Verde Natureza
- [ ] Tema Roxo Elegante

### Opções de Layout
- [ ] Layout Clássico (padrão atual)
- [ ] Layout Compacto (mais informações por tela)
- [ ] Layout Moderno (cards maiores, mais espaçamento)

### Frontend
- [ ] Criar página PersonalizarLayout.tsx
- [ ] Adicionar preview em tempo real dos temas
- [ ] Salvar preferências no localStorage e banco
- [ ] Aplicar tema selecionado em toda aplicação


## Fase 65: Sistema de Personalização de Layout (17/01/2026)
### Backend
- [x] Criar tabela preferencias_layout no schema
- [x] Criar router preferenciasLayout com get e save
- [x] Migrar banco de dados

### CSS/Temas
- [x] Criar variáveis CSS para tema Azul Corporativo
- [x] Criar variáveis CSS para tema Verde Natureza
- [x] Criar variáveis CSS para tema Roxo Elegante
- [x] Criar classes para layout Compacto
- [x] Criar classes para layout Moderno
- [x] Criar classes para tamanhos de fonte

### Frontend
- [x] Criar página PersonalizarLayout.tsx
- [x] Implementar seleção de tema de cores (Laranja, Azul, Verde, Roxo)
- [x] Implementar seleção de tipo de layout (Clássico, Compacto, Moderno)
- [x] Implementar seleção de tamanho de fonte (Pequeno, Médio, Grande)
- [x] Implementar toggle modo escuro
- [x] Criar preview em tempo real
- [x] Adicionar rota no App.tsx
- [x] Adicionar item no menu do Dashboard (seção Personalização)

### Aplicação Global
- [x] Criar hook useLayoutPreferences
- [x] Criar LayoutPreferencesProvider
- [x] Integrar provider no App.tsx
- [x] Persistir preferências no localStorage
- [x] Aplicar preferências automaticamente ao carregar
- [x] Todos os 121 testes passando



## Fase 66: Melhorias no Sistema de Personalização (17/01/2026)
### Novos Temas de Cores
- [x] Adicionar tema Vermelho
- [x] Adicionar tema Marrom
- [x] Adicionar tema Cinza Escuro
- [x] Atualizar página PersonalizarLayout com novos temas

### Personalização por Organização
- [x] Adicionar campos de tema na tabela de organizações
- [x] Criar endpoint para salvar tema da organização
- [x] Aplicar tema da organização como padrão para novos usuários
- [x] Permitir que gestor defina tema padrão da organização

### Exportar/Importar Configurações
- [x] Criar função de exportar configurações para JSON
- [x] Criar função de importar configurações de JSON
- [x] Adicionar botões de exportar/importar na página de personalização
- [x] Validar arquivo importado antes de aplicar


## Fase 67: Melhorias Avançadas de Personalização (17/01/2026)
### Preview Visual de Temas
- [x] Criar componente de miniatura visual para cada tema
- [x] Mostrar preview em tempo real ao passar o mouse
- [x] Adicionar animação suave na transição de preview

### Histórico de Temas
- [x] Criar tabela historico_temas no schema
- [x] Salvar histórico quando tema é alterado
- [x] Criar endpoint para listar histórico
- [x] Adicionar seção de histórico na página de personalização
- [x] Permitir restaurar tema anterior com um clique

### Temas Personalizados
- [x] Criar tabela temas_personalizados no schema
- [x] Criar interface de criação de tema com color picker
- [x] Permitir nomear e salvar temas personalizados
- [x] Listar temas personalizados junto com os padrões
- [x] Permitir editar e excluir temas personalizados

## Fase 68: Aplicação Global de Temas Personalizados (17/01/2026)
### Backend
- [x] Adicionar campo temaPersonalizadoId na tabela preferencias_layout
- [x] Criar endpoint para buscar tema personalizado ativo
- [x] Atualizar endpoint de save para aceitar tema personalizado

### Frontend
- [x] Atualizar LayoutPreferencesProvider para aplicar cores customizadas
- [x] Gerar variáveis CSS dinâmicas a partir das cores do tema personalizado
- [x] Adicionar seção de seleção de temas personalizados na página
- [x] Mostrar temas personalizados junto com os padrões na seleção
- [x] Aplicar tema personalizado em tempo real ao selecionar
