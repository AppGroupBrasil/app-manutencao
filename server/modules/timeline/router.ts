import { z } from "zod";
import { router, moduloUserProcedure, publicProcedure } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";
import { getDb } from "../../db";
import { 
    timelines, 
    timelineResponsaveis, 
    timelineLocais, 
    timelineStatus, 
    timelinePrioridades, 
    timelineTitulos, 
    timelineImagens, 
    timelineEventos, 
    timelineCompartilhamentos, 
    timelineNotificacoesConfig, 
    timelineNotificacoesHistorico, 
    timelineChat,
    membrosEquipe as membrosEquipeTabela,
    users,
    condominios 
} from "../../../drizzle/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail, emailTemplates } from "../../_core/email";
import { storagePut } from "../../storage";
import QRCode from "qrcode";

// Exige o modulo "timeline" habilitado e valida que cada id recebido pertence a
// organizacao da requisicao. Aqui `id` muda de tabela conforme a rota: nas de
// cadastro auxiliar aponta para responsavel/local/status/prioridade/titulo, e
// nas demais para a propria timeline. Todas essas tabelas tem condominioId.
const timelineProcedure = moduloUserProcedure(
  "timeline",
  escopoPorRegistro(
    {
      id: direto(timelines),
      timelineId: direto(timelines),
      // Impede vincular a timeline a registros de outra organizacao
      tituloPredefId: direto(timelineTitulos),
      membroEquipeId: direto(membrosEquipeTabela),
    },
    {
      atualizarResponsavel: { id: direto(timelineResponsaveis) },
      excluirResponsavel: { id: direto(timelineResponsaveis) },
      excluirLocal: { id: direto(timelineLocais) },
      excluirStatus: { id: direto(timelineStatus) },
      excluirPrioridade: { id: direto(timelinePrioridades) },
      excluirTitulo: { id: direto(timelineTitulos) },
      atualizar: {
        id: direto(timelines),
        localId: direto(timelineLocais),
        statusId: direto(timelineStatus),
        prioridadeId: direto(timelinePrioridades),
        responsavelId: direto(timelineResponsaveis),
      },
    },
  ),
);

// Helper: baixar imagem de URL externa e converter para base64 para uso no jsPDF
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

