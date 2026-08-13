import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateOSPDF } from "./pdf-generator";

describe("PDF Generation - Ordem de Serviço", () => {
  it("should generate a valid PDF buffer", async () => {
    const pdfData = {
      protocolo: "OS-001234",
      titulo: "Manutenção Preventiva",
      descricao: "Realizar manutenção preventiva do sistema de ar condicionado",
      responsavelPrincipalNome: "João Silva",
      tempoEstimadoDias: 1,
      tempoEstimadoHoras: 2,
      tempoEstimadoMinutos: 30,
      latitude: "-23.5505",
      longitude: "-46.6333",
      localizacaoDescricao: "Sala de máquinas - Bloco A",
      materiais: [
        { nome: "Filtro de ar", quantidade: 2 },
        { nome: "Óleo lubrificante", quantidade: 1 },
      ],
      imagens: [
        { url: "https://example.com/image1.jpg" },
        { url: "https://example.com/image2.jpg" },
      ],
      dataCriacao: new Date(),
      prioridadeNome: "Alta",
      categoriaNome: "Preventiva",
      setorNome: "Infraestrutura",
    };

    const pdfBuffer = await generateOSPDF(pdfData);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate PDF without images", async () => {
    const pdfData = {
      protocolo: "OS-005678",
      titulo: "Limpeza Geral",
      descricao: "Limpeza geral das áreas comuns",
      responsavelPrincipalNome: "Maria Santos",
      tempoEstimadoDias: 0,
      tempoEstimadoHoras: 4,
      tempoEstimadoMinutos: 0,
      latitude: undefined,
      longitude: undefined,
      localizacaoDescricao: undefined,
      materiais: [{ nome: "Detergente", quantidade: 5 }],
      imagens: [],
      dataCriacao: new Date(),
      prioridadeNome: "Normal",
      categoriaNome: "Limpeza",
      setorNome: "Operacional",
    };

    const pdfBuffer = await generateOSPDF(pdfData);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate PDF without location", async () => {
    const pdfData = {
      protocolo: "OS-009999",
      titulo: "Reparo de Equipamento",
      descricao: "Reparo do equipamento de ar condicionado",
      responsavelPrincipalNome: "Pedro Costa",
      tempoEstimadoDias: 2,
      tempoEstimadoHoras: 0,
      tempoEstimadoMinutos: 0,
      latitude: undefined,
      longitude: undefined,
      localizacaoDescricao: undefined,
      materiais: [],
      imagens: [],
      dataCriacao: new Date(),
      prioridadeNome: "Urgente",
      categoriaNome: "Corretiva",
      setorNome: "Manutenção",
    };

    const pdfBuffer = await generateOSPDF(pdfData);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate PDF with many materials", async () => {
    const materials = Array.from({ length: 20 }, (_, i) => ({
      nome: `Material ${i + 1}`,
      quantidade: Math.floor(Math.random() * 10) + 1,
    }));

    const pdfData = {
      protocolo: "OS-MANY-001",
      titulo: "Projeto Grande",
      descricao: "Projeto que requer muitos materiais",
      responsavelPrincipalNome: "Ana Silva",
      tempoEstimadoDias: 5,
      tempoEstimadoHoras: 8,
      tempoEstimadoMinutos: 15,
      latitude: "-23.5505",
      longitude: "-46.6333",
      localizacaoDescricao: "Local do projeto",
      materiais: materials,
      imagens: [],
      dataCriacao: new Date(),
      prioridadeNome: "Normal",
      categoriaNome: "Projeto",
      setorNome: "Engenharia",
    };

    const pdfBuffer = await generateOSPDF(pdfData);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate PDF with special characters in description", async () => {
    const pdfData = {
      protocolo: "OS-SPECIAL-001",
      titulo: "Manutenção com Caracteres Especiais",
      descricao: "Descrição com acentuação: São Paulo, Brasília, açúcar, pão, côté",
      responsavelPrincipalNome: "José Pereira",
      tempoEstimadoDias: 1,
      tempoEstimadoHoras: 0,
      tempoEstimadoMinutos: 0,
      latitude: "-23.5505",
      longitude: "-46.6333",
      localizacaoDescricao: "Rua das Flores, nº 123",
      materiais: [{ nome: "Peça de reposição", quantidade: 1 }],
      imagens: [],
      dataCriacao: new Date(),
      prioridadeNome: "Normal",
      categoriaNome: "Manutenção",
      setorNome: "Operacional",
    };

    const pdfBuffer = await generateOSPDF(pdfData);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });
});

/**
 * Foto de verdade, pequena: o gerador ignora buffer com menos de 100 bytes, e um
 * PNG de 1x1 cairia nesse filtro sem exercitar o desenho.
 */
const PNG_TESTE = "data:image/png;base64,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";

describe("Antes e depois no relatorio da O.S.", () => {
  const base = {
    protocolo: "OS-260813-0001",
    titulo: "Troca de lampadas do patio",
    descricao: "Seis lampadas queimadas",
    responsavelPrincipalNome: "Ana",
    tempoEstimadoDias: 0,
    tempoEstimadoHoras: 2,
    tempoEstimadoMinutos: 0,
    localizacaoDescricao: "Patio",
    materiais: [],
    dataCriacao: new Date("2026-08-13T09:00:00"),
    prioridadeNome: "Alta",
    categoriaNome: "Eletrica",
    setorNome: "Manutencao",
  };

  it("gera a folha com os pares de antes e depois", async () => {
    const pdf = await generateOSPDF({
      ...base,
      imagens: [
        { url: PNG_TESTE, tipo: "antes", descricao: "Lampada queimada" },
        { url: PNG_TESTE, tipo: "depois", descricao: "Lampada nova" },
        { url: PNG_TESTE, tipo: "antes" },
        { url: PNG_TESTE, tipo: "depois" },
        { url: PNG_TESTE, tipo: "durante" },
      ],
    });

    expect(pdf.toString("utf8", 0, 4)).toBe("%PDF");
    // Com cinco fotos embutidas a folha cresce bem acima da versao sem imagem.
    expect(pdf.length).toBeGreaterThan(20_000);
  });

  it("nao quebra quando falta o depois de um dos pares", async () => {
    const pdf = await generateOSPDF({
      ...base,
      imagens: [
        { url: PNG_TESTE, tipo: "antes" },
        { url: PNG_TESTE, tipo: "antes" },
        { url: PNG_TESTE, tipo: "depois" },
      ],
    });

    expect(pdf.toString("utf8", 0, 4)).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(10_000);
  });

  it("aceita ordem de servico sem foto nenhuma", async () => {
    const pdf = await generateOSPDF({ ...base, imagens: [] });
    expect(pdf.toString("utf8", 0, 4)).toBe("%PDF");
  });
});
