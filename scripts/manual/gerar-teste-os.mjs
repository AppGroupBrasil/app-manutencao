/**
 * Folha de teste do fluxo da O.S., para uma pessoa seguir do começo ao fim.
 *
 * Não é manual: é um roteiro de uma vez, com os botões na ordem em que ele vai
 * tocar. Sai só na área de trabalho (não vai para o site) porque é interno e tem
 * validade — depois do teste, o que vale é o manual.
 *
 * Rode com: node scripts/manual/gerar-teste-os.mjs
 */
import path from "node:path";
import os from "node:os";
import { aviso, bo, bt, bg, campo, et, ic, lista, montarHtml, passos, publicar } from "./comum.mjs";

const corpo = `
<div class="perfil">
<p style="margin:0"><b>O que é este papel:</b> um teste de uma ordem de serviço, do começo ao
fim, numa unidade só. São 6 passos. Se der certo, ligamos nas outras.</p>
</div>

<h2>Passo 1 — Entrar</h2>
${passos([
  `Abra <b>appmanutencao.com.br</b>.`,
  `Toque em ${bt("Entrar")} , digite seu e-mail e seus 6 números, e ${bt("Entrar")} de novo.`,
])}

<h2>Passo 2 — Escolher a unidade do teste</h2>
${passos([
  `No painel, toque no cartão ${bo("Funcionários", "users")} .`,
  `No alto da tela, toque em ${campo("Organização ▾")} e escolha <b>uma</b> unidade.`,
  `Volte com a flecha ${bg("arrow-left")} .`,
])}

<h2>Passo 3 — Ligar o fluxo e abrir a ordem de teste</h2>
${passos([
  `Toque no cartão ${bo("Manutenções", "wrench")} e depois no quadrado <b>Ordens de Serviço</b>.`,
  `Toque em ${bt("Nova O.S.", "plus")} .`,
  `Desça a janela até <b>Avisos ao abrir a O.S.</b> e marque a caixinha
   <b>Fluxo com prazo e confirmação de baixa</b>. <i>(Só você vê essa caixinha.)</i>`,
  `Agora preencha, na mesma janela: <b>Título</b> ${campo("Teste do fluxo")} e
   <b>Data máxima de finalização</b> — escolha uma data desta semana.`,
  `Em <b>Fotos de antes e depois</b>, no lado <b>Antes</b>, toque na câmera ${bg("camera")} e
   fotografe qualquer coisa.`,
  `Toque em ${bt("Criar Ordem de Serviço", "plus")} . Aparece um aviso verde com o número da O.S.`,
])}

<h2>Passo 4 — Marcar o dia e quem faz</h2>
${passos([
  `Volte ao painel com a flecha ${bg("arrow-left")} até ver o <b>Calendário</b> no alto.`,
  `Toque no dia da data que você escolheu. A lista do dia abre embaixo.`,
  `Toque em ${bo("Programar data", "calendar-clock")} .`,
  `Escolha a data do serviço e, em <b>Quem vai fazer o serviço</b>, marque um funcionário.`,
  `Toque em ${bt("Salvar data e equipe", "calendar-clock")} .`,
])}

<h2>Passo 5 — O funcionário faz e dá baixa</h2>
${aviso("Este passo é dele, no celular dele.", "Peça para ele fazer assim:")}
${passos([
  `Entrar em <b>appmanutencao.com.br</b> com o e-mail e a senha dele.`,
  `Tocar no cartão <b>Ordens de Serviço</b> e abrir a ordem do teste.`,
  `Tocar em ${bo("Iniciar serviço", "play")} .`,
  `Em <b>Fotos</b>, trocar ${campo("Antes ▾")} para <b>Depois</b> — o botão fica verde — e
   fotografar com a câmera ${bg("camera")} .`,
  `Tocar em ${bo("Dar baixa", "check-circle-2")} .`,
])}

<h2>Passo 6 — O gestor confirma e você finaliza</h2>
${passos([
  `<b>O gestor da unidade</b> entra com a conta dele, vê no painel a linha
   <b>Baixas a confirmar</b>, abre a ordem e toca em ${bo("Confirmar baixa", "check-circle-2")} .`,
  `<b>Você</b> entra, vê no painel a linha <b>Ordens a finalizar</b>, abre a ordem e toca em
   ${bo("Finalizar serviço", "check-circle-2")} .`,
  `Ainda na ordem, toque em ${bo("Baixar PDF", "printer")} : as fotos saem lado a lado,
   <b>ANTES</b> e <b>DEPOIS</b>. Pronto — o teste acabou.`,
])}

<h2>Se algo não aparecer</h2>
${lista([
  `<b>O funcionário não vê "Dar baixa":</b> ele não foi marcado em <b>Quem vai fazer o
   serviço</b>. Volte ao passo 4.`,
  `<b>Não achei "Programar data":</b> esse botão só existe na <b>Ordem de Serviço</b>, não nos
   outros itens do calendário.`,
  `<b>O gestor não vê "Baixas a confirmar":</b> ele precisa entrar com a conta dele, não com a
   sua.`,
  `<b>"Finalizar serviço" não funciona:</b> é porque falta a confirmação do gestor. É essa a
   ordem: baixa ${ic("chevron-right")} confirmação ${ic("chevron-right")} finalizar.`,
])}

${aviso(
  "Deu tudo certo?",
  `Avise que ligamos o fluxo nas outras unidades. Deu problema em algum passo, me diga
   <b>o número do passo</b> — resolvo e te chamo.`,
)}

<div class="rodape">
<p><b>App Manutenção</b> · Suporte pelo WhatsApp (11) 93328-4364 — ou o balão verde
${ic("message-circle")} no canto da tela.</p>
<p>Passo a passo de todas as funções: no manual em PDF, na tela de entrada do sistema.</p>
</div>
`;

await publicar({
  base: "Passo a passo - Teste da Ordem de Servico",
  pasta: path.join(os.homedir(), "Desktop"),
  rodapePdf: "Teste da Ordem de Serviço · App Manutenção",
  html: montarHtml({
    titulo: "Teste da Ordem de Serviço",
    subtitulo: "Seis passos, uma unidade. Siga na ordem e me diga se deu certo.",
    corpo,
    cssExtra: `
      @media print{
        body{font-size:13pt}
        h2{break-before:auto;margin-top:20px;font-size:16pt}
        ol.passos>li{margin:9px 0}
      }`,
  }),
});
