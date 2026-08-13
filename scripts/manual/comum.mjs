/**
 * Peças compartilhadas pelos manuais do usuário.
 *
 * Existe um manual completo e um resumo só das funções. Os dois usam o mesmo
 * desenho de botão e o mesmo ícone da tela — por isso ícone, CSS e casca do HTML
 * vivem aqui, e cada gerador só escreve o texto dele.
 */
import fs from "node:fs";
import path from "node:path";

export const RAIZ = path.resolve(import.meta.dirname, "../..");
const ICONES_DIR = path.join(RAIZ, "node_modules/lucide-react/dist/esm/icons");
const PUBLICO = path.join(RAIZ, "client/public");

/** Nomes de arquivo do lucide, em kebab-case. */
const ICONES = [
  "arrow-left", "log-out", "plus", "search", "trash-2", "pencil", "printer",
  "qr-code", "share-2", "sliders-horizontal", "camera", "check-circle-2",
  "building-2", "users", "user-cog", "wrench", "alert-triangle",
  "clipboard-list", "calendar-clock", "clipboard-check", "list-checks",
  "columns-3", "key-round", "lock", "lock-open", "crown", "eye", "star", "play",
  "rotate-ccw", "hash", "chevron-right", "chevron-left", "chevron-down", "image-plus", "mail",
  "inbox", "settings-2", "list", "calendar-days", "message-circle", "file-text",
  "more-vertical", "save", "copy", "bell", "smartphone",
];

/**
 * Lê o módulo do ícone e devolve os filhos do SVG já em markup.
 *
 * Nada é desenhado à mão: o traço sai do próprio lucide-react que o sistema usa,
 * então o desenho no papel é o mesmo da tela.
 */
function lerIcone(nome, saltos = 0) {
  const src = fs.readFileSync(path.join(ICONES_DIR, `${nome}.js`), "utf8");

  // Nome antigo (CheckCircle2, MoreVertical) é só um reexport do nome novo.
  const alias = src.match(/export \{ default \} from '\.\/([^']+)\.js'/);
  if (alias && saltos < 3) return lerIcone(alias[1], saltos + 1);

  const corpo = src
    .replace(/^import[^\n]*$/gm, "")
    .replace(/^export[^\n]*$/gm, "")
    .replace(/^\/\/#[^\n]*$/gm, "");

  let capturado = null;
  const registrar = (_nome, nos) => {
    capturado = nos;
    return {};
  };
  new Function("registrar", corpo.replace(/createLucideIcon\(/g, "registrar("))(
    registrar,
  );
  if (!capturado) throw new Error(`Não consegui ler o ícone ${nome}`);

  const kebab = (chave) => chave.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return capturado
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs)
        .filter(([chave]) => chave !== "key")
        .map(([chave, valor]) => `${kebab(chave)}="${valor}"`)
        .join(" ");
      return `<${tag} ${props}/>`;
    })
    .join("");
}

/* -------------------------------------------------- pedaços de conteúdo */

export const ic = (nome) => {
  if (!ICONES.includes(nome)) throw new Error(`Ícone fora da lista: ${nome}`);
  return `<svg class="ic" aria-hidden="true"><use href="#i-${nome}"/></svg>`;
};

/** Botão laranja — o botão principal do sistema. */
export const bt = (texto, icone) =>
  `<span class="bt bt-p">${icone ? ic(icone) : ""}${texto}</span>`;
/** Botão branco de borda — ações secundárias. */
export const bo = (texto, icone) =>
  `<span class="bt bt-o">${icone ? ic(icone) : ""}${texto}</span>`;
/** Botão só de ícone, sem fundo. */
export const bg = (icone) => `<span class="bt bt-g">${ic(icone)}</span>`;
/** Botão de excluir. */
export const bd = (icone = "trash-2") => `<span class="bt bt-d">${ic(icone)}</span>`;
/** Campo de digitação. */
export const campo = (texto) => `<span class="campo">${texto}</span>`;
/** Etiqueta colorida de status. */
export const et = (texto, cor) => `<span class="et et-${cor}">${texto}</span>`;

export const passos = (itens) =>
  `<ol class="passos">${itens.map((i) => `<li>${i}</li>`).join("")}</ol>`;
