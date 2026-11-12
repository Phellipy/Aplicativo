import { describe, it, expect } from "vitest";
import { recurrenceDates, createRecurringAppointments } from "./recurrence";
import {
  initialProcedures,
  initialWorkSchedules,
  professionals,
} from "./domain";

const input = {
  id: 10000,
  client: "Cliente teste",
  professional: professionals[0],
  date: "2026-11-16",
  time: "09:00",
};
const create = (end: string, days: number[]) =>
  createRecurringAppointments(
    input,
    end,
    days,
    [1, 2],
    initialProcedures,
    [],
    initialWorkSchedules,
  );
describe("agendamento recorrente", () => {
  it("gera segundas e terças inclusive até a data final", () => {
    expect(recurrenceDates("2026-11-15", "2026-11-24", [1, 2])).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-23",
      "2026-11-24",
    ]);
  });
  it("não duplica dias marcados e atravessa a virada do ano", () => {
    expect(recurrenceDates("2026-12-28", "2027-01-04", [1, 1])).toEqual([
      "2026-12-28",
      "2027-01-04",
    ]);
  });
  it.each([
    ["2026-11-16", "2026-11-15", [1]],
    ["2026-02-30", "2026-11-16", [1]],
    ["2026-11-16", "2027-11-17", [1]],
    ["2026-11-16", "2026-11-17", []],
    ["2026-11-16", "2026-11-17", [7]],
    ["2026-11-16", "2026-11-17", [0]],
  ] as [string, string, number[]][])(
    "rejeita período ou dias inválidos",
    (start, end, days) => {
      expect(() => recurrenceDates(start, end, days)).toThrow();
    },
  );
  it("cria ocorrências independentes agendadas com serviços e ids únicos", () => {
    const results = create("2026-11-24", [1, 2]);
    expect(results).toHaveLength(4);
    expect(new Set(results.map((a) => a.id)).size).toBe(4);
    expect(
      results.every(
        (a) =>
          a.status === "Agendado" &&
          a.duration === 90 &&
          a.value === 245 &&
          a.time === "09:00",
      ),
    ).toBe(true);
  });
  it("bloqueia toda a série se houver conflito futuro e não altera dados existentes", () => {
    const existing = create("2026-11-24", [1, 2]).slice(-1);
    const snapshot = JSON.stringify(existing);
    expect(() =>
      createRecurringAppointments(
        input,
        "2026-11-24",
        [1, 2],
        [1],
        initialProcedures,
        existing,
        initialWorkSchedules,
      ),
    ).toThrow("24/11/2026");
    expect(JSON.stringify(existing)).toBe(snapshot);
  });
  it("respeita ausências e dias fora da jornada", () => {
    const schedules = initialWorkSchedules.map((s) => ({
      ...s,
      restrictions: [
        ...s.restrictions,
        {
          id: 999,
          date: "2026-11-23",
          allDay: true,
          start: "09:00",
          end: "18:00",
          reason: "Ausência",
        },
      ],
    }));
    expect(() =>
      createRecurringAppointments(
        input,
        "2026-11-24",
        [1, 2],
        [1],
        initialProcedures,
        [],
        schedules,
      ),
    ).toThrow("23/11/2026");
    expect(() => create("2026-11-22", [0])).toThrow(
      "Nenhum atendimento foi salvo",
    );
  });
});
