import { TRPCError } from "@trpc/server";
import { ehGestorMaster } from "./gestorMaster";
import { getUserHierarquiaNivel, HIERARQUIA_NIVEL } from "./trpc.types";

/**
 * Quem programa a execução: designa a equipe e marca o dia do serviço.
 *
 * O cliente quis isso na mão de uma pessoa só — o gerente que responde pela
 * rede inteira. Os gestores de unidade continuam abrindo ordens, acompanhando
 * e corrigindo a data máxima; escalar equipe e dizer quando o serviço acontece
 * é dele. Por isso a regra não olha hierarquia (gestor de unidade e gerente são
 * ambos `admin`) e sim quem é dono ou chefe da organização.
 *
 * `OS_PROGRAMADORES` (e-mails separados por vírgula) abre exceção sem mexer no
 * código, para o caso de o gerente estar cadastrado como gestor comum.
 */
type UsuarioDoPedido = {
  id: number;
  email?: string | null;
  hierarquia?: string | null;
  role?: string | null;
} | null;

function autorizadosPorEmail(): string[] {
  return (process.env.OS_PROGRAMADORES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function ehProgramadorOs(ctx: { user: UsuarioDoPedido }): Promise<boolean> {
  const user = ctx.user;
  // Portal do funcionário: vê a agenda, não a distribui.
  if (!user) return false;
  if (getUserHierarquiaNivel(user) >= HIERARQUIA_NIVEL.admin_master) return true;

  const email = (user.email ?? "").trim().toLowerCase();
  if (email && autorizadosPorEmail().includes(email)) return true;

  return ehGestorMaster(user.id);
}

export async function exigirProgramadorOs(
  ctx: { user: UsuarioDoPedido },
  mensagem: string,
): Promise<void> {
  if (await ehProgramadorOs(ctx)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: mensagem });
}
