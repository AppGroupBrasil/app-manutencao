/**
 * Os blocos da ordem de serviço que o gestor pode esconder do cliente dele.
 *
 * Cada cliente usa um pedaço diferente da ordem. Em vez de apagar campo no
 * código a cada pedido — o que faz o campo sumir para todo mundo e deixa o
 * produto refém do último a reclamar —, a escolha vira dado: o gestor marca o
 * que não usa e o formulário monta o que sobrou.
 *
 * O id é a chave gravada no banco: **nunca renomeie um id existente**. Trocar
 * "solicitante" por "quem-pediu" faria o campo reaparecer em todos os clientes
 * que o tinham escondido, sem ninguém entender por quê. Para tirar um bloco da
 * lista, remova a entrada — a chave órfã no banco é ignorada.
 *
 * Título, unidade e prazo não estão aqui de propósito: sem eles o servidor
 * recusa a ordem, e escondê-los seria oferecer um caminho para travar a tela.
 */
export const CAMPOS_OCULTAVEIS_OS = [
  {
    id: "solicitante",
    rotulo: "Responsável pela abertura",
    ajuda: "Campo livre com o nome de quem pediu o serviço.",
  },
  {
    id: "descricao",
    rotulo: "Descrição do serviço",
    ajuda: "O texto longo abaixo do título.",
  },
  {
    id: "dataAbertura",
    rotulo: "Data de abertura do chamado",
    ajuda: "O dia em que o pedido chegou, que pode ser anterior ao de hoje.",
  },
  {
    id: "equipe",
    rotulo: "Equipe designada",
    ajuda: "Some junto o cadastro de equipes e o aviso ao supervisor.",
  },
  {
    id: "responsaveis",
    rotulo: "Responsáveis pela O.S.",
    ajuda: "A lista de quem responde pela ordem. Designar a equipe já preenche isso sozinho.",
  },
  {
    id: "classificacao",
    rotulo: "Categoria, prioridade e status",
    ajuda: "Os três seletores de classificação da ordem.",
  },
  {
    id: "local",
    rotulo: "Local do serviço",
    ajuda: "O endereço ou ponto dentro da unidade.",
  },
  {
    id: "fotos",
    rotulo: "Fotos (antes e depois)",
    ajuda: "O envio de imagens na abertura da ordem.",
  },
  {
    id: "observacoes",
    rotulo: "Observações adicionais",
    ajuda: "Acesso, horário e contato no local.",
  },
  {
    id: "avisos",
    rotulo: "Avisos ao abrir a O.S.",
    ajuda: "A configuração de quem recebe notificação e e-mail.",
  },
] as const;

export type CampoOcultavelOs = (typeof CAMPOS_OCULTAVEIS_OS)[number]["id"];

/**
 * Os ids válidos, para o servidor recusar chave inventada.
 *
 * Tipado como `string[]` de propósito: aqui ele é usado para conferir uma
 * lista que veio do banco, onde cabe qualquer coisa — inclusive o id de um
 * bloco que já saiu do produto.
 */
export const IDS_CAMPOS_OCULTAVEIS_OS: string[] = CAMPOS_OCULTAVEIS_OS.map((c) => c.id);
