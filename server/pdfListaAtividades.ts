/**
 * Relatório de uma coluna do Quadro de Atividades.
 *
 * Os outros relatórios do sistema descrevem **um** registro; aqui o assunto é
 * uma lista — o que está na coluna hoje, para levar impresso à reunião ou ao
 * turno. Por isso é um gerador próprio, e não uma adaptação forçada do de
 * função rápida.
 */
import PDFDocument from "pdfkit";

export interface AtividadeDoRelatorio {
  titulo: string;
  descricao?: string | null;
  prioridade?: string | null;
  rotina?: string | null;
  responsavelNome?: string | null;
  protocolo?: string | null;
}

const COR = {
  titulo: "#0f172a",
  texto: "#334155",
  apagado: "#94a3b8",
  linha: "#e2e8f0",
};

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function gerarPdfColuna(dados: {
  organizacao: string;
  coluna: string;
  atividades: AtividadeDoRelatorio[];
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const pedacos: Buffer[] = [];
  doc.on("data", (p: Buffer) => pedacos.push(p));

  const largura = doc.page.width - 80;

  doc.fontSize(18).fillColor(COR.titulo).font("Helvetica-Bold").text(dados.coluna);
  doc.fontSize(10).fillColor(COR.apagado).font("Helvetica").text(dados.organizacao);
  doc.fontSize(9).fillColor(COR.apagado).text(`Emitido em ${formatarDataHora(new Date())}`);
  doc.moveDown(0.5);
  doc.strokeColor(COR.linha).lineWidth(1).moveTo(40, doc.y).lineTo(40 + largura, doc.y).stroke();
  doc.moveDown(1);

  if (dados.atividades.length === 0) {
    doc.fontSize(11).fillColor(COR.apagado).text("Nenhuma atividade nesta coluna.");
  }

  dados.atividades.forEach((atividade, indice) => {
    // Quebra de página com folga para o bloco inteiro, para não partir o item.
    if (doc.y > doc.page.height - 140) doc.addPage();

    doc.fontSize(12).fillColor(COR.titulo).font("Helvetica-Bold");
    doc.text(`${indice + 1}. ${atividade.titulo}`, { width: largura });

    const etiquetas = [
      atividade.protocolo ? `Protocolo ${atividade.protocolo}` : "",
      atividade.prioridade ? `Prioridade: ${atividade.prioridade}` : "",
      atividade.rotina ? `Rotina: ${atividade.rotina}` : "",
      atividade.responsavelNome ? `Responsável: ${atividade.responsavelNome}` : "",
    ]
      .filter(Boolean)
      .join("   ·   ");

    if (etiquetas) {
      doc.fontSize(9).fillColor(COR.apagado).font("Helvetica").text(etiquetas, { width: largura });
    }

    if (atividade.descricao) {
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor(COR.texto).font("Helvetica");
      doc.text(atividade.descricao, { width: largura });
    }

    doc.moveDown(0.6);
    doc.strokeColor(COR.linha).lineWidth(0.5).moveTo(40, doc.y).lineTo(40 + largura, doc.y).stroke();
    doc.moveDown(0.6);
  });

  doc.fontSize(8).fillColor(COR.apagado);
  doc.text(
    `${dados.atividades.length} atividade(s) · App Manutenção`,
    40,
    doc.page.height - 50,
    { width: largura, align: "center" },
  );

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(pedacos)));
  });
}
