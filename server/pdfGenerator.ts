import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface RevistaData {
  titulo: string;
  subtitulo?: string;
  edicao: string;
  condominioNome: string;
  condominioLogo?: string;
  capaUrl?: string;
  estilo?: 'classico' | 'moderno' | 'minimalista' | 'elegante' | 'corporativo';
  mensagemSindico?: {
    titulo: string;
    mensagem: string;
    nomeSindico: string;
    fotoSindico?: string;
    assinatura?: string;
  };
  avisos?: Array<{
    titulo: string;
    conteudo: string;
    tipo: string;
  }>;
  eventos?: Array<{
    titulo: string;
    descricao?: string;
    dataEvento: string;
    horario?: string;
    local?: string;
  }>;
  funcionarios?: Array<{
    nome: string;
    cargo: string;
    turno?: string;
    fotoUrl?: string;
  }>;
  telefones?: Array<{
    nome: string;
    numero: string;
  }>;
  anunciantes?: Array<{
    nome: string;
    descricao?: string;
    categoria: string;
    telefone?: string;
    whatsapp?: string;
    logoUrl?: string;
  }>;
  comunicados?: Array<{
    titulo: string;
    conteudo: string;
    tipo: string;
    dataPublicacao?: string;
  }>;
  regras?: Array<{
    titulo: string;
    descricao: string;
    categoria?: string;
  }>;
  dicasSeguranca?: Array<{
    titulo: string;
    descricao: string;
    categoria?: string;
  }>;
  realizacoes?: Array<{
    titulo: string;
    descricao: string;
    dataRealizacao?: string;
    imagemUrl?: string;
  }>;
  melhorias?: Array<{
    titulo: string;
    descricao: string;
    status?: string;
    previsao?: string;
  }>;
  aquisicoes?: Array<{
    titulo: string;
    descricao: string;
    valor?: number;
    dataAquisicao?: string;
  }>;
  publicidade?: Array<{
    titulo: string;
    descricao?: string;
    imagemUrl?: string;
    link?: string;
  }>;
  galeria?: Array<{
    titulo: string;
    fotos: Array<{ url: string; legenda?: string }>;
  }>;
  classificados?: Array<{
    titulo: string;
    descricao: string;
    preco?: number;
    contato?: string;
    categoria?: string;
  }>;
  caronas?: Array<{
    origem: string;
    destino: string;
    horario?: string;
    diasSemana?: string;
    contato?: string;
  }>;
  achadosPerdidos?: Array<{
    titulo: string;
    descricao?: string;
    local?: string;
    tipo: string;
  }>;
}

// Definição dos estilos/temas disponíveis
interface ThemeColors {
  primary: [number, number, number];
  primaryLight: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  rose: [number, number, number];
  amber: [number, number, number];
  emerald: [number, number, number];
  violet: [number, number, number];
  cyan: [number, number, number];
  white: [number, number, number];
  cream: [number, number, number];
  lightGray: [number, number, number];
  gray: [number, number, number];
  darkGray: [number, number, number];
  dark: [number, number, number];
  coverBg: [number, number, number];
  coverAccent: [number, number, number];
}

// Estilo Clássico - Azul escuro e dourado (atual)
const classicoTheme: ThemeColors = {
  primary: [30, 58, 95],
  primaryLight: [59, 130, 246],
  secondary: [16, 185, 129],
  accent: [212, 175, 55],
  rose: [244, 63, 94],
  amber: [245, 158, 11],
  emerald: [16, 185, 129],
  violet: [139, 92, 246],
  cyan: [6, 182, 212],
  white: [255, 255, 255],
  cream: [254, 252, 243],
  lightGray: [248, 250, 252],
  gray: [148, 163, 184],
  darkGray: [71, 85, 105],
  dark: [15, 23, 42],
  coverBg: [30, 58, 95],
  coverAccent: [212, 175, 55],
};

