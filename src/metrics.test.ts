import { describe, it, expect } from "vitest";
import {
  formatPercentage,
  metricsReport,
  occupationStats,
  reportDates,
} from "./metrics";
import {
  initialAppointments,
  initialProcedures,
  initialWorkSchedules,
  professionals,
  type Appointment,
  type WorkSchedule,
} from "./domain";
const date = "2026-11-11",
  name = professionals[0];
const schedule: WorkSchedule = {
  professional: name,
  days: initialWorkSchedules[0].days.map((day) => ({
    ...day,
    start: "09:00",
    end: "17:00",
  })),
  restrictions: [],
};
const a = (
  id: number,
  time: string,
  status = "Concluído",
  extra: Partial<Appointment> = {},
): Appointment => ({
  ...initialAppointments[0],
  id,
  client: "Cliente A",
  time,
  status,
  date,
  duration: 60,
  value: 100,
  commissionRate: 40,
  ...extra,
});
describe("ocupação realizada", () => {
  it("compara tempo concluído com a jornada total, sem incluir futuros ou faltas", () => {
    const result = occupationStats(
      [
        a(1, "09:00"),
        a(2, "11:00"),
        a(3, "13:00", "Confirmado"),
        a(4, "14:00", "Agendado"),
        a(5, "15:00", "Não compareceu"),
      ],
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result).toEqual({
      availableMinutes: 480,
      occupiedMinutes: 120,
      rate: 25,
    });
  });
  it("não conta sobreposições duas vezes", () => {
    const result = occupationStats(
      [a(1, "09:00"), a(2, "09:30")],
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result.occupiedMinutes).toBe(90);
    expect(result.rate).toBe(18.75);
  });
  it("conta jornadas simultâneas de profissionais distintos", () => {
    const result = occupationStats(
      [
        a(1, "09:00"),
        a(2, "11:00"),
        a(3, "09:00", "Concluído", { professional: professionals[1] }),
      ],
      initialProcedures,
      [schedule, { ...schedule, professional: professionals[1] }],
      [name, professionals[1]],
      "day",
      date,
    );
    expect(result.availableMinutes).toBe(960);
    expect(result.occupiedMinutes).toBe(180);
    expect(result.rate).toBe(18.75);
  });
  it("desconta pausas e não duplica restrições sobrepostas", () => {
    const restricted = {
      ...schedule,
      restrictions: [
        {
          id: 1,
          date,
          allDay: false,
          start: "12:00",
          end: "13:00",
          reason: "",
        },
        {
          id: 2,
          date,
          allDay: false,
          start: "12:30",
          end: "14:00",
          reason: "",
        },
      ],
    };
    const result = occupationStats(
      [a(1, "11:30", "Concluído", { duration: 90 })],
      initialProcedures,
      [restricted],
      [name],
      "day",
      date,
    );
    expect(result.availableMinutes).toBe(360);
    expect(result.occupiedMinutes).toBe(30);
    expect(result.rate).toBeCloseTo(8.3333);
  });
  it("limita a ocupação à jornada mesmo se registros antigos extrapolarem", () => {
    const result = occupationStats(
      [a(1, "08:00", "Concluído", { duration: 600 })],
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result.rate).toBe(100);
    expect(result.occupiedMinutes).toBe(480);
  });
  it("usa os serviços fixados e não a duração editada posteriormente", () => {
    const result = occupationStats(
      [
        a(1, "09:00", "Concluído", {
          services: [
            {
              procedureId: 1,
              name: "A",
              duration: 60,
              price: 100,
              commissionRate: 40,
            },
            {
              procedureId: 2,
              name: "B",
              duration: 30,
              price: 50,
              commissionRate: 30,
            },
          ],
        }),
      ],
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result.occupiedMinutes).toBe(90);
  });
  it("distingue ausência de jornada de ocupação zero", () => {
    expect(
      occupationStats([], initialProcedures, [schedule], [name], "day", date)
        .rate,
    ).toBe(0);
    expect(
      occupationStats([], initialProcedures, [], [name], "day", date).rate,
    ).toBeNull();
    expect(
      occupationStats(
        [],
        initialProcedures,
        [
          {
            ...schedule,
            restrictions: [
              {
                id: 1,
                date,
                allDay: true,
                start: "00:00",
                end: "23:59",
                reason: "",
              },
            ],
          },
        ],
        [name],
        "day",
        date,
      ).rate,
    ).toBeNull();
  });
  it("aplica apenas os profissionais e o período selecionados", () => {
    const result = occupationStats(
      [
        a(1, "09:00"),
        a(2, "11:00", "Concluído", { date: "2026-11-12" }),
        a(3, "13:00", "Concluído", { professional: professionals[1] }),
      ],
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result.occupiedMinutes).toBe(60);
  });
});
describe("relatórios de métricas", () => {
  const records = [
    a(1, "09:00", "Concluído", { paymentMethod: "Pix" }),
    a(2, "11:00", "Concluído", {
      value: 200,
      commissionRate: 50,
      paymentMethod: "Cartão de crédito",
    }),
    a(3, "15:00", "Concluído", { client: "Cliente B", value: 50 }),
    a(4, "14:00", "Não compareceu", { client: "Cliente B" }),
    a(5, "13:00", "Confirmado", {
      client: "Cliente C",
      value: 300,
      paymentMethod: "Dinheiro",
    }),
    a(6, "16:00", "Cancelado", { client: "Cliente D" }),
  ];
  const report = (period: "day" | "week" | "month" | "year" = "day") =>
    metricsReport(records, initialProcedures, [schedule], [name], period, date);
  it("separa serviços concluídos, recebimento, a receber e repasses", () => {
    const result = report();
    expect(result.serviceValue).toBe(350);
    expect(result.received).toBe(300);
    expect(result.unpaid).toBe(50);
    expect(result.commissions).toBe(160);
    expect(result.paidCommission).toBe(140);
    expect(result.net).toBe(160);
    expect(result.ticket).toBeCloseTo(350 / 3);
  });
  it("não inclui pagamentos de serviços ainda não concluídos na pizza", () => {
    const result = report();
    expect(result.payments.find((p) => p.name === "Pix")?.value).toBe(100);
    expect(result.payments.find((p) => p.name === "Cartão")?.value).toBe(200);
    expect(result.payments.find((p) => p.name === "Dinheiro")?.value).toBe(0);
    expect(result.payments.reduce((sum, p) => sum + p.value, 0)).toBe(
      result.received,
    );
  });
  it("agrupa crédito e débito como cartão", () => {
    const result = metricsReport(
      [
        a(1, "09:00", "Concluído", { paymentMethod: "Cartão de crédito" }),
        a(2, "11:00", "Concluído", { paymentMethod: "Cartão de débito" }),
      ],
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result.payments.find((p) => p.name === "Cartão")).toMatchObject({
      count: 2,
      value: 200,
    });
  });
  it("ordena os clientes por visitas concluídas e apresenta faltas separadamente", () => {
    const result = report();
    expect(result.topClients.map((c) => c.name)).toEqual([
      "Cliente A",
      "Cliente B",
    ]);
    expect(result.topClients[0].visits).toBe(2);
    expect(result.mostMissed[0]).toMatchObject({
      name: "Cliente B",
      missed: 1,
      visits: 1,
      absenceRate: 50,
    });
    expect(result.missRate).toBe(25);
  });
  it("limita os rankings a 10 clientes sem inventar posições vazias", () => {
    const result = metricsReport(
      Array.from({ length: 12 }, (_, i) =>
        a(i, "09:00", "Concluído", { client: `Cliente ${i}` }),
      ),
      initialProcedures,
      [schedule],
      [name],
      "day",
      date,
    );
    expect(result.topClients).toHaveLength(10);
    expect(result.mostMissed).toEqual([]);
  });
  it.each(["week", "month", "year"] as const)(
    "agrega corretamente %s",
    (period) => {
      const result = report(period);
      expect(result.buckets.reduce((sum, b) => sum + b.completed, 0)).toBe(3);
      expect(result.buckets.reduce((sum, b) => sum + b.missed, 0)).toBe(1);
      expect(result.buckets.reduce((sum, b) => sum + b.received, 0)).toBe(300);
    },
  );
  it("usa segunda a domingo, inclusive em semana entre anos", () => {
    const dates = reportDates("week", "2027-01-01");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-12-28");
    expect(dates[6]).toBe("2027-01-03");
    expect(reportDates("week", "inválido")).toEqual([]);
  });
  it("expõe estados vazios sem receitas ou taxas fictícias", () => {
    const result = metricsReport(
      [],
      initialProcedures,
      [schedule],
      [name],
      "month",
      date,
    );
    expect(result.received).toBe(0);
    expect(result.ticket).toBe(0);
    expect(result.missRate).toBeNull();
    expect(result.topClients).toEqual([]);
    expect(result.mostMissed).toEqual([]);
  });
});

it("mostra ocupação positiva pequena sem arredondá-la a zero", () => {
  expect(formatPercentage((60 / 153360) * 100)).toBe("0,04%");
  expect(formatPercentage(0.001)).toBe("<0,01%");
  expect(formatPercentage(0)).toBe("0%");
  expect(formatPercentage(null)).toBe("—");
});
