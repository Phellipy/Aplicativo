import { describe, it, expect } from "vitest";
import { createDemoAdmin, verifyDemoAdmin } from "./adminAccess";
describe("senha demonstrativa do administrador", () => {
  it("normaliza e-mail e verifica senha sem armazenar texto puro", async () => {
    const account = await createDemoAdmin(
      " Admin@exemplo.test ",
      "senha-ficticia",
      "senha-ficticia",
    );
    expect(account.email).toBe("admin@exemplo.test");
    expect(JSON.stringify(account)).not.toContain("senha-ficticia");
    expect(
      await verifyDemoAdmin(account, "ADMIN@exemplo.test", "senha-ficticia"),
    ).toBe(true);
    expect(
      await verifyDemoAdmin(account, "outro@exemplo.test", "senha-ficticia"),
    ).toBe(false);
    expect(await verifyDemoAdmin(account, account.email, "incorreta")).toBe(
      false,
    );
  });
  it("recusa confirmação incorreta, e-mail inválido e senha curta", async () => {
    await expect(
      createDemoAdmin("admin@exemplo.test", "senha-ficticia", "outra"),
    ).rejects.toThrow("confirmação");
    await expect(
      createDemoAdmin("invalido", "senha-ficticia", "senha-ficticia"),
    ).rejects.toThrow("e-mail");
    await expect(
      createDemoAdmin("admin@exemplo.test", "123", "123"),
    ).rejects.toThrow();
  });
  it("preserva a credencial derivada ao recarregar os dados locais", async () => {
    const account = await createDemoAdmin(
      "admin@exemplo.test",
      "senha-ficticia",
      "senha-ficticia",
    );
    expect(
      await verifyDemoAdmin(
        JSON.parse(JSON.stringify(account)),
        account.email,
        "senha-ficticia",
      ),
    ).toBe(true);
  });
});