// Estilo Moderno - Gradiente azul vibrante
const modernoTheme: ThemeColors = {
  primary: [37, 99, 235],
  primaryLight: [96, 165, 250],
  secondary: [34, 197, 94],
  accent: [251, 146, 60],
  rose: [251, 113, 133],
  amber: [251, 191, 36],
  emerald: [52, 211, 153],
  violet: [167, 139, 250],
  cyan: [34, 211, 238],
  white: [255, 255, 255],
  cream: [240, 249, 255],
  lightGray: [241, 245, 249],
  gray: [156, 163, 175],
  darkGray: [75, 85, 99],
  dark: [17, 24, 39],
  coverBg: [37, 99, 235],
  coverAccent: [251, 146, 60],
};

// Estilo Minimalista - Preto e branco com toques de cinza
const minimalistaTheme: ThemeColors = {
  primary: [23, 23, 23],
  primaryLight: [64, 64, 64],
  secondary: [115, 115, 115],
  accent: [163, 163, 163],
  rose: [244, 63, 94],
  amber: [245, 158, 11],
  emerald: [16, 185, 129],
  violet: [139, 92, 246],
  cyan: [6, 182, 212],
  white: [255, 255, 255],
  cream: [250, 250, 250],
  lightGray: [245, 245, 245],
  gray: [163, 163, 163],
  darkGray: [82, 82, 82],
  dark: [23, 23, 23],
  coverBg: [23, 23, 23],
  coverAccent: [255, 255, 255],
};

// Estilo Elegante - Bordeaux e ouro rosé
const eleganteTheme: ThemeColors = {
  primary: [109, 40, 60],
  primaryLight: [157, 78, 98],
  secondary: [183, 110, 121],
  accent: [212, 175, 130],
  rose: [183, 110, 121],
  amber: [212, 175, 130],
  emerald: [16, 185, 129],
  violet: [139, 92, 246],
  cyan: [6, 182, 212],
  white: [255, 255, 255],
  cream: [255, 250, 245],
  lightGray: [250, 245, 240],
  gray: [180, 160, 150],
  darkGray: [100, 80, 70],
  dark: [45, 25, 30],
  coverBg: [109, 40, 60],
  coverAccent: [212, 175, 130],
};

// Estilo Corporativo - Verde escuro e prata
const corporativoTheme: ThemeColors = {
  primary: [20, 83, 45],
  primaryLight: [34, 139, 76],
  secondary: [107, 114, 128],
  accent: [192, 192, 192],
  rose: [244, 63, 94],
  amber: [245, 158, 11],
  emerald: [34, 139, 76],
  violet: [139, 92, 246],
  cyan: [6, 182, 212],
  white: [255, 255, 255],
  cream: [245, 250, 245],
  lightGray: [243, 244, 246],
  gray: [156, 163, 175],
  darkGray: [75, 85, 99],
  dark: [17, 24, 39],
  coverBg: [20, 83, 45],
  coverAccent: [192, 192, 192],
};

const themes: Record<string, ThemeColors> = {
  classico: classicoTheme,
  moderno: modernoTheme,
  minimalista: minimalistaTheme,
  elegante: eleganteTheme,
  corporativo: corporativoTheme,
};

// Cores por tipo de aviso
const getTipoColors = (theme: ThemeColors): Record<string, [number, number, number]> => ({
  informativo: theme.primaryLight,
  importante: theme.amber,
  urgente: theme.rose,
});

export type { RevistaData };

