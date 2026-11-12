import { describe, it, expect } from "vitest";
import {
  paymentMethods,
  recordPayment,
  completeAppointment,
  receivedTotal,
  visibleAppointments,
  initialAppointments,
  eligibleClients,
  initialClients,
  professionals,
  money,
  calculateCommission,
  hasConflict,
  procedureRate,
  initialProcedures,
} from "./domain";
describe("visibilidade demonstrativa", () => {
  it("administrador vê toda a agenda", () =>
    expect(visibleAppointments(initialAppointments, "admin")).toHaveLength(
      initialAppointments.length,
    ));
  it("profissional vê apenas seus atendimentos", () => {
    const rows = visibleAppointments(initialAppointments, "professional");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((a) => a.professional === professionals[0])).toBe(true);
  });
});
describe("reativação", () => {
  it("seleciona clientes após 30 dias sem visita", () =>
    expect(eligibleClients(initialClients, []).map((c) => c.id)).toEqual([
      2, 4,
    ]));
  it("bloqueia repetição de mensagens pendentes e aprovadas", () =>
    expect(
      eligibleClients(initialClients, [
        { clientId: 2, status: "pending", created: "2026-11-11" },
        { clientId: 4, status: "approved", created: "2026-11-11" },
      ]),
    ).toEqual([]));
  it("inclui o dia 30 e exclui o dia 29", () => {
    const clients = [
      { id: 1, name: "A", phone: "", consent: true, lastVisit: "2026-10-12" },
      { id: 2, name: "B", phone: "", consent: true, lastVisit: "2026-10-13" },
    ];
    expect(eligibleClients(clients, []).map((c) => c.id)).toEqual([1]);
  });
});
it("formata moeda brasileira", () => expect(money(90)).toContain("90,00"));

it("ignora clientes que não autorizaram lembretes", () =>
  expect(
    eligibleClients(
      [
        {
          id: 9,
          name: "Sem autorização",
          phone: "",
          lastVisit: "2026-01-01",
          consent: false,
        },
      ],
      [],
    ),
  ).toEqual([]));
it("calcula repasse pelo percentual fixado no agendamento", () =>
  expect(
    calculateCommission({
      ...initialAppointments[0],
      value: 100,
      commissionRate: 40,
    }),
  ).toBe(40));

describe("agendamentos", () => {
  it("detecta sobreposição e permite horários contíguos", () => {
    expect(
      hasConflict(
        initialAppointments,
        initialProcedures,
        professionals[0],
        "2026-11-11",
        "09:30",
        30,
      ),
    ).toBe(true);
    expect(
      hasConflict(
        initialAppointments,
        initialProcedures,
        professionals[0],
        "2026-11-11",
        "10:00",
        30,
      ),
    ).toBe(false);
  });
  it("não bloqueia outro profissional ou dia", () => {
    expect(
      hasConflict(
        initialAppointments,
        initialProcedures,
        professionals[2],
        "2026-11-11",
        "09:00",
        30,
      ),
    ).toBe(false);
    expect(
      hasConflict(
        initialAppointments,
        initialProcedures,
        professionals[0],
        "2026-11-12",
        "09:00",
        30,
      ),
    ).toBe(false);
  });
  it("ignora atendimentos cancelados", () =>
    expect(
      hasConflict(
        initialAppointments.map((a) => ({ ...a, status: "Cancelado" })),
        initialProcedures,
        professionals[0],
        "2026-11-11",
        "09:00",
        30,
      ),
    ).toBe(false));
  it("prioriza o repasse individual sobre o padrão", () =>
    expect(
      procedureRate(
        {
          ...initialProcedures[0],
          individualRates: { [professionals[0]]: 55 },
        },
        professionals[0],
      ),
    ).toBe(55));
});

describe("pagamentos manuais", () => {
  it.each(paymentMethods)(
    "registra pagamento em %s preservando o status",
    (method) => {
      const result = recordPayment(initialAppointments[0], method);
      expect(result.paymentMethod).toBe(method);
      expect(result.status).toBe(initialAppointments[0].status);
      expect(initialAppointments[0].paymentMethod).toBeUndefined();
    },
  );
  it("permite corrigir a forma e remover o registro", () => {
    const paid = recordPayment(initialAppointments[0], "Pix");
    expect(recordPayment(paid, "Dinheiro").paymentMethod).toBe("Dinheiro");
    expect(recordPayment(paid, "").paymentMethod).toBeUndefined();
  });
  it("rejeita formas desconhecidas", () =>
    expect(() => recordPayment(initialAppointments[0], "Boleto")).toThrow());
  it("não confunde confirmação ou conclusão com recebimento", () => {
    const base = initialAppointments[0];
    expect(receivedTotal([{ ...base, status: "Concluído" }])).toBe(0);
    expect(receivedTotal([recordPayment(base, "Pix")])).toBe(0);
    expect(
      receivedTotal([recordPayment({ ...base, status: "Concluído" }, "Pix")]),
    ).toBe(base.value);
    expect(
      receivedTotal([recordPayment({ ...base, status: "Cancelado" }, "Pix")]),
    ).toBe(0);
  });
});

describe("conclusão com escolha de pagamento", () => {
  it.each([...paymentMethods, ""])("conclui com a opção %s", (method) => {
    const result = completeAppointment(initialAppointments[0], method);
    expect(result.status).toBe("Concluído");
    expect(result.paymentMethod).toBe(method || undefined);
    expect(receivedTotal([result])).toBe(method ? result.value : 0);
  });
  it("não altera o original antes da confirmação", () => {
    completeAppointment(initialAppointments[0], "Pix");
    expect(initialAppointments[0].status).toBe("Confirmado");
    expect(initialAppointments[0].paymentMethod).toBeUndefined();
  });
  it.each(["Cancelado", "Não compareceu"])(
    "não conclui atendimento %s",
    (status) =>
      expect(() =>
        completeAppointment({ ...initialAppointments[0], status }, "Pix"),
      ).toThrow(),
  );
});
