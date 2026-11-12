import { describe, it, expect } from "vitest";
import { validateLogoFile, MAX_LOGO_FILE } from "./LogoSettings";
describe("logo local", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])(
    "aceita formato %s dentro do limite",
    (type) => {
      expect(() =>
        validateLogoFile({ type, size: MAX_LOGO_FILE }),
      ).not.toThrow();
    },
  );
  it("rejeita arquivos grandes e formatos sem suporte", () => {
    expect(() =>
      validateLogoFile({ type: "image/png", size: MAX_LOGO_FILE + 1 }),
    ).toThrow("2 MB");
    expect(() =>
      validateLogoFile({ type: "image/svg+xml", size: 100 }),
    ).toThrow("PNG");
    expect(() => validateLogoFile({ type: "text/html", size: 100 })).toThrow();
  });
});