export const lista = (itens) =>
  `<ul class="lista">${itens.map((i) => `<li>${i}</li>`).join("")}</ul>`;

export const aviso = (titulo, corpo) =>
  `<div class="aviso"><b>${titulo}</b> ${corpo}</div>`;
export const so = (quem, corpo) =>
  `<div class="so"><b>Só o ${quem}:</b> ${corpo}</div>`;

/** Cartão de função com título, para quem serve e conteúdo. */
export const func = (id, icone, titulo, quem, corpo) => `
<section class="fn" id="${id}">
  <h3>${ic(icone)} ${titulo}</h3>
  <p class="quem">${quem}</p>
  ${corpo}
</section>`;

/** Linha rotulada dos cartões do resumo. */
export const linha = (rotulo, texto) =>
  `<p class="lin"><b>${rotulo}</b> ${texto}</p>`;

/* ------------------------------------------------------------ casca HTML */

const CSS = `
  :root{
    --laranja:#ec5a00; --texto:#111827; --cinza:#4b5563; --linha:#e5e7eb;
    --fundo:#f8fafc; --azul:#1d4ed8;
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:#fff; color:var(--texto);
    font:19px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  }
  .pg{max-width:900px;margin:0 auto;padding:28px 22px 80px}
  h1{font-size:38px;line-height:1.15;margin:0 0 6px}
  h2{font-size:28px;margin:44px 0 6px;padding-top:14px;border-top:3px solid var(--laranja)}
  h3{font-size:23px;margin:26px 0 4px;display:flex;align-items:center;gap:10px}
  h4{font-size:20px;margin:20px 0 4px}
  p{margin:8px 0}
  .sub{color:var(--cinza);font-size:18px;margin:0 0 18px}
  .quem{color:var(--cinza);font-size:17px;margin:0 0 8px}
  ol.passos{margin:8px 0 8px;padding-left:28px}
  ol.passos>li{margin:7px 0}
  ul.lista{margin:8px 0;padding-left:24px}
  ul.lista>li{margin:6px 0}
  .ic{width:1.05em;height:1.05em;flex:none;fill:none;stroke:currentColor;
     stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-2px}
  .bt{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:12px;
     font-size:17px;font-weight:600;line-height:1.45;white-space:nowrap;vertical-align:1px}
  .bt-p{background:var(--laranja);color:#fff}
  .bt-o{background:#fff;color:#1f2937;border:1.5px solid #cbd5e1}
  .bt-g{background:#f1f5f9;color:#475569;padding:5px 8px}
  .bt-d{background:#fee2e2;color:#b91c1c;padding:5px 8px}
  .campo{display:inline-block;border:1.5px solid #cbd5e1;border-radius:10px;
     padding:2px 12px;color:#475569;font-size:17px;background:#fff}
  .et{display:inline-block;border-radius:999px;padding:1px 10px;font-size:15px;font-weight:600}
  .et-verde{background:#dcfce7;color:#166534}
  .et-amarelo{background:#fef3c7;color:#92400e}
  .et-vermelho{background:#fee2e2;color:#991b1b}
  .et-azul{background:#dbeafe;color:#1e40af}
  .aviso{background:#fff7ed;border-left:5px solid var(--laranja);padding:12px 14px;
     border-radius:10px;margin:12px 0;font-size:18px}
  .so{background:#eef2ff;border-left:5px solid #4f46e5;padding:12px 14px;
     border-radius:10px;margin:12px 0;font-size:18px}
  .perfil{background:var(--fundo);border:2px solid var(--linha);border-radius:16px;
     padding:16px 18px;margin:16px 0}
  .fn{border:2px solid var(--linha);border-radius:16px;padding:14px 18px;margin:16px 0}
  .card{border:2px solid var(--linha);border-radius:14px;padding:12px 14px;margin:10px 0;background:#fff}
  .grade{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .quadro{border:2px solid var(--linha);border-radius:14px;padding:12px;text-align:center}
  .quadro .ic{width:30px;height:30px;color:var(--laranja)}
  .quadro b{display:block;margin-top:6px;font-size:18px}
  .quadro span{display:block;color:var(--cinza);font-size:15px}
  table{border-collapse:collapse;width:100%;margin:12px 0;font-size:17px}
  th,td{border:1px solid var(--linha);padding:8px 10px;text-align:left}
  th{background:var(--fundo)}
  td.c{text-align:center;font-weight:700}
  .sim{color:#15803d}.nao{color:#b91c1c}
  .indice{background:var(--fundo);border-radius:16px;padding:14px 20px}
  .indice a{color:var(--azul);text-decoration:none}
  .indice li{margin:5px 0}
  .rodape{margin-top:40px;border-top:2px solid var(--linha);padding-top:14px;
     color:var(--cinza);font-size:17px}
  .imprimir{position:sticky;top:0;background:#fff;padding:10px 0;text-align:right;z-index:5}
  .imprimir button{font:inherit;font-weight:700;background:var(--laranja);color:#fff;
     border:0;border-radius:12px;padding:10px 18px;cursor:pointer}
  /* Resumo: cartão compacto, uma linha por pergunta. */
  .lin{margin:5px 0}
  .lin b{color:#0f172a}
  .fn.compacta{padding:12px 16px;margin:12px 0}
  .fn.compacta h3{font-size:21px;margin:0 0 2px}
  @media print{
    .imprimir{display:none}
    body{font-size:12.5pt}
    h1{font-size:24pt} h2{font-size:17pt} h3{font-size:14pt}
    h2{break-before:page;break-after:avoid}
    h2:first-of-type{break-before:auto}
    .fn,.perfil,.card,table{break-inside:avoid}
    .pg{padding:0}
    @page{margin:14mm}
  }
  @media (max-width:640px){
    body{font-size:18px}
    h1{font-size:30px} h2{font-size:24px}
    .grade{grid-template-columns:1fr}
  }
`;

