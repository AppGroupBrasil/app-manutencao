import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { carregarImagemParaPdf } from "./_core/imagemPdf";

/** Alias local: o gerador chama assim em vários pontos. */
const fetchImageBuffer = carregarImagemParaPdf;

interface OSPDFData {
  osId: number;
  protocolo: string;
  titulo: string;
  descricao: string;
  responsavelPrincipalNome?: string;
  tempoEstimadoDias: number;
  tempoEstimadoHoras: number;
  tempoEstimadoMinutos: number;
  latitude?: string;
  longitude?: string;
  localizacaoDescricao?: string;
  materiais: Array<{ nome: string; quantidade: number; unidade?: string; valorUnitario?: number; valorTotal?: number }>;
  imagens: Array<{ url: string; tipo?: string; descricao?: string }>;
  dataCriacao: Date;
  prioridadeNome?: string;
  categoriaNome?: string;
  setorNome?: string;
  statusNome?: string;
  statusCor?: string;
  // Orçamentos
  orcamentos?: Array<{ fornecedor?: string; descricao?: string; valor: number; aprovado?: boolean; dataOrcamento?: Date }>;
  // Responsáveis
  responsaveis?: Array<{ nome: string; cargo?: string; telefone?: string; email?: string }>;
  // Chat e timeline
  chat?: Array<{ remetente: string; mensagem: string; data: Date }>;
  timeline?: Array<{ tipo: string; descricao: string; usuarioNome: string; data: Date }>;
  // Branding
  condominioNome?: string;
  condominioEndereco?: string;
  // Financeiro
  valorEstimado?: number;
  valorReal?: number;
  /** Token de leitura pública, usado no QR da folha. */
  shareToken?: string;
  // Solicitante
  solicitanteNome?: string;
  solicitanteTipo?: string;
}

// ===== CORES PREMIUM =====
const COLORS = {
  primary: '#1a56db',
  primaryLight: '#3b82f6',
  primaryDark: '#1e3a5f',
  accent: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  dark: '#1e293b',
  text: '#334155',
  textLight: '#64748b',
  textMuted: '#94a3b8',
  white: '#ffffff',
  border: '#e2e8f0',
  cardBg: '#ffffff',
};

function getPriorityColor(prioridade?: string): string {
  if (!prioridade) return COLORS.textLight;
  const lower = prioridade.toLowerCase();
  if (lower.includes('urgent') || lower.includes('crítica') || lower.includes('critica')) return '#dc2626';
  if (lower.includes('alta') || lower.includes('high')) return '#ea580c';
  if (lower.includes('média') || lower.includes('media') || lower.includes('normal')) return '#d97706';
  if (lower.includes('baixa') || lower.includes('low')) return '#059669';
  return COLORS.textLight;
}

// ===== FUNÇÕES AUXILIARES DE DESENHO =====
function drawRoundedRect(doc: any, x: number, y: number, w: number, h: number, r: number, options?: { fill?: string; stroke?: string; lineWidth?: number }) {
  doc.save();
  if (options?.lineWidth) doc.lineWidth(options.lineWidth);
  doc.roundedRect(x, y, w, h, r);
  if (options?.fill && options?.stroke) {
    doc.fillAndStroke(options.fill, options.stroke);
  } else if (options?.fill) {
    doc.fill(options.fill);
  } else if (options?.stroke) {
    doc.stroke(options.stroke);
  }
  doc.restore();
}

function drawBadge(doc: any, text: string, x: number, y: number, color: string) {
  doc.save();
  const fontSize = 8;
  doc.fontSize(fontSize);
  const textWidth = doc.widthOfString(text);
  const pX = 8;
  const pY = 3;
  const bW = textWidth + pX * 2;
  const bH = fontSize + pY * 2;
  drawRoundedRect(doc, x, y, bW, bH, 4, { fill: color });
  doc.fillColor('#ffffff').fontSize(fontSize).text(text, x + pX, y + pY, { width: textWidth + 2 });
  doc.restore();
  return bW;
}

