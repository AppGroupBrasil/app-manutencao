/**
 * Resumo das funções: o que cada uma faz, onde fica, quem envia para quem e
 * quem vê o quê. Uma folha para consulta rápida, sem o passo a passo de tela —
 * esse fica no manual completo (gerar-manual.mjs).
 *
 * Rode com `pnpm manual`. Casca, CSS e ícones vêm de ./comum.mjs.
 */
import {
  aviso,
  bd,
  bo,
  bt,
  campo,
  et,
  ic,
  linha,
  lista,
  montarHtml,
  publicar,
} from "./comum.mjs";

/** Cartão compacto de função: quatro perguntas, quatro respostas. */
const fn = (icone, titulo, { faz, fica, vai, ve }) => `
<section class="fn compacta">
  <h3>${ic(icone)} ${titulo}</h3>
  ${linha("Faz:", faz)}
  ${linha("Fica em:", fica)}
  ${linha("Vai de quem para quem:", vai)}
  ${linha("Vê:", ve)}
</section>`;

const PORTAL = "portal do funcionário";
// Caminho em texto, não em botão: o botão já aparece na abertura, e repetir o
// desenho em nove cartões só engorda a folha.
const CAMINHO = (nome) =>
  `Painel → ${ic("wrench")} <b>Manutenções</b> → <b>${nome}</b>`;
const LIBERADA = `gerente, gestor da unidade e funcionário com a chave <b>Ver</b> ligada.
  Sem a chave <b>Criar</b>, a tela abre só para consulta.`;

