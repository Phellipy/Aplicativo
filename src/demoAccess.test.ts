import { describe, it, expect } from "vitest";
import { createDemoCredential, verifyDemoCredential } from "./demoAccess";
describe("acesso demonstrativo local", () => {
  it("guarda sal e derivação, verifica a senha e rejeita outra", async () => {
    const credential = await createDemoCredential("senha-ficticia-teste");
    expect(Object.keys(credential).sort()).toEqual(["hash", "salt"]);
    expect(JSON.stringify(credential)).not.toContain("senha-ficticia-teste");
    expect(await verifyDemoCredential("senha-ficticia-teste", credential)).toBe(
      true,
    );
    expect(await verifyDemoCredential("outra-ficticia", credential)).toBe(
      false,
    );
  });
  it("usa sais distintos para a mesma senha demonstrativa", async () => {
    const a = await createDemoCredential("senha-ficticia-teste"),
      b = await createDemoCredential("senha-ficticia-teste");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
  it("recusa senha vazia ou curta", async () => {
    await expect(createDemoCredential("")).rejects.toThrow();
    await expect(createDemoCredential("123")).rejects.toThrow();
  });
});
