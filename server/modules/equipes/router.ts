import { z } from "zod";
import { getDb } from "../../db";
import {
  condominios,
  equipes,
  equipeFuncionarios,
  equipeUnidades,
  funcionarios,
} from "../../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { moduloProcedure, moduloUserProcedure, router } from "../../_core/trpc";
import { unidadesDaConsulta, unidadesSelecionadas } from "../../_core/unidadesConsulta";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";

/**
 * Equipes de serviço: o time que recebe a O.S. designada.
 *
 * Diferente de "Equipe de Gestão" (síndico, conselho), que é o módulo `equipe`:
 * aqui são funcionários da unidade agrupados por frente de trabalho — elétrica,
 * hidráulica, jardinagem — e é o supervisor do grupo que recebe o aviso quando
 * a ordem é designada.
 *
 * O router é antigo e vinha sem escopo: qualquer autenticado listava e alterava
 * equipe de qualquer organização passando o id no input. Agora cada id é
 * validado contra as organizações da identidade autenticada.
 */
const escopoEquipes = escopoPorRegistro(
  {
    id: direto(equipes),
    equipeId: direto(equipes),
    funcionarioId: direto(funcionarios),
  },
  {
    // Aqui `funcionarioIds` é uma lista; o mapa por campo não a cobre, e a
    // checagem fica na própria rota.
    addMembros: { equipeId: direto(equipes) },
    removeMembro: { equipeId: direto(equipes), funcionarioId: direto(funcionarios) },
  },
);

/**
 * Consulta: o portal do funcionário também precisa, porque a tela da O.S. é a
 * mesma dos dois lados e mostra a equipe designada. Só usuário quebraria o
 * portal com UNAUTHORIZED.
 */
const equipeConsulta = moduloProcedure("equipes", escopoEquipes);

/** Montar e desfazer equipe é decisão de quem responde pela organização. */
const equipeProcedure = moduloUserProcedure("equipes", escopoEquipes);

/**
 * Unidades que a equipe vai atender, conferidas uma a uma contra o alcance de
 * quem chamou.
 *
 * A lista chega crua do input e o mapa de escopo por registro não cobre array:
 * sem esta volta, dava para marcar a unidade de outro cliente e a equipe
 * apareceria na O.S. dele.
 */
async function unidadesDaEquipe(
  ctx: { tenant: { assert: (id: number) => Promise<void> } },
  donaId: number,
  pedidas: number[] | undefined,
): Promise<number[]> {
  // A unidade dona sempre entra: equipe que não atende ninguém não aparece em
  // lugar nenhum e viraria cadastro fantasma.
  const ids = new Set<number>([donaId]);
  for (const id of pedidas ?? []) {
    if (!Number.isInteger(id) || id <= 0) continue;
    await ctx.tenant.assert(id);
    ids.add(id);
  }
  return [...ids];
}

/** Regrava as unidades atendidas, mexendo só no que mudou. */
async function gravarUnidades(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  equipeId: number,
  unidades: number[],
): Promise<void> {
  const atuais = await db
    .select({ condominioId: equipeUnidades.condominioId })
    .from(equipeUnidades)
    .where(eq(equipeUnidades.equipeId, equipeId));

  const tinha = new Set(atuais.map((u) => u.condominioId));
  const quer = new Set(unidades);

  const entrar = unidades.filter((id) => !tinha.has(id));
  const sair = [...tinha].filter((id) => !quer.has(id));

  if (entrar.length > 0) {
    await db
      .insert(equipeUnidades)
      .values(entrar.map((condominioId) => ({ equipeId, condominioId })));
  }

  if (sair.length > 0) {
    await db
      .delete(equipeUnidades)
      .where(and(eq(equipeUnidades.equipeId, equipeId), inArray(equipeUnidades.condominioId, sair)));
  }
}

