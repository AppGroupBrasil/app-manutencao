/**
 * Identidade de quem fez a ação, para registro em timelines e históricos.
 *
 * Existe porque as rotas de módulo aceitam usuário (síndico/admin) ou
 * funcionário, e as colunas `userId` apontam para `users`. Gravar o id de um
 * funcionário ali apontaria para o usuário errado — então funcionário entra
 * com `userId: null` e o nome preservado.
 */
import type { Funcionario, User } from '../../drizzle/schema';

export interface Autor {
  userId: number | null;
  nome: string;
}

export function autorDaRequisicao(ctx: {
  user: User | null;
  funcionario: Funcionario | null;
}): Autor {
  if (ctx.user) {
    return { userId: ctx.user.id, nome: ctx.user.name || 'Usuário' };
  }
  if (ctx.funcionario) {
    return { userId: null, nome: ctx.funcionario.nome };
  }
  return { userId: null, nome: 'Sistema' };
}
