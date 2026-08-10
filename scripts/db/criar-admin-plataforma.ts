/**
 * Cria (ou promove) a conta de dono da plataforma.
 *
 * É a única conta com hierarquia `admin_master`, a que enxerga a base inteira
 * e a única que pode abrir cliente novo. Fica fora da interface de propósito:
 * conta que vê todos os clientes não se cria por tela, senão vira alvo.
 *
 *   pnpm db:admin-plataforma "Nome" email@dominio.com "senha-forte"
 *
 * Rodar de novo com o mesmo e-mail promove a conta existente e troca a senha.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../server/db";
import { users } from "../../drizzle/schema";

async function main() {
  const [nome, email, senha] = process.argv.slice(2);

  if (!nome || !email || !senha) {
    throw new Error(
      'Uso: pnpm db:admin-plataforma "Nome" email@dominio.com "senha"',
    );
  }
  if (senha.length < 12) {
    throw new Error("A senha da conta de plataforma precisa de ao menos 12 caracteres.");
  }

  const db = await getDb();
  if (!db) throw new Error("Banco indisponível — confira DATABASE_URL.");

  const bcrypt = await import("bcryptjs");
  const crypto = await import("node:crypto");
  const senhaHash = await bcrypt.hash(senha, 10);
  const alvo = email.trim().toLowerCase();

  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, alvo))
    .limit(1);

  if (existente) {
    await db
      .update(users)
      .set({
        name: nome,
        senha: senhaHash,
        role: "master",
        hierarquia: "admin_master",
        // A conta da plataforma não passa pela tela de senha provisória.
        senhaProvisoria: false,
        loginMethod: "local",
      })
      .where(eq(users.id, existente.id));

    console.log(`Conta #${existente.id} (${alvo}) promovida a admin_master.`);
    return;
  }

  const [nova] = await db
    .insert(users)
    .values({
      openId: `local_${crypto.randomBytes(16).toString("hex")}`,
      name: nome,
      email: alvo,
      senha: senhaHash,
      loginMethod: "local",
      role: "master",
      hierarquia: "admin_master",
      senhaProvisoria: false,
      lastSignedIn: new Date(),
    })
    .returning({ id: users.id });

  console.log(`Conta de plataforma criada: #${nova.id} (${alvo}).`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
