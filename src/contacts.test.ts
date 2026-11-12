import { describe, it, expect } from "vitest";
import {
  deleteClient,
  restoreClient,
  saveClient,
  deleteProfessional,
  restoreProfessional,
  whatsAppLink,
  canOpenWhatsApp,
  initialClients,
  initialAppointments,
  initialProfessionalRecords,
  initialProcedures,
  assignedProcedures,
  eligibleClients,
  type Campaign,
} from "./domain";
describe("exclusão reversível", () => {
  it("exclui e restaura cliente sem remover dados do histórico", () => {
    const deleted = deleteClient(
      initialClients,
      initialClients[0].id,
      "admin",
      "2026-11-12T12:00:00Z",
    );
    expect(deleted[0].deletedAt).toBe("2026-11-12T12:00:00Z");
    expect(deleted[0].name).toBe(initialClients[0].name);
    expect(
      restoreClient(deleted, deleted[0].id, "admin")[0].deletedAt,
    ).toBeUndefined();
    expect(initialClients[0].deletedAt).toBeUndefined();
    expect(initialAppointments).toHaveLength(5);
  });
  it("não oferece cliente excluído para reativação", () => {
    const deleted = deleteClient(initialClients, 2, "admin");
    expect(eligibleClients(deleted, []).some((client) => client.id === 2)).toBe(
      false,
    );
  });
  it("exclui profissional preservando os repasses e restaura desabilitado", () => {
    const records = initialProfessionalRecords(initialProcedures),
      deleted = deleteProfessional(records, records[0].id, "admin");
    expect(deleted[0].active).toBe(false);
    expect(deleted[0].deletedAt).toBeTruthy();
    expect(deleted[0].services).toEqual(records[0].services);
    expect(
      assignedProcedures(initialProcedures, deleted)[0].professionals,
    ).not.toContain(records[0].name);
    const restored = restoreProfessional(deleted, records[0].id, "admin");
    expect(restored[0].active).toBe(false);
    expect(restored[0].deletedAt).toBeUndefined();
  });
  it("restringe exclusão e restauração ao administrador demonstrativo", () => {
    const records = initialProfessionalRecords(initialProcedures);
    expect(() => deleteClient(initialClients, 1, "professional")).toThrow();
    expect(() => restoreClient(initialClients, 1, "professional")).toThrow();
    expect(() => deleteProfessional(records, 1, "professional")).toThrow();
    expect(() => restoreProfessional(records, 1, "professional")).toThrow();
  });
});
describe("edição de clientes", () => {
  it("atualiza nome, telefone e autorização sem perder histórico financeiro", () => {
    const original = initialClients[0];
    const result = saveClient(
      initialClients,
      initialAppointments,
      {
        ...original,
        name: "Marcos Corrigido",
        phone: "(11) 99999-9999",
        consent: false,
      },
      "admin",
    );
    expect(result.clients[0].name).toBe("Marcos Corrigido");
    expect(result.clients[0].phone).toBe("(11) 99999-9999");
    expect(result.clients[0].consent).toBe(false);
    expect(result.appointments[0]).toEqual({
      ...initialAppointments[0],
      client: "Marcos Corrigido",
      clientId: original.id,
    });
    expect(initialAppointments[0].client).toBe(original.name);
  });
  it("não altera atendimentos de outro cliente com ID definido", () => {
    const original = initialClients[0],
      other = { ...initialAppointments[0], clientId: 999 };
    expect(
      saveClient(
        initialClients,
        [other],
        { ...original, name: "Nome Corrigido" },
        "admin",
      ).appointments[0],
    ).toEqual(other);
  });
  it("impede nomes duplicados e alteração por profissional", () => {
    expect(() =>
      saveClient(
        initialClients,
        [],
        { ...initialClients[0], name: initialClients[1].name },
        "admin",
      ),
    ).toThrow("existe");
    expect(() =>
      saveClient(initialClients, [], initialClients[0], "professional"),
    ).toThrow("administrador");
  });
  it("cadastra e valida os campos essenciais", () => {
    const result = saveClient(
      initialClients,
      [],
      {
        id: 99,
        name: " Novo Cliente ",
        phone: "(11) 99999-1111",
        lastVisit: "2026-11-11",
        consent: true,
      },
      "admin",
    );
    expect(result.clients.at(-1)?.name).toBe("Novo Cliente");
    expect(() =>
      saveClient(
        initialClients,
        [],
        { ...initialClients[0], lastVisit: "inválida" },
        "admin",
      ),
    ).toThrow();
  });
});
describe("WhatsApp manual", () => {
  it("prepara link com DDI brasileiro, telefone sem máscara e texto codificado", () => {
    const url = new URL(
      whatsAppLink(initialClients[0], "Olá, Marcos!\nVamos agendar?"),
    );
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/5511999990101");
    expect(url.searchParams.get("text")).toBe("Olá, Marcos!\nVamos agendar?");
  });
  it("aceita números internacionais explícitos e DDI brasileiro já informado", () => {
    expect(
      new URL(
        whatsAppLink(
          { ...initialClients[0], phone: "+1 (212) 555-0101" },
          "Olá",
        ),
      ).pathname,
    ).toBe("/12125550101");
    expect(
      new URL(
        whatsAppLink(
          { ...initialClients[0], phone: "55 11 99999-0101" },
          "Olá",
        ),
      ).pathname,
    ).toBe("/5511999990101");
  });
  it("não gera link sem autorização, com exclusão, número inválido ou texto vazio", () => {
    expect(() =>
      whatsAppLink({ ...initialClients[0], consent: false }, "Olá"),
    ).toThrow();
    expect(() =>
      whatsAppLink({ ...initialClients[0], deletedAt: "2026-11-12" }, "Olá"),
    ).toThrow();
    expect(() =>
      whatsAppLink({ ...initialClients[0], phone: "12345678" }, "Olá"),
    ).toThrow();
    expect(() => whatsAppLink(initialClients[0], " ")).toThrow();
  });
  it("bloqueia repetição do mesmo texto por sete dias, sem marcar como enviado", () => {
    const now = Date.parse("2026-11-12T12:00:00Z"),
      entries: Campaign[] = [
        {
          clientId: 1,
          status: "opened",
          created: "2026-11-12",
          openedAt: "2026-11-12T12:00:00Z",
          message: "Olá",
        },
      ];
    expect(canOpenWhatsApp(entries, 1, " Olá ", now)).toBe(false);
    expect(canOpenWhatsApp(entries, 1, "Olá", now + 7 * 86400000)).toBe(true);
    expect(canOpenWhatsApp(entries, 2, "Olá", now)).toBe(true);
    expect(canOpenWhatsApp(entries, 1, "Outro assunto", now)).toBe(true);
    expect(entries[0].status).toBe("opened");
  });
  it("registros antigos de aprovação não são tratados como abertura ou envio", () => {
    expect(
      canOpenWhatsApp(
        [
          {
            clientId: 1,
            status: "approved",
            created: "2026-11-11",
            message: "Olá",
          },
        ],
        1,
        "Olá",
      ),
    ).toBe(true);
  });
});