// ==================== FUNÇÃO INTERNA - GERAR PDF COMPLETO ====================
async function gerarTimelinePdfInterno(db: any, timeline: any) {
  // Buscar dados relacionados
  const [responsavel] = timeline.responsavelId 
    ? await db.select().from(timelineResponsaveis).where(eq(timelineResponsaveis.id, timeline.responsavelId))
    : [null];
  const [local] = timeline.localId 
    ? await db.select().from(timelineLocais).where(eq(timelineLocais.id, timeline.localId))
    : [null];
  const [statusObj] = timeline.statusId 
    ? await db.select().from(timelineStatus).where(eq(timelineStatus.id, timeline.statusId))
    : [null];
  const [prioridade] = timeline.prioridadeId 
    ? await db.select().from(timelinePrioridades).where(eq(timelinePrioridades.id, timeline.prioridadeId))
    : [null];
  const imagens = await db.select().from(timelineImagens)
    .where(eq(timelineImagens.timelineId, timeline.id))
    .orderBy(timelineImagens.ordem);
  const chatMessages = await db.select().from(timelineChat)
    .where(eq(timelineChat.timelineId, timeline.id))
    .orderBy(timelineChat.createdAt);
  const eventos = await db.select().from(timelineEventos)
    .where(eq(timelineEventos.timelineId, timeline.id))
    .orderBy(desc(timelineEventos.createdAt));
  const [condominio] = await db.select().from(condominios)
    .where(eq(condominios.id, timeline.condominioId));
  // Membros associados
  let membrosAssociadosNomes: string[] = [];
  try {
    if (timeline.membrosAssociados) {
      const ids = JSON.parse(timeline.membrosAssociados) as number[];
      if (ids.length > 0) {
        const membros = await db.select().from(timelineResponsaveis).where(
          and(eq(timelineResponsaveis.condominioId, timeline.condominioId), eq(timelineResponsaveis.ativo, true))
        );
        membrosAssociadosNomes = membros.filter((m: any) => ids.includes(m.id)).map((m: any) => m.nome);
      }
    }
  } catch {}

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const orgNome = condominio?.cabecalhoNomeCondominio || condominio?.nome || "Organização";
  const footerZone = 15; // reservar 15mm para o rodapé
  const maxY = pageHeight - footerZone; // limite de conteúdo

  // Helper: verifica se precisa nova página
  const checkPage = (needed: number) => {
    if (yPos + needed > maxY) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Helper: cabeçalho de seção
  const addSectionHeader = (title: string, r: number, g: number, b: number) => {
    checkPage(18); // seção header + pelo menos 1 linha de conteúdo
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin, yPos - 4, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, yPos + 2);
    yPos += 10;
    doc.setTextColor(50, 50, 50);
  };

  let yPos = 0;

  // ====== CABEÇALHO PRINCIPAL COM LOGO ======
  doc.setFillColor(249, 115, 22); // orange-500
  doc.rect(0, 0, pageWidth, 35, 'F');
  // Faixa inferior amber
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 35, pageWidth, 3, 'F');

  // Logo (tentar carregar se existir)
  let logoX = margin;
  const logoUrl = condominio?.cabecalhoLogoUrl || condominio?.logoUrl;
  if (logoUrl) {
    try {
      let logoData = logoUrl;
      if (!logoUrl.startsWith('data:')) {
        const fetched = await fetchImageAsBase64(logoUrl);
        if (fetched) logoData = fetched;
        else logoData = '';
      }
      if (logoData) {
        const fmt = logoData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoData, fmt, margin, 5, 25, 25);
        logoX = margin + 30;
      }
    } catch {
      // Fallback: iniciais no quadrado
      doc.setDrawColor(255, 255, 255);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 5, 25, 25, 2, 2, 'FD');
      doc.setTextColor(249, 115, 22);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(orgNome.substring(0, 3).toUpperCase(), margin + 12.5, 20, { align: 'center' });
      logoX = margin + 30;
    }
  }

  // Nome da organização no header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(orgNome, logoX, 15);

  // Título da timeline
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const tituloLines = doc.splitTextToSize(timeline.titulo, pageWidth - logoX - margin);
  doc.text(tituloLines[0] || '', logoX, 23);
  
  // Protocolo
  doc.setFontSize(9);
  doc.text(`Protocolo: ${timeline.protocolo}`, logoX, 30);

  yPos = 46;

  // ====== BADGES (Status, Prioridade, Categorização) ======
  doc.setFontSize(9);
  const badges: Array<{ label: string; r: number; g: number; b: number }> = [];
  if (statusObj?.nome) badges.push({ label: `Status: ${statusObj.nome}`, r: 34, g: 197, b: 94 });
  if (prioridade?.nome) badges.push({ label: `Prioridade: ${prioridade.nome}`, r: 234, g: 179, b: 8 });
  badges.push({ label: timeline.estado === "rascunho" ? "Rascunho" : timeline.estado === "enviado" ? "Enviado" : "Registado", r: 249, g: 115, b: 22 });
  
  const catLabels: Record<string, string> = { recebido: "Recebido", encaminhado: "Encaminhado", em_analise: "Em Análise", em_execucao: "Em Execução", aguardando_resposta: "Aguardando Resposta", finalizado: "Finalizado", reaberto: "Reaberto" };
  if (timeline.categorizacao) badges.push({ label: catLabels[timeline.categorizacao] || timeline.categorizacao, r: 99, g: 102, b: 241 });

  let badgeX = margin;
  for (const badge of badges) {
    const tw = doc.getTextWidth(badge.label) + 8;
    if (badgeX + tw > pageWidth - margin) { yPos += 8; badgeX = margin; }
    doc.setFillColor(badge.r, badge.g, badge.b);
    doc.roundedRect(badgeX, yPos - 4, tw, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(badge.label, badgeX + 4, yPos + 0.5);
    badgeX += tw + 3;
  }
  yPos += 12;

  // ====== INFORMAÇÕES ======
  addSectionHeader('Informações', 249, 115, 22);
  doc.setFontSize(9);
  const infoItems = [
    { label: 'Responsável', value: responsavel?.nome || '-' },
    { label: 'Local / Item', value: local?.nome || '-' },
    { label: 'Data', value: new Date(timeline.dataRegistro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + (timeline.horaRegistro ? ` às ${timeline.horaRegistro}` : '') },
    ...(timeline.localizacaoGps ? [{ label: 'GPS', value: timeline.localizacaoGps }] : []),
  ];
  for (const item of infoItems) {
    checkPage(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(`${item.label}:`, margin + 2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(String(item.value), margin + 35, yPos);
    yPos += 6;
  }

  // Membros associados
  if (membrosAssociadosNomes.length > 0) {
    yPos += 2;
    checkPage(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Equipe:', margin + 2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const membrosText = membrosAssociadosNomes.join(', ');
    const membrosLines = doc.splitTextToSize(membrosText, contentWidth - 35);
    for (const line of membrosLines) {
      checkPage(6);
      doc.text(line, margin + 35, yPos);
      yPos += 5;
    }
  }
  yPos += 4;

  // ====== DESCRIÇÕES ======
  if (timeline.descricao) {
    addSectionHeader('Descrições', 59, 130, 246);
    doc.setFontSize(9);
    const blocos = timeline.descricao.split("\n\n---\n\n");
    for (const bloco of blocos) {
      const match = bloco.match(/^\[(.+?)\]\s+(.+?):\n([\s\S]*)$/);
      if (match) {
        const [, data, autor, texto] = match;
        const textLines = doc.splitTextToSize(texto.trim(), contentWidth - 4);
        const blockHeight = 5 + textLines.length * 4.5 + 3;
        // Se o bloco inteiro cabe na página, mantém junto; senão, quebra para nova página
        checkPage(Math.min(blockHeight, maxY - 20));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(`${autor}`, margin + 2, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        doc.setFontSize(7);
        doc.text(data, margin + 2 + doc.getTextWidth(autor + '  '), yPos);
        doc.setFontSize(9);
        yPos += 5;
        doc.setTextColor(60, 60, 60);
        for (const line of textLines) {
          checkPage(5);
          doc.text(line, margin + 4, yPos);
          yPos += 4.5;
        }
        yPos += 3;
      } else {
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(bloco, contentWidth - 4);
        const blockHeight = lines.length * 4.5 + 3;
        checkPage(Math.min(blockHeight, maxY - 20));
        for (const line of lines) {
          checkPage(5);
          doc.text(line, margin + 2, yPos);
          yPos += 4.5;
        }
        yPos += 3;
      }
    }
    yPos += 2;
  }

  // ====== CHAT DA EQUIPE ======
  if (chatMessages && chatMessages.length > 0) {
    addSectionHeader('Chat da Equipe', 20, 184, 166);
    doc.setFontSize(8);
    for (const msg of chatMessages) {
      // Pré-calcular altura do bloco de mensagem
      const msgLines = doc.splitTextToSize(msg.mensagem || '', contentWidth - 12);
      const blockHeight = 4 + msgLines.length * 3.8 + 3;
      checkPage(Math.min(blockHeight + 4, maxY - 20));
      
      // Avatar circle
      doc.setFillColor(20, 184, 166);
      doc.circle(margin + 4, yPos - 1, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text((msg.autorNome || '?').charAt(0).toUpperCase(), margin + 4, yPos + 0.5, { align: 'center' });
      
      // Name + timestamp
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(msg.autorNome || 'Anônimo', margin + 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      doc.setFontSize(7);
      doc.text(new Date(msg.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }), margin + 10 + doc.getTextWidth((msg.autorNome || 'Anônimo') + '  '), yPos);
      yPos += 4;
      
      // Message text
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      for (const line of msgLines) {
        checkPage(4);
        doc.text(line, margin + 10, yPos);
        yPos += 3.8;
      }
      yPos += 3;
    }
    yPos += 2;
  }

  // ====== IMAGENS ======
  if (imagens && imagens.length > 0) {
    addSectionHeader(`Imagens (${imagens.length})`, 168, 85, 247);
    for (const img of imagens) {
      if (!img.url) continue;
      try {
        let imgData = img.url;
        // Se for URL externa, baixar e converter para base64
        if (!imgData.startsWith('data:')) {
          const fetched = await fetchImageAsBase64(imgData);
          if (fetched) {
            imgData = fetched;
          } else {
            // Falha no download - mostrar placeholder
            checkPage(8);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`[Imagem nao carregada: ${img.legenda || 'sem legenda'}]`, margin + 2, yPos);
            yPos += 6;
            continue;
          }
        }
        // Imagem ocupa 45mm de altura + legenda (até ~55mm total)
        const imgHeight = 45;
        const totalNeeded = imgHeight + (img.legenda ? 10 : 5);
        checkPage(totalNeeded);
        const fmt = imgData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, fmt, margin, yPos, 60, imgHeight);
        if (img.legenda) {
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.setFont('helvetica', 'italic');
          doc.text(img.legenda, margin + 65, yPos + 10);
          doc.setFont('helvetica', 'normal');
        }
        yPos += totalNeeded;
      } catch {
        checkPage(8);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`[Imagem: ${img.legenda || 'sem legenda'}]`, margin + 2, yPos);
        yPos += 6;
      }
    }
    yPos += 2;
  }

  // ====== REGISTRO DE ATIVIDADES ======
  if (eventos && eventos.length > 0) {
    addSectionHeader('Registro de Atividades', 100, 116, 139);
    
    // Legenda das abreviações
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    checkPage(8);
    doc.text('[VIS] Visualização  [CAT] Categorização  [MSG] Chat  [IMG] Imagem  [LINK] Compartilhamento  [EDIT] Edição  [PDF] PDF  [REG] Registro  [MBR] Membro', margin + 2, yPos);
    yPos += 5;
    
    doc.setFontSize(7);
    for (const evento of eventos.slice(0, 30)) {
      checkPage(6);
      const tipoLabels: Record<string, string> = { visualizacao: '[VIS]', categorizacao: '[CAT]', chat: '[MSG]', imagem: '[IMG]', compartilhamento: '[LINK]', edicao: '[EDIT]', pdf: '[PDF]', registro: '[REG]', membro: '[MBR]' };
      const icon = tipoLabels[evento.tipo] || '[*]';
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      const evText = `${icon} ${evento.descricao || ''} ${evento.usuarioNome ? '- ' + evento.usuarioNome : ''}`;
      const evDate = new Date(evento.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
      doc.text(evText.substring(0, 80), margin + 2, yPos);
      doc.setTextColor(160, 160, 160);
      doc.text(evDate, pageWidth - margin, yPos, { align: 'right' });
      yPos += 4.5;
    }
    if (eventos.length > 30) {
      checkPage(6);
      doc.setTextColor(140, 140, 140);
      doc.text(`... e mais ${eventos.length - 30} eventos`, margin + 2, yPos);
      yPos += 5;
    }
  }

  // ====== QR CODE DE ACESSO ======
  const baseUrl = process.env.VITE_APP_URL || "https://appmanutencao.com.br";
  const linkPublico = `${baseUrl}/timeline/${timeline.tokenPublico}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(linkPublico, {
      width: 200,
      margin: 1,
      color: { dark: '#1f2937', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    checkPage(55);
    // Fundo com borda suave
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPos - 2, contentWidth, 50, 2, 2, 'FD');
    // QR Code centralizado à esquerda
    const qrSize = 35;
    doc.addImage(qrDataUrl, 'PNG', margin + 8, yPos + 2, qrSize, qrSize);
    // Texto ao lado do QR
    const textX = margin + 8 + qrSize + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Acesse esta Timeline', textX, yPos + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Escaneie o QR Code com a câmera do', textX, yPos + 14);
    doc.text('celular para visualizar, editar ou', textX, yPos + 19);
    doc.text('adicionar ações a este documento.', textX, yPos + 24);
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    const linkLines = doc.splitTextToSize(linkPublico, contentWidth - qrSize - 30);
    doc.text(linkLines[0] || '', textX, yPos + 31);
    if (linkLines[1]) doc.text(linkLines[1], textX, yPos + 35);
    // Protocolo badge
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text(`Protocolo: ${timeline.protocolo}`, textX, yPos + 42);
    yPos += 52;
  } catch (qrErr) {
    console.error('Erro ao gerar QR Code no PDF:', qrErr);
  }

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  const footerText = `${orgNome} | Timeline ${timeline.protocolo} | Gerado em ${new Date().toLocaleString('pt-BR')}`;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(footerText, margin, pageHeight - 8);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  
  return {
    data: pdfBuffer.toString('base64'),
    filename: `timeline_${timeline.protocolo}.pdf`,
    mimeType: 'application/pdf',
  };
}

export const timelineRouter = router({
    // ==================== CONFIGURAÇÕES - RESPONSÁVEIS ====================
    listarResponsaveis: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(timelineResponsaveis)
          .where(and(
            eq(timelineResponsaveis.condominioId, input.condominioId),
            eq(timelineResponsaveis.ativo, true)
          ))
          .orderBy(timelineResponsaveis.nome);
      }),

    criarResponsavel: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(2),
        cargo: z.string().optional(),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(timelineResponsaveis).values(input).returning();
        return { id: result.id };
      }),

    atualizarResponsavel: timelineProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        cargo: z.string().optional(),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(timelineResponsaveis).set(data).where(eq(timelineResponsaveis.id, id));
        return { success: true };
      }),

    excluirResponsavel: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(timelineResponsaveis).set({ ativo: false }).where(eq(timelineResponsaveis.id, input.id));
        return { success: true };
      }),

    // ==================== CONFIGURAÇÕES - LOCAIS ====================
    listarLocais: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(timelineLocais)
          .where(and(
            eq(timelineLocais.condominioId, input.condominioId),
            eq(timelineLocais.ativo, true)
          ))
          .orderBy(timelineLocais.nome);
      }),

    criarLocal: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(2),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(timelineLocais).values(input).returning();
        return { id: result.id };
      }),

    excluirLocal: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(timelineLocais).set({ ativo: false }).where(eq(timelineLocais.id, input.id));
        return { success: true };
      }),

    // ==================== CONFIGURAÇÕES - STATUS ====================
    listarStatus: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(timelineStatus)
          .where(and(
            eq(timelineStatus.condominioId, input.condominioId),
            eq(timelineStatus.ativo, true)
          ))
          .orderBy(timelineStatus.ordem);
      }),

    criarStatus: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(2),
        cor: z.string().optional(),
        icone: z.string().optional(),
        ordem: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(timelineStatus).values(input).returning();
        return { id: result.id };
      }),

    excluirStatus: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(timelineStatus).set({ ativo: false }).where(eq(timelineStatus.id, input.id));
        return { success: true };
      }),

    // ==================== CONFIGURAÇÕES - PRIORIDADES ====================
    listarPrioridades: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(timelinePrioridades)
          .where(and(
            eq(timelinePrioridades.condominioId, input.condominioId),
            eq(timelinePrioridades.ativo, true)
          ))
          .orderBy(timelinePrioridades.nivel);
      }),

    criarPrioridade: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(2),
        cor: z.string().optional(),
        icone: z.string().optional(),
        nivel: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(timelinePrioridades).values(input).returning();
        return { id: result.id };
      }),

    excluirPrioridade: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(timelinePrioridades).set({ ativo: false }).where(eq(timelinePrioridades.id, input.id));
        return { success: true };
      }),

    // ==================== CONFIGURAÇÕES - TÍTULOS ====================
    listarTitulos: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(timelineTitulos)
          .where(and(
            eq(timelineTitulos.condominioId, input.condominioId),
            eq(timelineTitulos.ativo, true)
          ))
          .orderBy(timelineTitulos.titulo);
      }),

    criarTitulo: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        titulo: z.string().min(2),
        descricaoPadrao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(timelineTitulos).values(input).returning();
        return { id: result.id };
      }),

    excluirTitulo: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(timelineTitulos).set({ ativo: false }).where(eq(timelineTitulos.id, input.id));
        return { success: true };
      }),

    // ==================== TIMELINE - CRUD PRINCIPAL ====================
    listar: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        estado: z.enum(["rascunho", "enviado", "registado"]).optional(),
        responsavelId: z.number().optional(),
        statusId: z.number().optional(),
        prioridadeId: z.number().optional(),
        busca: z.string().optional(),
        limite: z.number().default(50),
        pagina: z.number().default(1),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        
        const conditions = [eq(timelines.condominioId, input.condominioId)];
        if (input.estado) conditions.push(eq(timelines.estado, input.estado));
        if (input.responsavelId) conditions.push(eq(timelines.responsavelId, input.responsavelId));
        if (input.statusId) conditions.push(eq(timelines.statusId, input.statusId));
        if (input.prioridadeId) conditions.push(eq(timelines.prioridadeId, input.prioridadeId));
        if (input.busca) conditions.push(or(
          like(timelines.titulo, `%${input.busca}%`),
          like(timelines.protocolo, `%${input.busca}%`),
          like(timelines.descricao, `%${input.busca}%`)
        ) as any);
        
        const offset = (input.pagina - 1) * input.limite;
        
        const items = await db.select().from(timelines)
          .where(and(...conditions))
          .orderBy(desc(timelines.createdAt))
          .limit(input.limite)
          .offset(offset);
        
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(timelines)
          .where(and(...conditions));
        
        return { items, total: Number(countResult?.count || 0) };
      }),

    obter: timelineProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [timeline] = await db.select().from(timelines).where(eq(timelines.id, input.id));
        if (!timeline) return null;
        
        // Buscar dados relacionados
        const [responsavel] = timeline.responsavelId 
          ? await db.select().from(timelineResponsaveis).where(eq(timelineResponsaveis.id, timeline.responsavelId))
          : [null];
        const [local] = timeline.localId 
          ? await db.select().from(timelineLocais).where(eq(timelineLocais.id, timeline.localId))
          : [null];
        const [status] = timeline.statusId 
          ? await db.select().from(timelineStatus).where(eq(timelineStatus.id, timeline.statusId))
          : [null];
        const [prioridade] = timeline.prioridadeId 
          ? await db.select().from(timelinePrioridades).where(eq(timelinePrioridades.id, timeline.prioridadeId))
          : [null];
        
        const imagens = await db.select().from(timelineImagens)
          .where(eq(timelineImagens.timelineId, input.id))
          .orderBy(timelineImagens.ordem);
        
        const eventos = await db.select().from(timelineEventos)
          .where(eq(timelineEventos.timelineId, input.id))
          .orderBy(desc(timelineEventos.createdAt));
        
        return {
          ...timeline,
          responsavel,
          local,
          status,
          prioridade,
          imagens,
          eventos,
        };
      }),

    criar: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        responsavelId: z.number(),
        titulo: z.string().min(2),
        localId: z.number().optional(),
        statusId: z.number().optional(),
        prioridadeId: z.number().optional(),
        tituloPredefId: z.number().optional(),
        descricao: z.string().optional(),
        localizacaoGps: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        estado: z.enum(["rascunho", "enviado", "registado"]).default("rascunho"),
        imagens: z.array(z.object({
          url: z.string(),
          legenda: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Gerar protocolo único
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, "0");
        const dia = String(now.getDate()).padStart(2, "0");
        const hora = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const seg = String(now.getSeconds()).padStart(2, "0");
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        const protocolo = `TL-${ano}${mes}${dia}-${hora}${min}${seg}-${random}`;
        
        // Gerar token público
        const tokenPublico = nanoid(32);
        
        const { imagens, ...timelineData } = input;
        
        const [result] = await db.insert(timelines).values({
          ...timelineData,
          protocolo,
          tokenPublico,
          horaRegistro: `${hora}:${min}:${seg}`,
          criadoPor: ctx.user?.id,
          criadoPorNome: ctx.user?.name || "Sistema",
        }).returning();
        
        const timelineId = Number(result.id);
        
        // Inserir imagens (upload base64 to S3 if needed)
        if (imagens && imagens.length > 0) {
          const processedImages = await Promise.all(
            imagens.map(async (img) => {
              let url = img.url;
              if (url.startsWith('data:')) {
                try {
                  const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
                  const buffer = Buffer.from(base64Data, "base64");
                  const uniqueId = nanoid(10);
                  const fileKey = `timeline/${ctx.user?.id || 'anon'}/${uniqueId}.jpg`;
                  const uploaded = await storagePut(fileKey, buffer, "image/jpeg");
                  url = uploaded.url;
                } catch (e) {
                  console.error("Erro ao fazer upload de imagem:", e);
                }
              }
              return { ...img, url };
            })
          );
          await db.insert(timelineImagens).values(
            processedImages.map((img, idx) => ({
              timelineId,
              url: img.url,
              legenda: img.legenda,
              ordem: idx,
            }))
          ).returning();
        }
        
        // Registar evento de criação
        await db.insert(timelineEventos).values({
          timelineId,
          tipo: "criacao",
          descricao: "Timeline criada",
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name || "Sistema",
        }).returning();
        
        return { id: timelineId, protocolo, tokenPublico };
      }),

    atualizar: timelineProcedure
      .input(z.object({
        id: z.number(),
        responsavelId: z.number().optional(),
        titulo: z.string().min(2).optional(),
        localId: z.number().nullable().optional(),
        statusId: z.number().nullable().optional(),
        prioridadeId: z.number().nullable().optional(),
        descricao: z.string().optional(),
        estado: z.enum(["rascunho", "enviado", "registado"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...data } = input;
        
        // Buscar dados anteriores para histórico
        const [anterior] = await db.select().from(timelines).where(eq(timelines.id, id));
        
        await db.update(timelines).set(data).where(eq(timelines.id, id));
        
        // Registar evento de edição
        await db.insert(timelineEventos).values({
          timelineId: id,
          tipo: "edicao",
          descricao: "Timeline atualizada",
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name || "Sistema",
          dadosAnteriores: JSON.stringify(anterior),
          dadosNovos: JSON.stringify(data),
        }).returning();
        
        // Verificar se houve mudança de status para enviar notificação
        if (input.statusId && anterior && input.statusId !== anterior.statusId) {
          // Buscar nomes dos status
          let statusAnteriorNome = "";
          let statusNovoNome = "";
          
          if (anterior.statusId) {
            const [statusAnt] = await db.select().from(timelineStatus)
              .where(eq(timelineStatus.id, anterior.statusId)).limit(1);
            statusAnteriorNome = statusAnt?.nome || "Sem status";
          }
          
          const [statusNov] = await db.select().from(timelineStatus)
            .where(eq(timelineStatus.id, input.statusId)).limit(1);
          statusNovoNome = statusNov?.nome || "Novo status";
          
          // Verificar configurações de notificação
          const [config] = await db.select().from(timelineNotificacoesConfig)
            .where(eq(timelineNotificacoesConfig.timelineId, id)).limit(1);
          
          if (config?.ativo && config?.notificarMudancaStatus) {
            // Coletar emails
            const emailsParaEnviar: string[] = [];
            const nomesDestinatarios: Record<string, string> = {};
            
            // Buscar timeline atualizada
            const [timelineAtual] = await db.select().from(timelines).where(eq(timelines.id, id)).limit(1);
            
            if (config.notificarResponsavel && timelineAtual?.responsavelId) {
              const [resp] = await db.select().from(timelineResponsaveis)
                .where(eq(timelineResponsaveis.id, timelineAtual.responsavelId)).limit(1);
              if (resp?.email) {
                emailsParaEnviar.push(resp.email);
                nomesDestinatarios[resp.email] = resp.nome;
              }
            }
            
            if (config.notificarCriador && timelineAtual?.criadoPor) {
              const [criador] = await db.select().from(users)
                .where(eq(users.id, timelineAtual.criadoPor)).limit(1);
              if (criador?.email && !emailsParaEnviar.includes(criador.email)) {
                emailsParaEnviar.push(criador.email);
                nomesDestinatarios[criador.email] = criador.name || "Usuário";
              }
            }
            
            if (config.emailsAdicionais) {
              try {
                const adicionais = JSON.parse(config.emailsAdicionais) as string[];
                for (const email of adicionais) {
                  if (email && !emailsParaEnviar.includes(email)) {
                    emailsParaEnviar.push(email);
                    nomesDestinatarios[email] = email.split("@")[0];
                  }
                }
              } catch (e) {}
            }
            
            // Enviar emails
            if (emailsParaEnviar.length > 0 && timelineAtual) {
              const baseUrl = process.env.VITE_APP_URL || "https://appmanutencao.com.br";
              const linkVisualizacao = `${baseUrl}/timeline/${timelineAtual.tokenPublico}`;
              
              for (const email of emailsParaEnviar) {
                try {
                  const html = emailTemplates.notificacaoTimeline({
                    nomeDestinatario: nomesDestinatarios[email] || "Usuário",
                    tipoEvento: "mudanca_status",
                    titulo: timelineAtual.titulo,
                    protocolo: timelineAtual.protocolo,
                    statusAnterior: statusAnteriorNome,
                    statusNovo: statusNovoNome,
                    linkVisualizacao,
                    nomeAlterador: ctx.user?.name || undefined,
                  });
                  
                  await sendEmail({
                    to: email,
                    subject: `🔔 Mudança de Status - ${timelineAtual.titulo} (${timelineAtual.protocolo})`,
                    html,
                  });
                } catch (e) {}
              }
              
              // Registrar no histórico
              await db.insert(timelineNotificacoesHistorico).values({
                timelineId: id,
                tipoEvento: "mudanca_status",
                statusAnterior: statusAnteriorNome,
                statusNovo: statusNovoNome,
                emailsEnviados: JSON.stringify(emailsParaEnviar),
                totalEnviados: emailsParaEnviar.length,
                enviado: true,
                usuarioId: ctx.user?.id,
                usuarioNome: ctx.user?.name,
              });
            }
          }
        }
        
        return { success: true };
      }),

    excluir: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Excluir TODOS os dados relacionados (chat, notificações, imagens, eventos, compartilhamentos)
        await db.delete(timelineChat).where(eq(timelineChat.timelineId, input.id));
        await db.delete(timelineNotificacoesHistorico).where(eq(timelineNotificacoesHistorico.timelineId, input.id));
        await db.delete(timelineNotificacoesConfig).where(eq(timelineNotificacoesConfig.timelineId, input.id));
        await db.delete(timelineImagens).where(eq(timelineImagens.timelineId, input.id));
        await db.delete(timelineEventos).where(eq(timelineEventos.timelineId, input.id));
        await db.delete(timelineCompartilhamentos).where(eq(timelineCompartilhamentos.timelineId, input.id));
        await db.delete(timelines).where(eq(timelines.id, input.id));
        
        return { success: true };
      }),

    // ==================== TIMELINE - IMAGENS ====================
    adicionarImagem: timelineProcedure
      .input(z.object({
        timelineId: z.number(),
        url: z.string(),
        legenda: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Safety net: upload base64 to S3 if needed
        let url = input.url;
        if (url.startsWith('data:')) {
          try {
            const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const uniqueId = nanoid(10);
            const fileKey = `timeline/${ctx.user?.id || 'anon'}/${uniqueId}.jpg`;
            const uploaded = await storagePut(fileKey, buffer, "image/jpeg");
            url = uploaded.url;
          } catch (e) {
            console.error("Erro ao fazer upload de imagem:", e);
          }
        }
        
        // Obter próxima ordem
        const [maxOrdem] = await db.select({ max: sql<number>`MAX(ordem)` })
          .from(timelineImagens)
          .where(eq(timelineImagens.timelineId, input.timelineId));
        
        const [result] = await db.insert(timelineImagens).values({
          timelineId: input.timelineId,
          url,
          legenda: input.legenda,
          ordem: (maxOrdem?.max || 0) + 1,
        }).returning();
        
        // Registar evento
        await db.insert(timelineEventos).values({
          timelineId: input.timelineId,
          tipo: "imagem",
          descricao: "Imagem adicionada",
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name || "Sistema",
        }).returning();
        
        return { id: result.id };
      }),

    removerImagem: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(timelineImagens).where(eq(timelineImagens.id, input.id));
        return { success: true };
      }),

    // ==================== TIMELINE - COMPARTILHAMENTO ====================
    compartilhar: timelineProcedure
      .input(z.object({
        timelineId: z.number(),
        membroEquipeId: z.number().optional(),
        membroNome: z.string(),
        membroEmail: z.string().optional(),
        membroTelefone: z.string().optional(),
        canalEnvio: z.enum(["email", "whatsapp", "ambos"]).default("email"),
        permissao: z.enum(["visualizar", "adicionar", "editar"]).default("visualizar"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(timelineCompartilhamentos).values(input).returning();
        
        // Atualizar permissão pública para a MAIOR permissão entre todos os compartilhamentos
        const shares = await db.select({ permissao: timelineCompartilhamentos.permissao })
          .from(timelineCompartilhamentos)
          .where(eq(timelineCompartilhamentos.timelineId, input.timelineId));
        
        const permOrder = { "visualizar": 1, "adicionar": 2, "editar": 3 };
        let maxPerm: "visualizar" | "adicionar" | "editar" = "visualizar";
        for (const s of shares) {
          if (s.permissao && (permOrder[s.permissao as keyof typeof permOrder] || 0) > (permOrder[maxPerm] || 0)) {
            maxPerm = s.permissao as "visualizar" | "adicionar" | "editar";
          }
        }
        
        await db.update(timelines)
          .set({ permissaoPublica: maxPerm })
          .where(eq(timelines.id, input.timelineId));
        
        // Registar evento
        const permissaoLabel = input.permissao === "visualizar" ? "visualização" : 
                               input.permissao === "adicionar" ? "adição" : "edição";
        await db.insert(timelineEventos).values({
          timelineId: input.timelineId,
          tipo: "compartilhamento",
          descricao: `Compartilhado com ${input.membroNome} via ${input.canalEnvio} (permissão: ${permissaoLabel})`,
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name || "Sistema",
        }).returning();
        
        // Buscar timeline para enviar email
        const [timeline] = await db.select().from(timelines).where(eq(timelines.id, input.timelineId));
        
        if (input.membroEmail && (input.canalEnvio === "email" || input.canalEnvio === "ambos")) {
          const linkVisualizacao = `${process.env.VITE_APP_URL || ""}/timeline/${timeline?.tokenPublico}`;
          
          await sendEmail({
            to: input.membroEmail,
            subject: `Timeline Compartilhada: ${timeline?.titulo}`,
            html: emailTemplates.compartilhamentoTimeline({
              nomeDestinatario: input.membroNome,
              nomeRemetente: ctx.user?.name || "Sistema",
              titulo: timeline?.titulo || "",
              protocolo: timeline?.protocolo || "",
              linkVisualizacao,
            }),
          });
        }
        
        return { id: result.id };
      }),

    listarCompartilhamentos: timelineProcedure
      .input(z.object({ timelineId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(timelineCompartilhamentos)
          .where(eq(timelineCompartilhamentos.timelineId, input.timelineId))
          .orderBy(desc(timelineCompartilhamentos.createdAt));
      }),

    // ==================== TIMELINE - VISUALIZAÇÃO PÚBLICA ====================
    obterPorToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) return null;
        
        // Buscar dados relacionados
        const [responsavel] = timeline.responsavelId 
          ? await db.select().from(timelineResponsaveis).where(eq(timelineResponsaveis.id, timeline.responsavelId))
          : [null];
        const [local] = timeline.localId 
          ? await db.select().from(timelineLocais).where(eq(timelineLocais.id, timeline.localId))
          : [null];
        const [status] = timeline.statusId 
          ? await db.select().from(timelineStatus).where(eq(timelineStatus.id, timeline.statusId))
          : [null];
        const [prioridade] = timeline.prioridadeId 
          ? await db.select().from(timelinePrioridades).where(eq(timelinePrioridades.id, timeline.prioridadeId))
          : [null];
        
        const imagens = await db.select().from(timelineImagens)
          .where(eq(timelineImagens.timelineId, timeline.id))
          .orderBy(timelineImagens.ordem);
        
        // Buscar eventos/histórico
        const eventos = await db.select().from(timelineEventos)
          .where(eq(timelineEventos.timelineId, timeline.id))
          .orderBy(desc(timelineEventos.createdAt));
        
        // Buscar mensagens do chat
        const chatMessages = await db.select().from(timelineChat)
          .where(eq(timelineChat.timelineId, timeline.id))
          .orderBy(timelineChat.createdAt);
        
        // Buscar compartilhamentos (quem recebeu o link)
        const compartilhamentos = await db.select().from(timelineCompartilhamentos)
          .where(eq(timelineCompartilhamentos.timelineId, timeline.id))
          .orderBy(desc(timelineCompartilhamentos.createdAt));
        
        // Buscar dados do condomínio (logo+nome)
        const [condominio] = await db.select().from(condominios)
          .where(eq(condominios.id, timeline.condominioId));

        // Buscar listas de status disponíveis para edição
        const statusList = await db.select().from(timelineStatus)
          .where(eq(timelineStatus.condominioId, timeline.condominioId));
        
        // Buscar membros da equipe (responsáveis do condomínio)
        const membrosEquipe = await db.select().from(timelineResponsaveis)
          .where(and(
            eq(timelineResponsaveis.condominioId, timeline.condominioId),
            eq(timelineResponsaveis.ativo, true)
          ));
        
        // Parse membros associados
        let membrosAssociadosIds: number[] = [];
        try {
          if (timeline.membrosAssociados) {
            membrosAssociadosIds = JSON.parse(timeline.membrosAssociados);
          }
        } catch {}
        
        return {
          ...timeline,
          responsavel,
          local,
          status,
          prioridade,
          imagens,
          eventos,
          chatMessages,
          compartilhamentos,
          statusList,
          membrosEquipe,
          membrosAssociadosIds,
          condominio: condominio ? {
            nome: condominio.cabecalhoNomeCondominio || condominio.nome,
            logoUrl: condominio.cabecalhoLogoUrl || condominio.logoUrl,
            rodapeTexto: condominio.rodapeTexto,
            rodapeContato: condominio.rodapeContato,
          } : null,
          permissao: timeline.permissaoPublica || "visualizar",
        };
      }),

    registarVisualizacao: publicProcedure
      .input(z.object({
        token: z.string(),
        compartilhamentoId: z.number().optional(),
        nomeVisualizador: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) return { success: false };
        
        // Registar evento de visualização com nome
        await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: "visualizacao",
          descricao: input.nomeVisualizador 
            ? `Timeline visualizada por ${input.nomeVisualizador}` 
            : "Timeline visualizada",
          usuarioNome: input.nomeVisualizador || undefined,
        }).returning();
        
        // Atualizar compartilhamento se fornecido
        if (input.compartilhamentoId) {
          await db.update(timelineCompartilhamentos)
            .set({ visualizado: true, dataVisualizacao: new Date() })
            .where(eq(timelineCompartilhamentos.id, input.compartilhamentoId));
        }
        
        return { success: true };
      }),

    // Toggle membro associado à timeline (via link público)
    toggleMembroAssociado: publicProcedure
      .input(z.object({
        token: z.string(),
        membroId: z.number(),
        associar: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        if (!timeline.permissaoPublica || timeline.permissaoPublica === "visualizar") {
          throw new Error("Sem permissão para modificar membros");
        }
        
        // Parse current associated members
        let membrosIds: number[] = [];
        try {
          if (timeline.membrosAssociados) {
            membrosIds = JSON.parse(timeline.membrosAssociados);
          }
        } catch {}
        
        if (input.associar) {
          if (!membrosIds.includes(input.membroId)) {
            membrosIds.push(input.membroId);
          }
        } else {
          membrosIds = membrosIds.filter(id => id !== input.membroId);
        }
        
        await db.update(timelines)
          .set({ membrosAssociados: JSON.stringify(membrosIds) })
          .where(eq(timelines.id, timeline.id));
        
        // Buscar nome do membro
        const [membro] = await db.select().from(timelineResponsaveis)
          .where(eq(timelineResponsaveis.id, input.membroId));
        
        await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: "edicao",
          descricao: input.associar
            ? `Membro "${membro?.nome || "Desconhecido"}" associado à timeline`
            : `Membro "${membro?.nome || "Desconhecido"}" removido da timeline`,
          usuarioNome: membro?.nome,
        }).returning();
        
        return { success: true };
      }),

    // ==================== TIMELINE - AÇÕES PÚBLICAS (via link com permissão) ====================
    
    // Adicionar comentário/evento via link público
    adicionarEventoPublico: publicProcedure
      .input(z.object({
        token: z.string(),
        tipo: z.enum(["comentario"]).default("comentario"),
        descricao: z.string().min(1),
        autorNome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        // Verificar permissão (adicionar ou editar)
        if (!timeline.permissaoPublica || timeline.permissaoPublica === "visualizar") {
          throw new Error("Sem permissão para adicionar conteúdo");
        }
        
        const [result] = await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: input.tipo,
          descricao: input.descricao,
          usuarioNome: input.autorNome,
        }).returning();
        
        return { id: result.id, success: true };
      }),

    // Adicionar imagem via link público
    adicionarImagemPublica: publicProcedure
      .input(z.object({
        token: z.string(),
        url: z.string(),
        legenda: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        // Verificar permissão (adicionar ou editar)
        if (!timeline.permissaoPublica || timeline.permissaoPublica === "visualizar") {
          throw new Error("Sem permissão para adicionar imagens");
        }
        
        // Upload base64 to S3 if needed
        let url = input.url;
        if (url.startsWith('data:')) {
          try {
            const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const uniqueId = nanoid(10);
            const fileKey = `timeline/public/${uniqueId}.jpg`;
            const uploaded = await storagePut(fileKey, buffer, "image/jpeg");
            url = uploaded.url;
          } catch (e) {
            console.error("Erro ao fazer upload de imagem:", e);
          }
        }
        
        // Obter próxima ordem
        const [maxOrdem] = await db.select({ max: sql<number>`MAX(ordem)` })
          .from(timelineImagens)
          .where(eq(timelineImagens.timelineId, timeline.id));
        
        const [result] = await db.insert(timelineImagens).values({
          timelineId: timeline.id,
          url,
          legenda: input.legenda,
          ordem: (maxOrdem?.max || 0) + 1,
        }).returning();
        
        // Registar evento
        await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: "imagem",
          descricao: "Imagem adicionada via link público",
        }).returning();
        
        return { id: result.id, success: true };
      }),

    // Atualizar timeline via link público (permissão editar)
    atualizarPublico: publicProcedure
      .input(z.object({
        token: z.string(),
        descricao: z.string().optional(),
        autorNome: z.string().optional(),
        statusId: z.number().nullable().optional(),
        categorizacao: z.enum(["recebido", "encaminhado", "em_analise", "em_execucao", "aguardando_resposta", "finalizado", "reaberto"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        // Verificar permissão (editar ou adicionar para descrição)
        if (input.descricao !== undefined) {
          if (!timeline.permissaoPublica || timeline.permissaoPublica === "visualizar") {
            throw new Error("Sem permissão para adicionar descrição");
          }
        } else if (timeline.permissaoPublica !== "editar") {
          throw new Error("Sem permissão para editar esta timeline");
        }
        
        const updateData: any = {};
        
        // Descrição: APPEND com nome do autor e timestamp
        if (input.descricao !== undefined && input.descricao.trim()) {
          const autor = input.autorNome?.trim() || "Anônimo";
          const agora = new Date().toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          });
          const novaEntrada = `[${agora}] ${autor}:\n${input.descricao.trim()}`;
          const descricaoAtual = timeline.descricao?.trim() || "";
          updateData.descricao = descricaoAtual
            ? `${descricaoAtual}\n\n---\n\n${novaEntrada}`
            : novaEntrada;
        }
        
        if (input.statusId !== undefined) updateData.statusId = input.statusId;
        if (input.categorizacao !== undefined) updateData.categorizacao = input.categorizacao;
        
        if (Object.keys(updateData).length > 0) {
          await db.update(timelines).set(updateData).where(eq(timelines.id, timeline.id));
          
          // Registar evento
          const autorNome = input.autorNome?.trim() || undefined;
          if (input.descricao) {
            await db.insert(timelineEventos).values({
              timelineId: timeline.id,
              tipo: "edicao",
              descricao: `${autorNome || "Alguém"} adicionou uma descrição: "${input.descricao.trim().substring(0, 100)}${input.descricao.trim().length > 100 ? "..." : ""}"`,
              usuarioNome: autorNome,
              dadosNovos: JSON.stringify({ descricao: input.descricao.trim() }),
            }).returning();
          } else {
            await db.insert(timelineEventos).values({
              timelineId: timeline.id,
              tipo: input.categorizacao ? "categorizacao" : "edicao",
              descricao: input.categorizacao 
                ? `Categorização alterada para: ${input.categorizacao.replace(/_/g, " ")}` 
                : "Timeline editada via link público",
              usuarioNome: autorNome,
              dadosNovos: JSON.stringify(updateData),
            });
          }
        }
        
        return { success: true };
      }),

    // Alterar categorização via link público (qualquer permissão exceto visualizar)
    alterarCategorizacao: publicProcedure
      .input(z.object({
        token: z.string(),
        categorizacao: z.enum(["recebido", "encaminhado", "em_analise", "em_execucao", "aguardando_resposta", "finalizado", "reaberto"]),
        autorNome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        if (!timeline.permissaoPublica || timeline.permissaoPublica === "visualizar") {
          throw new Error("Sem permissão para alterar categorização");
        }
        
        const categorizacaoAnterior = timeline.categorizacao || "recebido";
        
        await db.update(timelines)
          .set({ categorizacao: input.categorizacao })
          .where(eq(timelines.id, timeline.id));
        
        // Registar evento com quem fez e o que mudou
        const labelAnterior = categorizacaoAnterior.replace(/_/g, " ");
        const labelNova = input.categorizacao.replace(/_/g, " ");
        await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: "categorizacao",
          descricao: `${input.autorNome} alterou de "${labelAnterior}" para "${labelNova}"`,
          usuarioNome: input.autorNome,
          dadosAnteriores: JSON.stringify({ categorizacao: categorizacaoAnterior }),
          dadosNovos: JSON.stringify({ categorizacao: input.categorizacao }),
        }).returning();
        
        return { success: true };
      }),

    // Enviar mensagem no chat da timeline
    enviarMensagemChat: publicProcedure
      .input(z.object({
        token: z.string(),
        autorNome: z.string().min(1),
        mensagem: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        if (!timeline.permissaoPublica || timeline.permissaoPublica === "visualizar") {
          throw new Error("Sem permissão para enviar mensagens");
        }
        
        const [result] = await db.insert(timelineChat).values({
          timelineId: timeline.id,
          autorNome: input.autorNome,
          mensagem: input.mensagem,
          categorizacaoNoMomento: timeline.categorizacao || "recebido",
        }).returning();
        
        // Registar evento no histórico
        await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: "chat",
          descricao: `${input.autorNome}: ${input.mensagem.substring(0, 100)}${input.mensagem.length > 100 ? "..." : ""}`,
          usuarioNome: input.autorNome,
        });
        
        return { id: result.id, success: true };
      }),

    // ==================== TIMELINE - PDF ====================
    gerarPdf: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines).where(eq(timelines.id, input.id));
        if (!timeline) throw new Error("Timeline não encontrada");
        
        const result = await gerarTimelinePdfInterno(db, timeline);
        
        // Registar evento
        await db.insert(timelineEventos).values({
          timelineId: input.id,
          tipo: "pdf",
          descricao: "PDF gerado",
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name || "Sistema",
        }).returning();
        
        return result;
      }),

    gerarPdfPublico: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.tokenPublico, input.token));
        if (!timeline) throw new Error("Timeline não encontrada");
        
        const result = await gerarTimelinePdfInterno(db, timeline);
        
        await db.insert(timelineEventos).values({
          timelineId: timeline.id,
          tipo: "pdf",
          descricao: "PDF gerado (link público)",
          usuarioNome: "Visitante",
        }).returning();
        
        return result;
      }),

    // ==================== TIMELINE - REGISTAR (FINALIZAR) ====================
    registar: timelineProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(timelines)
          .set({ estado: "registado" })
          .where(eq(timelines.id, input.id));
        
        // Registar evento
        await db.insert(timelineEventos).values({
          timelineId: input.id,
          tipo: "registro",
          descricao: "Timeline registada/finalizada",
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name || "Sistema",
        }).returning();
        
        return { success: true };
      }),

    // ==================== TIMELINE - ESTATÍSTICAS BÁSICAS ====================
    estatisticasBasicas: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { total: 0, rascunhos: 0, enviados: 0, registados: 0 };
        
        const all = await db.select().from(timelines)
          .where(eq(timelines.condominioId, input.condominioId));
        
        return {
          total: all.length,
          rascunhos: all.filter(t => t.estado === "rascunho").length,
          enviados: all.filter(t => t.estado === "enviado").length,
          registados: all.filter(t => t.estado === "registado").length,
        };
      }),

    // ==================== TIMELINE - CONFIGURAÇÕES DE NOTIFICAÇÕES ====================
    obterConfigNotificacoes: timelineProcedure
      .input(z.object({ timelineId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [config] = await db.select().from(timelineNotificacoesConfig)
          .where(eq(timelineNotificacoesConfig.timelineId, input.timelineId))
          .limit(1);
        
        return config || null;
      }),

    salvarConfigNotificacoes: timelineProcedure
      .input(z.object({
        timelineId: z.number(),
        notificarResponsavel: z.boolean().default(true),
        notificarCriador: z.boolean().default(true),
        emailsAdicionais: z.string().optional(),
        notificarMudancaStatus: z.boolean().default(true),
        notificarAtualizacao: z.boolean().default(true),
        notificarNovaImagem: z.boolean().default(false),
        notificarComentario: z.boolean().default(true),
        notificarCompartilhamento: z.boolean().default(false),
        ativo: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [existente] = await db.select().from(timelineNotificacoesConfig)
          .where(eq(timelineNotificacoesConfig.timelineId, input.timelineId))
          .limit(1);
        
        if (existente) {
          await db.update(timelineNotificacoesConfig)
            .set({
              notificarResponsavel: input.notificarResponsavel,
              notificarCriador: input.notificarCriador,
              emailsAdicionais: input.emailsAdicionais,
              notificarMudancaStatus: input.notificarMudancaStatus,
              notificarAtualizacao: input.notificarAtualizacao,
              notificarNovaImagem: input.notificarNovaImagem,
              notificarComentario: input.notificarComentario,
              notificarCompartilhamento: input.notificarCompartilhamento,
              ativo: input.ativo,
            })
            .where(eq(timelineNotificacoesConfig.id, existente.id));
          return { id: existente.id };
        } else {
          const [result] = await db.insert(timelineNotificacoesConfig).values({
            timelineId: input.timelineId,
            notificarResponsavel: input.notificarResponsavel,
            notificarCriador: input.notificarCriador,
            emailsAdicionais: input.emailsAdicionais,
            notificarMudancaStatus: input.notificarMudancaStatus,
            notificarAtualizacao: input.notificarAtualizacao,
            notificarNovaImagem: input.notificarNovaImagem,
            notificarComentario: input.notificarComentario,
            notificarCompartilhamento: input.notificarCompartilhamento,
            ativo: input.ativo,
          }).returning();
          return { id: result.id };
        }
      }),

    // ==================== TIMELINE - ENVIO DE NOTIFICAÇÕES ====================
    enviarNotificacao: timelineProcedure
      .input(z.object({
        timelineId: z.number(),
        tipoEvento: z.enum(["mudanca_status", "atualizacao", "nova_imagem", "comentario", "compartilhamento", "criacao", "finalizacao"]),
        statusAnterior: z.string().optional(),
        statusNovo: z.string().optional(),
        descricaoEvento: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar timeline
        const [timeline] = await db.select().from(timelines)
          .where(eq(timelines.id, input.timelineId))
          .limit(1);
        
        if (!timeline) throw new Error("Timeline não encontrada");
        
        // Buscar configurações de notificação
        const [config] = await db.select().from(timelineNotificacoesConfig)
          .where(eq(timelineNotificacoesConfig.timelineId, input.timelineId))
          .limit(1);
        
        // Se não houver config ou estiver desativado, não enviar
        if (!config || !config.ativo) {
          return { enviado: false, motivo: "Notificações desativadas" };
        }
        
        // Verificar se o tipo de evento está habilitado
        const eventoHabilitado = 
          (input.tipoEvento === "mudanca_status" && config.notificarMudancaStatus) ||
          (input.tipoEvento === "atualizacao" && config.notificarAtualizacao) ||
          (input.tipoEvento === "nova_imagem" && config.notificarNovaImagem) ||
          (input.tipoEvento === "comentario" && config.notificarComentario) ||
          (input.tipoEvento === "compartilhamento" && config.notificarCompartilhamento) ||
          input.tipoEvento === "criacao" ||
          input.tipoEvento === "finalizacao";
        
        if (!eventoHabilitado) {
          return { enviado: false, motivo: "Tipo de evento desabilitado" };
        }
        
        // Coletar emails dos destinatários
        const emailsParaEnviar: string[] = [];
        const nomesDestinatarios: Record<string, string> = {};
        
        // Email do responsável
        if (config.notificarResponsavel && timeline.responsavelId) {
          const [responsavel] = await db.select().from(timelineResponsaveis)
            .where(eq(timelineResponsaveis.id, timeline.responsavelId))
            .limit(1);
          if (responsavel?.email) {
            emailsParaEnviar.push(responsavel.email);
            nomesDestinatarios[responsavel.email] = responsavel.nome;
          }
        }
        
        // Email do criador
        if (config.notificarCriador && timeline.criadoPor) {
          const [criador] = await db.select().from(users)
            .where(eq(users.id, timeline.criadoPor))
            .limit(1);
          if (criador?.email && !emailsParaEnviar.includes(criador.email)) {
            emailsParaEnviar.push(criador.email);
            nomesDestinatarios[criador.email] = criador.name || "Usuário";
          }
        }
        
        // Emails adicionais
        if (config.emailsAdicionais) {
          try {
            const adicionais = JSON.parse(config.emailsAdicionais) as string[];
            for (const email of adicionais) {
              if (email && !emailsParaEnviar.includes(email)) {
                emailsParaEnviar.push(email);
                nomesDestinatarios[email] = email.split("@")[0];
              }
            }
          } catch (e) {
            // Ignorar erro de parse
          }
        }
        
        if (emailsParaEnviar.length === 0) {
          return { enviado: false, motivo: "Nenhum destinatário configurado" };
        }
        
        // Gerar link de visualização
        const baseUrl = process.env.VITE_APP_URL || "https://appmanutencao.com.br";
        const linkVisualizacao = `${baseUrl}/timeline/${timeline.tokenPublico}`;
        
        // Enviar emails
        const tipoEventoLabels: Record<string, string> = {
          mudanca_status: "Mudança de Status",
          atualizacao: "Atualização",
          nova_imagem: "Nova Imagem",
          comentario: "Novo Comentário",
          compartilhamento: "Compartilhamento",
          criacao: "Timeline Criada",
          finalizacao: "Timeline Finalizada",
        };
        
        let enviados = 0;
        let erros: string[] = [];
        
        for (const email of emailsParaEnviar) {
          try {
            const html = emailTemplates.notificacaoTimeline({
              nomeDestinatario: nomesDestinatarios[email] || "Usuário",
              tipoEvento: input.tipoEvento,
              titulo: timeline.titulo,
              protocolo: timeline.protocolo,
              statusAnterior: input.statusAnterior,
              statusNovo: input.statusNovo,
              descricaoEvento: input.descricaoEvento,
              linkVisualizacao,
              nomeAlterador: ctx.user?.name || undefined,
            });
            
            const result = await sendEmail({
              to: email,
              subject: `🔔 ${tipoEventoLabels[input.tipoEvento]} - ${timeline.titulo} (${timeline.protocolo})`,
              html,
            });
            
            if (result.success) {
              enviados++;
            } else {
              erros.push(`${email}: ${result.error}`);
            }
          } catch (e) {
            erros.push(`${email}: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
          }
        }
        
        // Registrar no histórico
        await db.insert(timelineNotificacoesHistorico).values({
          timelineId: input.timelineId,
          tipoEvento: input.tipoEvento,
          statusAnterior: input.statusAnterior,
          statusNovo: input.statusNovo,
          descricaoEvento: input.descricaoEvento,
          emailsEnviados: JSON.stringify(emailsParaEnviar),
          totalEnviados: enviados,
          enviado: enviados > 0,
          erroEnvio: erros.length > 0 ? erros.join("; ") : null,
          usuarioId: ctx.user?.id,
          usuarioNome: ctx.user?.name,
        });
        
        return {
          enviado: enviados > 0,
          totalEnviados: enviados,
          totalDestinatarios: emailsParaEnviar.length,
          erros: erros.length > 0 ? erros : undefined,
        };
      }),

    // ==================== TIMELINE - HISTÓRICO DE NOTIFICAÇÕES ====================
    listarHistoricoNotificacoes: timelineProcedure
      .input(z.object({
        timelineId: z.number(),
        limite: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const historico = await db.select().from(timelineNotificacoesHistorico)
          .where(eq(timelineNotificacoesHistorico.timelineId, input.timelineId))
          .orderBy(desc(timelineNotificacoesHistorico.createdAt))
          .limit(input.limite);
        
        return historico;
      }),

    // ==================== DASHBOARD / ESTATÍSTICAS ====================
    estatisticas: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        periodo: z.enum(["7dias", "30dias", "90dias", "ano", "todos"]).default("30dias"),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return {
          total: 0,
          porStatus: [],
          porPrioridade: [],
          porResponsavel: [],
          evolucaoTemporal: [],
          mediaTempoResolucao: 0,
        };
        
        // Calcular data inicial baseada no período
        let dataInicio: Date | null = null;
        const agora = new Date();
        switch (input.periodo) {
          case "7dias":
            dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30dias":
            dataInicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "90dias":
            dataInicio = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case "ano":
            dataInicio = new Date(agora.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            dataInicio = null;
        }
        
        // Buscar todas as timelines do período
        const todasTimelines = await db.select().from(timelines)
          .where(eq(timelines.condominioId, input.condominioId));
        
        // Buscar nomes de status, prioridades e responsáveis
        const statusList = await db.select().from(timelineStatus)
          .where(eq(timelineStatus.condominioId, input.condominioId));
        const prioridadesList = await db.select().from(timelinePrioridades)
          .where(eq(timelinePrioridades.condominioId, input.condominioId));
        const responsaveisList = await db.select().from(timelineResponsaveis)
          .where(eq(timelineResponsaveis.condominioId, input.condominioId));
        
        const statusMap = new Map(statusList.map(s => [s.id, s.nome]));
        const prioridadeMap = new Map(prioridadesList.map(p => [p.id, p.nome]));
        const responsavelMap = new Map(responsaveisList.map(r => [r.id, r.nome]));
        
        // Filtrar por período se necessário
        const timelinesFiltradas = dataInicio 
          ? todasTimelines.filter(t => new Date(t.createdAt!) >= dataInicio!)
          : todasTimelines;
        
        // Contar por status
        const statusCount: Record<string, number> = {};
        timelinesFiltradas.forEach(t => {
          const statusNome = t.statusId ? statusMap.get(t.statusId) || "Sem status" : "Sem status";
          statusCount[statusNome] = (statusCount[statusNome] || 0) + 1;
        });
        const porStatus = Object.entries(statusCount).map(([nome, quantidade]) => ({ nome, quantidade }));
        
        // Contar por prioridade
        const prioridadeCount: Record<string, number> = {};
        timelinesFiltradas.forEach(t => {
          const prioridadeNome = t.prioridadeId ? prioridadeMap.get(t.prioridadeId) || "Sem prioridade" : "Sem prioridade";
          prioridadeCount[prioridadeNome] = (prioridadeCount[prioridadeNome] || 0) + 1;
        });
        const porPrioridade = Object.entries(prioridadeCount).map(([nome, quantidade]) => ({ nome, quantidade }));
        
        // Contar por responsável
        const responsavelCount: Record<string, number> = {};
        timelinesFiltradas.forEach(t => {
          const responsavelNome = t.responsavelId ? responsavelMap.get(t.responsavelId) || "Sem responsável" : "Sem responsável";
          responsavelCount[responsavelNome] = (responsavelCount[responsavelNome] || 0) + 1;
        });
        const porResponsavel = Object.entries(responsavelCount)
          .map(([nome, quantidade]) => ({ nome, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 10);
        
        // Evolução temporal (agrupar por dia/semana/mês)
        const evolucaoMap: Record<string, { criadas: number; finalizadas: number }> = {};
        timelinesFiltradas.forEach(t => {
          const data = new Date(t.createdAt!);
          const chave = input.periodo === "7dias" 
            ? data.toISOString().split('T')[0]
            : input.periodo === "30dias"
            ? data.toISOString().split('T')[0]
            : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
          
          if (!evolucaoMap[chave]) {
            evolucaoMap[chave] = { criadas: 0, finalizadas: 0 };
          }
          evolucaoMap[chave].criadas++;
          
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          if (statusNome === "Finalizado" || statusNome === "Concluído") {
            evolucaoMap[chave].finalizadas++;
          }
        });
        const evolucaoTemporal = Object.entries(evolucaoMap)
          .map(([data, valores]) => ({ data, ...valores }))
          .sort((a, b) => a.data.localeCompare(b.data));
        
        return {
          total: timelinesFiltradas.length,
          porStatus,
          porPrioridade,
          porResponsavel,
          evolucaoTemporal,
          mediaTempoResolucao: 0, // TODO: calcular média de tempo de resolução
        };
      }),

    alertas: timelineProcedure
      .input(z.object({
        condominioId: z.number(),
        limite: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        // Buscar timelines ativas
        const timelinesAtivas = await db.select().from(timelines)
          .where(eq(timelines.condominioId, input.condominioId))
          .orderBy(desc(timelines.createdAt))
          .limit(input.limite * 2);
        
        // Buscar nomes de status, prioridades e responsáveis
        const statusList = await db.select().from(timelineStatus)
          .where(eq(timelineStatus.condominioId, input.condominioId));
        const prioridadesList = await db.select().from(timelinePrioridades)
          .where(eq(timelinePrioridades.condominioId, input.condominioId));
        const responsaveisList = await db.select().from(timelineResponsaveis)
          .where(eq(timelineResponsaveis.condominioId, input.condominioId));
        
        const statusMap = new Map(statusList.map(s => [s.id, s.nome]));
        const prioridadeMap = new Map(prioridadesList.map(p => [p.id, p.nome]));
        const responsavelMap = new Map(responsaveisList.map(r => [r.id, r.nome]));
        
        // Filtrar timelines não finalizadas
        const timelinesFiltradas = timelinesAtivas.filter(t => {
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          return statusNome !== "Finalizado" && statusNome !== "Concluído" && statusNome !== "Cancelado";
        }).slice(0, input.limite);
        
        // Classificar alertas por urgência
        const alertas = timelinesFiltradas.map(t => {
          const diasCriacao = Math.floor((Date.now() - new Date(t.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
          let urgencia: "alta" | "media" | "baixa" = "baixa";
          let mensagem = "";
          
          const prioridadeNome = t.prioridadeId ? prioridadeMap.get(t.prioridadeId) : null;
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          const responsavelNome = t.responsavelId ? responsavelMap.get(t.responsavelId) : null;
          
          if (prioridadeNome === "Urgente" || prioridadeNome === "Crítica") {
            urgencia = "alta";
            mensagem = `Prioridade ${prioridadeNome} - ${diasCriacao} dias sem resolução`;
          } else if (diasCriacao > 7) {
            urgencia = "alta";
            mensagem = `Pendente há ${diasCriacao} dias`;
          } else if (diasCriacao > 3) {
            urgencia = "media";
            mensagem = `Pendente há ${diasCriacao} dias`;
          } else {
            mensagem = `Criada há ${diasCriacao} dias`;
          }
          
          return {
            id: t.id,
            titulo: t.titulo,
            responsavel: responsavelNome || "Sem responsável",
            status: statusNome || "Sem status",
            prioridade: prioridadeNome || "Sem prioridade",
            urgencia,
            mensagem,
            diasCriacao,
            createdAt: t.createdAt,
          };
        }).sort((a, b) => {
          // Ordenar por urgência (alta > media > baixa) e depois por dias
          const urgenciaOrder = { alta: 0, media: 1, baixa: 2 };
          if (urgenciaOrder[a.urgencia] !== urgenciaOrder[b.urgencia]) {
            return urgenciaOrder[a.urgencia] - urgenciaOrder[b.urgencia];
          }
          return b.diasCriacao - a.diasCriacao;
        });
        
        return alertas;
      }),

    resumoRapido: timelineProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return {
          totalAtivas: 0,
          pendentes: 0,
          emAndamento: 0,
          finalizadasHoje: 0,
          criadasHoje: 0,
          urgentes: 0,
        };
        
        // Buscar timelines com status e prioridade
        const todasTimelines = await db.select({
          id: timelines.id,
          estado: timelines.estado,
          statusId: timelines.statusId,
          prioridadeId: timelines.prioridadeId,
          createdAt: timelines.createdAt,
          updatedAt: timelines.updatedAt,
        }).from(timelines)
          .where(eq(timelines.condominioId, input.condominioId));
        
        // Buscar nomes de status e prioridades
        const statusList = await db.select().from(timelineStatus)
          .where(eq(timelineStatus.condominioId, input.condominioId));
        const prioridadesList = await db.select().from(timelinePrioridades)
          .where(eq(timelinePrioridades.condominioId, input.condominioId));
        
        const statusMap = new Map(statusList.map(s => [s.id, s.nome]));
        const prioridadeMap = new Map(prioridadesList.map(p => [p.id, p.nome]));
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const totalAtivas = todasTimelines.filter(t => {
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          return statusNome !== "Finalizado" && statusNome !== "Concluído" && statusNome !== "Cancelado";
        }).length;
        
        const pendentes = todasTimelines.filter(t => {
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          return statusNome === "Pendente" || t.estado === "rascunho" || !statusNome;
        }).length;
        
        const emAndamento = todasTimelines.filter(t => {
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          return statusNome === "Em Andamento" || statusNome === "Em Progresso";
        }).length;
        
        const finalizadasHoje = todasTimelines.filter(t => {
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          if (statusNome !== "Finalizado" && statusNome !== "Concluído") return false;
          const dataUpdate = new Date(t.updatedAt!);
          return dataUpdate >= hoje;
        }).length;
        
        const criadasHoje = todasTimelines.filter(t => {
          const dataCriacao = new Date(t.createdAt!);
          return dataCriacao >= hoje;
        }).length;
        
        const urgentes = todasTimelines.filter(t => {
          const prioridadeNome = t.prioridadeId ? prioridadeMap.get(t.prioridadeId) : null;
          const statusNome = t.statusId ? statusMap.get(t.statusId) : null;
          return (prioridadeNome === "Urgente" || prioridadeNome === "Crítica") &&
            statusNome !== "Finalizado" && statusNome !== "Concluído" && statusNome !== "Cancelado";
        }).length;
        
        return {
          totalAtivas,
          pendentes,
          emAndamento,
          finalizadasHoje,
          criadasHoje,
          urgentes,
        };
      }),
});