import { z } from "zod";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./notification";
import {
  adminProcedure,
  protectedOrFuncionarioProcedure,
  publicProcedure,
  router,
} from "./trpc";
import { getCatalogoVisivel, getModulosHabilitados } from "./modules";
import { condominios } from "../../drizzle/schema";
import { getDb } from "../db";

/** Limite defensivo: admin_master enxerga todos os tenants da base. */
const MAX_TENANTS_LISTADOS = 200;

export const systemRouter = router({
  /**
   * Estado inicial da sessão numa única chamada: organização ativa, módulos
   * liberados e vocabulário. O client usa isto para montar menu e rotas, em vez
   * de descobrir por tentativa e erro.
   *
   * Nunca lança por falta de organização: é o primeiro request da aplicação e
   * uma conta recém-criada ainda não tem condomínio. Nesse caso devolve
   * `tenant: null` e o client trata como "sem organização".
   */
  bootstrap: protectedOrFuncionarioProcedure.query(async ({ ctx }) => {
    const disponiveis = await ctx.tenant.ids();

    let condominioId: number;
    try {
      condominioId = await ctx.tenant.require();
    } catch {
      return {
        tenant: null,
        tenantsDisponiveis: [],
        modulosHabilitados: [] as string[],
        catalogo: [] as { id: string; nome: string; categoria: string }[],
        labels: {} as Record<string, string>,
      };
    }

    const db = await getDb();

    const [org] = db
      ? await db
          .select({
            id: condominios.id,
            nome: condominios.nome,
            segmento: condominios.segmento,
            labels: condominios.labels,
            logoUrl: condominios.logoUrl,
            corPrimaria: condominios.corPrimaria,
            corSecundaria: condominios.corSecundaria,
            temaPadrao: condominios.temaPadrao,
            layoutPadrao: condominios.layoutPadrao,
            modoEscuroPadrao: condominios.modoEscuroPadrao,
          })
          .from(condominios)
          .where(eq(condominios.id, condominioId))
          .limit(1)
      : [];

    const modulosHabilitados = await getModulosHabilitados(condominioId);

    return {
      tenant: {
        id: condominioId,
        nome: org?.nome ?? null,
        segmento: org?.segmento ?? "generico",
        logoUrl: org?.logoUrl ?? null,
        corPrimaria: org?.corPrimaria ?? null,
        corSecundaria: org?.corSecundaria ?? null,
        temaPadrao: org?.temaPadrao ?? null,
        layoutPadrao: org?.layoutPadrao ?? null,
        modoEscuroPadrao: org?.modoEscuroPadrao ?? false,
      },
      tenantsDisponiveis: disponiveis.slice(0, MAX_TENANTS_LISTADOS),
      modulosHabilitados,
      // Catálogo já filtrado: módulo restrito a outro cliente não vem aqui.
      catalogo: getCatalogoVisivel(condominioId).map((m) => ({
        id: m.id,
        nome: m.nome,
        categoria: m.categoria,
      })),
      // Sobrescrita de vocabulário: { "menu.inspections": "Inspeções de Solda" }
      labels: (org?.labels as Record<string, string> | null) ?? {},
    };
  }),

  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