const corpo = `
<div class="perfil">
${linha(
  "Gerente (a conta principal):",
  "responde por todas as unidades; cadastra gestores e funcionários e decide o que cada um vê.",
)}
${linha(
  "Gestor da unidade:",
  "mesma tela e as mesmas funções, só da unidade dele.",
)}
${linha(
  "Funcionário:",
  "vê apenas as funções liberadas para ele, normalmente pelo celular.",
)}
</div>

${lista([
  `<b>Onde as funções moram:</b> gerente e gestor entram por <b>Painel → ${bo("Manutenções", "wrench")}</b>,
   que tem um quadrado por função. O funcionário vê um <b>cartão por função liberada</b> no
   <b>Portal do Funcionário</b>.`,
  `<b>A permissão é por pessoa e por função</b>, na tela Funcionários: <b>Ver</b>, <b>Criar</b> e
   <b>Excluir</b> (Excluir existe só na Ordem de Serviço).`,
  `<b>O que vence quando:</b> o ${ic("calendar-days")} <b>Calendário</b> em destaque no painel junta
   as datas de todas as funções e leva direto ao registro.`,
  `<b>Em qualquer função:</b> ${bt("Novo", "plus")} cria · ${campo("Buscar…")} procura pelo protocolo ·
   ${bo("PDF", "printer")} gera o relatório com fotos · ${bo("QR Code", "qr-code")} deixa consultar sem login ·
   ${bo("Compartilhar", "share-2")} envia por WhatsApp · ${bd()} apaga, sempre perguntando antes.`,
])}

<h2>As funções</h2>

${fn("calendar-days", "Calendário", {
  faz: `junta num mês só <b>tudo que tem data marcada</b>, de todas as funções, com a cor do
    prazo: ${et("vermelho passou", "vermelho")} ${et("amarelo está chegando", "amarelo")}
    ${et("verde dentro do prazo", "verde")} — cinza é o que já foi resolvido.`,
  fica: `<b>em destaque no Painel</b>, logo ao entrar, e também em
    Painel → ${ic("wrench")} <b>Manutenções</b> → <b>Calendário</b>.`,
  vai: `não envia nada: é atalho. Toque no dia para ver o que vence nele e toque no item para
    <b>abrir a função de origem</b>, já filtrada pelo número de protocolo daquele registro.`,
  ve: `<b>gerente e gestor</b>, cada um com as datas da sua unidade. Mostra apenas as funções
    ligadas para a organização.`,
})}

${fn("clipboard-list", "Ordens de Serviço", {
  faz: `o serviço que tem começo, meio e fim: protocolo, responsáveis, fotos de antes,
    durante e depois, anexos, histórico e nota no final.`,
  fica: `${CAMINHO("Ordens de Serviço")} · no ${PORTAL}, cartão <b>Ordens de Serviço</b>.`,
  vai: `quem precisa do serviço abre a ordem com a <b>data máxima</b> (obrigatória) e marca os
    <b>responsáveis</b> e a <b>equipe designada</b> → a equipe recebe <b>aviso no aplicativo</b>
    (se o gestor ligou o envio automático), o <b>supervisor da equipe</b> recebe o dele e vai
    <b>e-mail</b> para quem estiver marcado → quem responde pela unidade <b>programa o dia</b> e
    quem executa → o responsável ${bo("Iniciar serviço", "play")} , registra as fotos e
    ${bo("Finalizar serviço", "check-circle-2")} → o gestor confere, dá a nota e, se precisar,
    ${bo("Reabrir", "rotate-ccw")} escrevendo o motivo.
    <br><b>Andamento:</b> ${et("Aguardando início", "azul")} → ${et("Em execução", "laranja")} →
    ${et("Finalizada parcialmente", "amarelo")} ou ${et("Finalizada totalmente", "verde")} —
    <b>Cancelada</b> é para a ordem aberta por engano.`,
  ve: `${LIBERADA} Quem recebe o QR ou o link vê aquela O.S. <b>sem entrar no sistema</b>.
    Reabrir é só de gerente e gestor.`,
})}

${fn("calendar-clock", "Agenda de Vencimentos", {
  faz: `contrato e serviço com prazo — dedetização, extintor, caixa d'água, seguro — em
    ${bo("Lista", "list")} ou ${bo("Calendário", "calendar-days")} , com aviso antes de vencer.`,
  fica: `${CAMINHO("Agenda de Vencimentos")}.`,
  vai: `o gestor cadastra a data e escolhe os <b>avisos</b> (tantos dias antes, ou data marcada)
    e os <b>e-mails</b> que recebem → o sistema <b>envia o e-mail sozinho</b>, todo dia que cai um
    aviso → resolvido o serviço, o gestor registra em ${bo("Antes e depois", "clipboard-list")} .`,
  ve: `<b>só gerente e gestor</b>. Esta função não existe no portal do funcionário.`,
})}

${fn("clipboard-check", "Checklists", {
  faz: `a verificação do dia, item por item, com foto e observação; a barra verde mostra
    quanto já foi feito.`,
  fica: `${CAMINHO("Checklists")} · no ${PORTAL}, cartão <b>Checklists</b>.`,
  vai: `o gestor monta a lista e escolhe em <b>Enviar para</b> quem vai executar → a pessoa marca
    os itens no celular, anexa foto e, achando defeito, <b>reporta o problema</b> → o problema volta
    para o gestor no botão ${bo("3", "alert-triangle")} da tela, como ${et("Aberto", "amarelo")} até
    alguém resolver. No modo <b>Ao vivo</b>, quem está no local monta e marca na hora.`,
  ve: LIBERADA,
})}

${fn("eye", "Vistorias", {
  faz: `a inspeção que precisa de prova: situação de cada item, galeria de fotos e relatório
    em PDF.`,
  fica: `${CAMINHO("Vistorias")} · no ${PORTAL}, cartão <b>Vistorias</b>.`,
  vai: `o gestor cria a vistoria <b>pré-definida</b> para alguém executar, ou faz <b>ao vivo</b> no
    local → quem vistoria fotografa e descreve item por item e reporta o problema com prioridade
    → o gestor recebe o problema e gera o ${bo("PDF", "printer")} para quem cobra resultado.`,
  ve: LIBERADA,
})}

${fn("list-checks", "Lista de Tarefas", {
  faz: `o serviço que se repete — diária, semanal, mensal ou data marcada — com registro de
    execução e prova em foto.`,
  fica: `${CAMINHO("Lista de Tarefas")} · no ${PORTAL}, cartão <b>Lista de Tarefas</b>.`,
  vai: `o gestor cria a tarefa <b>escolhendo o funcionário</b> e a frequência → a tarefa aparece na
    tela dessa pessoa → ela toca em ${bo("Registrar execução", "check-circle-2")} , escreve como
    ficou e anexa a foto → o gestor confere na aba <b>Acompanhamento</b>:
    ${et("Realizadas", "verde")} ${et("Pendentes", "amarelo")} ${et("Não executadas", "vermelho")} .`,
  ve: LIBERADA,
})}

${fn("columns-3", "Quadro de Atividades", {
  faz: `mostra o andamento da equipe em quatro colunas: <b>A Fazer</b>, <b>Em Andamento</b>,
    <b>Em Revisão</b> e <b>Concluído</b>.`,
  fica: `${CAMINHO("Quadro de Atividades")} · no ${PORTAL}, cartão <b>Quadro de Atividades</b>.`,
  vai: `aqui ninguém envia nada: é o quadro comum. Quem trabalha <b>arrasta o cartão</b> para a
    coluna nova, e qualquer registro que já exista entra pelo número — em <b>Adicionar por
    protocolo</b>, digite ${campo("OS-260810-4821")} e escolha a coluna.`,
  ve: `${LIBERADA} Cada coluna inteira sai em PDF pelo ${ic("printer")} do título.`,
})}

${fn("qr-code", "QR Code", {
  faz: `etiqueta colada no local ou no equipamento: quem aponta a câmera manda o problema com
    foto e localização, <b>sem ter conta no sistema</b>.`,
  fica: `${CAMINHO("QR Code")} · no ${PORTAL}, cartão <b>QR Code</b>.`,
  vai: `o gestor gera o código e ${bo("Imprimir", "printer")} para colar no ponto → qualquer pessoa
    que passa (morador, visitante, prestador) escaneia e envia → o registro cai na aba
    ${bo("Registros recebidos", "inbox")} → o gestor muda a situação (${et("Nova", "azul")}
    ${et("Em andamento", "amarelo")} ${et("Resolvida", "verde")}) e, se a pessoa deixou e-mail,
    responde por ${bo("Responder", "mail")} .`,
  ve: `${LIBERADA} Quem escaneia vê apenas o formulário daquele ponto — nunca o sistema.`,
})}

${fn("wrench", "Registro de Manutenções", {
  faz: `o histórico do que foi consertado ou trocado, com foto de antes e depois e o protocolo
    de cada registro.`,
  fica: `${CAMINHO("Registro de Manutenções")} · no ${PORTAL}, cartão <b>Manutenções</b>.`,
  vai: `quem executa registra o que fez → o registro fica na ficha da unidade → o gestor
    acompanha pelos números do alto (${et("Pendentes", "amarelo")} ${et("Requer ação", "vermelho")}
    ${et("Realizadas", "azul")} ${et("Finalizadas", "verde")}) e manda o PDF a quem pedir.`,
  ve: LIBERADA,
})}

${fn("alert-triangle", "Ocorrências", {
  faz: `o registro rápido de um incidente: título, local, prioridade e foto.`,
  fica: `${CAMINHO("Ocorrências")} · no ${PORTAL}, cartão <b>Ocorrências</b>.`,
  vai: `quem viu registra na hora, do celular → o registro entra na lista da unidade → o gestor
    (ou quem tem a função) toca em ${bo("Finalizar", "check-circle-2")} quando o caso é resolvido.`,
  ve: LIBERADA,
})}

${fn("users", "Equipes de Serviço", {
  faz: `times de funcionários com um <b>supervisor</b>, para designar a O.S. ao grupo em vez de
    pessoa por pessoa.`,
  fica: `<b>Painel → cartão Equipes</b> · ou pela engrenagem ao lado de <b>Equipe designada</b>,
    na abertura da O.S.`,
  vai: `o gestor monta a equipe → na O.S., escolhe a equipe em <b>Equipe designada</b> → o
    <b>supervisor</b> recebe o aviso com a ordem.`,
  ve: `<b>só gerente e gestor</b>. Desligada a função, o campo some da O.S. e o aviso ao supervisor
    deixa de existir.`,
})}

<h2>Para onde vai cada aviso</h2>
<table>
<tr><th style="width:210px">Caminho</th><th>Quando sai</th><th style="width:230px">Para quem</th></tr>
<tr>
  <td>${ic("bell")} Aviso no aplicativo</td>
  <td>ao abrir uma Ordem de Serviço, se o gestor ligou o <b>envio automático</b>; e sempre que uma
      <b>equipe é designada</b></td>
  <td>equipe da unidade · supervisor da equipe designada</td>
</tr>
<tr>
  <td>${ic("mail")} E-mail</td>
  <td>O.S. aberta · vencimento chegando · resposta de um registro do QR Code</td>
  <td>quem o gestor marcou na O.S. · a lista de e-mails do vencimento · quem deixou contato no QR</td>
</tr>
<tr>
  <td>${ic("message-circle")} WhatsApp</td>
  <td>quando alguém toca em ${bo("Compartilhar", "share-2")} num registro</td>
  <td>quem tem WhatsApp na ficha de funcionário</td>
</tr>
<tr>
  <td>${ic("chevron-right")} Nada automático</td>
  <td>Checklists, Vistorias, Tarefas, Quadro e Ocorrências</td>
  <td>a pessoa vê ao abrir a função; o gestor vê na faixa <b>Chamados em aberto</b></td>
</tr>
</table>

<h2>Quem vê o quê</h2>
<table>
<tr>
  <th>Função</th>
  <th class="c">Gerente</th>
  <th class="c">Gestor da unidade</th>
  <th class="c">Funcionário</th>
</tr>
${[
  ["Calendário", "todas as unidades", "a unidade dele", "não tem"],
  ["Ordens de Serviço", "todas as unidades", "a unidade dele", "se liberada"],
  ["Agenda de Vencimentos", "todas as unidades", "a unidade dele", "não tem"],
  ["Checklists", "todas as unidades", "a unidade dele", "se liberada"],
  ["Vistorias", "todas as unidades", "a unidade dele", "se liberada"],
  ["Lista de Tarefas", "todas as unidades", "a unidade dele", "se liberada"],
  ["Quadro de Atividades", "todas as unidades", "a unidade dele", "se liberada"],
  ["QR Code", "todas as unidades", "a unidade dele", "se liberada"],
  ["Registro de Manutenções", "todas as unidades", "a unidade dele", "se liberada"],
  ["Ocorrências", "todas as unidades", "a unidade dele", "se liberada"],
  ["Equipes de Serviço", "todas as unidades", "a unidade dele", "não tem"],
]
  .map(
    ([funcao, ger, ges, fun]) => `<tr>
  <td>${funcao}</td>
  <td class="c sim">${ger}</td>
  <td class="c sim">${ges}</td>
  <td class="c ${fun === "não tem" ? "nao" : ""}">${fun}</td>