function getTimelineColor(tipo: string): string {
  const colors: Record<string, string> = {
    'criacao': '#10b981',
    'status_alterado': '#3b82f6',
    'responsavel_adicionado': '#8b5cf6',
    'responsavel_removido': '#ef4444',
    'material_adicionado': '#f59e0b',
    'material_removido': '#ef4444',
    'orcamento_adicionado': '#06b6d4',
    'orcamento_aprovado': '#10b981',
    'orcamento_rejeitado': '#ef4444',
    'inicio_servico': '#22c55e',
    'fim_servico': '#059669',
    'comentario': '#6366f1',
    'foto_adicionada': '#ec4899',
    'localizacao_atualizada': '#f97316',
    'vinculo_manutencao': '#14b8a6',
    'anexo_adicionado': '#8b5cf6',
    'anexo_removido': '#ef4444',
  };
  return colors[tipo] || '#94a3b8';
}

function getSectionColor(section: string): string {
  const colors: Record<string, string> = {
    'INFORMACOES GERAIS': '#1a56db',
    'DESCRICAO DO SERVICO': '#0ea5e9',
    'EQUIPA RESPONSAVEL': '#8b5cf6',
    'MATERIAIS NECESSARIOS': '#f59e0b',
    'ORCAMENTOS': '#06b6d4',
    'LOCALIZACAO': '#f97316',
    'EVIDENCIAS FOTOGRAFICAS': '#ec4899',
    'HISTORICO / TIMELINE': '#6366f1',
    'COMENTARIOS / CHAT': '#14b8a6',
  };
  return colors[section] || COLORS.primary;
}

function drawSectionTitle(doc: any, icon: string, title: string, y: number, pageWidth: number, margin: number) {
  const contentWidth = pageWidth - margin * 2;
  const sectionColor = getSectionColor(title);
  doc.save();
  drawRoundedRect(doc, margin, y, 4, 20, 2, { fill: sectionColor });
  doc.fontSize(13).fillColor(sectionColor).font('Helvetica-Bold');
  doc.text(`${icon}  ${title}`, margin + 12, y + 3);
  doc.strokeColor(COLORS.border).lineWidth(0.5);
  doc.moveTo(margin, y + 24).lineTo(margin + contentWidth, y + 24).stroke();
  doc.restore();
  return y + 32;
}

