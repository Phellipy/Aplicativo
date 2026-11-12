import { describe, it, expect } from "vitest";
import { accentColors, normalizeAppearance } from "./appearance";
const luminance = (hex: string) => {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
describe("aparência e legibilidade", () => {
  it.each(accentColors)(
    "texto do botão $name mantém contraste mínimo AA",
    (color) => {
      const a = luminance(color.fill),
        b = luminance(color.text);
      expect(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
  it("recupera preferências válidas e ignora valores inválidos do armazenamento", () => {
    expect(normalizeAppearance({ mode: "dark", accent: "white" })).toEqual({
      mode: "dark",
      accent: "white",
    });
    for (const invalid of [
      null,
      {},
      "invalido",
      { mode: "outro", accent: "outra" },
    ])
      expect(normalizeAppearance(invalid)).toEqual({
        mode: "light",
        accent: "blue",
      });
  });
});
