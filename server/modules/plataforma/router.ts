/**
 * Operações de dono da plataforma — abrir cliente novo.
 *
 * Cliente aqui não é uma tabela: é um conjunto de unidades com um gestor-chefe
 * responsável por todas. O que separa um cliente do outro é o mesmo mecanismo
 * que já separa as unidades da ASA entre si — `sindicoId` mais o vínculo
 * `usuario_condominios.papel = 'chefe'`. Por isso não há entidade nova: o
 * isolamento que já existe passa a valer entre clientes de graça.
 *
 * Regra que não se quebra: o gestor do cliente **nunca** recebe hierarquia de
 * plataforma (`admin_master`), que enxergaria a base inteira. Ele manda na
 * rede dele porque é dono das unidades dele, e só.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  condominios,
  funcionarioAcessos,
  usuarioAcessos,
  usuarioCondominios,
  users,
} from "../../../drizzle/schema";
import { prepararUnidade } from "../../_core/seedUnidade";
import { SEGMENTOS_VALIDOS } from "../../../shared/modules/registry";
import { labelsDoSegmento } from "../../../shared/vocabulario";
import { invalidarCacheTeste } from "../../_core/teste";

/**
 * O alvo é mesmo um cliente?
 *
 * As rotas abaixo recebem um id de usuário. Sem esta conferência, um id errado
 * — digitado, copiado ou vindo de uma tela desatualizada — bloquearia ou
 * apagaria a conta da própria plataforma, e o caminho de volta seria pelo
 * banco. Cliente é quem é dono de pelo menos uma organização.
 */
async function exigirCliente(gestorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [conta] = await db
    .select({ hierarquia: users.hierarquia })
    .from(users)
    .where(eq(users.id, gestorId))
    .limit(1);

  if (!conta) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
  }
  if (conta.hierarquia === "admin_master") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta é uma conta da plataforma, não um cliente.",
    });
  }

  const [organizacao] = await db
    .select({ id: condominios.id })
    .from(condominios)
    .where(eq(condominios.sindicoId, gestorId))
    .limit(1);

  if (!organizacao) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Esta conta não é dona de nenhuma organização.",
    });
  }
}

/** Só a conta da plataforma abre cliente. */
const plataformaProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.tenant.isMaster()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas a conta da plataforma pode abrir um cliente.",
    });
  }
  return next({ ctx });
});

