import { describe, expect, it } from "vitest";
import { generateOSPDF } from "./pdf-generator";

/**
 * A folha impressa obedece aos blocos escondidos.
 *
 * O gerador desenha por coordenada: cada campo do cartão tinha a altura escrita
 * na mão, e esconder um deixava buraco no meio com os de baixo parados. Agora
 * as colunas são lista e refluem — este teste existe porque um erro de layout
 * aqui não aparece em `tsc` nem na tela, só no papel do cliente.
 */

const BASE = {
  osId: 1,
  protocolo: "OS-260825-0001",
  titulo: "Trocar lâmpadas do pátio",
  descricao: "Três lâmpadas queimadas no pátio coberto, perto da quadra.",
  responsavelPrincipalNome: "Ana Souza",
  solicitanteNome: "Coordenadora Marta",
  tempoEstimadoDias: 1,
  tempoEstimadoHoras: 2,
  tempoEstimadoMinutos: 0,
  materiais: [],
  // Vazio de propósito: com URL, o gerador sai buscando imagem na rede.
  imagens: [],
  dataCriacao: new Date("2026-08-25T12:00:00Z"),
  prioridadeNome: "Alta",
  categoriaNome: "Elétrica",
  setorNome: "Manutenção",
  statusNome: "Aguardando início",
  condominioNome: "Creche Central",
  responsaveis: [
    { nome: "Ana Souza", cargo: "Supervisora", telefone: "11999990000" },
    { nome: "Bruno Lima", cargo: "Auxiliar" },
  ],
};

/** Um PDF de verdade começa com esta assinatura. */
const ASSINATURA = "%PDF";

describe("PDF da O.S. com blocos escondidos", () => {
  it("gera a folha completa quando nada está escondido", async () => {
    const buffer = await generateOSPDF({ ...BASE });

    expect(buffer.subarray(0, 4).toString()).toBe(ASSINATURA);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("gera a folha com cada bloco escondido, um de cada vez", async () => {
    // Um por um: um erro de coordenada costuma aparecer só na combinação que
    // esvazia uma coluna inteira.
    for (const id of [
      "solicitante",
      "descricao",
      "dataAbertura",
      "responsaveis",
      "classificacao",
      "fotos",
      "equipe",
      "local",
      "observacoes",
      "avisos",
    ]) {
      const buffer = await generateOSPDF({ ...BASE, camposOcultos: [id] });

      expect(buffer.subarray(0, 4).toString(), `bloco ${id}`).toBe(ASSINATURA);
      expect(buffer.length, `bloco ${id}`).toBeGreaterThan(1000);
    }
  });

  it("gera a folha com tudo escondido de uma vez", async () => {
    // O caso extremo: a coluna esquerda fica só com o título e a direita
    // perde a data. É onde a altura do cartão encolhe mais.
    const buffer = await generateOSPDF({
      ...BASE,
      camposOcultos: [
        "solicitante",
        "descricao",
        "dataAbertura",
        "responsaveis",
        "classificacao",
        "fotos",
      ],
    });

    expect(buffer.subarray(0, 4).toString()).toBe(ASSINATURA);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("a folha encolhe quando o cliente esconde blocos", async () => {
    const completa = await generateOSPDF({ ...BASE });
    const enxuta = await generateOSPDF({
      ...BASE,
      camposOcultos: ["descricao", "responsaveis", "classificacao"],
    });

    // Não é firula: se o tamanho não cair, é sinal de que o "esconder" não
    // chegou ao papel — que foi exatamente o defeito encontrado na tela de
    // detalhe.
    expect(enxuta.length).toBeLessThan(completa.length);
  });

  it("cada bloco impresso some de fato, um por um", async () => {
    const completa = await generateOSPDF({ ...BASE });

    // Um a um, e não em bloco: escondendo tudo de uma vez, um único campo que
    // continuasse impresso passaria despercebido na conta do tamanho.
    for (const id of [
      "solicitante",
      "descricao",
      "dataAbertura",
      "responsaveis",
      "classificacao",
    ]) {
      const folha = await generateOSPDF({ ...BASE, camposOcultos: [id] });

      expect(folha.length, `bloco ${id} continuou na folha`).toBeLessThan(completa.length);
    }
  });

  it("bloco que a folha não imprime não muda nada nela", async () => {
    const completa = await generateOSPDF({ ...BASE });

    // Equipe, local, observações e avisos não são impressos nesta folha. O
    // teste registra isso: no dia em que algum deles passar a sair no papel,
    // ele quebra e lembra de ligá-lo ao "ocultar".
    for (const id of ["equipe", "local", "observacoes", "avisos"]) {
      const folha = await generateOSPDF({ ...BASE, camposOcultos: [id] });

      expect(folha.length, `bloco ${id} passou a sair na folha`).toBe(completa.length);
    }
  });
});
