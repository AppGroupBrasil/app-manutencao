/**
 * Verificação de ownership: garante que o usuário logado responde pela
 * organização sendo acessada — como dono (`sindicoId`) ou por vínculo
 * explícito (`usuario_condominios`).
 *
 * Uso nos routers:
 *   await verifyCondominioOwnership(db, ctx.user.id, input.condominioId);
 */
import { and, eq } from "drizzle-orm";
import { condominios, usuarioCondominios } from "../../drizzle/schema";

/**
 * Verifica se o userId responde pela organização.
 * Lança erro se não responder (previne acesso cross-organização).
 */
export async function verifyCondominioOwnership(
  db: any,
  userId: number,
  condominioId: number
): Promise<void> {
  const [condominio] = await db
    .select({ sindicoId: condominios.sindicoId })
    .from(condominios)
    .where(eq(condominios.id, condominioId))
    .limit(1);

  if (!condominio) {
    throw new Error("Organização não encontrada");
  }

  if (condominio.sindicoId === userId) return;

  // Gestor de unidade não é dono da organização: o acesso dele vem do vínculo.
  const [vinculo] = await db
    .select({ id: usuarioCondominios.id })
    .from(usuarioCondominios)
    .where(
      and(
        eq(usuarioCondominios.userId, userId),
        eq(usuarioCondominios.condominioId, condominioId),
        eq(usuarioCondominios.ativo, true),
      ),
    )
    .limit(1);

  if (!vinculo) {
    throw new Error("Sem permissão para acessar dados desta organização");
  }
}

/**
 * Quem manda na configuração da organização: o dono (`sindicoId`) ou o gestor
 * com papel `chefe`.
 *
 * Não usa `users.hierarquia`: toda conta de cliente nasce no default
 * `funcionario` de propósito — elevar liberaria as rotas `hierarquia.*`, que
 * não têm escopo de organização. Antes disso, a checagem por hierarquia
 * bloqueava até o gestor-chefe de mexer nos próprios módulos.
 */
export async function podeAdministrarOrganizacao(
  db: any,
  userId: number,
  condominioId: number,
): Promise<boolean> {
  const [condominio] = await db
    .select({ sindicoId: condominios.sindicoId })
    .from(condominios)
    .where(eq(condominios.id, condominioId))
    .limit(1);

  if (condominio?.sindicoId === userId) return true;

  const [chefe] = await db
    .select({ id: usuarioCondominios.id })
    .from(usuarioCondominios)
    .where(
      and(
        eq(usuarioCondominios.userId, userId),
        eq(usuarioCondominios.condominioId, condominioId),
        eq(usuarioCondominios.papel, "chefe"),
        eq(usuarioCondominios.ativo, true),
      ),
    )
    .limit(1);

  return !!chefe;
}