</tr>`,
  )
  .join("")}
</table>
${aviso(
  "Duas coisas que ninguém vê:",
  `unidade que não é sua, e função com a chave <b>Ver</b> desligada. O gerente troca de unidade no
   seletor ${campo("Organização ▾")} das telas <b>Funcionários</b> e <b>Registro de Manutenções</b>.`,
)}

<div class="rodape">
<p><b>App Manutenção</b> — appmanutencao.com.br · Suporte pelo WhatsApp (11) 93328-4364.</p>
<p>O passo a passo de cada tela, botão por botão, está no <b>Manual do App Manutenção</b> —
o PDF fica na tela de entrada, em <b>Baixar em PDF</b>.</p>
</div>
`;

await publicar({
  base: "resumo-funcoes-app-manutencao",
  rodapePdf: "Resumo das Funções · App Manutenção",
  html: montarHtml({
    titulo: "Resumo das Funções",
    subtitulo:
      "O que cada função faz, onde ela fica, quem envia para quem e quem vê o quê. " +
      "Os botões são só ilustração — os de verdade estão na tela.",
    corpo,
    // Folha de consulta: cabe em poucas páginas porque o texto corre, sem
    // começar cada parte numa página nova como no manual completo.
    cssExtra: `
      @media print{
        body{font-size:11.5pt}
        h2{break-before:auto;margin-top:22px}
        .fn.compacta{margin:9px 0;padding:10px 14px}
        .lin{margin:3px 0}
      }`,
  }),
});
