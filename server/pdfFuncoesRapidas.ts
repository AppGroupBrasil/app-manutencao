import { jsPDF } from 'jspdf';
import { carregarImagemParaPdf, formatoDaImagem } from './_core/imagemPdf';
import 'jspdf-autotable';

interface ItemFuncaoRapida {
  tipo: "checklist" | "manutencao" | "ocorrencia" | "vistoria";
  protocolo: string;
  titulo: string;
  subtitulo?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  status: string;
  prioridade?: string | null;
  responsavelNome?: string | null;
  localizacao?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  enderecoGeo?: string | null;
  createdAt: Date;
  dataAgendada?: Date | null;
  dataRealizada?: Date | null;
  dataOcorrencia?: Date | null;
  categoria?: string | null;
  tipo_manutencao?: string | null;
  tempoEstimadoDias?: number | null;
  tempoEstimadoHoras?: number | null;
  tempoEstimadoMinutos?: number | null;
  fornecedor?: string | null;
  totalItens?: number | null;
  itensCompletos?: number | null;
  imagens?: Array<{ url: string; legenda?: string | null }>;
  condominioNome: string;
  condominioLogo?: string | null;
  cabecalhoLogoUrl?: string | null;
  cabecalhoNomeCondominio?: string | null;
  cabecalhoNomeSindico?: string | null;
  rodapeTexto?: string | null;
  rodapeContato?: string | null;
  assinaturaTecnico?: string | null;
  assinaturaSolicitante?: string | null;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDateShort(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function getTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    checklist: "Checklist",
    manutencao: "Manutenção",
    ocorrencia: "Ocorrência",
    vistoria: "Vistoria",
    antes_depois: "Antes & Depois",
  };
  return labels[tipo] || tipo;
}

function getTipoColor(tipo: string): [number, number, number] {
  const colors: Record<string, [number, number, number]> = {
    checklist: [59, 130, 246],
    manutencao: [249, 115, 22],
    ocorrencia: [239, 68, 68],
    vistoria: [34, 197, 94],
    antes_depois: [139, 92, 246],
  };
  return colors[tipo] || [107, 114, 128];
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    realizada: "Realizada",
    acao_necessaria: "Ação Necessária",
    finalizada: "Finalizada",
    reaberta: "Reaberta",
    rascunho: "Rascunho",
    enviado: "Enviado",
    concluido: "Concluído",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): [number, number, number] {
  const colors: Record<string, [number, number, number]> = {
    pendente: [234, 179, 8],
    realizada: [34, 197, 94],
    acao_necessaria: [239, 68, 68],
    finalizada: [34, 197, 94],
    reaberta: [249, 115, 22],
    rascunho: [107, 114, 128],
    enviado: [59, 130, 246],
    concluido: [16, 185, 129],
  };
  return colors[status] || [107, 114, 128];
}

function getPrioridadeLabel(prioridade: string | null | undefined): string {
  if (!prioridade) return "Média";
  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };
  return labels[prioridade] || prioridade;
}

function getPrioridadeColor(prioridade: string | null | undefined): [number, number, number] {
  if (!prioridade) return [107, 114, 128];
  const colors: Record<string, [number, number, number]> = {
    baixa: [34, 197, 94],
    media: [59, 130, 246],
    alta: [249, 115, 22],
    urgente: [239, 68, 68],
  };
  return colors[prioridade] || [107, 114, 128];
}

