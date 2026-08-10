/**
 * Carrega a imagem de um registro para dentro de um PDF.
 *
 * Com armazenamento local, a url gravada é um caminho (`/uploads/os/1/f.jpg`),
 * não um endereço. Pedir isso pela rede estoura "Invalid URL" — o que derrubava
 * a geração do PDF da O.S. inteira — ou vira "Imagem indisponível" nos
 * relatórios das outras funções. Aqui o caminho é lido do disco e só o endereço
 * de verdade sai pela rede.
 *
 * Nunca lança: foto que não abre não pode cancelar o relatório.
 */
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import https from "node:https";

const RAIZ_UPLOADS = () => path.resolve(process.cwd(), "uploads");

async function lerDoDisco(url: string): Promise<Buffer | null> {
  try {
    const relativo = decodeURIComponent(url.replace(/^\/uploads\//, ""));
    // O caminho vem do banco, mas continua sendo entrada: nada de subir níveis.
    if (relativo.includes("..")) return null;

    const raiz = RAIZ_UPLOADS();
    const caminho = path.resolve(raiz, relativo);
    if (!caminho.startsWith(raiz)) return null;

    return await fs.readFile(caminho);
  } catch {
    return null;
  }
}

async function baixar(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const cliente = url.startsWith("https") ? https : http;
      const requisicao = cliente.get(url, { timeout: 8000 }, (resposta) => {
        if (resposta.statusCode !== 200) {
          resolve(null);
          return;
        }
        const pedacos: Buffer[] = [];
        resposta.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
        resposta.on("end", () => resolve(Buffer.concat(pedacos)));
        resposta.on("error", () => resolve(null));
      });
      requisicao.on("error", () => resolve(null));
      requisicao.on("timeout", () => {
        requisicao.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export async function carregarImagemParaPdf(url?: string | null): Promise<Buffer | null> {
  if (!url) return null;
  if (url.startsWith("data:")) {
    const base64 = url.slice(url.indexOf(",") + 1);
    try {
      return Buffer.from(base64, "base64");
    } catch {
      return null;
    }
  }
  if (url.startsWith("/")) return lerDoDisco(url);
  if (!/^https?:\/\//i.test(url)) return null;
  return baixar(url);
}

/** Tipo declarado ao PDF a partir da extensão; o padrão cobre o caso comum. */
export function formatoDaImagem(url: string): "PNG" | "JPEG" {
  return /\.png($|\?)/i.test(url) ? "PNG" : "JPEG";
}
