export type Role = "admin" | "professional";
export const paymentMethods = [
  "Dinheiro",
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type Appointment = {
  id: number;
  client: string;
  professional: string;
  procedure: string;
  date: string;
  time: string;
  value: number;
  commissionRate: number;
  status: string;
  paymentMethod?: PaymentMethod;
  services?: AppointmentService[];
  duration?: number;
};
export type AppointmentService = {
  procedureId: number;
  name: string;
  duration: number;
  price: number;
  commissionRate: number;
};
export type WorkDay = {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
};
export type Restriction = {
  id: number;
  date: string;
  allDay: boolean;
  start: string;
  end: string;
  reason: string;
};
export type WorkSchedule = {
  professional: string;
  days: WorkDay[];
  restrictions: Restriction[];
};
export type Client = {
  id: number;
  name: string;
  phone: string;
  lastVisit: string;
  consent: boolean;
};
export type Procedure = {
  id: number;
  name: string;
  duration: number;
  price: number;
  professionals: string[];
  commission: number;
  individualRates?: Record<string, number>;
};
export type Campaign = {
  clientId: number;
  status: "pending" | "approved";
  created: string;
  message?: string;
};
export const TODAY = "2026-11-11";
export const professionals = ["Rafael Moura", "Diego Alves", "Lucas Pires"];
export const initialClients: Client[] = [
  {
    id: 1,
    name: "Marcos Teixeira",
    phone: "(11) 99999-0101",
    consent: true,
    lastVisit: "2026-11-09",
  },
  {
    id: 2,
    name: "Gustavo Lima",
    phone: "(11) 99999-0102",
    consent: true,
    lastVisit: "2026-09-20",
  },
  {
    id: 3,
    name: "André Luz",
    phone: "(11) 99999-0103",
    consent: true,
    lastVisit: "2026-11-05",
  },
  {
    id: 4,
    name: "Carlos Nery",
    phone: "(11) 99999-0104",
    consent: true,
    lastVisit: "2026-10-01",
  },
  {
    id: 5,
    name: "Paulo Ribeiro",
    phone: "(11) 99999-0105",
    consent: true,
    lastVisit: "2026-11-10",
  },
];
export const initialProcedures: Procedure[] = [
  {
    id: 1,
    name: "Corte + barba",
    duration: 60,
    price: 180,
    professionals: [professionals[0], professionals[1]],
    commission: 40,
  },
  {
    id: 2,
    name: "Barba",
    duration: 30,
    price: 65,
    professionals: [professionals[0], professionals[2]],
    commission: 50,
  },
  {
    id: 3,
    name: "Corte degradê",
    duration: 60,
    price: 160,
    professionals: [professionals[1]],
    commission: 45,
  },
  {
    id: 4,
    name: "Corte",
    duration: 60,
    price: 90,
    professionals: [professionals[2]],
    commission: 50,
  },
];
export const initialAppointments: Appointment[] = [
  {
    id: 1,
    client: "Marcos Teixeira",
    professional: professionals[0],
    procedure: "Corte + barba",
    date: TODAY,
    time: "09:00",
    value: 180,
    commissionRate: 40,
    status: "Agendado",
  },
  {
    id: 2,
    client: "André Luz",
    professional: professionals[1],
    procedure: "Corte degradê",
    date: TODAY,
    time: "10:00",
    value: 160,
    commissionRate: 45,
    status: "Agendado",
  },
  {
    id: 3,
    client: "Paulo Ribeiro",
    professional: professionals[2],
    procedure: "Corte",
    date: TODAY,
    time: "11:00",
    value: 90,
    commissionRate: 50,
    status: "Agendado",
  },
  {
    id: 4,
    client: "Gustavo Lima",
    professional: professionals[0],
    procedure: "Barba",
    date: TODAY,
    time: "14:00",
    value: 65,
    commissionRate: 50,
    status: "Agendado",
  },
  {
    id: 5,
    client: "Carlos Nery",
    professional: professionals[1],
    procedure: "Corte + barba",
    date: TODAY,
    time: "15:30",
    value: 180,
    commissionRate: 40,
    status: "Agendado",
  },
];
export const visibleAppointments = (items: Appointment[], role: Role) =>
  role === "admin"
    ? items
    : items.filter((a) => a.professional === professionals[0]);
export const eligibleClients = (
  clients: Client[],
  campaigns: Campaign[],
  now = TODAY,
) =>
  clients.filter(
    (c) =>
      c.consent &&
      Math.floor((Date.parse(now) - Date.parse(c.lastVisit)) / 86400000) >=
        30 &&
      !campaigns.some((m) => m.clientId === c.id),
  );
export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const calculateCommission = (a: Appointment) =>
  a.services?.length
    ? a.services.reduce(
        (sum, service) => sum + (service.price * service.commissionRate) / 100,
        0,
      )
    : (a.value * a.commissionRate) / 100;

export const procedureRate = (procedure: Procedure, professional: string) =>
  procedure.individualRates?.[professional] ?? procedure.commission;
export function hasConflict(
  items: Appointment[],
  procedures: Procedure[],
  professional: string,
  date: string,
  time: string,
  duration: number,
) {
  const minutes = (value: string) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const start = minutes(time);
  return items.some(
    (a) =>
      a.professional === professional &&
      a.date === date &&
      !["Cancelado", "Não compareceu"].includes(a.status) &&
      start < minutes(a.time) + appointmentDuration(a, procedures) &&
      start + duration > minutes(a.time),
  );
}

export function recordPayment(
  appointment: Appointment,
  method: string,
): Appointment {
  if (method && !paymentMethods.includes(method as PaymentMethod))
    throw new Error("Forma de pagamento inválida");
  return {
    ...appointment,
    paymentMethod: method ? (method as PaymentMethod) : undefined,
  };
}
export const receivedTotal = (appointments: Appointment[]) =>
  appointments
    .filter((a) => a.status === "Concluído" && a.paymentMethod)
    .reduce((total, a) => total + a.value, 0);

export function completeAppointment(
  appointment: Appointment,
  method: string,
): Appointment {
  if (["Cancelado", "Não compareceu"].includes(appointment.status))
    throw new Error("Este atendimento não pode ser concluído");
  return { ...recordPayment(appointment, method), status: "Concluído" };
}

// Compatibilidade com registros da demonstração anterior, sem etapa extra na agenda.
export const normalizeAppointments = (
  appointments: Appointment[],
): Appointment[] =>
  appointments.map((appointment) =>
    appointment.status === "Em atendimento"
      ? { ...appointment, status: "Confirmado" }
      : appointment.status === "Pendente"
        ? { ...appointment, status: "Agendado" }
        : appointment,
  );

export function agendaHours(
  appointments: Appointment[],
  extraTimes: string[] = [],
) {
  const hours = [...appointments.map((a) => a.time), ...extraTimes].map(
    (time) => Number(time.slice(0, 2)),
  );
  const first = Math.min(8, ...hours);
  const last = Math.max(20, ...hours);
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const hour = first + index;
    return {
      label: `${String(hour).padStart(2, "0")}:00`,
      appointments: appointments
        .filter((a) => Number(a.time.slice(0, 2)) === hour)
        .sort(
          (a, b) =>
            a.time.localeCompare(b.time) ||
            a.professional.localeCompare(b.professional),
        ),
    };
  });
}
export const agendaStatusTone = (status: string) =>
  ({
    Agendado: "scheduled",
    Confirmado: "confirmed",
    Concluído: "completed",
    Cancelado: "cancelled",
    "Não compareceu": "absent",
  })[status] || "absent";

