import { describe, it, expect } from "vitest";
import { readInstance, instanceStorageKey } from "./instance";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
describe("base reutilizável por cliente", () => {
  it("mantém a instância demonstrativa e seus dados existentes", () => {
    expect(readInstance({}).id).toBe("demo");
    expect(readInstance({}).name).toBe("Navalha & Co.");
    expect(instanceStorageKey("navalha-v01-clients", "demo")).toBe(
      "navalha-v01-clients",
    );
  });
  it("separa chaves locais entre instâncias na mesma origem", () => {
    expect(
      instanceStorageKey("navalha-v01-admin-account", "cliente-a"),
    ).not.toBe(instanceStorageKey("navalha-v01-admin-account", "cliente-b"));
  });
  it("carrega identidade e projeto declarados sem alegar conexão Firebase", () => {
    const instance = readInstance({
      VITE_INSTANCE_ID: "cliente-a",
      VITE_ESTABLISHMENT_NAME: " Empresa A ",
      VITE_FIREBASE_PROJECT_ID: "projeto-a",
    });
    expect(instance.name).toBe("Empresa A");
    expect(instance.firebase.projectId).toBe("projeto-a");
    expect(instance.dataMode).toBe("demo-local");
  });
  it("rejeita identificadores inválidos", () => {
    expect(() => readInstance({ VITE_INSTANCE_ID: "../outro" })).toThrow();
  });
  const script = resolve("scripts/configure-instance.mjs");
  const args = [
    script,
    "--id",
    "cliente-a",
    "--name",
    "Empresa A",
    "--domain",
    "agenda.exemplo.com",
    "--project",
    "projeto-cliente-a",
  ];
  it("gera configuração isolada sem recursos externos", () => {
    const directory = mkdtempSync(join(tmpdir(), "gestao-instance-"));
    try {
      const result = spawnSync(process.execPath, args, {
        cwd: directory,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(readFileSync(join(directory, ".env.local"), "utf8")).toContain(
        'VITE_INSTANCE_ID="cliente-a"',
      );
      expect(
        JSON.parse(readFileSync(join(directory, ".firebaserc"), "utf8"))
          .projects.default,
      ).toBe("projeto-cliente-a");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("não sobrescreve configuração existente", () => {
    const directory = mkdtempSync(join(tmpdir(), "gestao-instance-"));
    try {
      writeFileSync(join(directory, ".env.local"), "configuração anterior");
      const result = spawnSync(process.execPath, args, {
        cwd: directory,
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(readFileSync(join(directory, ".env.local"), "utf8")).toBe(
        "configuração anterior",
      );
      expect(existsSync(join(directory, ".firebaserc"))).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("recusa domínio e projeto inválidos antes de gravar arquivos", () => {
    const directory = mkdtempSync(join(tmpdir(), "gestao-instance-"));
    try {
      const invalid = [...args];
      invalid[invalid.indexOf("agenda.exemplo.com")] = "https://outro.com/path";
      expect(
        spawnSync(process.execPath, invalid, {
          cwd: directory,
          encoding: "utf8",
        }).status,
      ).toBe(1);
      expect(existsSync(join(directory, ".env.local"))).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
