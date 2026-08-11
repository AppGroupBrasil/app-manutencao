/**
 * Remove do disco as imagens que nenhum registro referencia.
 *
 * Foto enviada num formulário que o usuário abandonou fica no volume para
 * sempre: o upload grava na hora, e só depois o registro é salvo. Com o tempo é
 * o volume inteiro ocupado por arquivo que ninguém abre.
 *
 * O que é "referenciado" não vem de uma lista de tabelas escrita à mão — ela
 * ficaria desatualizada na primeira função nova. O script varre toda coluna de
 * texto/JSON do banco atrás de caminhos `/uploads/...`.
 *
 * Uso:
 *   pnpm db:limpar-imagens            # só lista o que apagaria
 *   pnpm db:limpar-imagens --apagar   # apaga de verdade
 *   pnpm db:limpar-imagens --dias 30  # só arquivos com mais de 30 dias
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const PASTA = path.resolve(process.cwd(), "uploads");

/** Margem de segurança: arquivo recém-enviado pode estar num formulário aberto. */
const DIAS_PADRAO = 7;

function lerArgumento(nome: string, padrao: number): number {
  const i = process.argv.indexOf(`--${nome}`);
  if (i === -1) return padrao;
  const valor = Number(process.argv[i + 1]);
  return Number.isFinite(valor) && valor >= 0 ? valor : padrao;
}

function arquivosDe(pasta: string): string[] {
  if (!fs.existsSync(pasta)) return [];
  const saida: string[] = [];
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    const completo = path.join(pasta, item.name);
    if (item.isDirectory()) saida.push(...arquivosDe(completo));
    else saida.push(completo);
  }
  return saida;
}

/** Todo caminho `/uploads/...` que aparece em qualquer coluna do banco. */
async function referenciados(sql: postgres.Sql): Promise<Set<string>> {
  const colunas = await sql<{ tabela: string; coluna: string }[]>`
    SELECT table_name AS tabela, column_name AS coluna
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'json', 'jsonb')
  `;

  const encontrados = new Set<string>();

  for (const { tabela, coluna } of colunas) {
    let linhas: { valor: string | null }[];
    try {
      linhas = await sql.unsafe(
        `SELECT DISTINCT "${coluna}"::text AS valor FROM "${tabela}" WHERE "${coluna}"::text LIKE '%/uploads/%'`,
      );
    } catch {
      // Coluna que não aceita cast para texto: não guarda caminho de arquivo.
      continue;
    }

    for (const { valor } of linhas) {
      if (!valor) continue;
      for (const achado of valor.matchAll(/\/uploads\/[A-Za-z0-9._\-/]+/g)) {
        encontrados.add(decodeURIComponent(achado[0]));
      }
    }
  }

  return encontrados;
}

async function principal() {
  const apagar = process.argv.includes("--apagar");
  const dias = lerArgumento("dias", DIAS_PADRAO);
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("DATABASE_URL ausente.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, idle_timeout: 20 });

  try {
    const emUso = await referenciados(sql);
    const arquivos = arquivosDe(PASTA);
    const limite = Date.now() - dias * 24 * 60 * 60 * 1000;

    let orfaos = 0;
    let bytes = 0;
    let recentes = 0;

    for (const arquivo of arquivos) {
      const relativo = "/uploads/" + path.relative(PASTA, arquivo).split(path.sep).join("/");
      if (emUso.has(relativo)) continue;

      const info = fs.statSync(arquivo);
      if (info.mtimeMs > limite) {
        recentes++;
        continue;
      }

      orfaos++;
      bytes += info.size;
      if (apagar) {
        fs.unlinkSync(arquivo);
        console.log("apagado:", relativo);
      } else {
        console.log("órfão:  ", relativo, `(${(info.size / 1024).toFixed(0)}KB)`);
      }
    }

    console.log(
      `\narquivos: ${arquivos.length} | em uso: ${emUso.size} | órfãos: ${orfaos} ` +
        `(${(bytes / 1024 / 1024).toFixed(1)}MB) | recentes preservados: ${recentes}`,
    );
    if (!apagar && orfaos > 0) console.log("Nada foi apagado. Rode com --apagar para remover.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

principal().catch((erro) => {
  console.error("Falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
