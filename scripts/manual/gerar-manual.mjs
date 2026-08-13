/**
 * Manual completo do usuário: passo a passo de cada tela, perfil por perfil.
 *
 * Rode com `pnpm manual` depois de mexer em tela que o manual descreve — o
 * comando gera este e o resumo das funções. Casca, CSS e ícones vêm de
 * ./comum.mjs.
 */
import {
  aviso,
  bd,
  bg,
  bo,
  bt,
  campo,
  et,
  func,
  ic,
  lista,
  montarHtml,
  passos,
  publicar,
  so,
} from "./comum.mjs";

const corpo = `
<div class="indice">
<b>O que tem neste manual</b>
<ul class="lista">
  <li><a href="#comecar">1. Antes de começar — entrar, senha, sair</a></li>
  <li><a href="#botoes">2. Os botões que aparecem em todas as telas</a></li>
  <li><a href="#gerente">3. Gerente (Sr. Francisco)</a></li>
  <li><a href="#gestor">4. Gestor da unidade</a></li>
  <li><a href="#funcionario">5. Funcionário</a></li>
  <li><a href="#funcoes">6. As funções, uma por uma</a></li>
  <li><a href="#quemve">7. Quem vê o quê</a></li>
  <li><a href="#duvidas">8. Dúvidas rápidas e suporte</a></li>
</ul>
</div>

<h2 id="comecar">1. Antes de começar</h2>

<h3>${ic("log-out")} Entrar no sistema</h3>
${passos([
  `Abra o site <b>appmanutencao.com.br</b> no celular ou no computador.`,
  `Toque em ${bt("Entrar")} , no canto de cima da tela.`,
  `Em <b>Usuário ou E-mail</b>, digite seu e-mail: ${campo("nome@email.com")}`,
  `Em <b>Senha</b>, digite seus <b>6 números</b>: ${campo("• • • • • •")} — para conferir o que digitou, toque no olho ${ic("eye")} .`,
  `Marque <b>Lembrar e-mail e senha neste dispositivo</b> para não digitar tudo de novo na próxima vez.`,
  `Toque em ${bt("Entrar")} . Cada pessoa entra pelo mesmo endereço; o sistema já sabe qual tela abrir.`,
])}

<h3>${ic("key-round")} Primeira vez: criar a sua senha</h3>
${passos([
  `A conta nova vem com uma senha temporária, informada por quem cadastrou você.`,
  `Ao entrar, abre a tela <b>Crie sua senha</b>.`,
  `Digite <b>6 números</b> em <b>Nova senha</b> e repita em <b>Confirmar senha</b>.`,
  `Toque em ${bt("Salvar e entrar")} .`,
])}
${aviso("Atenção:", "enquanto a senha temporária não for trocada, o sistema fica bloqueado. Só existe esta saída — não tem como pular.")}

<h3>${ic("lock")} Esqueci a senha</h3>
${lista([
  `<b>Funcionário:</b> na tela de entrada, toque em <b>Esqueceu a senha?</b>, digite o e-mail do
   login e confirme. Chega um link no e-mail — ele <b>vale 1 hora</b>.`,
  `<b>Gerente e gestor:</b> peça ao gerente para redefinir (botão ${bg("key-round")} na tela
   <b>Gestores</b>). A senha volta para a inicial e o sistema pede uma nova no próximo acesso.`,
  `<b>Se o próprio gerente perdeu a senha:</b> fale com o suporte pelo WhatsApp.`,
])}

<h3>${ic("log-out")} Sair</h3>
<p>Toque em ${bo("Sair", "log-out")} no canto de cima, à direita. Em computador de uso comum, sempre saia ao terminar.</p>

<h2 id="botoes">2. Os botões que aparecem em todas as telas</h2>
<p>São sempre os mesmos, em qualquer função. Se souber estes, sabe usar o sistema todo.</p>

<table>
<tr><th style="width:190px">Botão</th><th>O que faz</th></tr>
<tr><td>${bg("arrow-left")}</td><td><b>Voltar</b> para a tela anterior. Fica sempre no canto de cima, à esquerda.</td></tr>
<tr><td>${bt("Novo", "plus")}</td><td><b>Criar</b> um registro novo (uma O.S., uma tarefa, um checklist…). Abre uma janela para preencher.</td></tr>
<tr><td>${campo("Buscar…")} ${ic("search")}</td><td><b>Procurar</b> por título, número do protocolo, local ou nome. Digite e a lista filtra sozinha.</td></tr>
<tr><td>${bg("pencil")}</td><td><b>Editar</b> o que já está gravado.</td></tr>
<tr><td>${bd()}</td><td><b>Excluir</b>. O sistema <b>pergunta antes</b>: leia e confirme só se tiver certeza. Não dá para desfazer.</td></tr>
<tr><td>${bo("PDF", "printer")}</td><td><b>Gerar o relatório</b> em PDF, com fotos e histórico, para guardar ou enviar.</td></tr>
<tr><td>${bo("QR Code", "qr-code")}</td><td><b>Mostrar o código</b> do registro para imprimir e colar no local. Quem aponta a câmera vê o registro sem precisar de senha.</td></tr>
<tr><td>${bo("Compartilhar", "share-2")}</td><td><b>Enviar por WhatsApp</b> para alguém da equipe, ou ${bo("Copiar", "copy")} o texto.</td></tr>
<tr><td>${bg("sliders-horizontal")}</td><td><b>Permissões</b> — o que cada funcionário pode ver e fazer.</td></tr>
<tr><td>${bo("3", "alert-triangle")}</td><td><b>Problemas reportados</b>. O número é a quantidade que ainda espera solução.</td></tr>
<tr><td>${bg("camera")}</td><td><b>Tirar foto</b> na hora, com a câmera do celular.</td></tr>
<tr><td>${bg("plus")}</td><td><b>Escolher foto</b> que já está guardada no aparelho.</td></tr>
</table>

${aviso("Três coisas valem para tudo:", `
<b>1)</b> todo registro ganha um <b>número de protocolo</b> (ex.: <b>OS-260810-0042</b>) — é por ele que se procura depois.
<b>2)</b> dentro da Ordem de Serviço <b>não existe botão de salvar</b>: o sistema grava sozinho e escreve
${et("As alterações são salvas automaticamente", "verde")} no alto da janela.
<b>3)</b> a foto pode ser tirada no lugar do serviço, direto do celular.`)}

<h2 id="gerente">3. Gerente (Sr. Francisco)</h2>
<div class="perfil">
<p><b>O que o gerente é no sistema:</b> responde por <b>todas as unidades</b>. Vê tudo, cadastra
gestores e funcionários, e decide o que cada um pode fazer.</p>
<p class="quem">Na tela de cadastro de gestor, esse papel aparece escrito como
<b>“Gestor-chefe (várias unidades)”</b> — é a mesma coisa.</p>
</div>

<h3>${ic("building-2")} A tela que abre depois de entrar</h3>
<p>Chama-se <b>Painel Administrativo</b>. Tem três partes:</p>

<h4>1) O calendário, em destaque no alto</h4>
<p>Mostra o mês com <b>tudo que tem data marcada</b>, de todas as funções, pela cor do prazo.
Toque num dia para ver o que vence nele; toque no item para abrir a função de origem.
O passo a passo está em <a href="#f-cal">Calendário</a>.</p>

<h4>2) A faixa de avisos</h4>
<div class="card">
${ic("alert-triangle")} <b>Chamados em aberto (12)</b><br>
<span class="quem">Itens de todas as funções que aguardam resposta ou verificação.</span>
<div style="margin-top:8px">
  <span class="bt bt-o" style="width:100%;justify-content:space-between"><b>4</b> &nbsp;Ordens de Serviço — em aberto ${ic("chevron-right")}</span><br>
  <span class="bt bt-o" style="margin-top:6px;width:100%;justify-content:space-between"><b>3</b> &nbsp;Agenda de Vencimentos — 1 vencido ${ic("chevron-right")}</span>
</div>
</div>
${lista([
  `Cada linha mostra <b>quantos</b> itens esperam você. Toque na linha e o sistema abre a função já naquela lista.`,
  `Quando estiver tudo em dia, a faixa fica verde: ${et("Nada esperando resposta", "verde")} .`,
])}

<h4>3) Os cartões quadrados, dois por linha</h4>
<div class="grade">
  <div class="quadro">${ic("building-2")}<b>Organizações</b><span>as unidades — abrir, editar, excluir</span></div>
  <div class="quadro">${ic("user-cog")}<b>Gestores</b><span>responsáveis pelas unidades</span></div>
  <div class="quadro">${ic("users")}<b>Funcionários</b><span>equipe e permissões</span></div>
  <div class="quadro">${ic("alert-triangle")}<b>Ocorrências</b><span>incidentes com foto e prioridade</span></div>
  <div class="quadro">${ic("wrench")}<b>Manutenções</b><span>entra aqui para as 9 funções</span></div>
</div>
<p>Toque no cartão para abrir. O número grande dentro do cartão é a quantidade já cadastrada.</p>

<h3>${ic("building-2")} Organizações (as unidades)</h3>
${passos([
  `No painel, toque no cartão <b>Organizações</b>.`,
  `Para cadastrar: ${bt("Nova", "plus")} → preencha <b>Nome</b>, <b>Endereço</b>, <b>Cidade</b>, <b>UF</b>, <b>CEP</b> → ${bt("Salvar")} .`,
  `Para corrigir: ${bg("pencil")} no cartão da unidade.`,
  `Para apagar: ${bd()} e confirme. Só o gerente vê este botão.`,
])}

<h3>${ic("user-cog")} Gestores</h3>
${passos([
  `No painel, toque no cartão <b>Gestores</b>.`,
  `${bt("Novo", "plus")} → <b>Nome</b>, <b>E-mail</b>, <b>Telefone</b>.`,
  `Em <b>Papel</b>, escolha: <b>Gestor da unidade</b> (cuida de uma) ou <b>Gestor-chefe</b> (cuida de várias — é o caso do gerente).`,
  `Em <b>Unidades</b>, marque as unidades dessa pessoa.`,
  `${bt("Salvar")} . Aparece um aviso verde com a <b>senha inicial</b> — passe para a pessoa; ela troca no primeiro acesso.`,
])}
<p><b>No cartão de cada gestor:</b>
${bg("pencil")} editar ·
${bg("key-round")} redefinir a senha ·
${bg("lock")} bloquear o acesso (${bg("lock-open")} para liberar de novo) ·
${bd()} excluir.</p>
${lista([
  `A conta marcada com a coroa ${ic("crown")} <b>Gestor master</b> não pode ser bloqueada nem excluída — é a que manda em tudo.`,
  `${et("senha provisória", "amarelo")} no cartão quer dizer que a pessoa ainda não criou a senha dela.`,
  `${et("bloqueado", "vermelho")} quer dizer que a pessoa não consegue entrar.`,
])}

<h3>${ic("users")} Funcionários e permissões</h3>
${passos([
  `No painel, toque no cartão <b>Funcionários</b>.`,
  `No alto, escolha a unidade no seletor ${campo("Organização ▾")} .`,
  `${bt("Novo", "plus")} → <b>Nome</b>, <b>Cargo</b>, <b>Tipo</b>, <b>E-mail</b>, <b>Telefone</b>, <b>WhatsApp</b>.`,
  `Em <b>Acesso ao portal</b>: escreva o <b>E-mail de login</b> e uma senha de <b>6 números</b>. Deixando a senha em branco, a pessoa fica apenas cadastrada, sem entrar no sistema.`,
  `${bt("Salvar")} .`,
  `Agora defina o que ela vê: toque em ${bg("sliders-horizontal")} no cartão dela.`,
])}
<h4>A janela de permissões</h4>
<p>Uma linha por função e três chaves em cada linha:</p>
<table>
<tr><th style="width:150px">Chave</th><th>O que acontece</th></tr>
<tr><td><b>Ver</b></td><td>A função aparece na tela do funcionário. Desligada, ele nem vê o cartão.</td></tr>
<tr><td><b>Criar</b></td><td>Ele pode registrar coisas novas. Desligada, ele só olha.</td></tr>
<tr><td><b>Excluir</b></td><td>Só existe em <b>Ordens de Serviço</b>. Apagar leva fotos, anexos e histórico junto — deixe desligada se a equipe só precisa registrar.</td></tr>
</table>
<p>Ao terminar: ${bt("Salvar permissões")} .</p>
${aviso("Como já nasce:", "toda função vem com <b>Ver</b> e <b>Criar</b> ligados e <b>Excluir</b> desligado. Você só mexe no que quiser tirar.")}
<p><b>Cartão do funcionário:</b> ${et("acesso ativo", "verde")} entra no sistema ·
${et("sem acesso", "azul")} só cadastrado. Botões: ${bg("sliders-horizontal")} permissões ·
${bg("pencil")} editar · ${bd()} excluir.</p>

<h3>${ic("wrench")} Manutenções — a porta das 8 funções</h3>
<p>No painel, toque no cartão <b>Manutenções</b>. Abre uma tela com nove quadrados:</p>
<div class="grade">
  <div class="quadro">${ic("calendar-days")}<b>Calendário</b><span>tudo com data, num mês só</span></div>
  <div class="quadro">${ic("clipboard-list")}<b>Ordens de Serviço</b><span>abertura, execução, conclusão</span></div>
  <div class="quadro">${ic("calendar-clock")}<b>Agenda de Vencimentos</b><span>contratos e serviços com prazo</span></div>
  <div class="quadro">${ic("clipboard-check")}<b>Checklists</b><span>itens, antes e depois</span></div>
  <div class="quadro">${ic("list-checks")}<b>Lista de Tarefas</b><span>quem faz, quando e com que foto</span></div>
  <div class="quadro">${ic("eye")}<b>Vistorias</b><span>inspeção item por item</span></div>
  <div class="quadro">${ic("columns-3")}<b>Quadro de Atividades</b><span>colunas do que está andando</span></div>
  <div class="quadro">${ic("qr-code")}<b>QR Code</b><span>etiqueta no local, registro pela câmera</span></div>
  <div class="quadro">${ic("wrench")}<b>Registro de Manutenções</b><span>o que já foi registrado</span></div>
</div>
<p>O passo a passo de cada uma está na <a href="#funcoes">parte 6</a>.</p>

<h3>${ic("building-2")} Trocar de unidade</h3>
${passos([
  `Abra <b>Funcionários</b> (ou <b>Registro de Manutenções</b>).`,
  `Toque no seletor ${campo("Organização ▾")} e escolha a unidade.`,
  `O sistema <b>guarda a escolha</b>: painel, ordens de serviço e todas as funções passam a mostrar essa unidade até você trocar de novo.`,
])}
${aviso("Importante:", "os números do painel são sempre <b>de uma unidade só</b> — a que está escolhida. Não existe soma de todas as unidades numa tela.")}

${so("gerente (não aparece para os gestores de unidade)", `
criar e excluir unidade ·
criar gestor, redefinir a senha de um gestor, bloquear e excluir gestor ·
ver a equipe inteira de cada unidade ·
ligar e desligar funções da unidade (tela <b>Módulos</b>, aberta digitando o endereço
<b>appmanutencao.com.br/admin/modulos</b>).`)}

<h2 id="gestor">4. Gestor da unidade</h2>
<div class="perfil">
<p><b>O que é:</b> responde por <b>uma unidade</b>. A tela é a mesma do gerente e as 8 funções
são as mesmas — só que tudo o que ele vê é da sua unidade.</p>
</div>

<h3>O que o gestor faz igual ao gerente</h3>
${lista([
  `Vê a faixa <b>Chamados em aberto</b> e entra em qualquer função pelo cartão <b>Manutenções</b>.`,
  `Cadastra e edita <b>funcionários</b> da unidade e define as <b>permissões</b> de cada um.`,
  `Cria, acompanha, finaliza, gera PDF e compartilha em todas as funções.`,
  `Reabre O.S. finalizada e responde os registros que chegam pelo QR Code.`,
])}

<h3>O que não aparece para ele</h3>
${lista([
  `Em <b>Gestores</b>: o botão ${bt("Novo", "plus")} e os botões ${bg("key-round")} ${bg("lock")} ${bd()} . Ele vê apenas a própria conta na lista.`,
  `Em <b>Organizações</b>: os botões ${bt("Nova", "plus")} e ${bd()} — ele vê só a unidade dele.`,
  `A tela <b>Módulos</b>, que liga e desliga funções da unidade.`,
])}
${aviso(
  "O gestor faz, sim:",
  `<b>reabrir</b> uma O.S. finalizada e ligar o <b>envio automático de avisos</b> da O.S. para a
   equipe. Isso é de quem responde pela unidade — o funcionário não tem esses botões.`,
)}
${aviso("Sobre a lista de funcionários:", "o gestor de unidade vê na lista <b>as pessoas que ele mesmo cadastrou</b>. O gerente vê a equipe inteira da unidade.")}

<h2 id="funcionario">5. Funcionário</h2>
<div class="perfil">
<p><b>O que é:</b> quem executa e registra o serviço, normalmente pelo celular.
Ele vê <b>somente as funções que o gerente liberou</b> para ele.</p>
</div>

<h3>${ic("users")} A tela que abre depois de entrar</h3>
<p>Chama-se <b>Portal do Funcionário</b>. Em cima aparece o seu nome e o seu cargo; no meio,
um cartão para cada função liberada:</p>
<div class="grade">
  <div class="quadro">${ic("clipboard-check")}<b>Checklists</b><span>verificações do dia</span></div>
  <div class="quadro">${ic("wrench")}<b>Manutenções</b><span>registrar e acompanhar</span></div>
  <div class="quadro">${ic("alert-triangle")}<b>Ocorrências</b><span>relatar problema</span></div>
  <div class="quadro">${ic("eye")}<b>Vistorias</b><span>inspeções</span></div>
  <div class="quadro">${ic("list-checks")}<b>Lista de Tarefas</b><span>o que foi pedido para você</span></div>
  <div class="quadro">${ic("columns-3")}<b>Quadro de Atividades</b><span>o andamento da equipe</span></div>
  <div class="quadro">${ic("clipboard-list")}<b>Ordens de Serviço</b><span>abrir e acompanhar</span></div>
  <div class="quadro">${ic("qr-code")}<b>QR Code</b><span>registros recebidos</span></div>
</div>
${passos([
  `Toque no cartão da função.`,
  `Faça o registro (o passo a passo está na <a href="#funcoes">parte 6</a>).`,
  `Para voltar aos cartões, toque em ${bg("arrow-left")} no canto de cima.`,
])}
${aviso("Não aparece nenhum cartão?", "o gerente ainda não liberou funções para você. Fale com ele.")}
${aviso("Trabalha em mais de uma unidade?", "a primeira tela mostra a lista de unidades. Toque na sua unidade para continuar.")}

<h3>O que o funcionário não faz</h3>
${lista([
  `Não vê outras unidades, nem a equipe, nem gestores.`,
  `Não <b>reabre</b> uma O.S. finalizada — isso é do gestor.`,
  `Só <b>exclui</b> se o gestor tiver ligado essa chave para ele.`,
  `Se a chave <b>Criar</b> estiver desligada, a tela abre <b>só para consulta</b>: aparece a lista, não aparece o formulário.`,
])}

<h2 id="funcoes">6. As funções, uma por uma</h2>
<p class="sub">Cada função tem um cartão por registro, e no pé do cartão sempre os mesmos botões:
${bo("Finalizar", "check-circle-2")} ${bo("QR Code", "qr-code")} ${bo("PDF", "printer")}
${bo("Compartilhar", "share-2")} ${bd()} .</p>

${func("f-cal", "calendar-days", "Calendário", "Gerente e gestor. É a primeira coisa que aparece no painel: o mês com tudo que tem data marcada, de todas as funções.", `
<h4>Ler as cores</h4>
${lista([
  `${et("vermelho", "vermelho")} — <b>passou do prazo</b> e ninguém resolveu.`,
  `${et("amarelo", "amarelo")} — <b>está chegando</b>: vence em até 7 dias.`,
  `${et("verde", "verde")} — <b>dentro do prazo</b>, ainda há tempo.`,
  `<b>cinza</b> — <b>já resolvido</b>; fica no calendário como histórico.`,
])}
${passos([
  `No painel, o calendário já está aberto. Para a tela cheia, toque em ${bo("Abrir")} — ou em
   <b>Manutenções → Calendário</b>.`,
  `Os três números do alto contam o mês inteiro: passou do prazo, está chegando, dentro do prazo.`,
  `Use ${bg("chevron-left")} e ${bg("chevron-right")} para trocar de mês.`,
  `Toque num <b>dia com bolinha colorida</b>: a lista daquele dia abre embaixo. O número na
   bolinha é a quantidade de itens.`,
  `Toque no item da lista: o sistema <b>abre a função de origem</b>, já filtrada pelo protocolo
   daquele registro — é o atalho.`,
  `Na tela cheia, os botões redondos filtram por função: <b>Vencimentos</b>, <b>Manutenções</b>,
   <b>Checklists</b>, <b>Vistorias</b>, <b>Tarefas</b>, <b>Atividades</b>.`,
])}
${aviso(
  "O que entra no calendário:",
  `a data de vencimento dos <b>vencimentos</b>; a data agendada de <b>manutenções</b>,
   <b>vistorias</b> e <b>checklists</b>; as <b>tarefas</b> — inclusive as que se repetem, que
   aparecem em cada dia em que caem; e as <b>atividades</b> do quadro com data marcada.
   e as <b>ordens de serviço</b>, pelo dia programado — ou pela data máxima, enquanto o
   gerente não programou.`,
)}
`)}

${func("f-os", "clipboard-list", "Ordens de Serviço (O.S.)", "Gerente, gestor e funcionário com a função liberada. É a função mais completa: use quando o serviço tem começo, meio e fim.", `
<h4>Abrir uma O.S.</h4>
${passos([
  `Toque em ${bt("Nova O.S.", "plus")} , no canto de cima.`,
  `<b>Título</b>: ${campo("Ex: Manutenção do elevador")}`,
  `<b>Descrição</b>: conte o problema com detalhe.`,
  `<b>Categoria</b>, <b>Prioridade</b> e <b>Status inicial</b>: escolha nas listas ▾.`,
  `<b>Local</b>: ${campo("Ex: Bloco A - 3º andar")}`,
  `<b>Fotos de antes e depois</b>: já na abertura, dois lados com câmera e galeria. A foto do
   problema é o “antes”; o “depois” pode entrar agora ou quando o serviço terminar.`,
  `<b>Responsáveis pela O.S.</b>: marque uma ou mais pessoas da equipe.`,
  `Toque em ${bt("Criar Ordem de Serviço", "plus")} . Aparece o aviso com o número: <b>O.S. OS-260810-0042 criada</b>.`,
])}
${aviso(
  "No relatório em PDF:",
  `as fotos saem <b>lado a lado</b> — coluna ANTES à esquerda, DEPOIS à direita, uma linha por
   par. Faltando um dos lados, o lugar aparece marcado como "Sem foto de depois".`,
)}
<h4>Acompanhar na lista</h4>
${lista([
  `Cada cartão mostra ${ic("hash")} o protocolo, o título, o responsável, o local, a data e duas etiquetas coloridas: <b>prioridade</b> e <b>status</b>.`,
  `Para mudar o andamento sem abrir nada: use a lista ${campo("Status ▾")} no pé do cartão.`,
  `Os botões redondos de cima (${et("Todas", "azul")} e um por status) filtram a lista.`,
  `No fim da tela há o gráfico <b>Resumo por Status</b>, com a contagem de cada situação.`,
])}
<h4>Dentro da O.S. — toque em ${bo("Abrir O.S.")}</h4>
${passos([
  `No alto: o <b>protocolo</b>, o <b>QR Code</b> da O.S. e ${bo("Baixar PDF", "printer")} .`,
  `${bo("Iniciar serviço", "play")} — marca a hora em que o trabalho começou.`,
  `<b>Fotos:</b> escolha a fase ${campo("Antes ▾")} (Antes, Durante, Depois) e toque em ${bg("camera")} para fotografar ou ${bg("plus")} para pegar do aparelho. Antes e Depois ficam lado a lado. O seletor muda de cor conforme a fase — âmbar no Antes, verde no Depois.`,
  `<b>Anexos:</b> ${bo("Anexar arquivo")} para orçamento, nota, laudo.`,
  `<b>Responsáveis:</b> marque ou desmarque quem está no serviço.`,
  `<b>Histórico:</b> escreva o que aconteceu e toque em ${bt("Enviar")} . Fica registrado com data, hora e nome.`,
  `${bo("Finalizar serviço", "check-circle-2")} quando o serviço estiver pronto.`,
  `<b>Avaliação:</b> toque nas estrelas ${ic("star")} , escreva um comentário se quiser, e ${bt("Avaliar")} .`,
])}
${aviso("Não procure o botão salvar:", "aqui tudo grava na hora. No alto fica escrito <b>As alterações são salvas automaticamente</b> e, depois de cada gravação, <b>Salvo às 14:32</b>.")}
${so("gestor", `${bo("Reabrir", "rotate-ccw")} , que só aparece depois de finalizada. O sistema pergunta
<b>por que</b> está reabrindo, e o motivo entra no histórico.`)}

