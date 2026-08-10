import { and, eq } from "drizzle-orm";
import { condominios, usuarioCondominios } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Quem é "master": dono de alguma organização ou gestor-chefe.
 *
 * É a única conta que enxerga a rede inteira — os demais gestores só veem a si
 * mesmos e a equipe que cadastraram. Vive aqui, e não dentro de um módulo,
 * porque a regra vale para gestores e para funcionários; duas cópias sairiam
 * do lugar na primeira alteração.
 */
export async function ehGestorMaster(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [dono] = await db
    .select({ id: condominios.id })
    .from(condominios)
    .where(eq(condominios.sindicoId, userId))
    .limit(1);
  if (dono) return true;

  const [chefe] = await db
    .select({ id: usuarioCondominios.id })
    .from(usuarioCondominios)
    .where(and(eq(usuarioCondominios.userId, userId), eq(usuarioCondominios.papel, "chefe")))
    .limit(1);

  return !!chefe;
}
