import { describe, it, expect } from "vitest";
import { firebaseOptions } from "./firebaseServices";
const config = {
  apiKey: "chave-publica-ficticia",
  authDomain: "projeto-exemplo.firebaseapp.com",
  projectId: "projeto-exemplo",
  appId: "id-ficticio",
  storageBucket: "",
  messagingSenderId: "",
};
describe("configuração da integração Firebase por cliente", () => {
  it("aceita apenas configuração completa para o projeto escolhido", () => {
    expect(firebaseOptions(config).projectId).toBe("projeto-exemplo");
  });
  it.each(["apiKey", "authDomain", "projectId", "appId"])(
    "recusa configuração sem %s",
    (field) => {
      expect(() => firebaseOptions({ ...config, [field]: "" })).toThrow(
        "configuração",
      );
    },
  );
  it("bloqueia identificador inválido de projeto", () => {
    expect(() =>
      firebaseOptions({ ...config, projectId: "../invalido" }),
    ).toThrow("projeto Firebase válido");
  });
});
