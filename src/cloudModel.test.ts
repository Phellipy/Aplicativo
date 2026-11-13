import { describe, it, expect } from "vitest";
import {
  documentsFor,
  materialize,
  cloudDiff,
  cleanCloudValue,
} from "./cloudModel";
describe("persistência por registro", () => {
  it("separa clientes por id e recupera a ordem", () => {
    const values = [
      { id: 7, name: "A" },
      { id: 2, name: "B" },
    ];
    const docs = documentsFor("array", values);
    expect([...docs.keys()]).toEqual(["7", "2"]);
    expect(materialize("array", docs)).toEqual(values);
  });
  it("salva somente registros alterados, novos ou removidos", () => {
    const old = documentsFor("array", [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ]);
    const next = documentsFor("array", [
      { id: 1, name: "Editado" },
      { id: 3, name: "C" },
    ]);
    expect(
      cloudDiff(old, next)
        .map((change) => change.id)
        .sort(),
    ).toEqual(["1", "2", "3"]);
    expect(cloudDiff(old, old)).toEqual([]);
  });
  it("não transporta credenciais demonstrativas ou valores undefined", () => {
    expect(
      cleanCloudValue({
        id: 1,
        credential: { hash: "fake" },
        optional: undefined,
      }),
    ).toEqual({ id: 1 });
  });
  it("preserva mapas de lembretes e escalares", () => {
    expect(
      materialize("map", documentsFor("map", { "55": { signature: "S" } })),
    ).toEqual({ "55": { signature: "S" } });
    expect(materialize("scalar", documentsFor("scalar", 30))).toBe(30);
  });
  it("não considera documentos adicionados depois da base como removidos", () => {
    const base = documentsFor("array", [{ id: 1, name: "A" }]);
    const next = documentsFor("array", [{ id: 1, name: "Editado" }]);
    expect(cloudDiff(base, next).map((change) => change.id)).toEqual(["1"]);
  });
});
