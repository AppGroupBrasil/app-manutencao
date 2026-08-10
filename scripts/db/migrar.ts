/**
 * Aplica as migrações pendentes por fora do servidor.
 *
 * O app já faz isso ao subir; este script existe para rodar a mão (deploy
 * manual, banco de teste, conferência antes de publicar):
 *
 *   pnpm db:migrar
 */
import { aplicarMigracoesPendentes } from "../../server/_core/migracoes";

aplicarMigracoesPendentes()
  .then((resultado) => {
    console.log(
      `Pendentes aplicadas: ${resultado.aplicadas.length} | já registradas: ${resultado.jaAplicadas}`,
    );
    process.exit(0);
  })
  .catch((erro) => {
    console.error("Falha ao migrar:", erro);
    process.exit(1);
  });