/**
 * Monta a página. O sprite leva só os ícones que o texto usa — manual novo não
 * carrega o desenho que ele não mostra.
 */
export function montarHtml({ titulo, subtitulo, corpo, cssExtra = "" }) {
  const usados = [...new Set([...corpo.matchAll(/#i-([a-z0-9-]+)/g)].map((m) => m[1]))];
  const sprite = usados
    .map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${lerIcone(n)}</symbol>`)
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>${CSS}${cssExtra}</style>
</head>
<body>
<svg style="display:none" aria-hidden="true">${sprite}</svg>

<div class="pg">
<div class="imprimir"><button onclick="window.print()">Imprimir</button></div>

<h1>${titulo}</h1>
<p class="sub">${subtitulo}</p>
${corpo}
</div>
</body>
</html>
`;
}

/**
 * Escreve o HTML em client/public e imprime o PDF ao lado.
 *
 * O PDF sai do próprio HTML, pelo Chrome do puppeteer: gerar à parte (jsPDF,
 * PDFKit) obrigaria a escrever o manual duas vezes e os ícones não sairiam
 * iguais. Os dois arquivos são estáticos e entram no build junto com o resto de
 * `client/public` — produção não precisa de Chrome, só quem gera aqui.
 */
export async function publicar({ base, html, rodapePdf, pasta = PUBLICO }) {
  // `pasta` existe para o documento que não é para o público: folha de teste,
  // instrução de uma pessoa. Ela sai só no lugar pedido, sem ir para o site.
  fs.mkdirSync(pasta, { recursive: true });
  const destinoHtml = path.join(pasta, `${base}.html`);
  fs.writeFileSync(destinoHtml, html, "utf8");
  console.log("HTML:", destinoHtml, (html.length / 1024).toFixed(1) + " kB");

  const destinoPdf = path.join(pasta, `${base}.pdf`);
  const puppeteer = await import("puppeteer");
  const navegador = await puppeteer.default.launch();

  try {
    const pagina = await navegador.newPage();
    await pagina.goto(`file://${destinoHtml.replace(/\\/g, "/")}`, { waitUntil: "load" });
    await pagina.pdf({
      path: destinoPdf,
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%;padding:0 14mm;font:9pt system-ui,Arial;color:#6b7280;
                    display:flex;justify-content:space-between">
          <span>${rodapePdf}</span>
          <span>página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>`,
    });
  } finally {
    await navegador.close();
  }

  console.log("PDF:", destinoPdf, (fs.statSync(destinoPdf).size / 1024).toFixed(0) + " kB");
}
