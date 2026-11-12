import { describe, it, expect } from "vitest";
import {
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
