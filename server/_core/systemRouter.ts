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
import { camposOcultosDaUnidade } from "./camposOcultosOs";

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
        // Sem organização não há o que esconder: nada é ocultado por falta de
        // resposta, que é o mesmo critério dos módulos aqui em cima.
        camposOcultosOs: [] as string[],
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

    /**
     * Blocos da O.S. que este cliente escondeu.
     *
     * Vem no bootstrap pelo mesmo motivo de `labels`: é configuração do
     * cliente, lida por várias telas, e o bootstrap já carrega antes delas.
     * Consultado por tela, o campo escondido aparecia por um instante em cada
     * carregamento — piscando justamente o que o cliente mandou tirar.
     *
     * Serve para qualquer unidade dele: a gravação replica a mesma lista em
     * todas. E não exige o módulo de ordens de serviço, o que faz o calendário
     * do painel — que soma vencimentos, checklists e vistorias — poder obedecer
     * sem consultar uma rota que recusaria quem não tem O.S.
     */
    return {
      camposOcultosOs: await camposOcultosDaUnidade(condominioId),
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
