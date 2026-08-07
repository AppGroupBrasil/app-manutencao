/**
 * Helpers de hierarquia isolados de `trpc.ts`.
 *
 * Vivem aqui para que `tenant.ts` e `modules.ts` possam usá-los sem criar
 * ciclo de importação com o inicializador do tRPC.
 */

// Hierarquia numérica: admin_master(4) > admin(3) > responsavel(2) > funcionario(1)
export const HIERARQUIA_NIVEL: Record<string, number> = {
  admin_master: 4,
  admin: 3,
  responsavel: 2,
  funcionario: 1,
};

/** Retorna o nível hierárquico do usuário (usa campo hierarquia, com fallback para role) */
export function getUserHierarquiaNivel(user: {
  hierarquia?: string | null;
  role?: string | null;
}): number {
  if (user.hierarquia && HIERARQUIA_NIVEL[user.hierarquia]) {
    return HIERARQUIA_NIVEL[user.hierarquia];
  }
  // Fallback: mapear role legado
  const roleMap: Record<string, string> = {
    master: 'admin_master',
    admin: 'admin',
    sindico: 'admin',
    user: 'funcionario',
    morador: 'funcionario',
  };
  const mapped = roleMap[user.role || ''] || 'funcionario';
  return HIERARQUIA_NIVEL[mapped] || 1;
}
