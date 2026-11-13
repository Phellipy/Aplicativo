import { describe, it, expect } from "vitest";
import { saveClient } from "./domain";
import {
  parseVCard,
  contactImportPreview,
  importedClients,
  importContactBatches,
} from "./contactImport";
const card = (lines: string) =>
  `BEGIN:VCARD\r\nVERSION:3.0\r\n${lines}\r\nEND:VCARD`;
describe("importação de contatos", () => {
  it("lê contatos de iPhone/Android com campos agrupados e prioriza celular", () => {
    expect(
      parseVCard(
        card(
          "FN:Ana Silva\r\nTEL;TYPE=HOME:1133334444\r\nitem1.TEL;TYPE=CELL:tel:+55 11 99999-8888",
        ),
      ),
    ).toEqual([{ name: "Ana Silva", phone: "+55 11 99999-8888" }]);
  });
  it("lê linhas dobradas, escapes e nomes quoted-printable", () => {
    expect(
      parseVCard(card("FN:Maria \\;\r\n Silva\r\nTEL:11999998888"))[0].name,
    ).toBe("Maria ;Silva");
    expect(
      parseVCard(
        card(
          "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9\r\nTEL:11999998888",
        ),
      )[0].name,
    ).toBe("José");
  });
  it("usa nome estruturado quando não existe FN e ignora conteúdo HTML como marcação", () => {
    expect(parseVCard(card("N:Silva;Ana;;;\r\nTEL:11999998888"))[0].name).toBe(
      "Ana Silva",
    );
    expect(
      parseVCard(card("FN:<script>alert(1)</script>\r\nTEL:11999998888"))[0]
        .name,
    ).toBe("<script>alert(1)</script>");
  });
  it("bloqueia telefone repetido com DDI, nome repetido e contato sem telefone válido", () => {
    const existing = importedClients(
      [{ name: "Ana", phone: "11999998888" }],
      [],
    );
    const preview = contactImportPreview(
      [
        { name: "Outra", phone: "+55 11 99999-8888" },
        { name: "ANA", phone: "21988887777" },
        { name: "Sem número", phone: "" },
      ],
      existing,
    );
    expect(preview.every((row) => !!row.reason)).toBe(true);
  });
  it("detecta repetidos no próprio arquivo e mantém clientes excluídos protegidos", () => {
    expect(
      contactImportPreview(
        [
          { name: "A", phone: "11999998888" },
          { name: "B", phone: "+5511999998888" },
        ],
        [],
      )[1].reason,
    ).toContain("repetido");
    const existing = importedClients(
      [{ name: "A", phone: "11999998888" }],
      [],
    ).map((c) => ({ ...c, deletedAt: "2026-11-12" }));
    expect(
      contactImportPreview([{ name: "B", phone: "11999998888" }], existing)[0]
        .reason,
    ).not.toBe("");
  });
  it("não importa aniversário, notas, autorização nem inventa última visita", () => {
    const parsed = parseVCard(
      card("FN:Ana\r\nTEL:11999998888\r\nNOTE:Privado\r\nBDAY:19900101"),
    );
    const result = importedClients(parsed, []);
    expect(result).toEqual([
      {
        id: -5511999998888,
        name: "Ana",
        phone: "11999998888",
        lastVisit: "",
        consent: false,
      },
    ]);
  });
  it("recusa arquivo inválido, muito grande e seleção maior que 10.000", () => {
    expect(() => parseVCard("texto comum")).toThrow();
    expect(() => parseVCard("x".repeat(20_000_001))).toThrow("20 MB");
    expect(() =>
      importedClients(
        Array.from({ length: 10001 }, (_, i) => ({
          name: String(i),
          phone: String(11900000000 + i),
        })),
        [],
      ),
    ).toThrow("10.000");
  });
  it("revalida duplicados antes de importar e evita colisão de IDs", () => {
    const contact = { name: "Ana", phone: "11999998888" };
    const existing = importedClients([contact], []);
    expect(() => importedClients([contact], existing)).toThrow("Revise");
    expect(
      importedClients([{ name: "B", phone: "21999998888" }], existing)[0].id,
    ).not.toBe(existing[0].id);
  });
});

describe("reimportação sem duplicar clientes", () => {
  const file = [
    card("FN:Ana Silva\r\nTEL:11999998888"),
    card("FN:Bruno\r\nTEL:21988887777"),
  ].join("\r\n");
  it("bloqueia todo o arquivo na segunda e terceira importações", () => {
    const contacts = parseVCard(file);
    const saved = importedClients(contacts, []);
    for (let attempt = 0; attempt < 2; attempt++) {
      const preview = contactImportPreview(parseVCard(file), saved);
      expect(preview.filter((row) => !row.reason)).toHaveLength(0);
      expect(() => importedClients(contacts, saved)).toThrow("Revise");
      expect(saved).toHaveLength(2);
    }
  });
  it("libera apenas contatos novos quando o arquivo já foi importado parcialmente", () => {
    const contacts = parseVCard(file);
    const first = importedClients(contacts.slice(0, 1), []);
    const remaining = contactImportPreview(contacts, first).filter(
      (row) => !row.reason,
    );
    const all = [...first, ...importedClients(remaining, first)];
    expect(all).toHaveLength(2);
    expect(contactImportPreview(contacts, all).every((row) => row.reason)).toBe(
      true,
    );
  });
  it("usa o mesmo identificador com ou sem DDI, mesmo em sessões separadas", () => {
    expect(
      importedClients([{ name: "Ana", phone: "11999998888" }], [])[0].id,
    ).toBe(
      importedClients(
        [{ name: "Ana Silva", phone: "+55 (11) 99999-8888" }],
        [],
      )[0].id,
    );
  });
});

