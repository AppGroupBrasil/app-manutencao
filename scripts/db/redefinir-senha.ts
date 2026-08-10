/**
 * Redefine a senha de uma conta de gestor.
 *
 * Senha não se recupera: o banco guarda um hash bcrypt, que é de mão única.
 * Quando alguém perde o acesso, o único caminho é gravar uma senha nova — e é
 * isto que este script faz, sem tocar em hierarquia, papel ou vínculo de
 * unidade.
 *
 * A senha entra como **provisória**: serve para o primeiro acesso e o sistema
 * obriga a troca na hora. Assim a senha combinada por telefone não vira senha
 * definitiva.
 *
 *   pnpm db:redefinir-senha email@dominio.com 123456
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../server/db";
import { users } from "../../drizzle/schema";

async function main() {
  const [emailBruto, senha] = process.argv.slice(2);

  if (!emailBruto || !senha) {
    throw new Error("Uso: pnpm db:redefinir-senha email@dominio.com <senha>");
  }
  // A tela de definição de senha do sistema exige seis dígitos; manter o mesmo
  // formato evita entregar uma senha que a própria tela recusa depois.
  if (!/^\d{6}$/.test(senha)) {
    throw new Error("A senha provisória precisa ter exatamente 6 dígitos.");
  }

  const db = await getDb();
  if (!db) throw new Error("Banco indisponível — confira DATABASE_URL.");

  const email = emailBruto.trim().toLowerCase();

  const [conta] = await db
    .select({
      id: users.id,
      nome: users.name,
      hierarquia: users.hierarquia,
      bloqueado: users.bloqueado,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!conta) throw new Error(`Não existe conta com o e-mail ${email}.`);

  const bcrypt = await import("bcryptjs");
  const senhaHash = await bcrypt.hash(senha, 10);

  await db
    .update(users)
    .set({
      senha: senhaHash,
      senhaProvisoria: true,
      loginMethod: "local",
      // Conta bloqueada por tentativa errada volta a poder entrar.
      bloqueado: false,
      motivoBloqueio: null,
    })
    .where(eq(users.id, conta.id));

  console.log(
    `Senha redefinida para ${conta.nome ?? email} (#${conta.id}). ` +
      `Ele entra com a senha provisória e o sistema pede a troca no primeiro acesso.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
