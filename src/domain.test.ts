import { describe, it, expect } from "vitest";
import {
  agendaHours,
  rescheduleAppointment,
  paymentMethods,
  normalizeAppointments,
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
    expect(initialAppointments[0].status).toBe("Agendado");
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

it("converte registros antigos em andamento para confirmado sem perder o pagamento", () => {
  const original = {
    ...initialAppointments[0],
    status: "Em atendimento",
    paymentMethod: "Pix" as const,
  };
  const [result] = normalizeAppointments([original]);
  expect(result.status).toBe("Confirmado");
  expect(result.paymentMethod).toBe("Pix");
  expect(original.status).toBe("Em atendimento");
});

it("migra horários pendentes para Agendado e preserva os demais estados", () => {
  const statuses = [
    "Pendente",
    "Agendado",
    "Confirmado",
    "Cancelado",
    "Não compareceu",
    "Concluído",
  ];
  expect(
    normalizeAppointments(
      statuses.map((status) => ({ ...initialAppointments[0], status })),
    ).map((a) => a.status),
  ).toEqual([
    "Agendado",
    "Agendado",
    "Confirmado",
    "Cancelado",
    "Não compareceu",
    "Concluído",
  ]);
});

it("todos os horários demonstrativos começam como Agendado", () =>
  expect(initialAppointments.every((a) => a.status === "Agendado")).toBe(true));

describe("agenda em pilha", () => {
  it("exibe horários mesmo em dias vazios", () => {
    const slots = agendaHours([]);
    expect(slots[0].label).toBe("08:00");
    expect(slots.at(-1)?.label).toBe("20:00");
    expect(slots.every((s) => s.appointments.length === 0)).toBe(true);
  });
  it("agrupa horários simultâneos e ordena os minutos sem alterar os dados", () => {
    const base = initialAppointments[0];
    const items = [
      { ...base, id: 1, time: "09:30" },
      { ...base, id: 2, time: "09:00" },
      { ...base, id: 3, time: "09:00", professional: professionals[1] },
      { ...base, id: 4, time: "10:00" },
    ];
    const slots = agendaHours(items);
    expect(
      slots.find((s) => s.label === "09:00")?.appointments.map((a) => a.time),
    ).toEqual(["09:00", "09:00", "09:30"]);
    expect(slots.find((s) => s.label === "10:00")?.appointments).toHaveLength(
      1,
    );
    expect(items[0].time).toBe("09:30");
  });
  it("inclui registros fora da jornada padrão sem ocultá-los", () => {
    const slots = agendaHours([
      { ...initialAppointments[0], time: "07:30" },
      { ...initialAppointments[0], time: "21:00" },
    ]);
    expect(slots[0].label).toBe("07:00");
    expect(slots.at(-1)?.label).toBe("21:00");
  });
});

describe("reagendamento", () => {
  it("move em 15 minutos preservando identidade, preço, repasse, status e pagamento", () => {
    const original = {
      ...initialAppointments[0],
      status: "Confirmado",
      paymentMethod: "Pix" as const,
    };
    const [moved] = rescheduleAppointment(
      [original],
      initialProcedures,
      original.id,
      "2026-11-12",
      "09:15",
      "admin",
    );
    expect(moved).toEqual({ ...original, date: "2026-11-12", time: "09:15" });
    expect(original.time).toBe("09:00");
  });
  it("não conflita com o próprio horário e permite períodos contíguos", () => {
    const base = initialAppointments[0];
    expect(
      rescheduleAppointment(
        [base],
        initialProcedures,
        base.id,
        base.date,
        base.time,
        "admin",
      )[0],
    ).toEqual(base);
    const other = { ...base, id: 90, time: "10:00" };
    expect(
      rescheduleAppointment(
        [base, other],
        initialProcedures,
        base.id,
        base.date,
        "09:00",
        "admin",
      )[0].time,
    ).toBe("09:00");
  });
  it("bloqueia sobreposição e mantém os dados originais", () => {
    const base = initialAppointments[0],
      other = { ...base, id: 90, time: "10:00" };
    expect(() =>
      rescheduleAppointment(
        [base, other],
        initialProcedures,
        base.id,
        base.date,
        "09:15",
        "admin",
      ),
    ).toThrow("conflito");
    expect(base.time).toBe("09:00");
  });
  it("permite horários iguais de profissionais diferentes", () => {
    const base = initialAppointments[0],
      other = {
        ...base,
        id: 90,
        professional: professionals[1],
        time: "10:00",
      };
    expect(
      rescheduleAppointment(
        [base, other],
        initialProcedures,
        base.id,
        base.date,
        "10:00",
        "admin",
      )[0].time,
    ).toBe("10:00");
  });
  it.each(["Concluído", "Cancelado", "Não compareceu"])(
    "não move atendimento %s",
    (status) => {
      const base = { ...initialAppointments[0], status };
      expect(() =>
        rescheduleAppointment(
          [base],
          initialProcedures,
          base.id,
          base.date,
          "12:00",
          "admin",
        ),
      ).toThrow();
    },
  );
  it.each(["07:45", "20:15", "09:10", "25:00", "9:00", ""])(
    "rejeita horário inválido %s",
    (time) => {
      const base = initialAppointments[0];
      expect(() =>
        rescheduleAppointment(
          [base],
          initialProcedures,
          base.id,
          base.date,
          time,
          "admin",
        ),
      ).toThrow("15 minutos");
    },
  );
  it.each(["2026-02-30", "inválida", ""])(
    "rejeita data inválida %s",
    (date) => {
      const base = initialAppointments[0];
      expect(() =>
        rescheduleAppointment(
          [base],
          initialProcedures,
          base.id,
          date,
          "12:00",
          "admin",
        ),
      ).toThrow("data válida");
    },
  );
  it("permite o próprio reagendamento e bloqueia outro profissional no perfil demonstrativo", () => {
    const base = initialAppointments[0];
    expect(
      rescheduleAppointment(
        [base],
        initialProcedures,
        base.id,
        base.date,
        "12:00",
        "professional",
      )[0].time,
    ).toBe("12:00");
    const other = { ...base, professional: professionals[1] };
    expect(() =>
      rescheduleAppointment(
        [other],
        initialProcedures,
        other.id,
        other.date,
        "12:00",
        "professional",
      ),
    ).toThrow("perfil");
  });
});
