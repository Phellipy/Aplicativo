import { describe, it, expect } from "vitest";
import {
  appointmentsInAgenda,
  filterPeriod,
  getAvailableTimes,
  initialAppointments,
  initialProcedures,
  initialWorkSchedules,
} from "./domain";
const booked = {
  ...initialAppointments[0],
  date: "2026-11-13",
  time: "09:00",
  duration: 30,
  services: undefined,
  status: "Confirmado",
};
const cancelled = { ...booked, status: "Cancelado" };
describe("cancelamento libera a agenda visual e o horário", () => {
  it("oculta cancelados em todos os períodos sem excluir o histórico", () => {
    const history = [cancelled, { ...booked, id: 999, time: "10:00" }];
    for (const period of ["day", "week", "month", "year"] as const) {
      const shown = filterPeriod(
        appointmentsInAgenda(history),
        period,
        booked.date,
      );
      expect(shown).toHaveLength(1);
      expect(shown[0].id).toBe(999);
    }
    expect(history).toHaveLength(2);
    expect(history[0].status).toBe("Cancelado");
  });
  it("libera o mesmo horário para um novo atendimento após cancelar", () => {
    const available = (appointments: (typeof booked)[]) =>
      getAvailableTimes(
        appointments,
        initialProcedures,
        initialWorkSchedules,
        booked.professional,
        booked.date,
        30,
      );
    expect(available([booked])).not.toContain("09:00");
    expect(available([cancelled])).toContain("09:00");
  });
});