export async function generateRevistaPDF(revista: RevistaData): Promise<Buffer> {
  const estilo = revista.estilo || 'classico';
  const colors = themes[estilo] || classicoTheme;
  const tipoColors = getTipoColors(colors);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;
  let currentPage = 1;
  const tocEntries: Array<{ title: string; page: number }> = [];

  // ==================== FUNÇÕES AUXILIARES ====================
  
  // Adicionar cabeçalho e rodapé elegante
  const addHeaderFooter = (pageNum: number, isFirstPage: boolean = false) => {
    if (isFirstPage) return;
    
    // Linha superior elegante
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, 10, pageWidth - margin, 10);
    
    // Linha decorativa accent
    doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, 11.5, pageWidth - margin, 11.5);
    
    // Texto do cabeçalho
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
    doc.text(revista.condominioNome.toUpperCase(), margin, 8);
    doc.text(revista.edicao.toUpperCase(), pageWidth - margin, 8, { align: 'right' });
    
    // Rodapé elegante
    doc.setDrawColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
    doc.setFontSize(8);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(`${pageNum}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
    
    // Logo App Manutenção no rodapé
    doc.setFontSize(7);
    doc.text('App Manutenção', pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  // Verificar se precisa de nova página
  const checkNewPage = (neededSpace: number, forceNewPage: boolean = false): boolean => {
    const availableSpace = pageHeight - margin - 18 - yPos;
    if (forceNewPage || availableSpace < neededSpace) {
      doc.addPage();
      currentPage++;
      addHeaderFooter(currentPage);
      yPos = margin + 18;
      return true;
    }
    return false;
  };

  // Desenhar cabeçalho de secção premium
  const drawSectionHeader = (title: string, color: [number, number, number]) => {
    checkNewPage(30);
    
    // Linha decorativa à esquerda
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, yPos, 4, 14, 'F');
    
    // Título da secção
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 10, yPos + 10);
    
    // Linha horizontal elegante
    doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.setLineWidth(0.5);
    const titleWidth = doc.getTextWidth(title.toUpperCase());
    doc.line(margin + 12 + titleWidth, yPos + 8, pageWidth - margin, yPos + 8);
    
    yPos += 22;
    tocEntries.push({ title, page: currentPage });
  };

  // Desenhar card premium com borda elegante
  const drawCard = (
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    accentColor: [number, number, number]
  ) => {
    // Sombra suave
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(x + 1, y + 1, width, height, 2, 2, 'F');
    
    // Card branco
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 2, 2, 'FD');
    
    // Borda superior colorida
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(x, y, width, 2, 'F');
  };

  // ==================== CAPA PREMIUM ====================
  
  // Fundo branco limpo
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Borda elegante accent
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.setLineWidth(1);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');
  
  // Borda interna primary
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');
  
  // Padrão geométrico no topo
  doc.setFillColor(colors.coverBg[0], colors.coverBg[1], colors.coverBg[2]);
  doc.rect(12, 12, pageWidth - 24, 60, 'F');
  
  // Linhas decorativas no padrão (estilo específico)
  if (estilo === 'minimalista') {
    // Minimalista: linhas finas horizontais
    doc.setDrawColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
    doc.setLineWidth(0.2);
    for (let i = 0; i < 4; i++) {
      doc.line(20, 25 + i * 12, pageWidth - 20, 25 + i * 12);
    }
  } else if (estilo === 'moderno') {
    // Moderno: círculos decorativos
    doc.setDrawColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
    doc.setLineWidth(0.5);
    doc.circle(30, 42, 15, 'S');
    doc.circle(pageWidth - 30, 42, 15, 'S');
    doc.circle(30, 42, 8, 'S');
    doc.circle(pageWidth - 30, 42, 8, 'S');
  } else {
    // Clássico, Elegante, Corporativo: linhas verticais
    doc.setDrawColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
    doc.setLineWidth(0.3);
    for (let i = 0; i < 5; i++) {
      doc.line(20 + i * 8, 20, 20 + i * 8, 65);
    }
    for (let i = 0; i < 5; i++) {
      doc.line(pageWidth - 60 + i * 8, 20, pageWidth - 60 + i * 8, 65);
    }
  }
  
  // Edição no topo
  doc.setTextColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`EDIÇÃO ${revista.edicao.toUpperCase()}`, pageWidth / 2, 30, { align: 'center' });
  
  // Linha decorativa
  doc.setDrawColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 35, 35, pageWidth / 2 + 35, 35);
  
  // Título "INFORMATIVO" elegante
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('INFORMATIVO DIGITAL', pageWidth / 2, 50, { align: 'center' });
  
  // Ornamento central
  doc.setFillColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
  doc.rect(pageWidth / 2 - 20, 55, 40, 1, 'F');
  
  // Área central - Nome do condomínio em destaque
  const condominioY = 110;
  
  // Moldura elegante para o nome
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, condominioY - 15, pageWidth - margin - 20, condominioY - 15);
  doc.line(margin + 20, condominioY + 25, pageWidth - margin - 20, condominioY + 25);
  
  // Ornamentos nos cantos
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.rect(margin + 20, condominioY - 17, 8, 4, 'F');
  doc.rect(pageWidth - margin - 28, condominioY - 17, 8, 4, 'F');
  doc.rect(margin + 20, condominioY + 23, 8, 4, 'F');
  doc.rect(pageWidth - margin - 28, condominioY + 23, 8, 4, 'F');
  
  // Nome do condomínio
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const condominioLines = doc.splitTextToSize(revista.condominioNome.toUpperCase(), contentWidth - 30);
  let condY = condominioY;
  for (const line of condominioLines) {
    doc.text(line, pageWidth / 2, condY, { align: 'center' });
    condY += 12;
  }
  
  // Título da revista
  if (revista.titulo) {
    doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(revista.titulo, pageWidth / 2, condominioY + 45, { align: 'center' });
  }
  
  // Subtítulo
  if (revista.subtitulo) {
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.setFontSize(11);
    doc.text(revista.subtitulo, pageWidth / 2, condominioY + 55, { align: 'center' });
  }
  
  // Badge "Revista Digital" elegante
  const badgeY = pageHeight - 80;
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.roundedRect(pageWidth / 2 - 35, badgeY, 70, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REVISTA DIGITAL', pageWidth / 2, badgeY + 11, { align: 'center' });
  
  // Rodapé da capa
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Produzido com App Manutenção', pageWidth / 2, pageHeight - 25, { align: 'center' });

  // ==================== PÁGINA DE ÍNDICE ====================
  doc.addPage();
  currentPage++;
  addHeaderFooter(currentPage);
  
  // Título do índice
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDICE', pageWidth / 2, margin + 20, { align: 'center' });
  
  // Linha decorativa
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 25, margin + 26, pageWidth / 2 + 25, margin + 26);
  
  // Guardar posição para preencher depois
  const tocPageNum = currentPage;
  const tocStartY = margin + 45;
  
  yPos = margin + 18;

  // ==================== MENSAGEM DO SÍNDICO ====================
  if (revista.mensagemSindico) {
    checkNewPage(80, true);
    drawSectionHeader('Palavra do Gerente', colors.primary);
    
    // Card elegante
    drawCard(margin, yPos, contentWidth, 65, colors.primary);
    
    // Nome do síndico
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(revista.mensagemSindico.nomeSindico, margin + 10, yPos + 15);
    
    // Título
    doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(revista.mensagemSindico.titulo, margin + 10, yPos + 23);
    
    // Mensagem
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const mensagemLines = doc.splitTextToSize(revista.mensagemSindico.mensagem, contentWidth - 20);
    let msgY = yPos + 32;
    for (const line of mensagemLines.slice(0, 4)) {
      doc.text(line, margin + 10, msgY);
      msgY += 5;
    }
    
    // Assinatura
    if (revista.mensagemSindico.assinatura) {
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(revista.mensagemSindico.assinatura, margin + 10, yPos + 58);
    }
    
    yPos += 75;
  }

  // ==================== AVISOS ====================
  if (revista.avisos && revista.avisos.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Avisos Importantes', colors.amber);
    
    for (const aviso of revista.avisos) {
      checkNewPage(40);
      
      const avisoColor = tipoColors[aviso.tipo] || colors.primaryLight;
      drawCard(margin, yPos, contentWidth, 32, avisoColor);
      
      // Badge do tipo
      doc.setFillColor(avisoColor[0], avisoColor[1], avisoColor[2]);
      doc.roundedRect(margin + 5, yPos + 5, 22, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(aviso.tipo.toUpperCase(), margin + 16, yPos + 8.5, { align: 'center' });
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(aviso.titulo, margin + 32, yPos + 10);
      
      // Conteúdo
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const avisoLines = doc.splitTextToSize(aviso.conteudo, contentWidth - 40);
      let avisoY = yPos + 18;
      for (const line of avisoLines.slice(0, 2)) {
        doc.text(line, margin + 8, avisoY);
        avisoY += 5;
      }
      
      yPos += 38;
    }
  }

  // ==================== EVENTOS ====================
  if (revista.eventos && revista.eventos.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Próximos Eventos', colors.emerald);
    
    for (const evento of revista.eventos) {
      checkNewPage(40);
      
      // Data em destaque
      const dataEvento = new Date(evento.dataEvento);
      const dia = dataEvento.getDate().toString().padStart(2, '0');
      const mes = dataEvento.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      
      doc.setFillColor(colors.emerald[0], colors.emerald[1], colors.emerald[2]);
      doc.roundedRect(margin + 5, yPos + 6, 20, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(dia, margin + 15, yPos + 16, { align: 'center' });
      doc.setFontSize(8);
      doc.text(mes, margin + 15, yPos + 22, { align: 'center' });
      
      // Título do evento
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(evento.titulo, margin + 30, yPos + 12);
      
      // Detalhes
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      let detalhes = '';
      if (evento.horario) detalhes += `${evento.horario}`;
      if (evento.local) detalhes += ` • ${evento.local}`;
      doc.text(detalhes, margin + 30, yPos + 20);
      
      if (evento.descricao) {
        doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
        const descLines = doc.splitTextToSize(evento.descricao, contentWidth - 40);
        doc.text(descLines[0] || '', margin + 30, yPos + 27);
      }
      
      yPos += 38;
    }
  }

  // ==================== FUNCIONÁRIOS ====================
  if (revista.funcionarios && revista.funcionarios.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Nossa Equipe', colors.violet);
    
    const cardWidth = (contentWidth - 10) / 2;
    let col = 0;
    
    for (const func of revista.funcionarios) {
      if (col === 0) checkNewPage(35);
      
      const x = margin + col * (cardWidth + 10);
      drawCard(x, yPos, cardWidth, 28, colors.violet);
      
      // Ícone de pessoa
      doc.setFillColor(colors.violet[0], colors.violet[1], colors.violet[2]);
      doc.circle(x + 12, yPos + 14, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(func.nome.charAt(0).toUpperCase(), x + 12, yPos + 17, { align: 'center' });
      
      // Nome e cargo
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(func.nome, x + 24, yPos + 12);
      
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(func.cargo, x + 24, yPos + 19);
      
      if (func.turno) {
        doc.setFontSize(8);
        doc.text(`Turno: ${func.turno}`, x + 24, yPos + 25);
      }
      
      col++;
      if (col >= 2) {
        col = 0;
        yPos += 34;
      }
    }
    if (col !== 0) yPos += 34;
  }

  // ==================== COMUNICADOS ====================
  if (revista.comunicados && revista.comunicados.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Comunicados Oficiais', colors.primaryLight);
    
    for (const comunicado of revista.comunicados) {
      checkNewPage(45);
      
      drawCard(margin, yPos, contentWidth, 38, colors.primaryLight);
      
      // Título
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(comunicado.titulo, margin + 8, yPos + 12);
      
      // Conteúdo
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const comLines = doc.splitTextToSize(comunicado.conteudo, contentWidth - 20);
      let comY = yPos + 20;
      for (const line of comLines.slice(0, 3)) {
        doc.text(line, margin + 8, comY);
        comY += 5;
      }
      
      yPos += 45;
    }
  }

  // ==================== REGRAS E NORMAS ====================
  if (revista.regras && revista.regras.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Regras e Normas', colors.darkGray);
    
    for (let i = 0; i < revista.regras.length; i++) {
      const regra = revista.regras[i];
      checkNewPage(35);
      
      // Número da regra
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(margin + 8, yPos + 8, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text((i + 1).toString(), margin + 8, yPos + 10, { align: 'center' });
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(regra.titulo, margin + 18, yPos + 10);
      
      // Descrição
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const regraLines = doc.splitTextToSize(regra.descricao, contentWidth - 25);
      let regraY = yPos + 18;
      for (const line of regraLines.slice(0, 2)) {
        doc.text(line, margin + 18, regraY);
        regraY += 5;
      }
      
      // Linha separadora
      doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin + 18, yPos + 28, pageWidth - margin, yPos + 28);
      
      yPos += 32;
    }
  }

  // ==================== DICAS DE SEGURANÇA ====================
  if (revista.dicasSeguranca && revista.dicasSeguranca.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Dicas de Segurança', colors.rose);
    
    for (const dica of revista.dicasSeguranca) {
      checkNewPage(35);
      
      drawCard(margin, yPos, contentWidth, 28, colors.rose);
      
      // Ícone de alerta
      doc.setFillColor(colors.rose[0], colors.rose[1], colors.rose[2]);
      doc.circle(margin + 12, yPos + 14, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('!', margin + 12, yPos + 17, { align: 'center' });
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(dica.titulo, margin + 22, yPos + 12);
      
      // Descrição
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const dicaLines = doc.splitTextToSize(dica.descricao, contentWidth - 30);
      doc.text(dicaLines[0] || '', margin + 22, yPos + 20);
      
      yPos += 34;
    }
  }

  // ==================== REALIZAÇÕES ====================
  if (revista.realizacoes && revista.realizacoes.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Realizações da Gestão', colors.emerald);
    
    for (const realizacao of revista.realizacoes) {
      checkNewPage(35);
      
      drawCard(margin, yPos, contentWidth, 30, colors.emerald);
      
      // Ícone de check
      doc.setFillColor(colors.emerald[0], colors.emerald[1], colors.emerald[2]);
      doc.circle(margin + 12, yPos + 15, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('✓', margin + 12, yPos + 18, { align: 'center' });
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(realizacao.titulo, margin + 22, yPos + 12);
      
      // Descrição
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const realLines = doc.splitTextToSize(realizacao.descricao, contentWidth - 30);
      doc.text(realLines[0] || '', margin + 22, yPos + 20);
      
      yPos += 36;
    }
  }

  // ==================== MELHORIAS ====================
  if (revista.melhorias && revista.melhorias.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Melhorias em Andamento', colors.cyan);
    
    for (const melhoria of revista.melhorias) {
      checkNewPage(35);
      
      drawCard(margin, yPos, contentWidth, 30, colors.cyan);
      
      // Status
      const statusColor = melhoria.status === 'concluido' ? colors.emerald : colors.amber;
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(margin + 5, yPos + 5, 22, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text((melhoria.status || 'EM ANDAMENTO').toUpperCase().slice(0, 12), margin + 16, yPos + 9, { align: 'center' });
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(melhoria.titulo, margin + 32, yPos + 10);
      
      // Descrição
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const melLines = doc.splitTextToSize(melhoria.descricao, contentWidth - 40);
      doc.text(melLines[0] || '', margin + 8, yPos + 20);
      
      yPos += 36;
    }
  }

  // ==================== AQUISIÇÕES ====================
  if (revista.aquisicoes && revista.aquisicoes.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Novas Aquisições', colors.violet);
    
    for (const aquisicao of revista.aquisicoes) {
      checkNewPage(35);
      
      drawCard(margin, yPos, contentWidth, 30, colors.violet);
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(aquisicao.titulo, margin + 8, yPos + 12);
      
      // Valor se existir
      if (aquisicao.valor) {
        doc.setTextColor(colors.emerald[0], colors.emerald[1], colors.emerald[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${aquisicao.valor.toLocaleString('pt-BR')}`, pageWidth - margin - 8, yPos + 12, { align: 'right' });
      }
      
      // Descrição
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const aqLines = doc.splitTextToSize(aquisicao.descricao, contentWidth - 20);
      doc.text(aqLines[0] || '', margin + 8, yPos + 20);
      
      yPos += 36;
    }
  }

  // ==================== TELEFONES ÚTEIS ====================
  if (revista.telefones && revista.telefones.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Telefones Úteis', colors.primaryLight);
    
    const cardWidth = (contentWidth - 10) / 2;
    let col = 0;
    
    for (const tel of revista.telefones) {
      if (col === 0) checkNewPage(25);
      
      const x = margin + col * (cardWidth + 10);
      drawCard(x, yPos, cardWidth, 20, colors.primaryLight);
      
      // Nome
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(tel.nome, x + 8, yPos + 10);
      
      // Número
      doc.setTextColor(colors.primaryLight[0], colors.primaryLight[1], colors.primaryLight[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(tel.numero, x + 8, yPos + 16);
      
      col++;
      if (col >= 2) {
        col = 0;
        yPos += 26;
      }
    }
    if (col !== 0) yPos += 26;
  }

  // ==================== CLASSIFICADOS ====================
  if (revista.classificados && revista.classificados.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Classificados', colors.amber);
    
    for (const classificado of revista.classificados) {
      checkNewPage(40);
      
      drawCard(margin, yPos, contentWidth, 32, colors.amber);
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(classificado.titulo, margin + 8, yPos + 12);
      
      // Preço
      if (classificado.preco) {
        doc.setTextColor(colors.emerald[0], colors.emerald[1], colors.emerald[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${classificado.preco.toLocaleString('pt-BR')}`, pageWidth - margin - 8, yPos + 12, { align: 'right' });
      }
      
      // Descrição
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const classLines = doc.splitTextToSize(classificado.descricao, contentWidth - 20);
      doc.text(classLines[0] || '', margin + 8, yPos + 20);
      
      // Contato
      if (classificado.contato) {
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.setFontSize(8);
        doc.text(`Contato: ${classificado.contato}`, margin + 8, yPos + 28);
      }
      
      yPos += 38;
    }
  }

  // ==================== CARONAS ====================
  if (revista.caronas && revista.caronas.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Caronas Solidárias', colors.cyan);
    
    for (const carona of revista.caronas) {
      checkNewPage(35);
      
      drawCard(margin, yPos, contentWidth, 28, colors.cyan);
      
      // Origem -> Destino
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${carona.origem} → ${carona.destino}`, margin + 8, yPos + 12);
      
      // Detalhes
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      let caronaInfo = '';
      if (carona.horario) caronaInfo += carona.horario;
      if (carona.diasSemana) caronaInfo += ` • ${carona.diasSemana}`;
      doc.text(caronaInfo, margin + 8, yPos + 20);
      
      // Contato
      if (carona.contato) {
        doc.setTextColor(colors.primaryLight[0], colors.primaryLight[1], colors.primaryLight[2]);
        doc.setFontSize(8);
        doc.text(`Contato: ${carona.contato}`, margin + 8, yPos + 26);
      }
      
      yPos += 34;
    }
  }

  // ==================== ACHADOS E PERDIDOS ====================
  if (revista.achadosPerdidos && revista.achadosPerdidos.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Achados e Perdidos', colors.rose);
    
    for (const item of revista.achadosPerdidos) {
      checkNewPage(35);
      
      const itemColor = item.tipo === 'achado' ? colors.emerald : colors.rose;
      drawCard(margin, yPos, contentWidth, 28, itemColor);
      
      // Badge tipo
      doc.setFillColor(itemColor[0], itemColor[1], itemColor[2]);
      doc.roundedRect(margin + 5, yPos + 5, 18, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(item.tipo.toUpperCase(), margin + 14, yPos + 8.5, { align: 'center' });
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(item.titulo, margin + 28, yPos + 10);
      
      // Local e descrição
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (item.local) {
        doc.text(`Local: ${item.local}`, margin + 8, yPos + 20);
      }
      if (item.descricao) {
        const descLines = doc.splitTextToSize(item.descricao, contentWidth - 20);
        doc.text(descLines[0] || '', margin + 8, yPos + 26);
      }
      
      yPos += 34;
    }
  }

  // ==================== ANUNCIANTES ====================
  if (revista.anunciantes && revista.anunciantes.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Parceiros e Anunciantes', colors.secondary);
    
    for (const anunciante of revista.anunciantes) {
      checkNewPage(40);
      
      drawCard(margin, yPos, contentWidth, 32, colors.secondary);
      
      // Nome
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(anunciante.nome, margin + 8, yPos + 12);
      
      // Categoria
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(anunciante.categoria.toUpperCase(), pageWidth - margin - 8, yPos + 12, { align: 'right' });
      
      // Descrição
      if (anunciante.descricao) {
        doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
        doc.setFontSize(9);
        const anLines = doc.splitTextToSize(anunciante.descricao, contentWidth - 20);
        doc.text(anLines[0] || '', margin + 8, yPos + 20);
      }
      
      // Contatos
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFontSize(8);
      let contatos = '';
      if (anunciante.telefone) contatos += `Tel: ${anunciante.telefone}`;
      if (anunciante.whatsapp) contatos += ` | WhatsApp: ${anunciante.whatsapp}`;
      doc.text(contatos, margin + 8, yPos + 28);
      
      yPos += 38;
    }
  }

  // ==================== PUBLICIDADE ====================
  if (revista.publicidade && revista.publicidade.length > 0) {
    checkNewPage(60, true);
    drawSectionHeader('Publicidade', colors.amber);
    
    for (const pub of revista.publicidade) {
      checkNewPage(40);
      
      drawCard(margin, yPos, contentWidth, 32, colors.amber);
      
      // Título
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(pub.titulo, margin + 8, yPos + 14);
      
      // Descrição
      if (pub.descricao) {
        doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const pubLines = doc.splitTextToSize(pub.descricao, contentWidth - 20);
        doc.text(pubLines[0] || '', margin + 8, yPos + 23);
      }
      
      yPos += 38;
    }
  }

  // ==================== CONTRACAPA ====================
  doc.addPage();
  currentPage++;
  
  // Fundo elegante
  doc.setFillColor(colors.coverBg[0], colors.coverBg[1], colors.coverBg[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Padrão decorativo (estilo específico)
  doc.setDrawColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
  doc.setLineWidth(0.3);
  
  if (estilo === 'minimalista') {
    // Minimalista: retângulo simples
    doc.setLineWidth(1);
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40, 'S');
  } else if (estilo === 'moderno') {
    // Moderno: círculos
    doc.circle(30, pageHeight - 50, 20, 'S');
    doc.circle(pageWidth - 30, pageHeight - 50, 20, 'S');
    doc.circle(30, pageHeight - 50, 12, 'S');
    doc.circle(pageWidth - 30, pageHeight - 50, 12, 'S');
  } else {
    // Clássico, Elegante, Corporativo: linhas verticais
    for (let i = 0; i < 8; i++) {
      doc.line(20 + i * 6, pageHeight - 80, 20 + i * 6, pageHeight - 30);
    }
    for (let i = 0; i < 8; i++) {
      doc.line(pageWidth - 68 + i * 6, pageHeight - 80, pageWidth - 68 + i * 6, pageHeight - 30);
    }
  }
  
  // Texto central
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(revista.condominioNome.toUpperCase(), pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  // Linha decorativa
  doc.setDrawColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 40, pageHeight / 2 - 5, pageWidth / 2 + 40, pageHeight / 2 - 5);
  
  // Edição
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(revista.edicao, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
  
  // Rodapé
  doc.setFontSize(10);
  doc.setTextColor(colors.coverAccent[0], colors.coverAccent[1], colors.coverAccent[2]);
  doc.text('Produzido com', pageWidth / 2, pageHeight - 35, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('App Manutenção', pageWidth / 2, pageHeight - 25, { align: 'center' });

  // ==================== PREENCHER ÍNDICE ====================
  doc.setPage(tocPageNum);
  let tocY = tocStartY;
  
  for (const entry of tocEntries) {
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.title, margin + 5, tocY);
    
    // Linha pontilhada
    doc.setDrawColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.setLineWidth(0.2);
    const titleWidth = doc.getTextWidth(entry.title);
    const pageNumWidth = doc.getTextWidth(entry.page.toString());
    
    // Pontos
    let dotX = margin + 8 + titleWidth;
    while (dotX < pageWidth - margin - pageNumWidth - 5) {
      doc.text('.', dotX, tocY);
      dotX += 2;
    }
    
    // Número da página
    doc.setFont('helvetica', 'bold');
    doc.text(entry.page.toString(), pageWidth - margin, tocY, { align: 'right' });
    
    tocY += 8;
  }

  // Retornar o PDF como buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

// Exportar lista de estilos disponíveis
export const estilosDisponiveis = [
  { id: 'classico', nome: 'Clássico', descricao: 'Azul escuro e dourado - elegante e tradicional' },
  { id: 'moderno', nome: 'Moderno', descricao: 'Azul vibrante e laranja - contemporâneo e dinâmico' },
  { id: 'minimalista', nome: 'Minimalista', descricao: 'Preto e branco - limpo e sofisticado' },
  { id: 'elegante', nome: 'Elegante', descricao: 'Bordeaux e ouro rosé - luxuoso e refinado' },
  { id: 'corporativo', nome: 'Corporativo', descricao: 'Verde escuro e prata - profissional e sério' },
];