it("permite editar o contato importado sem inventar data de atendimento", () => {
  const clients = importedClients(
    [{ name: "Contato sem visita", phone: "11999998888" }],
    [],
  );
  const result = saveClient(
    clients,
    [],
    { ...clients[0], consent: true },
    "admin",
  );
  expect(result.clients[0].lastVisit).toBe("");
  expect(result.clients[0].consent).toBe(true);
});

it("não sobrescreve um contato importado cujo nome e telefone foram editados", () => {
  const original = { name: "Nome antigo", phone: "11999998888" };
  const clients = importedClients([original], []).map((client) => ({
    ...client,
    name: "Nome novo",
    phone: "21988887777",
  }));
  expect(contactImportPreview([original], clients)[0].reason).toContain(
    "já importado",
  );
  expect(() => importedClients([original], clients)).toThrow("Revise");
  expect(clients[0].name).toBe("Nome novo");
});

describe("importações grandes em lotes", () => {
  const contacts = Array.from({ length: 1205 }, (_, i) => ({
    name: `Contato ${i}`,
    phone: String(11900000000 + i),
  }));
  it("lê mais de mil contatos e grava todos em lotes de até 200, sem duplicar na repetição", async () => {
    const parsed = parseVCard(
      contacts.map((c) => card(`FN:${c.name}\r\nTEL:${c.phone}`)).join("\r\n"),
    );
    expect(parsed).toHaveLength(1205);
    let saved: import("./domain").Client[] = [];
    const sizes: number[] = [],
      progress: number[] = [];
    const save = async (added: import("./domain").Client[]) => {
      sizes.push(added.length);
      saved = [...saved, ...added];
    };
    expect(
      await importContactBatches(
        parsed,
        () => saved,
        save,
        (done) => progress.push(done),
      ),
    ).toBe(1205);
    expect(sizes).toEqual([200, 200, 200, 200, 200, 200, 5]);
    expect(progress.at(-1)).toBe(1205);
    expect(
      await importContactBatches(
        parsed,
        () => saved,
        save,
        () => {},
      ),
    ).toBe(0);
    expect(saved).toHaveLength(1205);
  });
  it("interrompe após falha e retoma sem recriar o lote já confirmado", async () => {
    let saved: import("./domain").Client[] = [],
      attempt = 0;
    await expect(
      importContactBatches(
        contacts,
        () => saved,
        async (added) => {
          if (++attempt === 2) throw new Error("Falha de conexão");
          saved = [...saved, ...added];
        },
        () => {},
      ),
    ).rejects.toThrow("Falha de conexão");
    expect(saved).toHaveLength(200);
    expect(
      await importContactBatches(
        contacts,
        () => saved,
        async (added) => {
          saved = [...saved, ...added];
        },
        () => {},
      ),
    ).toBe(1005);
    expect(new Set(saved.map((c) => c.id)).size).toBe(1205);
  });
});

describe("somente celulares dos contatos", () => {
  it("ignora fixos e escolhe o celular entre vários números", () => {
    expect(
      parseVCard(
        card(
          "FN:Ana\r\nTEL;TYPE=HOME:1133334444\r\nTEL;TYPE=CELL:11988887777\r\nTEL;TYPE=CELL:11999998888",
        ),
      ),
    ).toEqual([{ name: "Ana", phone: "11988887777" }]);
  });
  it("reconhece celular brasileiro sem tipo declarado e não importa contatos só com fixo", () => {
    const file = [
      card("FN:Só fixo\r\nTEL:1133334444"),
      card("FN:Celular\r\nTEL:+55 (21) 98888-7777"),
    ].join("\r\n");
    expect(parseVCard(file)).toEqual([
      { name: "Celular", phone: "+55 (21) 98888-7777" },
    ]);
    expect(() =>
      parseVCard(card("FN:Só fixo\r\nTEL;TYPE=CELL:1133334444")),
    ).toThrow("Números fixos");
  });
  it("aceita celular internacional identificado e preserva o código do país", () => {
    const contact = parseVCard(
      card("FN:Exterior\r\nTEL;TYPE=CELL:+1 202 555 0123"),
    );
    expect(importedClients(contact, [])[0].id).toBe(-12025550123);
  });
  it("não duplica o cliente que tinha celular e fixo no mesmo contato", () => {
    const parsed = parseVCard(
      card("FN:Ana\r\nTEL:1133334444\r\nTEL:11988887777"),
    );
    const clients = importedClients(parsed, []);
    expect(
      contactImportPreview(parsed, clients).filter((row) => !row.reason),
    ).toHaveLength(0);
  });
});
