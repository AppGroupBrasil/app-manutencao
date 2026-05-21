import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getDb } from './db';
import { adminLogs, users } from '../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

describe('Admin Logs System', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('Admin Logs Table', () => {
    it('should insert a log entry successfully', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const logData = {
        adminId: 1,
        adminNome: 'Test Admin',
        adminEmail: 'admin@test.com',
        acao: 'editar' as const,
        entidade: 'usuario' as const,
        entidadeId: 2,
        entidadeNome: 'Test User',
        detalhes: JSON.stringify({
          alteracoes: {
            role: { de: 'user', para: 'admin' },
          },
        }),
      };

      await db.insert(adminLogs).values(logData);

      // Verify insertion by querying
      const [inserted] = await db
        .select()
        .from(adminLogs)
        .where(and(
          eq(adminLogs.adminEmail, 'admin@test.com'),
          eq(adminLogs.entidadeNome, 'Test User')
        ))
        .orderBy(desc(adminLogs.createdAt))
        .limit(1);

      expect(inserted).toBeDefined();
      expect(inserted.id).toBeGreaterThan(0);
      expect(inserted.adminId).toBe(1);
      expect(inserted.adminNome).toBe('Test Admin');
      expect(inserted.acao).toBe('editar');
      expect(inserted.entidade).toBe('usuario');
      expect(inserted.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve log entries ordered by date', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const logs = await db
        .select()
        .from(adminLogs)
        .orderBy(desc(adminLogs.createdAt))
        .limit(10);

      expect(Array.isArray(logs)).toBe(true);
      
      // Verify ordering (most recent first)
      if (logs.length >= 2) {
        const firstDate = new Date(logs[0].createdAt).getTime();
        const secondDate = new Date(logs[1].createdAt).getTime();
        expect(firstDate).toBeGreaterThanOrEqual(secondDate);
      }
    });

    it('should filter logs by action type', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const editLogs = await db
        .select()
        .from(adminLogs)
        .where(eq(adminLogs.acao, 'editar'));

      expect(Array.isArray(editLogs)).toBe(true);
      editLogs.forEach((log) => {
        expect(log.acao).toBe('editar');
      });
    });

    it('should filter logs by entity type', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const userLogs = await db
        .select()
        .from(adminLogs)
        .where(eq(adminLogs.entidade, 'usuario'));

      expect(Array.isArray(userLogs)).toBe(true);
      userLogs.forEach((log) => {
        expect(log.entidade).toBe('usuario');
      });
    });

    it('should parse JSON details correctly', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [log] = await db
        .select()
        .from(adminLogs)
        .where(eq(adminLogs.adminEmail, 'admin@test.com'))
        .orderBy(desc(adminLogs.createdAt))
        .limit(1);

      if (log && log.detalhes) {
        const detalhes = JSON.parse(log.detalhes);
        expect(detalhes).toHaveProperty('alteracoes');
        expect(detalhes.alteracoes).toHaveProperty('role');
        expect(detalhes.alteracoes.role.de).toBe('user');
        expect(detalhes.alteracoes.role.para).toBe('admin');
      }
    });

    it('should support all action types', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const actionTypes = ['criar', 'editar', 'excluir', 'ativar', 'desativar', 'promover', 'rebaixar'] as const;

      for (const acao of actionTypes) {
        await db.insert(adminLogs).values({
          adminId: 1,
          adminNome: 'Test Admin Actions',
          adminEmail: 'admin-actions@test.com',
          acao,
          entidade: 'usuario',
          entidadeId: 1,
          entidadeNome: `Test ${acao}`,
          detalhes: null,
        });

        // Verify insertion
        const [inserted] = await db
          .select()
          .from(adminLogs)
          .where(and(
            eq(adminLogs.adminEmail, 'admin-actions@test.com'),
            eq(adminLogs.acao, acao)
          ))
          .limit(1);

        expect(inserted.acao).toBe(acao);
      }
    });

    it('should support all entity types', async () => {
      if (!db) { console.warn('[skip] Database not available'); return; }

      const entityTypes = ['usuario', 'condominio', 'vistoria', 'manutencao', 'ordem_servico', 'funcao', 'configuracao'] as const;

      for (const entidade of entityTypes) {
        await db.insert(adminLogs).values({
          adminId: 1,
          adminNome: 'Test Admin Entities',
          adminEmail: 'admin-entities@test.com',
          acao: 'criar',
          entidade,
          entidadeId: 1,
          entidadeNome: `Test ${entidade}`,
          detalhes: null,
        });

        // Verify insertion
        const [inserted] = await db
          .select()
          .from(adminLogs)
          .where(and(
            eq(adminLogs.adminEmail, 'admin-entities@test.com'),
            eq(adminLogs.entidade, entidade)
          ))
          .limit(1);

        expect(inserted.entidade).toBe(entidade);
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.delete(adminLogs).where(eq(adminLogs.adminEmail, 'admin@test.com'));
      await db.delete(adminLogs).where(eq(adminLogs.adminEmail, 'admin-actions@test.com'));
      await db.delete(adminLogs).where(eq(adminLogs.adminEmail, 'admin-entities@test.com'));
    }
  });
});
