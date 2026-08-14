/**
 * Manual só do Calendário.
 *
 * Folha curta para quem vai usar o calendário todo dia: as cores, como ler o
 * mês, o atalho para a função e — para o gerente — como programar e
 * redistribuir o serviço sem abrir cada ordem.
 *
 * Rode com `pnpm manual`. Casca, CSS e ícones vêm de ./comum.mjs.
 */
import {
  aviso,
  bg,
  bo,
  bt,
  campo,
  et,
  ic,
  linha,
  lista,
  montarHtml,
  passos,
  publicar,
  so,
} from "./comum.mjs";

const corpo = `
<div class="perfil">
${linha(
  "O que é:",
  `um mês só com <b>tudo que tem data marcada</b> no sistema — vencimentos, ordens de serviço,
   manutenções, vistorias, checklists, tarefas e atividades. A cor diz o prazo, e cada item é um
   <b>atalho</b> para a função de onde ele veio.`,
)}
${linha(
  "Para quem:",
  "gerente e gestor da unidade. O funcionário não tem esta tela.",
)}
</div>

<h2>1. Onde ele fica</h2>
${passos([
  `Entre no sistema. O calendário <b>já aparece em destaque</b> no alto do painel.`,
  `Para a tela cheia, toque em ${bo("Abrir")} , no canto do cartão — ou em
   <b>Manutenções</b> → ${bo("Calendário", "calendar-days")} .`,
])}
${aviso(
  "Diferença entre as duas telas:",
  `no painel é o mês e a lista do dia. Na tela cheia entram os <b>filtros por função</b> —
   botões redondos com <b>Vencimentos</b>, <b>Manutenções</b>, <b>Checklists</b>, <b>Vistorias</b>,
   <b>Tarefas</b> e <b>Atividades</b>. Nada marcado = mostra tudo.`,
)}

<h2>2. As cores</h2>
${lista([
  `<span style="display:inline-block;width:11px;height:11px;border-radius:99px;background:#c62828"></span>
   <b>Vermelho — passou do prazo.</b> A data já venceu e ninguém registrou a conclusão.`,
  `<span style="display:inline-block;width:11px;height:11px;border-radius:99px;background:#e0a800"></span>
   <b>Amarelo — está chegando.</b> Vence <b>hoje ou nos próximos 7 dias</b>.`,
  `<span style="display:inline-block;width:11px;height:11px;border-radius:99px;background:#2e7d32"></span>
   <b>Verde — dentro do prazo.</b> Ainda há tempo.`,
  `<span style="display:inline-block;width:11px;height:11px;border-radius:99px;background:#94a3b8"></span>
   <b>Cinza — já resolvido.</b> Continua no calendário como histórico.`,
])}
<p>A mesma legenda está impressa no pé do calendário, na tela.</p>

<h2>3. Ler o mês</h2>
${passos([
  `Os <b>três números do alto</b> contam o mês inteiro: quantos passaram do prazo, quantos estão
   chegando e quantos estão dentro do prazo.`,
  `${bg("chevron-left")} e ${bg("chevron-right")} , ao lado do nome do mês, trocam de mês.`,
  `<b>Dia com bolinha colorida</b> tem coisa marcada. O <b>número dentro da bolinha</b> é quantos
   itens são; a <b>cor</b> é a do item mais urgente daquele dia.`,
  `O dia de <b>hoje</b> fica com um anel azul em volta.`,
  `<b>Toque no dia</b> e a lista dele abre embaixo do calendário. Dia sem bolinha não abre nada —
   é porque não tem nada marcado.`,
])}

<h2>4. O atalho: tocar no item</h2>
<p>Cada linha da lista mostra o <b>nome</b>, a <b>função</b> de onde veio, o <b>número de
protocolo</b> e quanto falta (ou quanto passou) do prazo.</p>
${passos([
  `Toque na linha do item.`,
  `O sistema <b>abre a função de origem</b> — Vencimentos, Checklists, Vistorias, Tarefas,
   Manutenções ou Quadro — já <b>filtrada pelo protocolo</b> daquele registro, para você não
   procurar numa lista grande.`,
  `Se for uma <b>Ordem de Serviço</b>, abre a própria ordem, com fotos, histórico e botões.`,
])}

<h2>5. Programar e redistribuir o serviço</h2>
${so(
  "gerente",
  `este passo <b>pelo calendário</b>: é ele que distribui a agenda da rede, uma ordem depois da
   outra. O gestor da unidade programa da mesma forma, mas <b>dentro da própria O.S.</b>; a equipe
   não programa nada.`,
)}
${passos([
  `Toque no dia e depois no item da Ordem de Serviço.`,
  `Toque em ${bo("Programar data", "calendar-clock")} — ou em <b>Reprogramar</b>, se já tiver
   data.`,
  `Escolha a <b>data</b> em que o serviço vai ser feito: ${campo("dd/mm/aaaa")}`,
  `Em <b>Quem vai fazer o serviço</b>, marque as pessoas da equipe.`,
  `Toque em ${bt("Salvar data e equipe", "calendar-clock")} . A janela fecha e você já pode
   abrir o próximo dia.`,
])}
${lista([
  `<b>Sem marcar ninguém</b>, a equipe que já está na ordem continua como está.`,
  `Se a data escolhida <b>passar da data máxima</b> combinada com o gestor, aparece um aviso em
   vermelho. Ele avisa, mas <b>deixa salvar</b> — a decisão é sua.`,
  `Precisa ver as fotos ou a descrição antes de marcar? Toque em <b>Abrir a O.S.</b>, no pé da
   mesma janela.`,
  `Toda mudança de data fica <b>no histórico da ordem</b>, com o seu nome e a hora.`,
])}
${aviso(
  "Ordem de serviço que ainda não foi programada:",
  `aparece no dia da <b>data máxima</b>, com o recado <em>“esta é a data máxima — o serviço ainda
   não foi programado”</em>. É o calendário cobrando a sua programação.`,
)}

<h2>6. O que entra no calendário</h2>
${lista([
  `${ic("calendar-clock")} <b>Vencimentos</b> — pela data de vencimento.`,
  `${ic("clipboard-list")} <b>Ordens de Serviço</b> — pelo <b>dia programado</b>; enquanto ninguém
   programou, pela <b>data máxima</b>.`,
  `${ic("wrench")} <b>Manutenções</b>, ${ic("eye")} <b>Vistorias</b> e
   ${ic("clipboard-check")} <b>Checklists</b> — pela data agendada.`,
  `${ic("list-checks")} <b>Tarefas</b> — inclusive as que se repetem: a diária aparece todo dia, a
   semanal nos dias escolhidos, a mensal no dia do mês.`,
  `${ic("columns-3")} <b>Atividades</b> do quadro que têm data específica.`,
])}
<p>Só aparecem as funções <b>ligadas para a sua organização</b>. Registro sem data nenhuma não
entra — é o caso das ocorrências e dos registros recebidos por QR Code.</p>

<h2>7. Dúvidas rápidas</h2>
<h4>Não aparece nada no mês.</h4>
<p>Ou não há nada com data naquele mês, ou os filtros da tela cheia estão marcados. Toque em
<b>Todas as funções</b> para limpar o filtro.</p>

<h4>O dia está vermelho, mas o serviço já foi feito.</h4>
<p>O item só fica cinza quando o sistema recebe o registro de conclusão: ${et("O.S. finalizada", "verde")} ,
vencimento com <b>Antes e depois</b> registrado, tarefa com <b>execução registrada</b>, checklist,
vistoria ou manutenção com data de realização. Registre a baixa e a cor muda.</p>

<h4>Mudei a data e o calendário não mudou.</h4>
<p>Ele recarrega ao salvar. Se você mexeu por outra tela, troque de mês e volte — ou saia e entre
no calendário de novo.</p>

<h4>Não vejo o botão de programar.</h4>
<p>No calendário ele é só do gerente, e só aparece na linha de uma <b>Ordem de Serviço</b> que
ainda não foi concluída. Sendo gestor da unidade, abra a O.S. e programe por dentro dela.</p>

<h4>Preciso de ajuda.</h4>
<p>Balão verde ${ic("message-circle")} no canto da tela, ou ${bo("Fale com suporte", "message-circle")}
na tela de entrada. Os dois abrem o WhatsApp do suporte.</p>

<div class="rodape">
<p><b>App Manutenção</b> — appmanutencao.com.br · Suporte pelo WhatsApp (11) 93328-4364.</p>
<p>O passo a passo das outras funções está no <b>Manual do App Manutenção</b> e no
<b>Resumo das Funções</b>.</p>
</div>
`;

await publicar({
  base: "manual-calendario-app-manutencao",
  rodapePdf: "Calendário · App Manutenção",
  html: montarHtml({
    titulo: "Calendário — como funciona",
    subtitulo:
      "Um mês só, com tudo que tem data marcada. Toque no dia, veja o que vence, " +
      "toque no item e o sistema abre a função.",
    corpo,
    // Folha de mão: texto corrido, sem começar cada parte numa página nova.
    cssExtra: `
      @media print{
        body{font-size:12pt}
        h2{break-before:auto;margin-top:20px}
      }`,
  }),
});
