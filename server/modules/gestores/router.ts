import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { ehGestorMaster } from "../../_core/gestorMaster";
import { condominios, users, usuarioCondominios } from "../../../drizzle/schema";

/**
 * Gestores são contas de `users` ligadas a organizações por
 * `usuario_condominios` — o mesmo caminho que o seed da ASA usa. Não confundir
 * com `funcionarios`, que é quem executa a tarefa.
 *
 * Toda rota aqui é limitada às organizações que o solicitante alcança
 * (`ctx.tenant`), diferente de `hierarquia.*`, que compara só nível e enxerga a
 * base inteira.
 */

const PAPEIS = ["chefe", "gestor"] as const;

/** Conta nova nasce com senha para troca obrigatória no primeiro acesso. */
const SENHA_PADRAO = process.env.SENHA_PADRAO ?? "123456";

async function assertOrganizacoes(
  ctx: { tenant: { assert: (id: number) => Promise<void> } },
  ids: number[],
) {
  for (const id of ids) await ctx.tenant.assert(id);
}

/**
 * Só quem é dono de alguma organização ou tem papel `chefe` administra
 * gestores. Sem isto, o gestor de uma unidade poderia redefinir a senha do
 * gestor-chefe, que aparece na lista dele por estar vinculado à mesma unidade.
 */
async function assertPodeGerenciar(ctx: { user: { id: number } }) {
  if (!(await podeGerenciarGestores(ctx.user.id))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas o gestor-chefe ou o dono da organização administra gestores.",
    });
  }
}

const podeGerenciarGestores = ehGestorMaster;

