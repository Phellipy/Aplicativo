import { describe, it, expect } from "vitest";
import { businessDateLabel } from "./domain";
describe("data do cabeçalho no fuso do estabelecimento", () => {
  it("mostra o dia anterior antes de meia-noite em São Paulo", () => {
    expect(businessDateLabel(new Date("2026-11-13T02:59:00Z"))).toBe(
      "quinta-feira, 12 de novembro de 2026",
    );
  });
  it("avança a data após meia-noite em São Paulo", () => {
    expect(businessDateLabel(new Date("2026-11-13T03:00:00Z"))).toBe(
      "sexta-feira, 13 de novembro de 2026",
    );
  });
});
