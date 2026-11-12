import { describe, it, expect } from "vitest";
import {
  initialProfessionalRecords,
  assignedProcedures,
  cleanProcedure,
  createProfessional,
  updateProfessional,
  effectiveSchedules,
  defaultSchedule,
  createAppointment,
  getAvailableTimes,
  initialWorkSchedules,
  fitsWorkSchedule,
  appointmentDuration,
  validateWorkDays,
  validateRestriction,
  timelineLayout,
  filterPeriod,
  periodDates,
  workCapacity,
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
      {
        id: 1,
        name: "A",
        phone: "11900000000",
        consent: true,
        lastVisit: "2026-10-12",
      },
      {
        id: 2,
        name: "B",
        phone: "11900000000",
        consent: true,
        lastVisit: "2026-10-13",
      },
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
      ).toThrow();
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

describe("vários procedimentos e disponibilidade", () => {
  const prof = professionals[0],
    date = "2026-11-11";
  const input = {
    id: 100,
    client: "Cliente de teste",
    professional: prof,
    date,
    time: "09:00",
  };
  it("soma duração, preço e repasses de todos os serviços", () => {
    const a = createAppointment(
      input,
      [1, 2],
      initialProcedures,
      [],
      initialWorkSchedules,
    );
    expect(a.services).toHaveLength(2);
    expect(a.duration).toBe(90);
    expect(a.value).toBe(245);
    expect(a.procedure).toBe("Corte + barba + Barba");
    expect(calculateCommission(a)).toBe(104.5);
    expect(a.status).toBe("Agendado");
  });
  it("fixa duração, preço e percentual mesmo após edição do cadastro", () => {
    const a = createAppointment(
      input,
      [1, 2],
      initialProcedures,
      [],
      initialWorkSchedules,
    );
    const changed = initialProcedures.map((p) => ({
      ...p,
      duration: 15,
      price: 1,
      commission: 1,
    }));
    expect(appointmentDuration(a, changed)).toBe(90);
    expect(a.value).toBe(245);
    expect(calculateCommission(a)).toBe(104.5);
  });
  it("só permite serviços habilitados e não repetidos", () => {
    expect(() =>
      createAppointment(
        input,
        [3],
        initialProcedures,
        [],
        initialWorkSchedules,
      ),
    ).toThrow("habilitados");
    expect(() =>
      createAppointment(
        input,
        [1, 1],
        initialProcedures,
        [],
        initialWorkSchedules,
      ),
    ).toThrow("repetição");
    expect(() =>
      createAppointment(input, [], initialProcedures, [], initialWorkSchedules),
    ).toThrow();
  });
  it("exige espaço para a duração inteira dentro da jornada", () => {
    expect(
      getAvailableTimes(
        [],
        initialProcedures,
        initialWorkSchedules,
        prof,
        date,
        90,
      ),
    ).toContain("16:30");
    expect(
      getAvailableTimes(
        [],
        initialProcedures,
        initialWorkSchedules,
        prof,
        date,
        90,
      ),
    ).not.toContain("16:45");
    expect(() =>
      createAppointment(
        { ...input, time: "17:00" },
        [1, 2],
        initialProcedures,
        [],
        initialWorkSchedules,
      ),
    ).toThrow("duração total");
  });
  it("reserva a duração somada e impede sobreposição", () => {
    const a = createAppointment(
      input,
      [1, 2],
      initialProcedures,
      [],
      initialWorkSchedules,
    );
    const slots = getAvailableTimes(
      [a],
      initialProcedures,
      initialWorkSchedules,
      prof,
      date,
      30,
    );
    expect(slots).not.toContain("10:15");
    expect(slots).toContain("10:30");
  });
  it("respeita folgas semanais e jornada reduzida de sábado", () => {
    expect(
      getAvailableTimes(
        [],
        initialProcedures,
        initialWorkSchedules,
        prof,
        "2026-11-15",
        30,
      ),
    ).toEqual([]);
    const saturday = getAvailableTimes(
      [],
      initialProcedures,
      initialWorkSchedules,
      prof,
      "2026-11-14",
      60,
    );
    expect(saturday[0]).toBe("09:00");
    expect(saturday.at(-1)).toBe("12:00");
  });
  it("bloqueia intervalos parciais e permite horários que terminam no início da ausência", () => {
    const schedules = initialWorkSchedules.map((s) =>
      s.professional === prof
        ? {
            ...s,
            restrictions: [
              {
                id: 1,
                date,
                allDay: false,
                start: "12:00",
                end: "13:00",
                reason: "Almoço",
              },
            ],
          }
        : s,
    );
    const slots = getAvailableTimes(
      [],
      initialProcedures,
      schedules,
      prof,
      date,
      60,
    );
    expect(slots).toContain("11:00");
    expect(slots).not.toContain("11:15");
    expect(slots).not.toContain("12:00");
    expect(slots).toContain("13:00");
  });
  it("bloqueia dia inteiro e somente o profissional da restrição", () => {
    const schedules = initialWorkSchedules.map((s) =>
      s.professional === prof
        ? {
            ...s,
            restrictions: [
              {
                id: 1,
                date,
                allDay: true,
                start: "00:00",
                end: "23:59",
                reason: "Folga",
              },
            ],
          }
        : s,
    );
    expect(
      getAvailableTimes([], initialProcedures, schedules, prof, date, 30),
    ).toEqual([]);
    expect(
      getAvailableTimes(
        [],
        initialProcedures,
        schedules,
        professionals[1],
        date,
        30,
      ).length,
    ).toBeGreaterThan(0);
    expect(() =>
      rescheduleAppointment(
        [initialAppointments[0]],
        initialProcedures,
        1,
        date,
        "12:00",
        "admin",
        schedules,
      ),
    ).toThrow("jornada");
  });
  it("dias desmarcados também bloqueiam o arraste", () => {
    const schedules = initialWorkSchedules.map((s) =>
      s.professional === prof
        ? { ...s, days: s.days.map((d) => ({ ...d, enabled: false })) }
        : s,
    );
    expect(() =>
      rescheduleAppointment(
        [initialAppointments[0]],
        initialProcedures,
        1,
        date,
        "12:00",
        "admin",
        schedules,
      ),
    ).toThrow("jornada");
  });
  it("admite jornadas fora do antigo limite fixo de 08h–20h", () => {
    const schedules = initialWorkSchedules.map((s) => ({
      ...s,
      days: s.days.map((d) => ({
        ...d,
        enabled: true,
        start: "07:00",
        end: "22:00",
      })),
    }));
    expect(
      getAvailableTimes([], initialProcedures, schedules, prof, date, 60),
    ).toContain("21:00");
    expect(
      rescheduleAppointment(
        [initialAppointments[0]],
        initialProcedures,
        1,
        date,
        "07:00",
        "admin",
        schedules,
      )[0].time,
    ).toBe("07:00");
  });
  it("detecta agendamento existente que ficou fora da jornada", () =>
    expect(fitsWorkSchedule(initialWorkSchedules[0], date, "17:30", 90)).toBe(
      false,
    ));
  it("valida horários de trabalho e ausências invertidas", () => {
    expect(() =>
      validateWorkDays(
        initialWorkSchedules[0].days.map((d) => ({
          ...d,
          start: "18:00",
          end: "09:00",
        })),
      ),
    ).toThrow();
    expect(() =>
      validateRestriction({
        id: 1,
        date,
        allDay: false,
        start: "13:00",
        end: "12:00",
        reason: "",
      }),
    ).toThrow();
  });
  it("ausências e cancelamentos não ocupam horários para novos atendimentos", () => {
    const slots = getAvailableTimes(
      initialAppointments.map((a) => ({ ...a, status: "Não compareceu" })),
      initialProcedures,
      initialWorkSchedules,
      prof,
      date,
      60,
    );
    expect(slots).toContain("09:00");
  });
});
describe("pilha com duração proporcional", () => {
  it("posiciona por início e término usando a soma de serviços", () => {
    const appointment = createAppointment(
      {
        id: 100,
        client: "Teste",
        professional: professionals[0],
        date: "2026-11-11",
        time: "09:15",
      },
      [1, 2],
      initialProcedures,
      [],
      initialWorkSchedules,
    );
    const [event] = timelineLayout([appointment], initialProcedures);
    expect(event.start).toBe(555);
    expect(event.end).toBe(645);
    expect(event.end - event.start).toBe(90);
  });
  it("divide a largura dos conflitos sem deslocar o horário de início", () => {
    const base = initialAppointments[0];
    const placed = timelineLayout(
      [
        base,
        { ...base, id: 20, time: "09:30" },
        { ...base, id: 21, time: "11:00" },
      ],
      initialProcedures,
    );
    expect(placed[0].columns).toBe(2);
    expect(placed[1].column).toBe(1);
    expect(placed[1].start).toBe(570);
    expect(placed[2].columns).toBe(1);
  });
});
describe("períodos hoje, mês e ano", () => {
  const base = initialAppointments[0];
  const items = [
    { ...base, id: 1, date: "2026-11-11" },
    { ...base, id: 2, date: "2026-11-30" },
    { ...base, id: 3, date: "2026-12-01" },
    { ...base, id: 4, date: "2027-01-01" },
  ];
  it("separa os limites do dia, mês e ano", () => {
    expect(filterPeriod(items, "day", "2026-11-11")).toHaveLength(1);
    expect(filterPeriod(items, "month", "2026-11-11")).toHaveLength(2);
    expect(filterPeriod(items, "year", "2026-11-11")).toHaveLength(3);
  });
  it("conta corretamente meses e anos bissextos", () => {
    expect(periodDates("month", "2024-02-01")).toHaveLength(29);
    expect(periodDates("year", "2024-01-01")).toHaveLength(366);
    expect(periodDates("year", "2026-01-01")).toHaveLength(365);
  });
  it("calcula a ocupação pela jornada cadastrada do período", () => {
    expect(
      workCapacity(
        initialWorkSchedules,
        [professionals[0]],
        "day",
        "2026-11-11",
      ),
    ).toBe(540);
    expect(
      workCapacity(
        initialWorkSchedules,
        [professionals[0]],
        "day",
        "2026-11-15",
      ),
    ).toBe(0);
  });
});