export async function generateFuncaoRapidaPDF(item: ItemFuncaoRapida): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const tipoColor = getTipoColor(item.tipo);
  const statusColor = getStatusColor(item.status);
  const prioridadeColor = getPrioridadeColor(item.prioridade);

  // Função auxiliar para adicionar nova página se necessário
  const checkNewPage = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // ==================== HEADER ====================
  // Barra colorida do tipo
  doc.setFillColor(tipoColor[0], tipoColor[1], tipoColor[2]);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // Nome do condomínio
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(item.cabecalhoNomeCondominio || item.condominioNome, margin, 12);

  // Subtítulo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório de ${getTipoLabel(item.tipo)}`, margin, 18);

  // Protocolo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(item.protocolo, pageWidth - margin, 15, { align: 'right' });

  yPos = 35;

  // ==================== TÍTULO E STATUS ====================
  // Título
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const tituloLines = doc.splitTextToSize(item.titulo, contentWidth);
  doc.text(tituloLines, margin, yPos);
  yPos += tituloLines.length * 7 + 5;

  // Subtítulo
  if (item.subtitulo) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(item.subtitulo, margin, yPos);
    yPos += 7;
  }

  yPos += 5;

  // Badges de status e prioridade
  // Status badge
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin, yPos, 30, 7, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(getStatusLabel(item.status), margin + 2, yPos + 5);

  // Prioridade badge
  if (item.prioridade) {
    doc.setFillColor(prioridadeColor[0], prioridadeColor[1], prioridadeColor[2]);
    doc.roundedRect(margin + 35, yPos, 25, 7, 2, 2, 'F');
    doc.text(getPrioridadeLabel(item.prioridade), margin + 37, yPos + 5);
  }

  // Tipo badge
  doc.setFillColor(tipoColor[0], tipoColor[1], tipoColor[2]);
  doc.roundedRect(margin + 65, yPos, 25, 7, 2, 2, 'F');
  doc.text(getTipoLabel(item.tipo), margin + 67, yPos + 5);

  yPos += 15;

  // ==================== INFORMAÇÕES ====================
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Grid de informações
  const infoItems: Array<{ label: string; value: string }> = [];

  infoItems.push({ label: 'Data de Criação', value: formatDate(item.createdAt) });

  if (item.responsavelNome) {
    infoItems.push({ label: 'Responsável', value: item.responsavelNome });
  }

  if (item.localizacao) {
    infoItems.push({ label: 'Localização', value: item.localizacao });
  }

  if (item.dataAgendada) {
    infoItems.push({ label: 'Data Agendada', value: formatDateShort(item.dataAgendada) });
  }

  if (item.dataRealizada) {
    infoItems.push({ label: 'Data Realizada', value: formatDateShort(item.dataRealizada) });
  }

  if (item.dataOcorrencia) {
    infoItems.push({ label: 'Data da Ocorrência', value: formatDateShort(item.dataOcorrencia) });
  }

  if (item.categoria) {
    infoItems.push({ label: 'Categoria', value: item.categoria });
  }

  if (item.tipo_manutencao) {
    infoItems.push({ label: 'Tipo de Manutenção', value: item.tipo_manutencao });
  }

  if (item.fornecedor) {
    infoItems.push({ label: 'Fornecedor', value: item.fornecedor });
  }

  if (item.totalItens !== null && item.totalItens !== undefined) {
    const completos = item.itensCompletos || 0;
    infoItems.push({ label: 'Progresso', value: `${completos}/${item.totalItens} itens` });
  }

  // Tempo estimado
  if (item.tempoEstimadoDias || item.tempoEstimadoHoras || item.tempoEstimadoMinutos) {
    const partes = [];
    if (item.tempoEstimadoDias) partes.push(`${item.tempoEstimadoDias}d`);
    if (item.tempoEstimadoHoras) partes.push(`${item.tempoEstimadoHoras}h`);
    if (item.tempoEstimadoMinutos) partes.push(`${item.tempoEstimadoMinutos}min`);
    infoItems.push({ label: 'Tempo Estimado', value: partes.join(' ') });
  }

  // Renderizar informações em 2 colunas
  const colWidth = contentWidth / 2;
  for (let i = 0; i < infoItems.length; i += 2) {
    checkNewPage(15);

    // Coluna 1
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(infoItems[i].label, margin, yPos);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(infoItems[i].value, margin, yPos + 5);

    // Coluna 2
    if (infoItems[i + 1]) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(infoItems[i + 1].label, margin + colWidth, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(infoItems[i + 1].value, margin + colWidth, yPos + 5);
    }

    yPos += 15;
  }

  // ==================== DESCRIÇÃO ====================
  if (item.descricao) {
    checkNewPage(30);
    yPos += 5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    
    const descLines = doc.splitTextToSize(item.descricao, contentWidth - 10);
    const boxHeight = 15 + descLines.length * 5;
    
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(tipoColor[0], tipoColor[1], tipoColor[2]);
    doc.text('Descrição', margin + 5, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(descLines, margin + 5, yPos + 14);

    yPos += boxHeight + 8;
  }

  // ==================== OBSERVAÇÕES ====================
  if (item.observacoes) {
    checkNewPage(30);

    doc.setFillColor(254, 249, 195);
    doc.setDrawColor(234, 179, 8);
    
    const obsLines = doc.splitTextToSize(item.observacoes, contentWidth - 10);
    const boxHeight = 15 + obsLines.length * 5;
    
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(161, 98, 7);
    doc.text('Observações', margin + 5, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 63, 18);
    doc.text(obsLines, margin + 5, yPos + 14);

    yPos += boxHeight + 8;
  }

  // ==================== IMAGENS ====================
  if (item.imagens && item.imagens.length > 0) {
    checkNewPage(30);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(`Imagens (${item.imagens.length})`, margin, yPos + 5);
    yPos += 10;

    const imgWidth = 55;
    const imgHeight = 40;
    const imgGap = 5;
    const imgsPerRow = 3;
    
    for (let i = 0; i < item.imagens.length; i++) {
      const col = i % imgsPerRow;
      if (col === 0 && i > 0) {
        yPos += imgHeight + (item.imagens[i - imgsPerRow]?.legenda ? 12 : 5);
      }
      if (col === 0) {
        checkNewPage(imgHeight + 15);
      }
      
      const xPos = margin + col * (imgWidth + imgGap);
      
      try {
        // A url pode ser caminho local (`/uploads/...`) ou endereço; quem
        // resolve os dois é o carregador comum. Com `fetch` direto, toda foto
        // guardada no disco do servidor virava "Imagem indisponível".
        const imgUrl = item.imagens[i].url;
        const buffer = await carregarImagemParaPdf(imgUrl);
        if (buffer) {
          const format = formatoDaImagem(imgUrl);
          const contentType = format === 'PNG' ? 'image/png' : 'image/jpeg';
          const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
          
          // Borda e fundo
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');
          
          doc.addImage(dataUri, format, xPos + 1, yPos + 1, imgWidth - 2, imgHeight - 2);
        }
      } catch {
        // Se falhar, desenhar placeholder
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('Imagem indisponível', xPos + imgWidth / 2, yPos + imgHeight / 2, { align: 'center' });
      }
      
      // Legenda da imagem
      if (item.imagens[i].legenda) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const legendaTruncada = item.imagens[i].legenda!.length > 25 
          ? item.imagens[i].legenda!.substring(0, 22) + '...' 
          : item.imagens[i].legenda!;
        doc.text(legendaTruncada, xPos + imgWidth / 2, yPos + imgHeight + 4, { align: 'center' });
      }
    }
    
    // Avançar após a última linha de imagens
    const lastRowLegenda = item.imagens[item.imagens.length - 1]?.legenda;
    yPos += imgHeight + (lastRowLegenda ? 12 : 8);
  }

  // ==================== LOCALIZAÇÃO ====================
  if (item.enderecoGeo || (item.latitude && item.longitude)) {
    checkNewPage(25);

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('Localização', margin + 5, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(21, 128, 61);
    
    if (item.enderecoGeo) {
      doc.text(item.enderecoGeo, margin + 5, yPos + 14);
    }
    
    if (item.latitude && item.longitude) {
      doc.setFontSize(8);
      doc.text(`Coordenadas: ${item.latitude}, ${item.longitude}`, margin + 5, yPos + 18);
    }

    yPos += 25;
  }

  // ==================== ASSINATURAS DIGITAIS ====================
  if (item.assinaturaTecnico || item.assinaturaSolicitante) {
    checkNewPage(55);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Assinaturas Digitais', margin, yPos + 5);
    yPos += 10;

    const sigWidth = 70;
    const sigHeight = 30;
    const sigGap = 20;
    
    if (item.assinaturaTecnico) {
      try {
        // Desenhar borda e fundo
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(margin, yPos, sigWidth, sigHeight, 2, 2, 'FD');
        // Inserir imagem da assinatura
        doc.addImage(item.assinaturaTecnico, 'PNG', margin + 2, yPos + 2, sigWidth - 4, sigHeight - 4);
        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('Assinatura do Funcionário', margin + sigWidth / 2, yPos + sigHeight + 5, { align: 'center' });
      } catch { /* ignore rendering errors */ }
    }

    if (item.assinaturaSolicitante) {
      const xOffset = item.assinaturaTecnico ? margin + sigWidth + sigGap : margin;
      try {
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(xOffset, yPos, sigWidth, sigHeight, 2, 2, 'FD');
        doc.addImage(item.assinaturaSolicitante, 'PNG', xOffset + 2, yPos + 2, sigWidth - 4, sigHeight - 4);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('Assinatura do Solicitante', xOffset + sigWidth / 2, yPos + sigHeight + 5, { align: 'center' });
      } catch { /* ignore rendering errors */ }
    }

    yPos += sigHeight + 12;
  }

  // ==================== FOOTER ====================
  // Adicionar footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Linha separadora
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    // Texto do rodapé
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    
    const rodapeTexto = item.rodapeTexto || 'Documento gerado automaticamente pelo sistema';
    doc.text(rodapeTexto, pageWidth / 2, pageHeight - 18, { align: 'center' });
    
    if (item.rodapeContato) {
      doc.text(item.rodapeContato, pageWidth / 2, pageHeight - 13, { align: 'center' });
    }
    
    doc.text(`${item.cabecalhoNomeCondominio || item.condominioNome} • ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    
    // Número da página
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // Retornar como Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

export type { ItemFuncaoRapida };
