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
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { condominios, usuarioCondominios, users } from "../../../drizzle/schema";
import { prepararUnidade } from "../../_core/seedUnidade";
import { SEGMENTOS_VALIDOS } from "../../../shared/modules/registry";
import { labelsDoSegmento } from "../../../shared/vocabulario";

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

  /** Clientes já abertos: um por gestor-chefe, com as unidades dele. */
  listarClientes: plataformaProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const linhas = await db
      .select({
        gestorId: users.id,
        gestorNome: users.name,
        gestorEmail: users.email,
        senhaProvisoria: users.senhaProvisoria,
        unidadeId: condominios.id,
        unidadeNome: condominios.nome,
        segmento: condominios.segmento,
      })
      .from(condominios)
      .innerJoin(users, eq(users.id, condominios.sindicoId));

    const porGestor = new Map<
      number,
      {
        gestorId: number;
        gestorNome: string | null;
        gestorEmail: string | null;
        senhaProvisoria: boolean | null;
        segmento: string | null;
        unidades: { id: number; nome: string | null }[];
      }
    >();

    for (const l of linhas) {
      const atual = porGestor.get(l.gestorId) ?? {
        gestorId: l.gestorId,
        gestorNome: l.gestorNome,
        gestorEmail: l.gestorEmail,
        senhaProvisoria: l.senhaProvisoria,
        segmento: l.segmento,
        unidades: [],
      };
      atual.unidades.push({ id: l.unidadeId, nome: l.unidadeNome });
      porGestor.set(l.gestorId, atual);
    }

    return [...porGestor.values()];
  }),
});
