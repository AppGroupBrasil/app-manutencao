import { z } from "zod";
import { eq, and, desc, sql, or, like } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { router, protectedProcedure, getUserHierarquiaNivel, HIERARQUIA_NIVEL } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";

const hierarquiaValues = ["admin_master", "admin", "responsavel", "funcionario"] as const;

export const hierarquiaRouter = router({
  // ==================== LISTAR USUÁRIOS DA MINHA HIERARQUIA ====================
  listar: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      search: z.string().optional(),
      hierarquia: z.enum(hierarquiaValues).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const meuNivel = getUserHierarquiaNivel(ctx.user!);
      const conditions = [];

      // Admin Master vê todos; demais veem apenas quem eles criaram
      if (meuNivel < HIERARQUIA_NIVEL.admin_master) {
        conditions.push(eq(users.criadoPorUserId, ctx.user!.id));
      }

      // Filtro por hierarquia
      if (input.hierarquia) {
        conditions.push(eq(users.hierarquia, input.hierarquia));
      }

      // Busca por nome/email
      if (input.search) {
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(users).where(where);
      const total = Number(totalResult[0]?.count || 0);

      const offset = (input.page - 1) * input.limit;
      const lista = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        hierarquia: users.hierarquia,
        bloqueado: users.bloqueado,
        motivoBloqueio: users.motivoBloqueio,
        phone: users.phone,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(offset);

      return { total, lista, page: input.page, limit: input.limit };
    }),

  // ==================== CADASTRAR NOVO USUÁRIO ====================
  cadastrar: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      email: z.string().email(),
      senha: z.string().min(6),
      telefone: z.string().optional(),
      hierarquia: z.enum(hierarquiaValues),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const meuNivel = getUserHierarquiaNivel(ctx.user!);
      const nivelAlvo = HIERARQUIA_NIVEL[input.hierarquia];

      // Só pode cadastrar hierarquia inferior à sua
      if (nivelAlvo >= meuNivel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você só pode cadastrar usuários de hierarquia inferior à sua.",
        });
      }

      // Verificar se email já existe
      const existing = await db.select({ id: users.id })
        .from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Este email já está cadastrado." });
      }

      // Hash da senha
      const bcrypt = await import("bcryptjs");
      const senhaHash = await bcrypt.hash(input.senha, 10);

      const crypto = await import("node:crypto");
      const openId = `local_${crypto.randomBytes(16).toString("hex")}`;

      // Mapear hierarquia → role legado para compatibilidade
      const roleMap: Record<string, "user" | "admin" | "sindico" | "morador" | "master"> = {
        admin_master: "master",
        admin: "admin",
        responsavel: "sindico",
        funcionario: "user",
      };

      const [novo] = await db.insert(users).values({
        openId,
        name: input.nome,
        email: input.email,
        senha: senhaHash,
        phone: input.telefone || null,
        loginMethod: "local",
        role: roleMap[input.hierarquia] || "user",
        hierarquia: input.hierarquia,
        criadoPorUserId: ctx.user!.id,
        lastSignedIn: new Date(),
      }).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        hierarquia: users.hierarquia,
      });

      return { success: true, usuario: novo };
    }),

  // ==================== BLOQUEAR / DESBLOQUEAR ====================
  toggleBloqueio: protectedProcedure
    .input(z.object({
      userId: z.number(),
      bloqueado: z.boolean(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar alvo
      const [alvo] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });

      const meuNivel = getUserHierarquiaNivel(ctx.user!);
      const nivelAlvo = getUserHierarquiaNivel(alvo);

      // Só pode bloquear hierarquia inferior
      if (nivelAlvo >= meuNivel) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode bloquear usuários de hierarquia inferior." });
      }

      await db.update(users).set({
        bloqueado: input.bloqueado,
        motivoBloqueio: input.bloqueado ? (input.motivo || "Bloqueado pelo administrador") : null,
        updatedAt: new Date(),
      }).where(eq(users.id, input.userId));

      return { success: true, bloqueado: input.bloqueado };
    }),

  // ==================== EXCLUIR USUÁRIO ====================
  excluir: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [alvo] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });

      const meuNivel = getUserHierarquiaNivel(ctx.user!);
      const nivelAlvo = getUserHierarquiaNivel(alvo);

      if (nivelAlvo >= meuNivel) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode excluir usuários de hierarquia inferior." });
      }

      await db.delete(users).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ==================== ALTERAR HIERARQUIA ====================
  alterarHierarquia: protectedProcedure
    .input(z.object({
      userId: z.number(),
      novaHierarquia: z.enum(hierarquiaValues),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [alvo] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });

      const meuNivel = getUserHierarquiaNivel(ctx.user!);
      const nivelAlvo = getUserHierarquiaNivel(alvo);
      const nivelNovo = HIERARQUIA_NIVEL[input.novaHierarquia];

      if (nivelAlvo >= meuNivel || nivelNovo >= meuNivel) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Operação não permitida para sua hierarquia." });
      }

      const roleMap: Record<string, "user" | "admin" | "sindico" | "morador" | "master"> = {
        admin_master: "master",
        admin: "admin",
        responsavel: "sindico",
        funcionario: "user",
      };

      await db.update(users).set({
        hierarquia: input.novaHierarquia,
        role: roleMap[input.novaHierarquia] || "user",
        updatedAt: new Date(),
      }).where(eq(users.id, input.userId));

      return { success: true };
    }),

  // ==================== VER DETALHES DE UM USUÁRIO ====================
  detalhe: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [alvo] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        hierarquia: users.hierarquia,
        bloqueado: users.bloqueado,
        motivoBloqueio: users.motivoBloqueio,
        criadoPorUserId: users.criadoPorUserId,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).where(eq(users.id, input.userId)).limit(1);

      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });

      const meuNivel = getUserHierarquiaNivel(ctx.user!);
      const nivelAlvo = getUserHierarquiaNivel(alvo);

      // Pode ver detalhes se for de hierarquia inferior OU se for o próprio
      if (alvo.id !== ctx.user!.id && nivelAlvo >= meuNivel) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para ver este usuário." });
      }

      return alvo;
    }),
});