<h4>Se a sua unidade usa o fluxo com prazo e confirmação</h4>
<p>O gerente liga essa forma de trabalhar na própria O.S., em <b>Avisos ao abrir a O.S.</b>. Com
ela, a ordem passa por cinco etapas, e a etiqueta do cartão mostra em qual delas está:</p>
${passos([
  `<b>O gestor abre</b> a O.S. com a <b>data máxima de finalização</b> — sem ela o sistema não
   aceita, porque é o prazo que cobra a data no calendário.`,
  `A ordem entra no calendário como ${et("Aguardando programação", "amarelo")} .`,
  `<b>O gerente programa pelo calendário:</b> toca no item, em
   ${bo("Programar data", "calendar-clock")} , escolhe a data e marca <b>quem vai fazer o
   serviço</b> — tudo na mesma janela, uma ordem depois da outra. Dá no mesmo abrir a O.S. e usar
   <b>Programar o serviço</b>.`,
  `<b>A equipe executa</b> e, no lugar de finalizar, toca em ${bo("Dar baixa", "check-circle-2")}
   — com as fotos já anexadas e uma observação do que foi feito.`,
  `<b>O gestor confere:</b> ${bo("Confirmar baixa", "check-circle-2")} , ou
   ${bo("Devolver", "rotate-ccw")} escrevendo o motivo, e a ordem volta para a equipe.`,
  `<b>O gerente finaliza.</b> Antes da confirmação do gestor, o botão de finalizar não funciona
   nem para ele.`,
])}
${aviso(
  "Onde cada um vê o que falta:",
  `na faixa do painel. O gerente tem <b>Serviços a programar</b> e <b>Ordens a finalizar</b>; o
   gestor tem <b>Baixas a confirmar</b>. Cada linha leva direto à lista.`,
)}
`)}

${func("f-venc", "calendar-clock", "Agenda de Vencimentos", "Gerente e gestor. Para contratos e serviços que têm prazo: dedetização, extintor, limpeza de caixa d'água, seguro.", `
<h4>Ler a tela</h4>
${lista([
  `Três números em cima: <b>Ativos</b>, <b>Próximos 30 dias</b> (amarelo) e <b>Vencidos</b> (vermelho).`,
  `${bo("Lista", "list")} mostra em forma de lista; ${bo("Calendário", "calendar-days")} mostra no mês.`,
  `Os botões redondos filtram por tipo e por situação: <b>Vencidos</b>, <b>Próximos</b>, <b>Em dia</b>.`,
])}
<h4>Cadastrar um vencimento</h4>
${passos([
  `${bt("Novo", "plus")} .`,
  `<b>Título</b>: ${campo("Ex: Contrato de dedetização")} .`,
  `Escolha o <b>tipo</b> e a <b>data de vencimento</b>.`,
  `<b>Avisos:</b> escolha ${campo("Dias antes ▾")} (ex.: 30) ou ${campo("Data específica ▾")} . Pode colocar vários.`,
  `<b>E-mails:</b> digite ${campo("nome@empresa.com.br")} de quem deve receber o aviso.`,
  `Anexe fotos ou o documento, se tiver, e ${bt("Salvar")} .`,
])}
<h4>No cartão de cada vencimento</h4>
${lista([
  `A etiqueta mostra a situação e quantos dias faltam (ou de atraso).`,
  `${bo("Editar", "pencil")} corrige os dados.`,
  `${bo("Antes e depois", "clipboard-list")} registra o serviço feito, com foto de antes e de depois.`,
  `${ic("bell")} quantos avisos estão programados · ${ic("mail")} quantos e-mails vão receber.`,
  `${bg("settings-2")} , no alto da tela, cadastra os <b>tipos de manutenção</b> da sua unidade.`,
])}
`)}

${func("f-check", "clipboard-check", "Checklists", "Gerente, gestor e funcionário com a função liberada. Para a verificação do dia a dia, item por item.", `
<h4>Criar — duas maneiras</h4>
${passos([
  `${bt("Novo", "plus")} .`,
  `Na chave do alto, escolha: <b>Pré-definido</b> (você monta a lista e manda alguém executar) ou <b>Ao vivo</b> (você está no local e vai marcando na hora).`,
  `<b>Título</b>: ${campo("Ex: Limpeza da cozinha")} · <b>Local</b>: ${campo("Ex.: cozinha, pátio")} · <b>Tipo</b>: Diária, Semanal, Mensal ou Especial.`,
  `<b>Enviar para</b> (ou <b>Quem está executando</b>): escolha a pessoa na lista ▾.`,
  `Escreva os itens, um por linha. Para mais linhas, toque em ${bo("Item", "plus")} .`,
  `No modo <b>Ao vivo</b>, cada item já tem ${bg("camera")} para foto e espaço para observação.`,
  `${bt("Criar checklist", "plus")} — ou ${bt("Salvar checklist", "save")} no modo ao vivo.`,
])}
<h4>Executar e acompanhar</h4>
${lista([
  `A barra verde do cartão mostra o quanto já foi feito: <b>4/10 (40%)</b>.`,
  `Para marcar um item como feito, toque no círculo ${ic("check-circle-2")} do lado esquerdo. Ele fica riscado.`,
  `${ic("alert-triangle")} do item: anexar foto e escrever o que viu. Quando o item tem registro, o triângulo fica <b>amarelo</b>.`,
  `${bg("more-vertical")} do item: abre <b>Ações</b> — <b>Reportar problema</b> (com foto e prioridade) e <b>Antes e depois</b>.`,
  `${bd()} no alto do cartão apaga o checklist inteiro.`,
])}
<h4>Ver os problemas que a equipe reportou</h4>
<p>No alto da tela, toque em ${bo("3", "alert-triangle")} — o número é quanto ainda falta resolver.
Abre a lista <b>Problemas reportados</b>, com protocolo, foto, prioridade, quem reportou e a situação
(${et("Aberto", "amarelo")} ${et("Em andamento", "azul")} ${et("Resolvido", "verde")}).</p>
${aviso(
  "No celular do funcionário a tela é mais simples:",
  `um formulário com <b>Título</b>, <b>Descrição</b>, <b>Localização</b>, <b>Prioridade</b> e
   ${ic("image-plus")} <b>Anexar imagens</b>, e o botão ${bt("Criar registro")} . A lista fica ao
   lado, com Finalizar, QR Code, PDF e Compartilhar.`,
)}
`)}

${func("f-vist", "eye", "Vistorias", "Gerente, gestor e funcionário com a função liberada. Para inspecionar e provar com foto o estado de cada item.", `
${passos([
  `${bt("Nova", "plus")} .`,
  `Escolha <b>Pré-definida</b> (lista montada antes) ou <b>Ao vivo</b> (registro no local).`,
  `<b>Título</b>: ${campo("Ex: Vistoria mensal do bloco A")} , mais local e tipo.`,
  `Escreva os itens; use ${bo("Item", "plus")} para acrescentar linhas.`,
  `${bt("Criar")} — no modo ao vivo, cada item já sai com foto e descrição.`,
])}
<h4>Trabalhando na vistoria</h4>
${lista([
  `Em cada item: ${bg("camera")} tirar foto e descrever · ${bg("image-plus")} ver galeria, descrição e situação · ${bg("more-vertical")} ações.`,
  `Em <b>Ações</b> você <b>reporta um problema</b> (com prioridade Baixa, Média, Alta ou Urgente) ou registra <b>Antes e depois</b>.`,
  `Para acrescentar item durante a vistoria: campo ${campo("Novo item da vistoria…")} no pé da lista.`,
  `${bo("PDF", "printer")} gera o relatório com as fotos, pronto para enviar.`,
])}
`)}

${func("f-tarefas", "list-checks", "Lista de Tarefas", "Gerente, gestor e funcionário com a função liberada. Para o serviço que se repete: quem faz, com que frequência, e a prova de que foi feito.", `
<p>A faixa laranja ${bo("Como funciona", "clipboard-list")} ${ic("chevron-down")} , no alto, explica a função em quatro linhas.</p>
<h4>Criar a tarefa</h4>
${passos([
  `${bt("Criar Tarefa", "plus")} .`,
  `<b>Título</b>: ${campo("Ex: Limpeza do hall de entrada")} .`,
  `<b>Funcionário</b>: escolha na lista ▾ quem vai fazer.`,
  `<b>Unidade</b>, <b>Setor</b> e <b>Local</b>: onde é o serviço.`,
  `<b>Prioridade</b>: Baixa, Média, Alta ou Urgente.`,
  `<b>Recorrência</b>: <b>Data Específica</b>, <b>Diária</b>, <b>Semanal</b> (marque os dias) ou <b>Mensal</b> (escolha o dia do mês).`,
  `${bt("Criar Tarefa", "plus")} .`,
])}
<h4>Registrar que foi feito — quem executa</h4>
${passos([
  `No cartão da tarefa, toque em ${bo("Registrar execução", "check-circle-2")} .`,
  `Escreva como ficou: ${campo("Como ficou a execução…")} .`,
  `Anexe a foto do serviço.`,
  `Confirme. A tarefa passa a contar <b>1 execução</b>.`,
])}
<h4>Conferir — aba <b>Acompanhamento</b></h4>
${lista([
  `Filtre por ${campo("Funcionário ▾")} e por período: ${campo("Último dia ▾")} , 7 dias ou 30 dias.`,
  `Quatro números: <b>Total</b>, ${et("Realizadas", "verde")} , ${et("Pendentes", "amarelo")} e ${et("Não executadas", "vermelho")} .`,
])}
<p>No alto: ${bo("Compartilhar", "share-2")} · ${bg("printer")} imprimir · ${bt("", "file-text")} PDF da lista.</p>
`)}

${func("f-quadro", "columns-3", "Quadro de Atividades", "Gerente, gestor e funcionário com a função liberada. Mostra, num olhar, o que a equipe está fazendo.", `
<h4>As quatro colunas</h4>
${lista([
  `${et("A Fazer", "azul")} — ainda não começou.`,
  `${et("Em Andamento", "amarelo")} — alguém está fazendo.`,
  `${et("Em Revisão", "azul")} — feito, esperando conferência.`,
  `${et("Concluído", "verde")} — encerrado.`,
])}
${passos([
  `Para mover uma atividade, <b>arraste o cartão</b> para a coluna nova (no celular, segure e arraste).`,
  `Para criar: ${bt("Nova Atividade", "plus")} → título, responsável, prioridade e rotina.`,
  `Para trazer algo que já existe: em <b>Adicionar por protocolo</b>, digite o número — ${campo("Ex.: VNC-000012, OS-260810-4821")} — escolha a coluna e toque em ${bo("Buscar")} , depois em ${bt("Adicionar")} .`,
  `${bo("Kanban", "columns-3")} mostra em colunas; ${bo("Lista", "list")} mostra tudo de uma vez.`,
  `${bg("printer")} no título da coluna gera o PDF daquela coluna inteira.`,
])}
`)}

${func("f-qr", "qr-code", "QR Code", "Gerente, gestor e funcionário com a função liberada. Uma etiqueta em cada ponto: quem passa aponta a câmera e relata o problema, sem ter conta no sistema.", `
<h4>Criar e colar a etiqueta</h4>
${passos([
  `${bt("Novo", "plus")} .`,
  `<b>Tipo</b>: <b>Local</b> (ex.: cozinha) ou <b>Item</b> (ex.: extintor do corredor).`,
  `<b>Nome</b>: ${campo("Ex: Cozinha")} · <b>Descrição</b>: a instrução para quem escanear.`,
  `${bt("Gerar código", "plus")} .`,
  `No cartão, toque em ${bo("Imprimir", "printer")} e cole o papel no lugar.`,
])}
<h4>Ver e responder o que chegou</h4>
${passos([
  `Toque na aba ${bo("Registros recebidos", "inbox")} . A bolinha vermelha mostra quantos são novos.`,
  `Cada registro traz o protocolo, quem avisou, o texto, as fotos, a data e o mapa do local.`,
  `Mude a situação na lista ▾: <b>Nova</b>, <b>Em andamento</b>, <b>Resolvida</b>.`,
  `Se a pessoa deixou e-mail, toque em ${bo("Responder", "mail")} , escreva a resposta, anexe fotos e ${bt("Enviar resposta", "mail")} .`,
])}
`)}

${func("f-manut", "wrench", "Registro de Manutenções", "Gerente, gestor e funcionário com a função liberada. É o histórico do que foi consertado e trocado.", `
${lista([
  `Cinco números em cima: <b>Total</b>, ${et("Pendentes", "amarelo")} , ${et("Requer ação", "vermelho")} , ${et("Realizadas", "azul")} e ${et("Finalizadas", "verde")} .`,
  `Procure por protocolo, título, local ou responsável, e filtre por ${campo("Todos os status ▾")} .`,
  `${bt("Nova", "plus")} abre o cadastro; o protocolo é gerado sozinho.`,
  `Toque no cartão para abrir o registro: fotos <b>Antes</b> e <b>Depois</b>, descrição e histórico.`,
  `No pé do cartão: ${bo("QR Code", "qr-code")} ${bo("PDF", "printer")} ${bo("Compartilhar", "share-2")} .`,
])}
${aviso(
  "No celular do funcionário:",
  `esta função abre a tela simples — formulário com título, descrição, localização, prioridade e
   fotos, e a lista ao lado. É a mesma tela de <b>Ocorrências</b>.`,
)}
`)}

${func("f-ocor", "alert-triangle", "Ocorrências", "Gerente, gestor e funcionário com a função liberada. O registro rápido de um problema ou incidente.", `
${passos([
  `Abra <b>Ocorrências</b> (cartão do painel ou do portal).`,
  `No formulário: <b>Título</b>, <b>Descrição</b>, <b>Localização</b>.`,
  `<b>Prioridade</b>: toque em Baixa, Média, Alta ou Urgente.`,
  `${ic("image-plus")} <b>Anexar imagens</b> — pode ser a foto tirada na hora.`,
  `${bt("Criar registro")} .`,
  `Depois, no cartão: ${bo("Finalizar", "check-circle-2")} quando resolver, e ${bo("PDF", "printer")} para o relatório.`,
])}
`)}

<h2 id="quemve">7. Quem vê o quê</h2>
<table>
<tr>
  <th>O que é</th>
  <th class="c">Gerente<br><span style="font-weight:400">(Sr. Francisco)</span></th>
  <th class="c">Gestor da<br>unidade</th>
  <th class="c">Funcionário</th>
</tr>
<tr><td>Todas as unidades</td><td class="c sim">sim</td><td class="c nao">só a dele</td><td class="c nao">só a dele</td></tr>
<tr><td>Faixa <b>Chamados em aberto</b></td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c nao">não</td></tr>
<tr><td>As 8 funções de manutenção</td><td class="c sim">todas</td><td class="c sim">todas</td><td class="c">só as liberadas</td></tr>
<tr><td>Criar e excluir unidade</td><td class="c sim">sim</td><td class="c nao">não</td><td class="c nao">não</td></tr>
<tr><td>Criar gestor / redefinir senha / bloquear</td><td class="c sim">sim</td><td class="c nao">não</td><td class="c nao">não</td></tr>
<tr><td>Cadastrar funcionário e dar permissões</td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c nao">não</td></tr>
<tr><td>Programar a data e a equipe (fluxo)</td><td class="c sim">sim</td><td class="c nao">não</td><td class="c nao">não</td></tr>
<tr><td>Dar baixa no serviço (fluxo)</td><td class="c nao">não</td><td class="c nao">não</td><td class="c sim">se designado</td></tr>
<tr><td>Confirmar a baixa (fluxo)</td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c nao">não</td></tr>
<tr><td>Finalizar no fluxo com confirmação</td><td class="c sim">sim</td><td class="c nao">não</td><td class="c nao">não</td></tr>
<tr><td>Reabrir O.S. finalizada</td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c nao">não</td></tr>
<tr><td>Excluir registro</td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c">só se liberado</td></tr>
<tr><td>Ligar e desligar funções (Módulos)</td><td class="c sim">sim</td><td class="c nao">não</td><td class="c nao">não</td></tr>
<tr><td>Calendário de todas as datas</td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c nao">não</td></tr>
<tr><td>Gerar PDF e compartilhar</td><td class="c sim">sim</td><td class="c sim">sim</td><td class="c sim">sim</td></tr>
</table>
${aviso("A regra em uma frase:", "o <b>gerente</b> manda em todas as unidades; o <b>gestor</b> manda na dele; o <b>funcionário</b> registra o serviço nas funções que abriram para ele.")}

<h2 id="duvidas">8. Dúvidas rápidas e suporte</h2>
<h4>Onde clico para salvar?</h4>
<p>Nos formulários, no botão laranja do fim (${bt("Salvar")} , ${bt("Criar registro")} , ${bt("Criar Tarefa")} ).
Dentro da <b>Ordem de Serviço</b> não tem botão: grava sozinho.</p>

<h4>Onde vejo o número do registro?</h4>
<p>Sempre no alto do cartão, com o desenho ${ic("hash")} . É o <b>protocolo</b> — use ele para procurar
${ic("search")} , para citar no WhatsApp e para trazer o registro ao Quadro de Atividades.</p>

<h4>Como envio para alguém?</h4>
<p>${bo("Compartilhar", "share-2")} → a lista mostra as pessoas da equipe com WhatsApp cadastrado.
Toque no nome e o WhatsApp abre com a mensagem pronta. Ou use ${bo("Copiar", "copy")} e cole onde quiser.
Se ninguém aparecer, é porque falta preencher o WhatsApp na ficha do funcionário.</p>

<h4>Como faço um relatório com as fotos?</h4>
<p>${bo("PDF", "printer")} no cartão do registro. O arquivo baixa no aparelho e pode ser enviado ou impresso.</p>

<h4>Apaguei sem querer. Volta?</h4>
<p>Não. Por isso o sistema pergunta antes. Ao apagar uma O.S., vão junto as fotos, os anexos e o histórico.</p>

<h4>Errei a senha três vezes e travou</h4>
<p>Espere alguns minutos e tente de novo, com calma. Se não entrar, peça ao gerente para redefinir.</p>

<h4>Preciso de ajuda de verdade</h4>
<p>Na tela de entrada há o botão verde ${bo("Fale com suporte", "message-circle")} .
Dentro do sistema, o balão verde ${ic("message-circle")} fica no canto da tela. Os dois abrem o WhatsApp do suporte.</p>

<div class="rodape">
<p><b>App Manutenção</b> — appmanutencao.com.br · Suporte pelo WhatsApp (11) 93328-4364.</p>
<p>Este manual também é um arquivo em PDF: na tela de entrada do sistema, toque em
<b>Baixar em PDF</b> para guardar no aparelho, ou em <b>WhatsApp</b> para enviar a alguém.</p>
</div>
`;

await publicar({
  base: "manual-app-manutencao",
  rodapePdf: "Manual do App Manutenção",
  html: montarHtml({
    titulo: "Manual do App Manutenção",
    subtitulo:
      "Passo a passo, com os mesmos botões e desenhos que aparecem na tela. " +
      "Os botões deste manual são só ilustração — para usar, toque nos botões do sistema.",
    corpo,
  }),
});
