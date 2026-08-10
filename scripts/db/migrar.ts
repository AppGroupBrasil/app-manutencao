/**
 * Passo de pré-voo do deploy: confere o ambiente e aplica as migrações
 * pendentes, num container descartável, antes de trocar a versão no ar.
 *
 * Falhar aqui é o comportamento desejado: o deploy para com a versão antiga
 * ainda servindo. Também roda a mão, com `pnpm db:migrar`.
 */
import { aplicarMigracoesPendentes } from "../../server/_core/migracoes";

/**
 * Variáveis sem as quais o servidor se recusa a subir.
 *
 * Confere aqui, antes da troca, para o deploy não morrer no `docker compose up`
 * com o site já fora do ar. `ENV` faz a validação completa ao ser importado — a
 * lista abaixo existe só para a mensagem sair legível.
 */
function conferirAmbiente(): void {
  if (process.env.NODE_ENV !== "production") return;

  const faltando: string[] = [];
  if (!process.env.DATABASE_URL) faltando.push("DATABASE_URL");
  if (!process.env.CRON_SECRET) faltando.push("CRON_SECRET");

  const jwt = process.env.JWT_SECRET ?? "";
  if (jwt.length < 32) {
    faltando.push("JWT_SECRET (mínimo de 32 caracteres)");
  }

  if (faltando.length > 0) {
    throw new Error(
      `Faltam variáveis de ambiente em produção: ${faltando.join(", ")}. ` +
        `Ajuste o .env do servidor antes de publicar.`,
    );
  }
}

async function main() {
  conferirAmbiente();

  // Importado depois da conferência, para a mensagem acima aparecer primeiro:
  // `ENV` lança no import quando alguma variável obrigatória está errada.
  await import("../../server/_core/env");

  const resultado = await aplicarMigracoesPendentes();
  console.log(
    `Pendentes aplicadas: ${resultado.aplicadas.length} | já registradas: ${resultado.jaAplicadas}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("Falha no pré-voo:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