export const equipesRouter = router({
  /** Equipes ativas da organização, com a contagem de membros. */
  list: equipeConsulta
    .input(
      z
        .object({
          condominioId: z.number().optional(),
          /** Unidades marcadas na tela: a equipe é da unidade, não da rede. */
          unidades: unidadesSelecionadas,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const alvo = await unidadesDaConsulta(ctx, input ?? {}, "equipes");

      // Pelas unidades atendidas, e não pela unidade dona: é o que faz a equipe
      // de rede aparecer na O.S. de cada unidade que ela cobre. `DISTINCT`
      // porque a equipe que atende três unidades marcadas casaria três vezes.
      const lista = await db
        .selectDistinct({
          id: equipes.id,
          condominioId: equipes.condominioId,
          nome: equipes.nome,
          descricao: equipes.descricao,
          cor: equipes.cor,
          createdAt: equipes.createdAt,
          totalMembros: sql<number>`(
            SELECT COUNT(*) FROM "equipe_funcionarios" ef
            WHERE ef."equipeId" = ${equipes.id}
          )`,
          /** Em quantas unidades ela atende: é o que distingue rede de unidade. */
          totalUnidades: sql<number>`(
            SELECT COUNT(*) FROM "equipe_unidades" eu
            WHERE eu."equipeId" = ${equipes.id}
          )`,
        })
        .from(equipes)
        .innerJoin(equipeUnidades, eq(equipeUnidades.equipeId, equipes.id))
        .where(and(inArray(equipeUnidades.condominioId, alvo), eq(equipes.ativo, true)))
        .orderBy(equipes.nome);

      // Nome da unidade só quando a lista soma várias: é o que separa a
      // "Elétrica" de uma unidade da "Elétrica" da outra. Equipe que atende
      // mais de uma fica sem nome de unidade — quem descreve essa é a
      // contagem, e um nome só mentiria sobre as outras.
      if (alvo.length < 2 || lista.length === 0) {
        return lista.map((e) => ({ ...e, unidadeNome: null as string | null }));
      }

      const unidades = await db
        .select({ id: condominios.id, nome: condominios.nome })
        .from(condominios)
        .where(inArray(condominios.id, alvo));
      const nomes = new Map(unidades.map((u) => [u.id, u.nome]));

      return lista.map((e) => ({
        ...e,
        unidadeNome: Number(e.totalUnidades) > 1 ? null : nomes.get(e.condominioId) ?? null,
      }));
    }),

  /**
   * Equipes de cada funcionário, para a tela de Funcionários.
   *
   * Uma consulta para a lista inteira: perguntar equipe por equipe deixaria a
   * tela com uma chamada por pessoa só para desenhar as etiquetas.
   */
  porFuncionario: equipeConsulta
    .input(
      z.object({
        condominioId: z.number().optional(),
        unidades: unidadesSelecionadas,
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const alvo = await unidadesDaConsulta(ctx, input, "equipes");

      return db
        .select({
          funcionarioId: equipeFuncionarios.funcionarioId,
          equipeId: equipes.id,
          nome: equipes.nome,
          cor: equipes.cor,
        })
        .from(equipeFuncionarios)
        .innerJoin(equipes, eq(equipes.id, equipeFuncionarios.equipeId))
        // Pelas unidades atendidas: o funcionário de São José pode estar numa
        // equipe de rede cuja unidade dona é outra, e pela coluna dona a
        // etiqueta dele sumiria da tela.
        .innerJoin(equipeUnidades, eq(equipeUnidades.equipeId, equipes.id))
        .where(and(inArray(equipeUnidades.condominioId, alvo), eq(equipes.ativo, true)))
        .groupBy(equipeFuncionarios.funcionarioId, equipes.id, equipes.nome, equipes.cor);
    }),

  /**
   * Equipes de um funcionário, gravadas de uma vez pela ficha dele.
   *
   * O caminho antigo era o contrário: abrir a equipe e procurar a pessoa na
   * lista. Quem acabou de cadastrar alguém quer dizer ali mesmo de que time ele
   * é — e criar equipe, criar pessoa e juntar as duas viravam três telas.
   */
  definirDoFuncionario: equipeProcedure
    .input(
      z.object({
        /**
         * Unidade do funcionário, para o portão da função olhar a unidade
         * certa. Sem ela, a checagem recai na unidade ativa da tela — e mexer
         * na equipe de quem é de outra unidade voltaria "função não disponível"
         * quando a ativa não tem equipes ligadas.
         */
        condominioId: z.number().optional(),
        funcionarioId: z.number(),
        equipeIds: z.array(z.number()).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const [funcionario] = await db
        .select({ condominioId: funcionarios.condominioId })
        .from(funcionarios)
        .where(eq(funcionarios.id, input.funcionarioId))
        .limit(1);

      if (!funcionario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Funcionário não encontrado." });
      }

      // A equipe tem de atender a unidade da pessoa: sem esta trava, a ficha
      // viraria um caminho para pendurar alguém no time da unidade vizinha.
      // Atender, e não pertencer: a equipe de rede atende a unidade dela sem
      // ser dona de nenhuma em particular.
      const daUnidade = input.equipeIds.length
        ? await db
            .selectDistinct({ id: equipes.id })
            .from(equipes)
            .innerJoin(equipeUnidades, eq(equipeUnidades.equipeId, equipes.id))
            .where(
              and(
                inArray(equipes.id, input.equipeIds),
                eq(equipeUnidades.condominioId, funcionario.condominioId),
                eq(equipes.ativo, true),
              ),
            )
        : [];

      if (daUnidade.length !== input.equipeIds.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Só é possível usar equipes que atendem a unidade do funcionário.",
        });
      }

      // O que ele já tem NAS equipes que atendem a unidade dele. O recorte
      // importa: gravar a lista da ficha não pode desfazer vínculo de equipe
      // que a tela nem ofereceu.
      const atuais = await db
        .selectDistinct({ equipeId: equipeFuncionarios.equipeId })
        .from(equipeFuncionarios)
        .innerJoin(equipes, eq(equipes.id, equipeFuncionarios.equipeId))
        .innerJoin(equipeUnidades, eq(equipeUnidades.equipeId, equipes.id))
        .where(
          and(
            eq(equipeFuncionarios.funcionarioId, input.funcionarioId),
            eq(equipeUnidades.condominioId, funcionario.condominioId),
          ),
        );

      const tinha = new Set(atuais.map((a) => a.equipeId));
      const quer = new Set(input.equipeIds);

      const entrar = input.equipeIds.filter((id) => !tinha.has(id));
      const sair = [...tinha].filter((id) => !quer.has(id));

      if (entrar.length > 0) {
        await db
          .insert(equipeFuncionarios)
          .values(entrar.map((equipeId) => ({ equipeId, funcionarioId: input.funcionarioId })));
      }

      if (sair.length > 0) {
        await db
          .delete(equipeFuncionarios)
          .where(
            and(
              eq(equipeFuncionarios.funcionarioId, input.funcionarioId),
              inArray(equipeFuncionarios.equipeId, sair),
            ),
          );
      }

      return { entrou: entrar.length, saiu: sair.length };
    }),

  create: equipeProcedure
    .input(
      z.object({
        condominioId: z.number().optional(),
        nome: z.string().min(1).max(255),
        descricao: z.string().optional(),
        cor: z.string().optional(),
        /**
         * Unidades que a equipe atende. Vazio é "só a unidade em que ela
         * nasceu", que é como toda equipe funcionava antes de existir equipe
         * de rede.
         */
        unidades: z.array(z.number().int().positive()).max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const unidades = await unidadesDaEquipe(ctx, ctx.condominioId, input.unidades);

      const [result] = await db
        .insert(equipes)
        .values({
          condominioId: ctx.condominioId,
          nome: input.nome,
          descricao: input.descricao || null,
          cor: input.cor || "#3b82f6",
        })
        .returning();

      await gravarUnidades(db, result.id, unidades);

      return { id: result.id };
    }),

  update: equipeProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).max(255).optional(),
        descricao: z.string().optional(),
        cor: z.string().optional(),
        /** Ausente não mexe nas unidades; presente troca a lista inteira. */
        unidades: z.array(z.number().int().positive()).max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const { id, unidades: pedidas, ...dados } = input;
      await db.update(equipes).set({ ...dados, updatedAt: new Date() }).where(eq(equipes.id, id));

      if (pedidas) {
        // A dona entra sempre, e é a da própria equipe — não a da tela, que
        // pode ser outra unidade da rede.
        const [dona] = await db
          .select({ condominioId: equipes.condominioId })
          .from(equipes)
          .where(eq(equipes.id, id))
          .limit(1);

        if (!dona) throw new TRPCError({ code: "NOT_FOUND", message: "Equipe não encontrada." });

        await gravarUnidades(db, id, await unidadesDaEquipe(ctx, dona.condominioId, pedidas));
      }

      return { ok: true };
    }),

  /** Unidades que a equipe atende hoje, para a tela abrir marcada. */
  unidades: equipeConsulta
    .input(z.object({ equipeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const linhas = await db
        .select({ condominioId: equipeUnidades.condominioId })
        .from(equipeUnidades)
        .where(eq(equipeUnidades.equipeId, input.equipeId));

      return linhas.map((l) => l.condominioId);
    }),

  /** Desativa a equipe. A O.S. já designada guarda o vínculo e o histórico. */
  delete: equipeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db
        .update(equipes)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(equipes.id, input.id));
      return { ok: true };
    }),

  membros: equipeConsulta
    .input(z.object({ equipeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: equipeFuncionarios.id,
          funcionarioId: funcionarios.id,
          nome: funcionarios.nome,
          cargo: funcionarios.cargo,
          telefone: funcionarios.telefone,
          fotoUrl: funcionarios.fotoUrl,
          tipoFuncionario: funcionarios.tipoFuncionario,
        })
        .from(equipeFuncionarios)
        .innerJoin(funcionarios, eq(equipeFuncionarios.funcionarioId, funcionarios.id))
        .where(eq(equipeFuncionarios.equipeId, input.equipeId))
        .orderBy(funcionarios.nome);
    }),

  addMembros: equipeProcedure
    .input(
      z.object({
        equipeId: z.number(),
        funcionarioIds: z.array(z.number()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Lista de ids não passa pelo mapa de escopo: sem esta conferência daria
      // para pendurar funcionário de outra organização na equipe. O recorte é
      // pelas unidades que a equipe atende — a de rede monta o time com gente
      // de várias, e exigir a unidade da tela deixaria metade de fora.
      const unidadesAtendidas = await db
        .select({ condominioId: equipeUnidades.condominioId })
        .from(equipeUnidades)
        .where(eq(equipeUnidades.equipeId, input.equipeId));

      const alcance = unidadesAtendidas.map((u) => u.condominioId);
      if (alcance.length === 0) alcance.push(ctx.condominioId);

      const daOrganizacao = await db
        .select({ id: funcionarios.id })
        .from(funcionarios)
        .where(
          and(
            inArray(funcionarios.id, input.funcionarioIds),
            inArray(funcionarios.condominioId, alcance),
          ),
        );

      if (daOrganizacao.length !== input.funcionarioIds.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Só é possível montar a equipe com funcionários das unidades que ela atende.",
        });
      }

      const existentes = await db
        .select({ funcionarioId: equipeFuncionarios.funcionarioId })
        .from(equipeFuncionarios)
        .where(eq(equipeFuncionarios.equipeId, input.equipeId));

      const jaEstao = new Set(existentes.map((e) => e.funcionarioId));
      const novos = input.funcionarioIds.filter((id) => !jaEstao.has(id));

      if (novos.length > 0) {
        await db
          .insert(equipeFuncionarios)
          .values(novos.map((funcionarioId) => ({ equipeId: input.equipeId, funcionarioId })));
      }

      return { added: novos.length };
    }),

  removeMembro: equipeProcedure
    .input(
      z.object({
        equipeId: z.number(),
        funcionarioId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db
        .delete(equipeFuncionarios)
        .where(
          and(
            eq(equipeFuncionarios.equipeId, input.equipeId),
            eq(equipeFuncionarios.funcionarioId, input.funcionarioId),
          ),
        );
      return { ok: true };
    }),
});
