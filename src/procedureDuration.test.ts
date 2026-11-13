import { describe, expect, it } from "vitest";
import { validProcedureDuration } from "./procedureDuration";
describe("duração do procedimento", () => {
  it.each([1, 7, 17, 59, 60, 91, 539, 540])("aceita %i minutos", (value) => {
    expect(validProcedureDuration(value)).toBe(true);
  });
  it.each([0, -1, 541, 600, 1.5, NaN, Infinity])(
    "recusa duração inválida %s",
    (value) => {
      expect(validProcedureDuration(value)).toBe(false);
    },
  );
});
