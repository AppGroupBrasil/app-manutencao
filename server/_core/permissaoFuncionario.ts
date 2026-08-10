import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { funcionarioFuncoes } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Permissão por funcionário, valendo no servidor.
 *
 * A tela do gestor grava em `funcionario_funcoes` o que cada pessoa vê e o que
 * pode criar. Sem esta checagem a permissão seria só desenho: bastava chamar a
 * rota direto para criar ou apagar registro de uma função desligada.
 *
 * Conta de gestor passa direto — a permissão existe para funcionário.
 * Sem linha gravada vale o padrão da tela: vê e cria.
 */
export async function assegurarPermissaoFuncionario(
  ctx: { funcionario: { id: number } | null },
  chaveFuncao: string,
  ehEscrita: boolean,
): Promise<void> {
  if (!ctx.funcionario) return;

  const db = await getDb();
  if (!db) return;

  const [permissao] = await db
    .select({
      habilitada: funcionarioFuncoes.habilitada,
      podeCriar: funcionarioFuncoes.podeCriar,
    })
    .from(funcionarioFuncoes)
    .where(
      and(
        eq(funcionarioFuncoes.funcionarioId, ctx.funcionario.id),
        eq(funcionarioFuncoes.funcaoKey, chaveFuncao),
      ),
    )
    .limit(1);

  if (!permissao) return;

  if (permissao.habilitada !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta função não está liberada para o seu acesso.",
    });
  }

  if (ehEscrita && permissao.podeCriar !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu acesso é apenas de consulta nesta função.",
    });
  }
}