function checkPageBreak(doc: any, neededSpace: number, margin: number, currentY?: number): number {
  const posY = currentY !== undefined ? currentY : doc.y;
  if (posY + neededSpace > 760) {
    doc.addPage();
    return margin + 10;
  }
  return posY;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getTimelineLabel(tipo: string): string {
  const labels: Record<string, string> = {
    'criacao': 'Criacao',
    'status_alterado': 'Status alterado',
    'responsavel_adicionado': 'Responsavel adicionado',
    'responsavel_removido': 'Responsavel removido',
    'material_adicionado': 'Material adicionado',
    'material_removido': 'Material removido',
    'orcamento_adicionado': 'Orcamento adicionado',
    'orcamento_aprovado': 'Orcamento aprovado',
    'orcamento_rejeitado': 'Orcamento rejeitado',
    'inicio_servico': 'Inicio do servico',
    'fim_servico': 'Fim do servico',
    'comentario': 'Comentario',
    'foto_adicionada': 'Foto adicionada',
    'localizacao_atualizada': 'Localizacao atualizada',
    'vinculo_manutencao': 'Vinculo com manutencao',
    'anexo_adicionado': 'Anexo adicionado',
    'anexo_removido': 'Anexo removido',
  };
  return labels[tipo] || tipo;
}

// ===== GERADOR PRINCIPAL =====
export async function generateOSPDF(data: OSPDFData): Promise<Buffer> {
  // Pre-fetch de todas as imagens (antes de iniciar o doc)
  const imageBuffers: Array<{ buffer: Buffer; tipo?: string; descricao?: string; url: string }> = [];
  if (data.imagens && data.imagens.length > 0) {
    const fetches = data.imagens.slice(0, 12).map(async (img) => {
      const buf = await fetchImageBuffer(img.url);
      if (buf && buf.length > 100) {
        imageBuffers.push({ buffer: buf, tipo: img.tipo, descricao: img.descricao, url: img.url });
      }
    });
    await Promise.all(fetches);
  }

  // Gerar QR Code como PNG buffer
  const baseUrl = process.env.VITE_APP_URL || "https://appmanutencao.com.br";
  // Link público: quem lê o código na folha impressa está no local e quase
  // nunca tem conta — apontar para a tela interna parava todo mundo no login.
  const osUrl = data.shareToken
    ? `${baseUrl}/os/${data.shareToken}`
    : `${baseUrl}/manutencoes/ordens-servico/${data.osId}`;
  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await QRCode.toBuffer(osUrl, {
      type: 'png',
      width: 200,
      margin: 1,
      color: { dark: '#1e3a5f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch {}

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const margin = 40;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const contentWidth = pageWidth - margin * 2;

    const doc = new (PDFDocument as any)({
      size: "A4",
      margins: { top: margin, bottom: 0, left: margin, right: margin },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `Relatorio OS - ${data.protocolo}`,
        Author: data.condominioNome || 'Sistema de Manutencao',
        Subject: `Ordem de Servico ${data.protocolo}`,
      }
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ==========================================
    //  CABECALHO PREMIUM — FAIXA SUPERIOR
    // ==========================================
    const headerHeight = 120;

    // Gradiente simulado (faixas de cor)
    const gradientSteps = 40;
    const stepH = headerHeight / gradientSteps;
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(30 + ratio * (26 - 30));
      const g = Math.round(58 + ratio * (86 - 58));
      const b = Math.round(95 + ratio * (219 - 95));
      const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      doc.rect(0, i * stepH, pageWidth, stepH + 1).fill(color);
    }

    // Circulos decorativos
    doc.save();
    doc.opacity(0.08);
    doc.circle(pageWidth - 60, 30, 80).fill('#ffffff');
    doc.circle(pageWidth - 20, 90, 50).fill('#ffffff');
    doc.circle(50, 100, 40).fill('#ffffff');
    doc.restore();

    // Titulo no header
    doc.save();
    doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('RELATORIO DE', margin + 8, 25, { width: contentWidth - 16 });
    doc.fontSize(26).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('ORDEM DE SERVICO', margin + 8, 50, { width: contentWidth - 16 });

    // Protocolo no header
    doc.fontSize(10).fillColor('#b3d4fc').font('Helvetica');
    doc.text('Protocolo', margin + 8, 85);
    doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text(data.protocolo || 'N/A', margin + 8, 97);

    // Data no header (direita)
    doc.fontSize(9).fillColor('#b3d4fc').font('Helvetica');
    doc.text('Gerado em', pageWidth - margin - 150, 85, { width: 142, align: 'right' });
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text(formatDateTime(new Date()), pageWidth - margin - 150, 97, { width: 142, align: 'right' });
    doc.restore();

    // QR Code no header (canto superior direito)
    if (qrBuffer) {
      try {
        const qrSize = 58;
        const qrX = pageWidth - margin - qrSize - 2;
        const qrY = 18;
        // Fundo branco arredondado para o QR
        doc.save();
        drawRoundedRect(doc, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 6, { fill: '#ffffff' });
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
        doc.fontSize(5.5).fillColor('#b3d4fc').font('Helvetica');
        doc.text('Escaneie para acessar', qrX - 4, qrY + qrSize + 6, { width: qrSize + 8, align: 'center' });
        doc.restore();
      } catch {}
    }

    // Barra de accent abaixo do header
    doc.rect(0, headerHeight, pageWidth, 3).fill(COLORS.accent);

    let y = headerHeight + 18;

    // ==========================================
    //  BARRA DE INFO: STATUS / PRIORIDADE / CATEGORIA / SETOR
    // ==========================================
    doc.save();
    drawRoundedRect(doc, margin, y, contentWidth, 50, 8, { fill: '#f8fafc', stroke: COLORS.border, lineWidth: 0.5 });

    const colW = contentWidth / 4;
    const ibY = y + 8;

    // Status
    doc.fontSize(8).fillColor(COLORS.textMuted).font('Helvetica').text('STATUS', margin + 12, ibY, { width: colW - 24 });
    drawBadge(doc, (data.statusNome || 'Pendente').toUpperCase(), margin + 12, ibY + 14, data.statusCor || COLORS.primary);

    // Prioridade
    doc.fontSize(8).fillColor(COLORS.textMuted).font('Helvetica').text('PRIORIDADE', margin + colW + 12, ibY, { width: colW - 24 });
    drawBadge(doc, (data.prioridadeNome || 'N/A').toUpperCase(), margin + colW + 12, ibY + 14, getPriorityColor(data.prioridadeNome));

    // Categoria
    doc.fontSize(8).fillColor(COLORS.textMuted).font('Helvetica').text('CATEGORIA', margin + colW * 2 + 12, ibY, { width: colW - 24 });
    if (data.categoriaNome && data.categoriaNome !== 'N/A') {
      drawBadge(doc, (data.categoriaNome).toUpperCase(), margin + colW * 2 + 12, ibY + 14, '#8b5cf6');
    } else {
      doc.fontSize(10).fillColor(COLORS.dark).font('Helvetica-Bold').text('N/A', margin + colW * 2 + 12, ibY + 15, { width: colW - 24 });
    }

    // Setor
    doc.fontSize(8).fillColor(COLORS.textMuted).font('Helvetica').text('SETOR', margin + colW * 3 + 12, ibY, { width: colW - 24 });
    if (data.setorNome && data.setorNome !== 'N/A') {
      drawBadge(doc, (data.setorNome).toUpperCase(), margin + colW * 3 + 12, ibY + 14, '#06b6d4');
    } else {
      doc.fontSize(10).fillColor(COLORS.dark).font('Helvetica-Bold').text('N/A', margin + colW * 3 + 12, ibY + 15, { width: colW - 24 });
    }

    doc.restore();
    y += 62;

    // ==========================================
    //  SECAO: INFORMACOES GERAIS
    // ==========================================
    y = drawSectionTitle(doc, ' ', 'INFORMACOES GERAIS', y, pageWidth, margin);

    doc.save();
    drawRoundedRect(doc, margin, y, contentWidth, 95, 6, { fill: COLORS.cardBg, stroke: COLORS.border, lineWidth: 0.5 });
    // Barra lateral de accent
    drawRoundedRect(doc, margin, y, 4, 95, 2, { fill: '#1a56db' });

    const isY = y + 10;
    const half = contentWidth / 2;

    // Col esquerda
    doc.fontSize(8).fillColor('#1a56db').font('Helvetica-Bold').text('TITULO', margin + 14, isY);
    doc.fontSize(11).fillColor(COLORS.dark).font('Helvetica-Bold').text(data.titulo || 'Sem titulo', margin + 14, isY + 12, { width: half - 28 });

    doc.fontSize(8).fillColor('#8b5cf6').font('Helvetica-Bold').text('RESPONSAVEL PRINCIPAL', margin + 14, isY + 35);
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica').text(data.responsavelPrincipalNome || 'Nao atribuido', margin + 14, isY + 47, { width: half - 28 });

    doc.fontSize(8).fillColor('#ec4899').font('Helvetica-Bold').text('SOLICITANTE', margin + 14, isY + 62);
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica').text(
      data.solicitanteNome ? `${data.solicitanteNome}${data.solicitanteTipo ? ` (${data.solicitanteTipo})` : ''}` : 'N/A',
      margin + 14, isY + 74, { width: half - 28 }
    );

    // Col direita
    doc.fontSize(8).fillColor('#0ea5e9').font('Helvetica-Bold').text('DATA DE CRIACAO', margin + half + 14, isY);
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica').text(formatDateTime(data.dataCriacao), margin + half + 14, isY + 12, { width: half - 28 });

    const totalHours = data.tempoEstimadoDias * 24 + data.tempoEstimadoHoras + data.tempoEstimadoMinutos / 60;
    const prazoText = totalHours > 0 ? `${data.tempoEstimadoDias}d ${data.tempoEstimadoHoras}h ${data.tempoEstimadoMinutos}min` : 'Nao definido';
    doc.fontSize(8).fillColor('#f59e0b').font('Helvetica-Bold').text('PRAZO ESTIMADO', margin + half + 14, isY + 35);
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica').text(prazoText, margin + half + 14, isY + 47, { width: half - 28 });

    // O sistema não trabalha com valores: onde ficava o dinheiro, entra o local.
    doc.fontSize(8).fillColor('#06b6d4').font('Helvetica-Bold').text('LOCAL/ITEM', margin + half + 14, isY + 62);
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica').text(data.condominioNome || 'N/A', margin + half + 14, isY + 74, { width: half - 28 });

    doc.restore();
    y += 105 + 12;

    // ==========================================
    //  SECAO: DESCRICAO DO SERVICO
    // ==========================================
    if (data.descricao) {
      y = checkPageBreak(doc, 80, margin, y);
      y = drawSectionTitle(doc, ' ', 'DESCRICAO DO SERVICO', y, pageWidth, margin);

      doc.save();
      doc.fontSize(10).fillColor(COLORS.text).font('Helvetica');
      const dH = doc.heightOfString(data.descricao, { width: contentWidth - 28, lineGap: 4 });
      const boxH = Math.max(dH + 20, 40);

      drawRoundedRect(doc, margin, y, contentWidth, boxH, 6, { fill: '#f0f9ff', stroke: '#bae6fd', lineWidth: 0.5 });
      drawRoundedRect(doc, margin, y, 4, boxH, 2, { fill: COLORS.primaryLight });

      doc.fontSize(10).fillColor(COLORS.text).font('Helvetica');
      doc.text(data.descricao, margin + 16, y + 10, { width: contentWidth - 32, lineGap: 4, align: 'justify' });
      doc.restore();
      y += boxH + 24;
    }

    // ==========================================
    //  SECAO: RESPONSAVEIS
    // ==========================================
    if (data.responsaveis && data.responsaveis.length > 0) {
      y = checkPageBreak(doc, 80, margin, y);
      y = drawSectionTitle(doc, ' ', 'EQUIPA RESPONSAVEL', y, pageWidth, margin);

      const cardH = 48;
      const cardsPerRow = 2;
      const cardW = (contentWidth - 10) / cardsPerRow;

      for (let i = 0; i < data.responsaveis.length; i++) {
        const resp = data.responsaveis[i];
        const col = i % cardsPerRow;
        const row = Math.floor(i / cardsPerRow);
        if (col === 0 && row > 0) y = checkPageBreak(doc, cardH + 10, margin, y);

        const cx = margin + col * (cardW + 10);
        const cy = y + row * (cardH + 8);

        doc.save();
        drawRoundedRect(doc, cx, cy, cardW, cardH, 5, { fill: COLORS.cardBg, stroke: COLORS.border, lineWidth: 0.5 });

        // Avatar
        doc.circle(cx + 20, cy + 24, 14).fill(COLORS.primaryLight);
        doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold');
        const initials = resp.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
        doc.text(initials, cx + 10, cy + 18, { width: 20, align: 'center' });

        doc.fontSize(10).fillColor(COLORS.dark).font('Helvetica-Bold');
        doc.text(resp.nome, cx + 40, cy + 8, { width: cardW - 52 });
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
        const dets = [resp.cargo, resp.telefone, resp.email].filter(Boolean).join(' | ');
        doc.text(dets || 'Sem informacao adicional', cx + 40, cy + 22, { width: cardW - 52 });
        doc.restore();
      }

      const totalRows = Math.ceil(data.responsaveis.length / cardsPerRow);
      y += totalRows * (cardH + 8) + 20;
    }

    // ==========================================
    //  SECAO: MATERIAIS
    // ==========================================
    if (data.materiais && data.materiais.length > 0) {
      y = checkPageBreak(doc, 100, margin, y);
      y = drawSectionTitle(doc, ' ', 'MATERIAIS NECESSARIOS', y, pageWidth, margin);

      const tX = margin;
      const tW = contentWidth;
      const rH = 26;
      const cW = [tW * 0.5, tW * 0.15, tW * 0.15, tW * 0.2];

      // Header tabela
      doc.save();
      drawRoundedRect(doc, tX, y, tW, rH, 4, { fill: COLORS.primaryDark });
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('MATERIAL', tX + 12, y + 8, { width: cW[0] - 16 });
      doc.text('QTD.', tX + cW[0] + 8, y + 8, { width: cW[1] - 16, align: 'center' });
      doc.text('UNID.', tX + cW[0] + cW[1] + 8, y + 8, { width: cW[2] - 16, align: 'center' });
      doc.restore();
      y += rH;

      for (let i = 0; i < data.materiais.length; i++) {
        y = checkPageBreak(doc, rH + 5, margin, y);
        const mat = data.materiais[i];
        const isEven = i % 2 === 0;

        doc.save();
        if (isEven) drawRoundedRect(doc, tX, y, tW, rH, 0, { fill: '#fffbeb' });
        else drawRoundedRect(doc, tX, y, tW, rH, 0, { fill: '#fefce8' });

        doc.strokeColor('#fde68a').lineWidth(0.3);
        doc.moveTo(tX, y + rH).lineTo(tX + tW, y + rH).stroke();

        // Bullet colorido
        doc.circle(tX + 7, y + rH / 2, 3).fill('#f59e0b');

        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
        doc.text(mat.nome, tX + 16, y + 8, { width: cW[0] - 20 });
        doc.text(String(mat.quantidade || 0), tX + cW[0] + 8, y + 8, { width: cW[1] - 16, align: 'center' });
        doc.text(mat.unidade || 'un', tX + cW[0] + cW[1] + 8, y + 8, { width: cW[2] - 16, align: 'center' });

        doc.restore();
        y += rH;
      }
      y += 24;
    }

    // ==========================================
    //  SECAO: LOCALIZACAO
    // ==========================================
    if (data.latitude && data.longitude) {
      y = checkPageBreak(doc, 70, margin, y);
      y = drawSectionTitle(doc, ' ', 'LOCALIZACAO', y, pageWidth, margin);

      doc.save();
      const lH = 50;
      drawRoundedRect(doc, margin, y, contentWidth, lH, 6, { fill: '#fef3c7', stroke: '#fcd34d', lineWidth: 0.5 });
      drawRoundedRect(doc, margin, y, 4, lH, 2, { fill: COLORS.warning });

      doc.fontSize(10).fillColor(COLORS.dark).font('Helvetica-Bold').text('Coordenadas GPS', margin + 14, y + 8);
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica').text(`Lat: ${data.latitude}  |  Long: ${data.longitude}`, margin + 14, y + 22);

      if (data.localizacaoDescricao) {
        doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica').text(data.localizacaoDescricao, margin + 14, y + 35, { width: contentWidth * 0.6 });
      }

      doc.fontSize(8).fillColor(COLORS.primaryLight).font('Helvetica');
      doc.text(`maps.google.com/maps?q=${data.latitude},${data.longitude}`, margin + contentWidth * 0.5, y + 35, { width: contentWidth * 0.5 - 14, align: 'right' });
      doc.restore();
      y += lH + 24;
    }

    // ==========================================
    //  SECAO: IMAGENS / EVIDENCIAS FOTOGRAFICAS
    // ==========================================
    if (imageBuffers.length > 0) {
      y = checkPageBreak(doc, 120, margin, y);
      y = drawSectionTitle(doc, ' ', 'EVIDENCIAS FOTOGRAFICAS', y, pageWidth, margin);

      // Info box
      doc.save();
      drawRoundedRect(doc, margin, y, contentWidth, 32, 6, { fill: '#f0fdf4', stroke: '#bbf7d0', lineWidth: 0.5 });
      doc.fontSize(10).fillColor(COLORS.dark).font('Helvetica-Bold')
        .text(`${imageBuffers.length} imagem(ns) anexada(s)`, margin + 14, y + 9);
      doc.restore();
      y += 42;

      // Grid de imagens: 2 por linha
      const imgCols = 2;
      const imgGap = 14;
      const imgW = (contentWidth - imgGap * (imgCols - 1)) / imgCols;
      const imgH = 180;
      const cardPad = 6;

      for (let i = 0; i < imageBuffers.length; i++) {
        const col = i % imgCols;
        if (col === 0) {
          y = checkPageBreak(doc, imgH + 40, margin, y);
        }

        const cx = margin + col * (imgW + imgGap);
        const imgInfo = imageBuffers[i];

        try {
          doc.save();

          // Card container com sombra sutil
          drawRoundedRect(doc, cx, y, imgW, imgH + 28, 8, { fill: '#ffffff', stroke: COLORS.border, lineWidth: 0.5 });

          // Clip para imagem arredondada dentro do card
          doc.save();
          doc.roundedRect(cx + cardPad, y + cardPad, imgW - cardPad * 2, imgH - cardPad, 6).clip();
          doc.image(imgInfo.buffer, cx + cardPad, y + cardPad, {
            width: imgW - cardPad * 2,
            height: imgH - cardPad,
            fit: [imgW - cardPad * 2, imgH - cardPad],
            align: 'center',
            valign: 'center',
          });
          doc.restore();

          // Label de tipo (badge dentro da imagem)
          if (imgInfo.tipo && imgInfo.tipo !== 'outro') {
            const tipoColors: Record<string, string> = {
              'antes': '#3b82f6', 'durante': '#f59e0b', 'depois': '#10b981', 'orcamento': '#8b5cf6',
            };
            drawBadge(doc, imgInfo.tipo.toUpperCase(), cx + cardPad + 4, y + cardPad + 4, tipoColors[imgInfo.tipo] || COLORS.textLight);
          }

          // Legenda abaixo da imagem
          const labelText = imgInfo.descricao || `Imagem ${i + 1}`;
          doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
          doc.text(labelText, cx + cardPad + 2, y + imgH + 6, { width: imgW - cardPad * 2 - 4, align: 'center', ellipsis: true });

          doc.restore();
        } catch {
          // Se falhar ao incorporar a imagem, mostrar placeholder
          doc.save();
          drawRoundedRect(doc, cx, y, imgW, imgH + 28, 8, { fill: '#f8fafc', stroke: COLORS.border, lineWidth: 0.5 });
          doc.fontSize(9).fillColor(COLORS.textMuted).font('Helvetica');
          doc.text('Imagem indisponivel', cx + 10, y + imgH / 2, { width: imgW - 20, align: 'center' });
          doc.restore();
        }

        // Avançar Y apenas na ultima coluna da linha
        if (col === imgCols - 1 || i === imageBuffers.length - 1) {
          y += imgH + 28 + 12;
        }
      }
      y += 12;
    }

    // ==========================================
    //  SECAO: TIMELINE / HISTORICO
    // ==========================================
    if (data.timeline && data.timeline.length > 0) {
      y = checkPageBreak(doc, 80, margin, y);
      y = drawSectionTitle(doc, ' ', 'HISTORICO / TIMELINE', y, pageWidth, margin);

      const tlX = margin + 20;

      for (let i = 0; i < data.timeline.length; i++) {
        y = checkPageBreak(doc, 40, margin, y);
        const evt = data.timeline[i];
        const isLast = i === data.timeline.length - 1;

        doc.save();

        // Linha vertical
        if (!isLast) {
          doc.strokeColor(COLORS.border).lineWidth(1.5);
          doc.moveTo(tlX, y + 10).lineTo(tlX, y + 42).stroke();
        }

        // Ponto — cor por tipo de evento
        const evtColor = getTimelineColor(evt.tipo);
        doc.circle(tlX, y + 8, 5).fill(evtColor);
        doc.circle(tlX, y + 8, 2).fill('#ffffff');

        doc.fontSize(9).fillColor(COLORS.dark).font('Helvetica-Bold');
        doc.text(getTimelineLabel(evt.tipo), tlX + 14, y + 2, { width: contentWidth - 50 });

        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
        if (evt.descricao) {
          doc.text(evt.descricao, tlX + 14, y + 14, { width: contentWidth - 80 });
        }

        doc.fontSize(7).fillColor(COLORS.textMuted).font('Helvetica');
        doc.text(`${formatDateTime(evt.data)} | ${evt.usuarioNome}`, tlX + 14, y + (evt.descricao ? 26 : 14), { width: contentWidth - 50 });

        doc.restore();
        y += evt.descricao ? 38 : 28;
      }
      y += 20;
    }

    // ==========================================
    //  SECAO: CHAT / COMENTARIOS
    // ==========================================
    if (data.chat && data.chat.length > 0) {
      y = checkPageBreak(doc, 80, margin, y);
      y = drawSectionTitle(doc, ' ', 'COMENTARIOS / CHAT', y, pageWidth, margin);

      for (let i = 0; i < data.chat.length; i++) {
        const msg = data.chat[i];
        const mH = Math.max(doc.fontSize(9).heightOfString(msg.mensagem || '', { width: contentWidth - 50 }) + 30, 40);
        y = checkPageBreak(doc, mH + 5, margin, y);

        const chatColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#06b6d4'];
        const chatColor = chatColors[i % chatColors.length];

        doc.save();
        drawRoundedRect(doc, margin + 8, y, contentWidth - 16, mH, 6, { fill: i % 2 === 0 ? '#f8fafc' : '#ffffff', stroke: COLORS.border, lineWidth: 0.3 });
        drawRoundedRect(doc, margin + 8, y, 3, mH, 2, { fill: chatColor });

        doc.fontSize(9).fillColor(chatColor).font('Helvetica-Bold');
        doc.text(msg.remetente, margin + 18, y + 6, { width: contentWidth * 0.5 });

        doc.fontSize(7).fillColor(COLORS.textMuted).font('Helvetica');
        doc.text(formatDateTime(msg.data), margin + contentWidth * 0.5, y + 7, { width: contentWidth * 0.5 - 28, align: 'right' });

        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
        doc.text(msg.mensagem || '', margin + 18, y + 20, { width: contentWidth - 50, lineGap: 3 });

        doc.restore();
        y += mH + 6;
      }
      y += 8;
    }

    // ==========================================
    //  RODAPE EM TODAS AS PAGINAS
    // ==========================================
    const pages = doc.bufferedPageRange();
    const totalPages = pages.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.save();

      // Linha
      doc.strokeColor(COLORS.border).lineWidth(0.5);
      doc.moveTo(margin, pageHeight - 50).lineTo(pageWidth - margin, pageHeight - 50).stroke();
      doc.rect(margin, pageHeight - 50, contentWidth, 2).fill(COLORS.primary);

      // QR Code pequeno no rodape (todas as paginas)
      if (qrBuffer) {
        try {
          const fqrSize = 32;
          const fqrX = pageWidth - margin - fqrSize;
          const fqrY = pageHeight - 48;
          doc.save();
          drawRoundedRect(doc, fqrX - 2, fqrY - 2, fqrSize + 4, fqrSize + 4, 3, { fill: '#ffffff', stroke: COLORS.border, lineWidth: 0.3 });
          doc.image(qrBuffer, fqrX, fqrY, { width: fqrSize, height: fqrSize });
          doc.restore();
        } catch {}
      }

      // Texto esquerdo
      doc.fontSize(7).fillColor(COLORS.textMuted).font('Helvetica');
      doc.text(`${data.condominioNome || 'Sistema de Manutencao'} — Relatorio gerado automaticamente`, margin, pageHeight - 40, { width: contentWidth * 0.55 });
      doc.text(data.protocolo || '', margin, pageHeight - 30, { width: contentWidth * 0.55 });

      // Pagina (centro-direita)
      doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica-Bold');
      doc.text(`Pagina ${i + 1} de ${totalPages}`, margin + contentWidth * 0.55, pageHeight - 40, { width: contentWidth * 0.25, align: 'right' });
      doc.fontSize(7).fillColor(COLORS.textMuted).font('Helvetica');
      doc.text(formatDateTime(new Date()), margin + contentWidth * 0.55, pageHeight - 30, { width: contentWidth * 0.25, align: 'right' });

      doc.restore();
    }

    doc.end();
  });
}
