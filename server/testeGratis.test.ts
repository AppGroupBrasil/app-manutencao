import { describe, expect, it } from "vitest";
import { DIAS_DE_TESTE, diasRestantes, fimDoTeste } from "./_core/teste";

/**
 * Contagem do teste grátis.
 *
 * O risco aqui é silencioso e caro: errar para mais deixa quem não pagou
 * usando de graça; errar para menos bloqueia cliente no meio da avaliação, com
 * a mensagem "seu teste terminou" na cara de quem ainda estava decidindo.
 */
describe("teste grátis", () => {
  it("dura sete dias a partir do cadastro", () => {
    const inicio = new Date("2026-08-13T10:00:00");
    const fim = fimDoTeste(inicio);

    expect(DIAS_DE_TESTE).toBe(7);
    expect(fim.toISOString().slice(0, 10)).toBe("2026-08-20");
  });

  it("conta os dias que faltam, sem passar de zero", () => {
    const daquiTresDias = new Date(Date.now() + 3 * 86_400_000);
    const ontem = new Date(Date.now() - 86_400_000);

    expect(diasRestantes(daquiTresDias)).toBe(3);
    expect(diasRestantes(ontem)).toBe(0);
  });

  it("conta sem prazo quando a conta não tem teste", () => {
    // Cliente aberto pela plataforma: venda assistida, nunca bloqueia.
    expect(diasRestantes(null)).toBeNull();
    expect(diasRestantes(undefined)).toBeNull();
  });

  it("ignora data inválida em vez de bloquear", () => {
    expect(diasRestantes("qualquer coisa")).toBeNull();
  });
});
