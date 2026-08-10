/**
 * Funções que um funcionário pode receber no portal dele.
 *
 * Fonte única: a tela de permissões do gestor e o painel do funcionário leem
 * daqui. Função nova só aparece nos dois lugares depois que a tela dela existir
 * do lado do funcionário — por isso a lista é curada, e não derivada do
 * registry de módulos, que tem coisa que só o gestor usa.
 *
 * `modulo` amarra a permissão individual ao módulo da organização: mesmo
 * liberada para a pessoa, a função some se o cliente não tem o módulo.
 */
export interface FuncaoFuncionario {
  chave: string;
  rotulo: string;
  descricao: string;
  modulo: string;
}

export const FUNCOES_FUNCIONARIO: readonly FuncaoFuncionario[] = [
  {
    chave: "checklists",
    rotulo: "Checklists",
    descricao: "Verificações e tarefas diárias",
    modulo: "checklists",
  },
  {
    chave: "manutencoes",
    rotulo: "Manutenções",
    descricao: "Registrar e acompanhar manutenções",
    modulo: "manutencoes",
  },
  {
    chave: "ocorrencias",
    rotulo: "Ocorrências",
    descricao: "Reportar problemas e incidentes",
    modulo: "ocorrencias",
  },
  {
    chave: "vistorias",
    rotulo: "Vistorias",
    descricao: "Inspeções e verificações",
    modulo: "vistorias",
  },
  {
    chave: "tarefas",
    rotulo: "Lista de Tarefas",
    descricao: "Tarefas atribuídas e registro de execução",
    modulo: "tarefas-agendadas",
  },
  {
    chave: "quadro",
    rotulo: "Quadro de Atividades",
    descricao: "Atividades da equipe por coluna",
    modulo: "quadro-atividades",
  },
  {
    chave: "qrcode",
    rotulo: "QR Code",
    descricao: "Pontos e registros recebidos por leitura",
    modulo: "qrcode",
  },
] as const;

export const CHAVES_FUNCOES_FUNCIONARIO = FUNCOES_FUNCIONARIO.map((f) => f.chave);