export const gestoresRouter = router({
  /**
   * A tela usa isto para esconder o que o gestor de unidade não pode fazer.
   *
   * A conta da plataforma entra aqui mesmo sem ser dona de organização
   * nenhuma: sem isso, ela abria Organizações e Gestores sem os botões de
   * criar e excluir — as ações existiam e ficavam invisíveis justamente para
   * quem administra o sistema.
   */
  podeGerenciar: protectedProcedure.query(({ ctx }) =>
    ctx.tenant.isMaster() ? true : podeGerenciarGestores(ctx.user.id),
  ),

  /** Gestores das organizações que o solicitante alcança, com seus vínculos. */
  /**
   * Só o master vê a rede inteira. Gestor de unidade vê apenas a própria
   * conta — antes ele via os colegas da mesma unidade, inclusive a etiqueta
   * de senha provisória, que denuncia quem ainda está com a senha padrão.
   */
  listar: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const master = await ehGestorMaster(ctx.user.id);

    const idsOrg = await ctx.tenant.ids();
    if (idsOrg.length === 0) return [];

    const vinculos = await db
      .select({
        userId: usuarioCondominios.userId,
        condominioId: usuarioCondominios.condominioId,
        papel: usuarioCondominios.papel,
        ativo: usuarioCondominios.ativo,
        organizacao: condominios.nome,
      })
      .from(usuarioCondominios)
      .innerJoin(condominios, eq(condominios.id, usuarioCondominios.condominioId))
      .where(inArray(usuarioCondominios.condominioId, idsOrg));

    if (vinculos.length === 0) return [];

    const idsUsuarios = master
      ? [...new Set(vinculos.map((v) => v.userId))]
      : [ctx.user.id];
    const contas = await db
      .select({
        id: users.id,
        nome: users.name,
        email: users.email,
        telefone: users.phone,
        bloqueado: users.bloqueado,
        senhaProvisoria: users.senhaProvisoria,
        ultimoAcesso: users.lastSignedIn,
      })
      .from(users)
      .where(inArray(users.id, idsUsuarios));

    // Dono de organização: é o topo da hierarquia, e a tela o fixa em primeiro.
    const donos = await db
      .select({ sindicoId: condominios.sindicoId })
      .from(condominios)
      .where(inArray(condominios.id, idsOrg));
    const idsDonos = new Set(donos.map((d) => d.sindicoId).filter((id): id is number => !!id));

    const lista = contas.map((conta) => {
      const unidades = vinculos
        .filter((v) => v.userId === conta.id)
        .map((v) => ({
          id: v.condominioId,
          nome: v.organizacao,
          papel: v.papel,
          ativo: v.ativo,
        }));

      return {
        ...conta,
        unidades,
        // Master é dono da organização ou chefe: a conta que não pode ser
        // bloqueada nem removida, sob pena de ninguém mais administrar nada.
        master: idsDonos.has(conta.id) || unidades.some((u) => u.papel === "chefe"),
        dono: idsDonos.has(conta.id),
      };
    });

    // Ordem fixa: o master primeiro, depois em ordem alfabética. Sem isto a
    // lista sai na ordem do banco e o topo da hierarquia cai no meio.
    return lista.sort((a, b) => {
      if (a.dono !== b.dono) return a.dono ? -1 : 1;
      if (a.master !== b.master) return a.master ? -1 : 1;
      return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
    });
  }),

  criar: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        email: z.string().email(),
        telefone: z.string().optional(),
        papel: z.enum(PAPEIS).default("gestor"),
        organizacoesIds: z.array(z.number()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertPodeGerenciar(ctx);
      await assertOrganizacoes(ctx, input.organizacoesIds);

      const email = input.email.trim().toLowerCase();
      const [existente] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existente) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail." });
      }

      // `hierarquia` fica no default: elevar liberaria as rotas de hierarquia,
      // que não têm escopo de organização. Quem manda é o papel no vínculo.
      const [conta] = await db
        .insert(users)
        .values({
          openId: `local_${crypto.randomBytes(16).toString("hex")}`,
          email,
          name: input.nome.trim(),
          phone: input.telefone?.trim() || null,
          senha: await bcrypt.hash(SENHA_PADRAO, 10),
          loginMethod: "local",
          role: "sindico",
          tipoConta: "sindico",
          senhaProvisoria: true,
        })
        .returning({ id: users.id });

      await db.insert(usuarioCondominios).values(
        input.organizacoesIds.map((condominioId) => ({
          userId: conta.id,
          condominioId,
          papel: input.papel,
        })),
      );

      return { id: conta.id, senhaProvisoria: SENHA_PADRAO };
    }),

  atualizar: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        telefone: z.string().optional(),
        bloqueado: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertPodeGerenciar(ctx);
      await assertGestorAlcancavel(ctx, input.id);
      if (input.bloqueado === true) await assertNaoEhDono(input.id, "bloquear");

      // Mapeamento explícito: a coluna é `phone`, e um spread com `telefone`
      // não é rejeitado pelo TypeScript nem chega ao banco.
      const dados: { name?: string; phone?: string; bloqueado?: boolean } = {};
      if (input.nome !== undefined) dados.name = input.nome.trim();
      if (input.telefone !== undefined) dados.phone = input.telefone.trim();
      if (input.bloqueado !== undefined) dados.bloqueado = input.bloqueado;
      if (Object.keys(dados).length === 0) return { success: true };

      await db.update(users).set(dados).where(eq(users.id, input.id));
      return { success: true };
    }),

  /** Substitui os vínculos do gestor dentro do alcance de quem edita. */
  definirUnidades: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        papel: z.enum(PAPEIS).default("gestor"),
        organizacoesIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertPodeGerenciar(ctx);
      await assertGestorAlcancavel(ctx, input.id);
      await assertOrganizacoes(ctx, input.organizacoesIds);

      const idsOrg = await ctx.tenant.ids();
      // Transação: sem ela, uma falha no insert deixaria o gestor sem nenhum
      // vínculo — ou seja, sem acesso a nada.
      await db.transaction(async (tx) => {
        // Só mexe nas unidades que quem edita alcança: vínculo em outra
        // organização não é dele para remover.
        await tx
          .delete(usuarioCondominios)
          .where(
            and(
              eq(usuarioCondominios.userId, input.id),
              inArray(usuarioCondominios.condominioId, idsOrg),
            ),
          );

        if (input.organizacoesIds.length > 0) {
          await tx.insert(usuarioCondominios).values(
            input.organizacoesIds.map((condominioId) => ({
              userId: input.id,
              condominioId,
              papel: input.papel,
            })),
          );
        }
      });

      return { success: true };
    }),

  /** Redefine para a senha padrão e força a troca no próximo acesso. */
  resetarSenha: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertPodeGerenciar(ctx);
      await assertGestorAlcancavel(ctx, input.id);

      await db
        .update(users)
        .set({ senha: await bcrypt.hash(SENHA_PADRAO, 10), senhaProvisoria: true })
        .where(eq(users.id, input.id));

      return { senhaProvisoria: SENHA_PADRAO };
    }),

  /** Remove os vínculos; a conta some junto se não sobrar nenhuma unidade. */
  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertPodeGerenciar(ctx);
      await assertGestorAlcancavel(ctx, input.id);

      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode excluir a própria conta." });
      }
      await assertNaoEhDono(input.id, "remover");

      const idsOrg = await ctx.tenant.ids();
      await db
        .delete(usuarioCondominios)
        .where(
          and(
            eq(usuarioCondominios.userId, input.id),
            inArray(usuarioCondominios.condominioId, idsOrg),
          ),
        );

      const restantes = await db
        .select({ id: usuarioCondominios.id })
        .from(usuarioCondominios)
        .where(eq(usuarioCondominios.userId, input.id))
        .limit(1);

      // Conta dona de organização não é apagada: apagaria o `sindicoId` de quem
      // ainda tem unidade fora do alcance de quem está editando.
      const [dono] = await db
        .select({ id: condominios.id })
        .from(condominios)
        .where(eq(condominios.sindicoId, input.id))
        .limit(1);

      if (restantes.length === 0 && !dono) {
        try {
          await db.delete(users).where(eq(users.id, input.id));
          return { contaExcluida: true };
        } catch (erro) {
          // A conta assina manutenções, OS e outros registros. Apagar quebraria
          // a FK; o vínculo já saiu, então o acesso está cortado de qualquer forma.
          const codigo =
            (erro as { code?: string }).code ??
            (erro as { cause?: { code?: string } }).cause?.code;
          if (codigo === "23503") return { contaExcluida: false };
          throw erro;
        }
      }

      return { contaExcluida: false };
    }),
});

/**
 * Dono da organização não se bloqueia nem se remove.
 *
 * É a conta no topo da hierarquia: sem ela ninguém mais cria gestor, redefine
 * senha ou abre unidade — e o estrago só se desfaz direto no banco.
 */
async function assertNaoEhDono(userId: number, acao: "bloquear" | "remover") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [dono] = await db
    .select({ id: condominios.id })
    .from(condominios)
    .where(eq(condominios.sindicoId, userId))
    .limit(1);

  if (dono) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Não é possível ${acao} o gestor master da organização.`,
    });
  }
}

/** Só é editável quem tem vínculo com alguma organização do solicitante. */
async function assertGestorAlcancavel(
  ctx: { tenant: { ids: () => Promise<number[]> } },
  userId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const idsOrg = await ctx.tenant.ids();
  if (idsOrg.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Sem organização." });

  const [vinculo] = await db
    .select({ id: usuarioCondominios.id })
    .from(usuarioCondominios)
    .where(
      and(eq(usuarioCondominios.userId, userId), inArray(usuarioCondominios.condominioId, idsOrg)),
    )
    .limit(1);

  if (!vinculo) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gestor fora do seu alcance." });
  }
}
