# Scripts de banco — uso histórico e manual

Esta pasta contém scripts ad-hoc usados durante o desenvolvimento. **Nenhum deles é executado em produção pelo pipeline padrão** — o fluxo oficial é `pnpm db:push` (Drizzle).

## Status atual

- A fonte de verdade do schema é [`drizzle/schema.ts`](../../drizzle/schema.ts).
- Migrations versionadas em [`drizzle/`](../../drizzle/) (0000-0029+).
- Estes scripts aplicaram correções fora do Drizzle no passado. Não rodá-los novamente sem revisar — podem causar drift.

## Categorias

- `add-*.mjs` — adicionam colunas/permissões manualmente. Já refletidos no schema.
- `fix-*.sql`, `fix_*.mjs` — correções pontuais já incorporadas ao schema.
- `restore-fks.sql` — restaura FKs após migração massiva.
- `migrate-*.mjs`, `migrate-*.ts` — utilitários de migração de dados (MySQL→PostgreSQL, conversão de insertId, etc.).
- `check_*`, `compare_*`, `test_conn*` — diagnóstico.
- `seed-*.mjs` — populam dados de exemplo (mover para `scripts/seed/`).

## Antes de aplicar qualquer um deles

1. Verificar se a alteração já está em `drizzle/schema.ts`.
2. Comparar com `drizzle/0029_*.sql` (ou a última migration) antes de rodar manualmente.
3. Após qualquer hotfix manual em produção, regenerar a migration com `pnpm db:push` para registrar no histórico do Drizzle.
