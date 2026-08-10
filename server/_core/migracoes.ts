/**
 * Aplicação automática das migrações SQL.
 *
 * Antes disto o deploy só publicava código: o SQL era aplicado à mão no
 * servidor e, se alguém esquecesse, a versão nova subia contra um banco velho e
 * as telas quebravam com "coluna não existe". Aqui o próprio processo aplica o
 * que falta antes de atender a primeira requisição.
 *
 * Regras:
 * - Ordem alfabética do nome do arquivo, que é a ordem numérica (0001, 0002…).
 * - Cada arquivo roda numa transação e é registrado em `_migracoes_aplicadas`.
 *   Registro gravado nunca roda de novo.
 * - Um lock de sessão (`pg_advisory_lock`) serializa réplicas subindo juntas.
 * - `MIGRACAO_BASELINE` marca até onde o banco já estava migrado quando este
 *   runner entrou. Esses arquivos são registrados sem executar, porque as
 *   migrações antigas (geradas pelo drizzle-kit) não são repetíveis: um
 *   `CREATE TABLE` sem `IF NOT EXISTS` derrubaria o processo.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

/** Número travado no código: qualquer processo do app usa o mesmo. */
const LOCK_ID = 918273645;

/** Última migração aplicada à mão, antes deste runner existir. */
const BASELINE_PADRAO = "0042";

function pastaDasMigracoes(): string {
  // Em produção o processo roda em /app com `dist/` e `drizzle/` lado a lado.
  const candidatos = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "..", "drizzle"),
  ];
  return candidatos.find((p) => fs.existsSync(p)) ?? candidatos[0];
}

function arquivosDeMigracao(pasta: string): string[] {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((nome) => nome.endsWith(".sql"))
    .sort();
}

/** "0043_x.sql" -> "0043". Arquivo sem prefixo numérico nunca é baseline. */
function numeroDoArquivo(nome: string): string | null {
  const m = nome.match(/^(\d+)/);
  return m ? m[1] : null;
}

/** Crase fora de comentário = identificador MySQL, que o Postgres não entende. */
export function temCraseNoSql(conteudo: string): boolean {
  const semComentarios = conteudo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
  return semComentarios.includes("`");
}

export interface ResultadoMigracao {
  aplicadas: string[];
  registradasComoBaseline: string[];
  jaAplicadas: number;
}

/**
 * Aplica o que falta. Lança em caso de erro de SQL — subir com banco
 * incompleto é pior do que não subir.
 */
export async function aplicarMigracoesPendentes(
  urlDoBanco = process.env.DATABASE_URL,
): Promise<ResultadoMigracao> {
  const resultado: ResultadoMigracao = {
    aplicadas: [],
    registradasComoBaseline: [],
    jaAplicadas: 0,
  };

  if (!urlDoBanco) {
    console.warn("[migracoes] DATABASE_URL ausente; nada a fazer.");
    return resultado;
  }

  const pasta = pastaDasMigracoes();
  const arquivos = arquivosDeMigracao(pasta);
  if (arquivos.length === 0) {
    console.warn(`[migracoes] nenhum .sql em ${pasta}`);
    return resultado;
  }

  const baseline = process.env.MIGRACAO_BASELINE ?? BASELINE_PADRAO;

  // Conexão própria e curta: o pool da aplicação não deve carregar DDL.
  const sql = postgres(urlDoBanco, { max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    // O lock vem antes de tudo: duas instâncias subindo juntas não podem nem
    // criar a tabela de controle ao mesmo tempo.
    await sql`SELECT pg_advisory_lock(${LOCK_ID})`;

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "_migracoes_aplicadas" (
          "arquivo" text PRIMARY KEY,
          "aplicada_em" timestamptz NOT NULL DEFAULT now(),
          "baseline" boolean NOT NULL DEFAULT false
        )
      `;

      const registradas = await sql<{ arquivo: string }[]>`
        SELECT "arquivo" FROM "_migracoes_aplicadas"
      `;
      const aplicadas = new Set(registradas.map((r) => r.arquivo));
      resultado.jaAplicadas = aplicadas.size;

      for (const arquivo of arquivos) {
        if (aplicadas.has(arquivo)) continue;

        const numero = numeroDoArquivo(arquivo);
        const ehBaseline = numero !== null && numero <= baseline;

        if (ehBaseline) {
          await sql`
            INSERT INTO "_migracoes_aplicadas" ("arquivo", "baseline")
            VALUES (${arquivo}, true)
            ON CONFLICT ("arquivo") DO NOTHING
          `;
          resultado.registradasComoBaseline.push(arquivo);
          continue;
        }

        const conteudo = fs.readFileSync(path.join(pasta, arquivo), "utf8");

        // Guarda contra baseline errado: as migrações da era MySQL usam crase e
        // não rodam no Postgres. Melhor recusar com a causa do que estourar com
        // "syntax error at or near". Comentário com crase não conta — os nossos
        // citam `nextval` e afins.
        if (temCraseNoSql(conteudo)) {
          throw new Error(
            `${arquivo} é uma migração da era MySQL e não pode ser executada. ` +
              `Ajuste MIGRACAO_BASELINE (atual: ${baseline}) para incluí-la no baseline.`,
          );
        }

        console.log(`[migracoes] aplicando ${arquivo}`);

        await sql.begin(async (tx) => {
          await tx.unsafe(conteudo);
          await tx`
            INSERT INTO "_migracoes_aplicadas" ("arquivo") VALUES (${arquivo})
            ON CONFLICT ("arquivo") DO NOTHING
          `;
        });

        resultado.aplicadas.push(arquivo);
      }
    } finally {
      await sql`SELECT pg_advisory_unlock(${LOCK_ID})`;
    }

    if (resultado.registradasComoBaseline.length > 0) {
      console.log(
        `[migracoes] ${resultado.registradasComoBaseline.length} arquivo(s) marcados como baseline (<= ${baseline}), sem executar.`,
      );
    }
    console.log(
      resultado.aplicadas.length > 0
        ? `[migracoes] ${resultado.aplicadas.length} migração(ões) aplicada(s).`
        : "[migracoes] banco já estava atualizado.",
    );

    return resultado;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