export const plataformaRouter = router({
  /**
   * Abre um cliente: unidades + gestor-chefe, numa transação.
   *
   * A senha entra como provisória: o gestor é obrigado a trocá-la no primeiro
   * acesso, então ela pode ser combinada por telefone sem virar senha eterna.
   */
  abrirCliente: plataformaProcedure
    .input(
      z.object({
        segmento: z.enum(SEGMENTOS_VALIDOS),
        unidades: z.array(z.string().min(1).max(255)).min(1).max(50),
        gestor: z.object({
          nome: z.string().min(2).max(255),
          email: z.string().email(),
          senhaProvisoria: z.string().min(6).max(72),
          telefone: z.string().max(30).optional(),
        }),
        /** Sobrescreve o vocabulário do cliente ("unidade" -> "filial", etc.). */
        labels: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const email = input.gestor.email.trim().toLowerCase();

      const [existente] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma conta com este e-mail.",
        });
      }

      const bcrypt = await import("bcryptjs");
      const crypto = await import("node:crypto");
      const senhaHash = await bcrypt.hash(input.gestor.senhaProvisoria, 10);

      const criado = await db.transaction(async (tx) => {
        const [gestor] = await tx
          .insert(users)
          .values({
            openId: `local_${crypto.randomBytes(16).toString("hex")}`,
            name: input.gestor.nome.trim(),
            email,
            senha: senhaHash,
            phone: input.gestor.telefone?.trim() || null,
            loginMethod: "local",
            // Mesmo molde do gestor-chefe que já está em produção: o poder vem
            // de ser dono das unidades, não da hierarquia.
            role: "sindico",
            hierarquia: "funcionario",
            senhaProvisoria: true,
            lastSignedIn: new Date(),
          })
          .returning({ id: users.id, nome: users.name, email: users.email });

        const unidades: { id: number; nome: string }[] = [];

        for (const nome of input.unidades) {
          const [unidade] = await tx
            .insert(condominios)
            .values({
              nome: nome.trim(),
              sindicoId: gestor.id,
              segmento: input.segmento,
              // O preset do segmento entra por baixo do que a plataforma
              // digitou: quem abre o cliente pode ajustar tudo, mas ninguém
              // precisa lembrar de traduzir "unidade" em toda abertura.
              labels: { ...labelsDoSegmento(input.segmento), ...(input.labels ?? {}) },
            })
            .returning({ id: condominios.id, nome: condominios.nome });

          await tx.insert(usuarioCondominios).values({
            userId: gestor.id,
            condominioId: unidade.id,
            papel: "chefe",
            ativo: true,
          });

          unidades.push({ id: unidade.id, nome: unidade.nome ?? nome });
        }

        return { gestor, unidades };
      });

      // Fora da transação: preparar a unidade é recuperável (basta rodar de
      // novo), e uma falha aqui não justifica desfazer o cliente inteiro.
      const semModulos: string[] = [];
      for (const unidade of criado.unidades) {
        try {
          await prepararUnidade(unidade.id);
        } catch (erro) {
          console.error(`[plataforma] preparo falhou para #${unidade.id}:`, erro);
          semModulos.push(unidade.nome);
        }
      }

      return {
        gestor: criado.gestor,
        unidades: criado.unidades,
        semModulos,
      };
    }),

  /**
   * Clientes abertos, com o que a plataforma precisa para cobrar.
   *
   * Além do cadastro: quando entrou, quanto usou na semana e no mês, e em que
   * estado está (em teste, vencido, bloqueado). Sem isso a tela dizia apenas
   * que o cliente existe — e existir não paga conta.
   */
  listarClientes: plataformaProcedure
    .input(z.object({ incluirExcluidos: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const seteDias = new Date(Date.now() - 7 * 86_400_000);
      const trintaDias = new Date(Date.now() - 30 * 86_400_000);

      const consulta = db
        .select({
          gestorId: users.id,
          gestorNome: users.name,
          gestorEmail: users.email,
          gestorTelefone: users.phone,
          senhaProvisoria: users.senhaProvisoria,
          criadoEm: users.createdAt,
          ultimoAcesso: users.lastSignedIn,
          bloqueado: users.bloqueado,
          motivoBloqueio: users.motivoBloqueio,
          trialAte: users.trialAte,
          excluidoEm: users.excluidoEm,
          unidadeId: condominios.id,
          unidadeNome: condominios.nome,
          segmento: condominios.segmento,
          // Separados de propósito: o do gestor se repete em toda linha (uma
          // por unidade) e o da equipe é daquela unidade. Somar direto na
          // consulta contaria o gestor uma vez por unidade.
          acessosGestor7: sql<number>`(
            SELECT COUNT(*) FROM "usuario_acessos" a
            WHERE a."userId" = ${users.id} AND a."em" >= ${seteDias}
          )`,
          acessosGestor30: sql<number>`(
            SELECT COUNT(*) FROM "usuario_acessos" a
            WHERE a."userId" = ${users.id} AND a."em" >= ${trintaDias}
          )`,
          acessosEquipe7: sql<number>`(
            SELECT COUNT(*) FROM "funcionario_acessos" f
            WHERE f."condominioId" = ${condominios.id} AND f."dataHora" >= ${seteDias}
          )`,
          acessosEquipe30: sql<number>`(
            SELECT COUNT(*) FROM "funcionario_acessos" f
            WHERE f."condominioId" = ${condominios.id} AND f."dataHora" >= ${trintaDias}
          )`,
        })
        .from(condominios)
        .innerJoin(users, eq(users.id, condominios.sindicoId));

      const linhas = input?.incluirExcluidos
        ? await consulta
        : await consulta.where(isNull(users.excluidoEm));

      const porGestor = new Map<
        number,
        {
          gestorId: number;
          gestorNome: string | null;
          gestorEmail: string | null;
          gestorTelefone: string | null;
          senhaProvisoria: boolean | null;
          criadoEm: Date;
          ultimoAcesso: Date | null;
          bloqueado: boolean | null;
          motivoBloqueio: string | null;
          trialAte: Date | null;
          excluidoEm: Date | null;
          acessos7: number;
          acessos30: number;
          segmento: string | null;
          unidades: { id: number; nome: string | null }[];
        }
      >();

      for (const l of linhas) {
        const atual = porGestor.get(l.gestorId) ?? {
          gestorId: l.gestorId,
          gestorNome: l.gestorNome,
          gestorEmail: l.gestorEmail,
          gestorTelefone: l.gestorTelefone,
          senhaProvisoria: l.senhaProvisoria,
          criadoEm: l.criadoEm,
          ultimoAcesso: l.ultimoAcesso,
          bloqueado: l.bloqueado,
          motivoBloqueio: l.motivoBloqueio,
          trialAte: l.trialAte,
          excluidoEm: l.excluidoEm,
          // Gestor entra uma vez na conta; a equipe soma por unidade.
          acessos7: Number(l.acessosGestor7),
          acessos30: Number(l.acessosGestor30),
          segmento: l.segmento,
          unidades: [],
        };
        atual.unidades.push({ id: l.unidadeId, nome: l.unidadeNome });
        atual.acessos7 += Number(l.acessosEquipe7);
        atual.acessos30 += Number(l.acessosEquipe30);
        porGestor.set(l.gestorId, atual);
      }

      return [...porGestor.values()];
    }),

  /** Corrige nome, e-mail ou telefone do gestor-chefe. */
  editarCliente: plataformaProcedure
    .input(
      z.object({
        gestorId: z.number(),
        nome: z.string().min(2).max(255).optional(),
        email: z.string().email().optional(),
        telefone: z.string().max(30).nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await exigirCliente(input.gestorId);

      if (input.email) {
        const email = input.email.trim().toLowerCase();
        const [ocupado] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (ocupado && ocupado.id !== input.gestorId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe outra conta com este e-mail.",
          });
        }
      }

      await db
        .update(users)
        .set({
          ...(input.nome ? { name: input.nome.trim() } : {}),
          ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
          ...(input.telefone !== undefined ? { phone: input.telefone } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.gestorId));

      return { success: true };
    }),

  /**
   * Bloqueia ou libera o acesso do cliente.
   *
   * O bloqueio já é respeitado no login, então vale para o gestor na hora. A
   * equipe dele entra por outra porta e continua entrando: quem paga é o
   * cliente, e derrubar a operação inteira por causa de fatura é decisão que
   * ninguém quer tomar sem avisar.
   */
  bloquearCliente: plataformaProcedure
    .input(
      z.object({
        gestorId: z.number(),
        bloqueado: z.boolean(),
        motivo: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await exigirCliente(input.gestorId);

      await db
        .update(users)
        .set({
          bloqueado: input.bloqueado,
          motivoBloqueio: input.bloqueado
            ? input.motivo?.trim() || "Acesso suspenso. Fale com o suporte."
            : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.gestorId));

      return { success: true, bloqueado: input.bloqueado };
    }),

  /** Encerra o teste ou devolve o prazo: `null` deixa a conta sem prazo. */
  definirTeste: plataformaProcedure
    .input(z.object({ gestorId: z.number(), dias: z.number().int().min(0).max(365).nullable() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await exigirCliente(input.gestorId);

      const trialAte =
        input.dias === null ? null : new Date(Date.now() + input.dias * 86_400_000);

      await db
        .update(users)
        .set({ trialAte, updatedAt: new Date() })
        .where(eq(users.id, input.gestorId));

      invalidarCacheTeste();
      return { success: true, trialAte };
    }),

  /**
   * Exclusão em duas etapas.
   *
   * Marca a data e bloqueia: o cliente some da lista e não entra mais, e o
   * dado continua no banco. Apagar de verdade significa varrer as tabelas de
   * cinquenta funções, sem volta — com um toque na tela, cedo ou tarde o
   * cliente errado seria apagado. Restaurar desfaz.
   */
  excluirCliente: plataformaProcedure
    .input(z.object({ gestorId: z.number(), restaurar: z.boolean().default(false) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await exigirCliente(input.gestorId);

      await db
        .update(users)
        .set({
          excluidoEm: input.restaurar ? null : new Date(),
          bloqueado: !input.restaurar,
          motivoBloqueio: input.restaurar ? null : "Conta encerrada.",
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.gestorId));

      return { success: true, excluido: !input.restaurar };
    }),
});