describe("cadastro de procedimentos e profissionais separados", () => {
  it("migra habilitação e repasses antigos para os profissionais", () => {
    const records = initialProfessionalRecords(initialProcedures);
    expect(records).toHaveLength(3);
    expect(
      records[0].services.find((s) => s.procedureId === 1)?.commissionRate,
    ).toBe(40);
    expect(Object.keys(cleanProcedure(initialProcedures[0])).sort()).toEqual([
      "duration",
      "id",
      "name",
      "price",
    ]);
    const catalog = initialProcedures.map(cleanProcedure),
      assigned = assignedProcedures(catalog, records);
    expect(assigned[0].professionals).toContain(professionals[0]);
    expect(procedureRate(assigned[0], professionals[0])).toBe(40);
  });
  it("novo procedimento não habilita profissionais automaticamente", () => {
    const catalog = [
      ...initialProcedures.map(cleanProcedure),
      { id: 99, name: "Novo serviço", duration: 30, price: 80 },
    ];
    expect(
      assignedProcedures(
        catalog,
        initialProfessionalRecords(initialProcedures),
      ).find((p) => p.id === 99)?.professionals,
    ).toEqual([]);
  });
  it("cadastra profissional ativo sem serviços e impede nomes duplicados", () => {
    const records = initialProfessionalRecords(initialProcedures),
      record = createProfessional(records, "  Bianca Souza  ", 99, "admin");
    expect(record.name).toBe("Bianca Souza");
    expect(record.active).toBe(true);
    expect(record.services).toEqual([]);
    expect(() =>
      createProfessional(records, " rafael moura ", 99, "admin"),
    ).toThrow("existe");
  });
  it("apenas o administrador cadastra e altera repasses ou acesso", () => {
    const records = initialProfessionalRecords(initialProcedures);
    expect(() =>
      createProfessional(records, "Teste", 99, "professional"),
    ).toThrow("administrador");
    expect(() =>
      updateProfessional(
        records,
        { ...records[0], active: false },
        "professional",
      ),
    ).toThrow("administrador");
    expect(() =>
      updateProfessional(
        records,
        {
          ...records[0],
          services: [{ procedureId: 1, enabled: true, commissionRate: 101 }],
        },
        "admin",
      ),
    ).toThrow("100%");
  });
  it("desabilitar preserva histórico e repasses, mas remove horários e habilitação para novos serviços", () => {
    const records = initialProfessionalRecords(initialProcedures),
      updated = updateProfessional(
        records,
        { ...records[0], active: false },
        "admin",
      );
    expect(updated[0].services).toEqual(records[0].services);
    expect(
      assignedProcedures(initialProcedures.map(cleanProcedure), updated)[0]
        .professionals,
    ).not.toContain(professionals[0]);
    expect(
      getAvailableTimes(
        initialAppointments,
        initialProcedures,
        effectiveSchedules(initialWorkSchedules, updated),
        professionals[0],
        "2026-11-11",
        30,
      ),
    ).toEqual([]);
    expect(initialAppointments[0].professional).toBe(professionals[0]);
  });
  it("configuração individual de serviços e repasses aplica-se aos novos atendimentos", () => {
    const records = initialProfessionalRecords(initialProcedures),
      updated = updateProfessional(
        records,
        {
          ...records[0],
          services: [{ procedureId: 3, enabled: true, commissionRate: 70 }],
        },
        "admin",
      );
    const projected = assignedProcedures(
      initialProcedures.map(cleanProcedure),
      updated,
    );
    expect(projected[0].professionals).not.toContain(professionals[0]);
    expect(projected[2].professionals).toContain(professionals[0]);
    const a = createAppointment(
      {
        id: 99,
        client: "Teste",
        professional: professionals[0],
        date: "2026-11-12",
        time: "09:00",
      },
      [3],
      projected,
      [],
      initialWorkSchedules,
    );
    expect(calculateCommission(a)).toBe(112);
    expect(initialAppointments[0].commissionRate).toBe(40);
  });
  it("permite agenda e visibilidade para um novo profissional sem expor os demais", () => {
    const original = initialProfessionalRecords(initialProcedures),
      created = createProfessional(original, "Bianca Souza", 99, "admin");
    const records = [
        ...original,
        {
          ...created,
          services: [{ procedureId: 1, enabled: true, commissionRate: 30 }],
        },
      ],
      schedule = defaultSchedule(created.name);
    const a = createAppointment(
      {
        id: 99,
        client: "Teste",
        professional: created.name,
        date: "2026-11-12",
        time: "09:00",
      },
      [1],
      assignedProcedures(initialProcedures.map(cleanProcedure), records),
      [],
      [...initialWorkSchedules, schedule],
    );
    expect(
      visibleAppointments(
        [...initialAppointments, a],
        "professional",
        created.name,
      ),
    ).toEqual([a]);
    expect(
      rescheduleAppointment(
        [a],
        initialProcedures,
        a.id,
        a.date,
        "10:00",
        "professional",
        [schedule],
        created.name,
      )[0].time,
    ).toBe("10:00");
  });
});
