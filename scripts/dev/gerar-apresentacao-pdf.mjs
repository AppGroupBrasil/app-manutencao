import puppeteer from 'puppeteer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

// Verificar se o servidor está rodando
async function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Páginas para capturar
const PAGES_TO_CAPTURE = [
  { url: '/', name: 'home', title: 'Página Inicial' },
  { url: '/login', name: 'login', title: 'Tela de Login' },
];

async function captureScreenshots(browser, outputDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const screenshots = [];
  
  // Primeiro, fazer login
  console.log('🔐 Fazendo login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Preencher credenciais
  try {
    await page.type('input[type="email"], input[name="email"]', 'eduardodominikus@hotmail.com', { delay: 50 });
    await page.type('input[type="password"], input[name="password"], input[name="senha"]', '123456', { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Login automático não disponível, continuando com páginas públicas...');
  }
  
  // Capturar cada página
  for (const pageInfo of PAGES_TO_CAPTURE) {
    try {
      console.log(`📸 Capturando: ${pageInfo.title}...`);
      await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(outputDir, `${pageInfo.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      screenshots.push({
        path: screenshotPath,
        title: pageInfo.title,
        name: pageInfo.name
      });
      
      console.log(`✅ ${pageInfo.title} capturada!`);
    } catch (error) {
      console.log(`⚠️ Erro ao capturar ${pageInfo.title}: ${error.message}`);
    }
  }
  
  await page.close();
  return screenshots;
}

async function createPDF(screenshots, outputPath) {
  console.log('\n📄 Gerando PDF...');
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Cores do App Manutenção
  const orange = rgb(0.976, 0.451, 0.086); // #f97316
  const gray = rgb(0.15, 0.15, 0.15);
  const lightGray = rgb(0.5, 0.5, 0.5);
  
  // PÁGINA DE CAPA
  const coverPage = pdfDoc.addPage([1920, 1080]);
  
  // Background gradiente (simulado com retângulos)
  coverPage.drawRectangle({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: orange,
  });
  
  // Título principal
  coverPage.drawText('APP MANUTENÇÃO', {
    x: 960 - 400,
    y: 600,
    size: 120,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  // Subtítulo
  coverPage.drawText('Sistema Completo de Gestão de Manutenção', {
    x: 960 - 350,
    y: 480,
    size: 36,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  // Badges
  const badges = ['📱 App Mobile', '☁️ 100% Nuvem', '🔒 Seguro', '⚡ Tempo Real'];
  let badgeX = 500;
  for (const badge of badges) {
    coverPage.drawText(badge, {
      x: badgeX,
      y: 350,
      size: 24,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });
    badgeX += 250;
  }
  
  // Adicionar screenshots como páginas
  for (const screenshot of screenshots) {
    try {
      const imageBytes = fs.readFileSync(screenshot.path);
      const image = await pdfDoc.embedPng(imageBytes);
      
      const page = pdfDoc.addPage([1920, 1080]);
      
      // Header com título
      page.drawRectangle({
        x: 0,
        y: 1000,
        width: 1920,
        height: 80,
        color: orange,
      });
      
      page.drawText(screenshot.title.toUpperCase(), {
        x: 60,
        y: 1025,
        size: 36,
        font: font,
        color: rgb(1, 1, 1),
      });
      
      page.drawText('APP MANUTENÇÃO', {
        x: 1600,
        y: 1025,
        size: 24,
        font: fontRegular,
        color: rgb(1, 1, 1),
      });
      
      // Imagem do screenshot
      const imgWidth = 1800;
      const imgHeight = (image.height / image.width) * imgWidth;
      
      page.drawImage(image, {
        x: 60,
        y: 980 - imgHeight,
        width: imgWidth,
        height: Math.min(imgHeight, 900),
      });
      
      // Footer
      page.drawText(`© 2026 APP GROUP LTDA - Todos os direitos reservados`, {
        x: 60,
        y: 30,
        size: 18,
        font: fontRegular,
        color: lightGray,
      });
      
      console.log(`✅ Página adicionada: ${screenshot.title}`);
    } catch (error) {
      console.log(`⚠️ Erro ao adicionar ${screenshot.title}: ${error.message}`);
    }
  }
  
  // PÁGINA DE FUNCIONALIDADES
  const featuresPage = pdfDoc.addPage([1920, 1080]);
  
  featuresPage.drawRectangle({
    x: 0,
    y: 1000,
    width: 1920,
    height: 80,
    color: orange,
  });
  
  featuresPage.drawText('FUNCIONALIDADES PRINCIPAIS', {
    x: 60,
    y: 1025,
    size: 36,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  const features = [
    { icon: '📋', title: 'Ordens de Serviço', desc: 'Crie, atribua e acompanhe ordens em tempo real' },
    { icon: '🔍', title: 'Vistorias Detalhadas', desc: 'Checklists personalizáveis com fotos de evidência' },
    { icon: '📊', title: 'Relatórios Profissionais', desc: 'Gráficos, análises e métricas de desempenho' },
    { icon: '👥', title: 'Gestão de Equipes', desc: 'Gerencie técnicos e controle acessos' },
    { icon: '📱', title: 'App Mobile', desc: 'iOS e Android com modo offline' },
    { icon: '🔔', title: 'Notificações', desc: 'Alertas em tempo real via push e e-mail' },
    { icon: '📸', title: 'Anexos e Fotos', desc: 'Documente cada serviço com imagens' },
    { icon: '🔐', title: 'Segurança', desc: 'Criptografia e conformidade com LGPD' },
  ];
  
  let y = 850;
  let col = 0;
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const x = col === 0 ? 100 : 1000;
    
    featuresPage.drawText(`${f.icon} ${f.title}`, {
      x: x,
      y: y,
      size: 32,
      font: font,
      color: gray,
    });
    
    featuresPage.drawText(f.desc, {
      x: x,
      y: y - 40,
      size: 22,
      font: fontRegular,
      color: lightGray,
    });
    
    col++;
    if (col > 1) {
      col = 0;
      y -= 120;
    }
  }
  
  // PÁGINA DE PLANOS
  const plansPage = pdfDoc.addPage([1920, 1080]);
  
  plansPage.drawRectangle({
    x: 0,
    y: 1000,
    width: 1920,
    height: 80,
    color: orange,
  });
  
  plansPage.drawText('PLANOS E PREÇOS', {
    x: 60,
    y: 1025,
    size: 36,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  const plans = [
    { name: 'Individual', price: 'R$ 99/mês', users: '1 usuário', features: ['OS ilimitadas', 'App mobile', 'Relatórios básicos'] },
    { name: 'Equipes', price: 'R$ 199/mês', users: 'Até 5 usuários', features: ['OS ilimitadas', 'App mobile', 'Relatórios avançados', 'Integrações'] },
    { name: 'Empresarial', price: 'R$ 299/mês', users: 'Até 15 usuários', features: ['OS ilimitadas', 'App mobile', 'Relatórios customizados', 'API completa', 'Suporte 24/7'] },
  ];
  
  let planX = 150;
  for (const plan of plans) {
    // Card background
    plansPage.drawRectangle({
      x: planX,
      y: 200,
      width: 500,
      height: 700,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 2,
    });
    
    plansPage.drawText(plan.name, {
      x: planX + 50,
      y: 820,
      size: 36,
      font: font,
      color: gray,
    });
    
    plansPage.drawText(plan.price, {
      x: planX + 50,
      y: 750,
      size: 48,
      font: font,
      color: orange,
    });
    
    plansPage.drawText(plan.users, {
      x: planX + 50,
      y: 690,
      size: 22,
      font: fontRegular,
      color: lightGray,
    });
    
    let fy = 620;
    for (const feat of plan.features) {
      plansPage.drawText(`✓ ${feat}`, {
        x: planX + 50,
        y: fy,
        size: 20,
        font: fontRegular,
        color: gray,
      });
      fy -= 40;
    }
    
    planX += 560;
  }
  
  // PÁGINA DE CONTATO
  const contactPage = pdfDoc.addPage([1920, 1080]);
  
  contactPage.drawRectangle({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: orange,
  });
  
  contactPage.drawText('ENTRE EM CONTATO', {
    x: 960 - 300,
    y: 700,
    size: 64,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  contactPage.drawText('🌐 www.appmanutencao.com.br', {
    x: 960 - 250,
    y: 550,
    size: 32,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  contactPage.drawText('📧 contato@appmanutencao.com.br', {
    x: 960 - 280,
    y: 480,
    size: 32,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  contactPage.drawText('📱 WhatsApp: (11) 99999-9999', {
    x: 960 - 250,
    y: 410,
    size: 32,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  contactPage.drawText('© 2026 APP GROUP LTDA - Todos os direitos reservados', {
    x: 960 - 320,
    y: 200,
    size: 24,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  // Salvar PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  
  console.log(`\n✅ PDF gerado com sucesso: ${outputPath}`);
}

async function main() {
  const outputDir = './screenshots-apresentacao';
  const pdfPath = './apresentacao-comercial-sistema.pdf';
  
  // Verificar se o servidor está rodando
  console.log('🔍 Verificando se o servidor está rodando...');
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    console.log('\n❌ O servidor não está rodando!');
    console.log('Por favor, execute em outro terminal:');
    console.log('   cd "c:\\Users\\HP\\OneDrive\\Área de Trabalho\\ARQUIVOS APP MANUS\\App Manutenção Zip 1"');
    console.log('   pnpm dev');
    console.log('\nDepois execute este script novamente.');
    process.exit(1);
  }
  
  console.log('✅ Servidor rodando!');
  
  // Criar diretório para screenshots
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('\n🚀 Iniciando captura de telas do App Manutenção...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const screenshots = await captureScreenshots(browser, outputDir);
    await createPDF(screenshots, pdfPath);
    
    console.log('\n🎉 Apresentação comercial gerada com sucesso!');
    console.log(`📄 Arquivo: ${pdfPath}`);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await browser.close();
  }
}

main();
