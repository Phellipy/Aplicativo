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
  (a.value * a.commissionRate) / 100;

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
      a.status !== "Cancelado" &&
      start <
        minutes(a.time) +
          (procedures.find((p) => p.name === a.procedure)?.duration ?? 60) &&
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

export function agendaHours(appointments: Appointment[]) {
  const hours = appointments.map((a) => Number(a.time.slice(0, 2)));
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
  if (!/^(?:0[8-9]|1\d|20):(?:00|15|30|45)$/.test(time) || time > "20:00")
    throw new Error(
      "Escolha um horário entre 08:00 e 20:00, em intervalos de 15 minutos.",
    );
  const duration =
    procedures.find((p) => p.name === appointment.procedure)?.duration ?? 60;
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
  return appointments.map((item) =>
    item.id === id ? { ...item, date, time } : item,
  );
}