export const canReschedule = (appointment: Appointment) =>
  ["Agendado", "Confirmado"].includes(appointment.status);

export function rescheduleAppointment(
  appointments: Appointment[],
  procedures: Procedure[],
  id: number,
  date: string,
  time: string,
  role: Role,
  schedules: WorkSchedule[] = initialWorkSchedules,
): Appointment[] {
  const appointment = appointments.find((item) => item.id === id);
  if (
    !appointment ||
    (role === "professional" && appointment.professional !== professionals[0])
  )
    throw new Error("Atendimento indisponível para este perfil demonstrativo.");
  if (!canReschedule(appointment))
    throw new Error(
      "Só é possível reagendar atendimentos agendados ou confirmados.",
    );
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  if (!validDate) throw new Error("Escolha uma data válida.");
  if (!/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(time))
    throw new Error("Escolha um horário válido, em intervalos de 15 minutos.");
  const duration = appointmentDuration(appointment, procedures);
  if (
    hasConflict(
      appointments.filter((item) => item.id !== id),
      procedures,
      appointment.professional,
      date,
      time,
      duration,
    )
  )
    throw new Error(
      "Há um conflito na agenda deste profissional. O horário original foi mantido.",
    );
  if (
    !getAvailableTimes(
      appointments,
      procedures,
      schedules,
      appointment.professional,
      date,
      duration,
      id,
    ).includes(time)
  )
    throw new Error(
      "Horário indisponível na jornada do profissional ou bloqueado por uma ausência. O horário original foi mantido.",
    );
  return appointments.map((item) =>
    item.id === id ? { ...item, date, time } : item,
  );
}

