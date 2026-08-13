import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "../../_core/trpc";
import {
  getCatalogoVisivel,
  getModulosHabilitados,
  seedModulosDoTenant,
  setModuloHabilitado,
  setModulosHabilitados,
} from "../../_core/modules";
import { getUserHierarquiaNivel, HIERARQUIA_NIVEL } from "../../_core/trpc.types";
import { getDb } from "../../db";
import { podeAdministrarOrganizacao } from "../../_core/ownership";

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

  /**
   * Grava o mesmo conjunto de módulos em uma ou em várias organizações.
   *
   * `organizacoesIds` existe para rede de unidades: repetir a configuração 15
   * vezes trocando de organização no seletor é o tipo de trabalho que ninguém
   * termina igual. Cada alvo passa pelas duas checagens (pertence a quem chamou
   * e tem direito de configurar) ANTES de qualquer escrita — com uma unidade
   * fora do alcance, nada é gravado.
   */
  atualizarMultiplas: tenantProcedure
    .input(
      z.object({
        condominioId: z.number().optional(),
        organizacoesIds: z.array(z.number().int().positive()).optional(),
        funcoes: z.array(
          z.object({
            funcaoId: z.string(),
            habilitada: z.boolean(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const alvos = input.organizacoesIds?.length
        ? [...new Set(input.organizacoesIds)]
        : [ctx.condominioId];

      for (const condominioId of alvos) {
        await ctx.tenant.assert(condominioId);
        if (!(await podeConfigurarModulos({ user: ctx.user, condominioId }))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sem permissão para configurar os módulos de uma das organizações.",
          });
        }
      }

      for (const condominioId of alvos) {
        // Organização sem nenhuma linha gravada vive do pacote do segmento.
        // Gravar só as alterações desligaria em silêncio tudo que não veio na
        // lista, porque a partir da primeira linha o pacote deixa de valer.
        await seedModulosDoTenant(condominioId);
        await setModulosHabilitados(condominioId, input.funcoes);
      }

      return {
        success: true,
        updated: input.funcoes.length * alvos.length,
        organizacoes: alvos.length,
      };
    }),

  // Grava o pacote padrão para o tenant
  inicializar: tenantProcedure
    .input(z.object({ condominioId: z.number().optional() }).optional())
    .mutation(async ({ ctx }) => {
      await exigirAdmin(ctx);
      const criados = await seedModulosDoTenant(ctx.condominioId);
      return { initialized: criados > 0, count: criados };
    }),
});
