import {
  createAppointment,
  validDate,
  type Appointment,
  type Procedure,
  type WorkSchedule,
} from "./domain";

export function recurrenceDates(
  start: string,
  end: string,
  weekdays: number[],
): string[] {
  if (!validDate(start) || !validDate(end) || end < start)
    throw new Error("Informe um período válido para a recorrência.");
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 365)
    throw new Error("A recorrência pode abranger no máximo um ano.");
  if (
    !weekdays.length ||
    weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  )
    throw new Error("Marque pelo menos um dia da semana.");
  const dates: string[] = [];
  for (
    let timestamp = Date.parse(start);
    timestamp <= Date.parse(end);
    timestamp += 86400000
  ) {
    const date = new Date(timestamp);
    if (weekdays.includes(date.getUTCDay()))
      dates.push(date.toISOString().slice(0, 10));
  }
  if (!dates.length)
    throw new Error("Não há dias selecionados dentro deste período.");
  return dates;
}

// Validate the whole series before the caller stores anything.
export function createRecurringAppointments(
  input: Pick<Appointment, "id" | "client" | "professional" | "date" | "time">,
  end: string,
  weekdays: number[],
  ids: number[],
  procedures: Procedure[],
  appointments: Appointment[],
  schedules: WorkSchedule[],
): Appointment[] {
  const dates = recurrenceDates(input.date, end, weekdays);
  const created: Appointment[] = [];
  const blocked: string[] = [];
  dates.forEach((date, index) => {
    try {
      created.push(
        createAppointment(
          { ...input, id: input.id + index, date },
          ids,
          procedures,
          [...appointments, ...created],
          schedules,
        ),
      );
    } catch (error) {
      blocked.push(
        `${date.split("-").reverse().join("/")}: ${(error as Error).message}`,
      );
    }
  });
  if (blocked.length)
    throw new Error(
      `Nenhum atendimento foi salvo. Revise ${blocked.length} data(s) indisponível(is): ${blocked.slice(0, 3).join("; ")}${blocked.length > 3 ? "; e outras datas." : ""}`,
    );
  return created;
}
