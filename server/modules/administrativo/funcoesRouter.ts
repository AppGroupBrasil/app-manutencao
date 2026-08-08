import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "../../_core/trpc";
import {
  getCatalogoVisivel,
  getModulosHabilitados,
  seedModulosDoTenant,
  setModuloHabilitado,
} from "../../_core/modules";
import { getUserHierarquiaNivel, HIERARQUIA_NIVEL } from "../../_core/trpc.types";
import { getDb } from "../../db";
import { podeAdministrarOrganizacao } from "../../_core/ownership";
import type { Segmento } from "../../../shared/modules/registry";

/**
 * Configuração de quais módulos cada organização enxerga.
 *
 * Duas mudanças em relação à versão anterior:
 *  - o catálogo é filtrado por tenant (módulo restrito a um cliente não aparece
 *    para os demais, nem na tela de configuração);
 *  - tenant sem registros NÃO significa mais "tudo habilitado" — cai no pacote
 *    padrão do segmento. Sem isso, todo módulo novo vazava para todos.
 */

/**
 * Admin interno (hierarquia) OU quem responde pela organização: dono ou gestor
 * `chefe`. Só a hierarquia não serve — conta de cliente fica no nível 1 de
 * propósito, e a regra antiga travava o gestor-chefe nos próprios módulos.
 */
async function podeConfigurarModulos(ctx: {
  user: { id: number; hierarquia?: string | null; role?: string | null } | null;
  condominioId: number;
}): Promise<boolean> {
  if (!ctx.user) return false;
  if (getUserHierarquiaNivel(ctx.user) >= HIERARQUIA_NIVEL.admin) return true;

  const db = await getDb();
  if (!db) return false;
  return podeAdministrarOrganizacao(db, ctx.user.id, ctx.condominioId);
}

async function exigirAdmin(ctx: {
  user: { id: number; hierarquia?: string | null; role?: string | null } | null;
  condominioId: number;
}) {
  if (!(await podeConfigurarModulos(ctx))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas o gestor-chefe ou o dono da organização altera módulos.",
    });
  }
}

export const funcoesCondominioRouter = router({
  /** A tela pergunta antes de mostrar os controles de ligar/desligar. */
  podeConfigurar: tenantProcedure
    .input(z.object({ condominioId: z.number().optional() }).optional())
    .query(({ ctx }) => podeConfigurarModulos(ctx)),

  // Catálogo visível para ESTE tenant
  listarDisponiveis: tenantProcedure
    .input(z.object({ condominioId: z.number().optional() }).optional())
    .query(({ ctx }) => {
      return getCatalogoVisivel(ctx.condominioId).map((m) => ({
        id: m.id,
        nome: m.nome,
        categoria: m.categoria,
        descricao: m.descricao,
      }));
    }),

  // Estado (ligado/desligado) de cada módulo do catálogo do tenant
  listar: tenantProcedure
    .input(z.object({ condominioId: z.number().optional() }).optional())
    .query(async ({ ctx }) => {
      const habilitados = new Set(await getModulosHabilitados(ctx.condominioId));
      return getCatalogoVisivel(ctx.condominioId).map((m) => ({
        condominioId: ctx.condominioId,
        funcaoId: m.id,
        habilitada: habilitados.has(m.id),
      }));
    }),

  // Apenas os IDs habilitados — consumido pelo menu
  listarHabilitadas: tenantProcedure
    .input(z.object({ condominioId: z.number().optional() }).optional())
    .query(async ({ ctx }) => {
      return getModulosHabilitados(ctx.condominioId);
    }),

  toggle: tenantProcedure
    .input(
      z.object({
        condominioId: z.number().optional(),
        funcaoId: z.string(),
        habilitada: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await exigirAdmin(ctx);
      await setModuloHabilitado(ctx.condominioId, input.funcaoId, input.habilitada);
      return { success: true, condominioId: ctx.condominioId, funcaoId: input.funcaoId, habilitada: input.habilitada };
    }),

  atualizarMultiplas: tenantProcedure
    .input(
      z.object({
        condominioId: z.number().optional(),
        funcoes: z.array(
          z.object({
            funcaoId: z.string(),
            habilitada: z.boolean(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await exigirAdmin(ctx);
      for (const funcao of input.funcoes) {
        await setModuloHabilitado(ctx.condominioId, funcao.funcaoId, funcao.habilitada);
      }
      return { success: true, updated: input.funcoes.length };
    }),

  // Grava o pacote padrão do segmento para o tenant
  inicializar: tenantProcedure
    .input(
      z.object({
        condominioId: z.number().optional(),
        segmento: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await exigirAdmin(ctx);
      const criados = await seedModulosDoTenant(
        ctx.condominioId,
        (input.segmento as Segmento) || undefined,
      );
      return { initialized: criados > 0, count: criados };
    }),
});
