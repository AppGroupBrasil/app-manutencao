import { describe, it, expect } from "vitest";
import { temCraseNoSql } from "./_core/migracoes";

/**
 * A guarda existe porque as migrações anteriores ao baseline ainda são MySQL:
 * se alguém baixar `MIGRACAO_BASELINE`, o runner precisa recusar com a causa em
 * vez de estourar um "syntax error" no meio do deploy.
 */
describe("Guarda de migração da era MySQL", () => {
  it("recusa identificador entre crases", () => {
    expect(temCraseNoSql("CREATE TABLE `algo` (id int);")).toBe(true);
    expect(temCraseNoSql("ALTER TABLE `users` MODIFY COLUMN `role` text;")).toBe(true);
  });

  it("aceita crase dentro de comentário, que é como documentamos o SQL", () => {
    expect(
      temCraseNoSql("-- `nextval` é atômico\nCREATE SEQUENCE IF NOT EXISTS x;"),
    ).toBe(false);
    expect(
      temCraseNoSql("/* usa `setval` para posicionar */\nSELECT setval('x', 1);"),
    ).toBe(false);
  });

  it("aceita migração Postgres normal", () => {
    expect(
      temCraseNoSql('ALTER TABLE "funcionario_funcoes" ADD COLUMN IF NOT EXISTS "podeExcluir" boolean;'),
    ).toBe(false);
  });
});