export const weekdayLabels = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
export const initialWorkSchedules: WorkSchedule[] = professionals.map(
  (professional) => ({
    professional,
    days: weekdayLabels.map((_, day) => ({
      day,
      enabled: day !== 0,
      start: "09:00",
      end: day === 6 ? "13:00" : "18:00",
    })),
    restrictions: [],
  }),
);
export const timeMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const minuteTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const validDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;
export const validTime = (time: string) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
export const appointmentDuration = (
  appointment: Appointment,
  procedures: Procedure[],
) =>
  appointment.services?.length
    ? appointment.services.reduce((sum, service) => sum + service.duration, 0)
    : (appointment.duration ??
      procedures.find((p) => p.name === appointment.procedure)?.duration ??
      60);
export function fitsWorkSchedule(
  schedule: WorkSchedule | undefined,
  date: string,
  time: string,
  duration: number,
) {
  if (!schedule || !validDate(date) || !validTime(time) || duration <= 0)
    return false;
  const day = schedule.days.find(
    (d) => d.day === new Date(`${date}T12:00:00Z`).getUTCDay(),
  );
  if (!day?.enabled || !validTime(day.start) || !validTime(day.end))
    return false;
  const start = timeMinutes(time),
    end = start + duration;
  if (start < timeMinutes(day.start) || end > timeMinutes(day.end))
    return false;
  return !schedule.restrictions.some(
    (block) =>
      block.date === date &&
      (block.allDay ||
        (start < timeMinutes(block.end) && end > timeMinutes(block.start))),
  );
}
export function getAvailableTimes(
  appointments: Appointment[],
  procedures: Procedure[],
  schedules: WorkSchedule[],
  professional: string,
  date: string,
  duration: number,
  excludeId?: number,
) {
  const schedule = schedules.find((s) => s.professional === professional);
  if (
    !schedule ||
    !validDate(date) ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    return [];
  const day = schedule.days.find(
    (d) => d.day === new Date(`${date}T12:00:00Z`).getUTCDay(),
  );
  if (!day?.enabled || !validTime(day.start) || !validTime(day.end)) return [];
  const slots: string[] = [];
  for (
    let start = Math.ceil(timeMinutes(day.start) / 15) * 15;
    start + duration <= timeMinutes(day.end);
    start += 15
  ) {
    const time = minuteTime(start);
    if (
      fitsWorkSchedule(schedule, date, time, duration) &&
      !hasConflict(
        appointments.filter((a) => a.id !== excludeId),
        procedures,
        professional,
        date,
        time,
        duration,
      )
    )
      slots.push(time);
  }
  return slots;
}
export function createAppointment(
  input: Pick<Appointment, "id" | "client" | "professional" | "date" | "time">,
  ids: number[],
  procedures: Procedure[],
  appointments: Appointment[],
  schedules: WorkSchedule[],
): Appointment {
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new Error("Selecione um ou mais procedimentos sem repetição.");
  const selected = ids.map((id) => procedures.find((p) => p.id === id));
  if (selected.some((p) => !p || !p.professionals.includes(input.professional)))
    throw new Error(
      "Selecione apenas procedimentos habilitados para este profissional.",
    );
  const services: AppointmentService[] = selected.map((p) => ({
    procedureId: p!.id,
    name: p!.name,
    duration: p!.duration,
    price: p!.price,
    commissionRate: procedureRate(p!, input.professional),
  }));
  const duration = services.reduce((sum, s) => sum + s.duration, 0),
    value = services.reduce((sum, s) => sum + s.price, 0);
  if (
    !getAvailableTimes(
      appointments,
      procedures,
      schedules,
      input.professional,
      input.date,
      duration,
    ).includes(input.time)
  )
    throw new Error(
      "Este horário não está disponível para a duração total dos procedimentos. Escolha outro horário.",
    );
  return {
    ...input,
    services,
    duration,
    value,
    commissionRate: value
      ? services.reduce((sum, s) => sum + s.price * s.commissionRate, 0) / value
      : 0,
    procedure: services.map((s) => s.name).join(" + "),
    status: "Agendado",
  };
}
export function validateWorkDays(days: WorkDay[]) {
  if (
    days.length !== 7 ||
    new Set(days.map((d) => d.day)).size !== 7 ||
    days.some((d) => d.day < 0 || d.day > 6)
  )
    throw new Error("Configure os sete dias da semana.");
  if (
    days.some(
      (d) =>
        d.enabled &&
        (!validTime(d.start) ||
          !validTime(d.end) ||
          timeMinutes(d.start) >= timeMinutes(d.end)),
    )
  )
    throw new Error(
      "O fim da jornada deve ser depois do início em cada dia ativo.",
    );
}
export function validateRestriction(block: Restriction) {
  if (!validDate(block.date))
    throw new Error("Escolha uma data válida para a ausência.");
  if (
    !block.allDay &&
    (!validTime(block.start) ||
      !validTime(block.end) ||
      timeMinutes(block.start) >= timeMinutes(block.end))
  )
    throw new Error("O fim da ausência deve ser depois do início.");
}

export function timelineLayout(
  appointments: Appointment[],
  procedures: Procedure[],
) {
  type Placed = {
    appointment: Appointment;
    start: number;
    end: number;
    column: number;
    columns: number;
  };
  const placed: Placed[] = [];
  for (const professional of new Set(appointments.map((a) => a.professional))) {
    const sorted = appointments
      .filter((a) => a.professional === professional)
      .map((appointment) => ({
        appointment,
        start: timeMinutes(appointment.time),
        end:
          timeMinutes(appointment.time) +
          appointmentDuration(appointment, procedures),
      }))
      .sort((a, b) => a.start - b.start || a.appointment.id - b.appointment.id);
    let group: Placed[] = [],
      ends: number[] = [],
      groupEnd = -1;
    const finish = () => {
      for (const item of group) item.columns = ends.length;
      placed.push(...group);
      group = [];
      ends = [];
      groupEnd = -1;
    };
    for (const item of sorted) {
      if (group.length && item.start >= groupEnd) finish();
      let column = ends.findIndex((end) => end <= item.start);
      if (column < 0) column = ends.length;
      ends[column] = item.end;
      group.push({ ...item, column, columns: 1 });
      groupEnd = Math.max(groupEnd, item.end);
    }
    finish();
  }
  return placed;
}

export type Period = "day" | "month" | "year";
export function filterPeriod(
  appointments: Appointment[],
  period: Period,
  date: string,
) {
  if (!validDate(date)) return [];
  const length = period === "day" ? 10 : period === "month" ? 7 : 4;
  return appointments.filter(
    (a) => a.date.slice(0, length) === date.slice(0, length),
  );
}
export function periodDates(period: Period, date: string) {
  if (!validDate(date)) return [];
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7)) - 1;
  const start =
    period === "day"
      ? Date.parse(date)
      : period === "month"
        ? Date.UTC(year, month, 1)
        : Date.UTC(year, 0, 1);
  const end =
    period === "day"
      ? start + 86400000
      : period === "month"
        ? Date.UTC(year, month + 1, 1)
        : Date.UTC(year + 1, 0, 1);
  const dates: string[] = [];
  for (let timestamp = start; timestamp < end; timestamp += 86400000)
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  return dates;
}
export const periodLabel = (period: Period, date: string) =>
  !validDate(date)
    ? "Período inválido"
    : period === "day"
      ? date.split("-").reverse().join("/")
      : period === "month"
        ? new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${date}T12:00:00Z`))
        : date.slice(0, 4);
export function workCapacity(
  schedules: WorkSchedule[],
  names: string[],
  period: Period,
  date: string,
) {
  return periodDates(period, date).reduce(
    (sum, day) =>
      sum +
      names.reduce(
        (minutes, name) =>
          minutes +
          getAvailableTimes([], [], schedules, name, day, 15).length * 15,
        0,
      ),
    0,
  );
}
