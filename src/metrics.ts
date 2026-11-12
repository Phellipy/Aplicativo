import {
  appointmentDuration,
  calculateCommission,
  periodDates,
  validDate,
  timeMinutes,
  type Appointment,
  type Procedure,
  type WorkSchedule,
  type Period,
} from "./domain";
export type MetricsPeriod = Period | "week";
export const formatPercentage = (value: number | null) =>
  value === null
    ? "—"
    : value > 0 && value < 0.01
      ? "<0,01%"
      : `${value.toLocaleString("pt-BR", { maximumFractionDigits: value > 0 && value < 1 ? 2 : 1 })}%`;
export const hours = (minutes: number) =>
  `${(minutes / 60).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h`;
export function reportDates(period: MetricsPeriod, date: string): string[] {
  if (period !== "week") return periodDates(period, date);
  if (!validDate(date)) return [];
  const reference = new Date(`${date}T00:00:00Z`),
    offset = (reference.getUTCDay() + 6) % 7;
  const first = reference.getTime() - offset * 86400000;
  return Array.from({ length: 7 }, (_, i) =>
    new Date(first + i * 86400000).toISOString().slice(0, 10),
  );
}
type Interval = [number, number];
function availableIntervals(
  schedule: WorkSchedule | undefined,
  date: string,
): Interval[] {
  if (!schedule) return [];
  const day = schedule.days.find(
    (d) => d.day === new Date(`${date}T12:00:00Z`).getUTCDay(),
  );
  if (!day?.enabled || timeMinutes(day.end) <= timeMinutes(day.start))
    return [];
  let intervals: Interval[] = [[timeMinutes(day.start), timeMinutes(day.end)]];
  for (const restriction of schedule.restrictions.filter(
    (r) => r.date === date,
  )) {
    if (restriction.allDay) return [];
    const start = timeMinutes(restriction.start),
      end = timeMinutes(restriction.end);
    intervals = intervals.flatMap(([left, right]): Interval[] =>
      end <= left || start >= right
        ? [[left, right]]
        : [
            ...(start > left
              ? [[left, Math.min(start, right)] as Interval]
              : []),
            ...(end < right ? [[Math.max(end, left), right] as Interval] : []),
          ],
    );
  }
  return intervals;
}
function unionLength(intervals: Interval[]) {
  const sorted = intervals
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = 0,
    end = 0,
    initialized = false;
  for (const [left, right] of sorted) {
    if (!initialized) {
      start = left;
      end = right;
      initialized = true;
    } else if (left <= end) end = Math.max(end, right);
    else {
      total += end - start;
      start = left;
      end = right;
    }
  }
  return total + (initialized ? end - start : 0);
}
export function occupationStats(
  appointments: Appointment[],
  procedures: Procedure[],
  schedules: WorkSchedule[],
  names: string[],
  period: MetricsPeriod,
  date: string,
) {
  let availableMinutes = 0,
    occupiedMinutes = 0;
  const dates = reportDates(period, date),
    dateSet = new Set(dates),
    nameSet = new Set(names);
  const completedByDay = new Map<string, Appointment[]>();
  const scheduleByName = new Map(
    schedules.map((schedule) => [schedule.professional, schedule]),
  );
  for (const appointment of appointments) {
    if (
      appointment.status !== "Concluído" ||
      !dateSet.has(appointment.date) ||
      !nameSet.has(appointment.professional)
    )
      continue;
    const key = `${appointment.date}::${appointment.professional}`;
    const bucket = completedByDay.get(key) ?? [];
    bucket.push(appointment);
    completedByDay.set(key, bucket);
  }
  for (const day of dates)
    for (const name of nameSet) {
      const availability = availableIntervals(scheduleByName.get(name), day);
      availableMinutes += availability.reduce(
        (sum, [start, end]) => sum + end - start,
        0,
      );
      const completed = completedByDay.get(`${day}::${name}`) ?? [];
      const intersections: Interval[] = [];
      for (const a of completed) {
        const start = timeMinutes(a.time),
          end = start + appointmentDuration(a, procedures);
        for (const [left, right] of availability) {
          const from = Math.max(left, start),
            to = Math.min(right, end);
          if (to > from) intersections.push([from, to]);
        }
      }
      occupiedMinutes += unionLength(intersections);
    }
  return {
    availableMinutes,
    occupiedMinutes,
    rate: availableMinutes ? (occupiedMinutes / availableMinutes) * 100 : null,
  };
}
export type MetricBucket = {
  key: string;
  label: string;
  completed: number;
  missed: number;
  received: number;
  net: number;
};
export function metricsReport(
  appointments: Appointment[],
  procedures: Procedure[],
  schedules: WorkSchedule[],
  names: string[],
  period: MetricsPeriod,
  date: string,
) {
  const dates = reportDates(period, date),
    set = new Set(dates),
    people = new Set(names);
  const items = appointments.filter(
    (a) => people.has(a.professional) && set.has(a.date),
  );
  const completed = items.filter((a) => a.status === "Concluído"),
    paid = completed.filter((a) => a.paymentMethod),
    missed = items.filter((a) => a.status === "Não compareceu");
  const received = paid.reduce((sum, a) => sum + a.value, 0),
    serviceValue = completed.reduce((sum, a) => sum + a.value, 0),
    paidCommission = paid.reduce((sum, a) => sum + calculateCommission(a), 0);
  const buckets: MetricBucket[] =
    period === "day"
      ? Array.from({ length: 24 }, (_, i) => ({
          key: String(i).padStart(2, "0"),
          label: `${String(i).padStart(2, "0")}h`,
          completed: 0,
          missed: 0,
          received: 0,
          net: 0,
        }))
      : period === "year"
        ? Array.from({ length: 12 }, (_, i) => ({
            key: `${date.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`,
            label: [
              "Jan",
              "Fev",
              "Mar",
              "Abr",
              "Mai",
              "Jun",
              "Jul",
              "Ago",
              "Set",
              "Out",
              "Nov",
              "Dez",
            ][i],
            completed: 0,
            missed: 0,
            received: 0,
            net: 0,
          }))
        : dates.map((day) => ({
            key: day,
            label:
              period === "week"
                ? `${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][new Date(`${day}T12:00:00Z`).getUTCDay()]} ${day.slice(8)}`
                : day.slice(8),
            completed: 0,
            missed: 0,
            received: 0,
            net: 0,
          }));
  for (const a of items) {
    const key =
      period === "day"
        ? a.time.slice(0, 2)
        : period === "year"
          ? a.date.slice(0, 7)
          : a.date;
    const bucket = buckets.find((b) => b.key === key);
    if (!bucket) continue;
    if (a.status === "Concluído") {
      bucket.completed++;
      if (a.paymentMethod) {
        bucket.received += a.value;
        bucket.net += a.value - calculateCommission(a);
      }
    }
    if (a.status === "Não compareceu") bucket.missed++;
  }
  const customerMap = new Map<
    string,
    {
      name: string;
      visits: number;
      missed: number;
      value: number;
      absenceRate: number;
    }
  >();
  for (const appointment of items) {
    if (
      appointment.status !== "Concluído" &&
      appointment.status !== "Não compareceu"
    )
      continue;
    const customer = customerMap.get(appointment.client) ?? {
      name: appointment.client,
      visits: 0,
      missed: 0,
      value: 0,
      absenceRate: 0,
    };
    if (appointment.status === "Concluído") {
      customer.visits++;
      customer.value += appointment.value;
    } else customer.missed++;
    customerMap.set(customer.name, customer);
  }
  const customers = [...customerMap.values()].map((customer) => ({
    ...customer,
    absenceRate: (customer.missed / (customer.visits + customer.missed)) * 100,
  }));
  const topClients = customers
    .filter((c) => c.visits > 0)
    .sort(
      (a, b) =>
        b.visits - a.visits ||
        b.value - a.value ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 10);
  const mostMissed = customers
    .filter((c) => c.missed > 0)
    .sort(
      (a, b) =>
        b.missed - a.missed ||
        b.absenceRate - a.absenceRate ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 10);
  const payments = [
    { name: "Cartão", color: "#7455ba", value: 0, count: 0 },
    { name: "Dinheiro", color: "#39845a", value: 0, count: 0 },
    { name: "Pix", color: "#238b8a", value: 0, count: 0 },
  ];
  for (const a of paid) {
    const group = payments.find(
      (p) =>
        p.name ===
        (a.paymentMethod === "Dinheiro"
          ? "Dinheiro"
          : a.paymentMethod === "Pix"
            ? "Pix"
            : "Cartão"),
    );
    if (group) {
      group.value += a.value;
      group.count++;
    }
  }
  const statuses = [
    "Agendado",
    "Confirmado",
    "Concluído",
    "Cancelado",
    "Não compareceu",
  ].map((name) => ({
    name,
    value: items.filter((a) => a.status === name).length,
  }));
  const occupation = occupationStats(
    items,
    procedures,
    schedules,
    names,
    period,
    date,
  );
  const professionals = names.map((name) => ({
    name,
    ...occupationStats(items, procedures, schedules, [name], period, date),
  }));
  return {
    items,
    completed,
    missed,
    received,
    serviceValue,
    unpaid: serviceValue - received,
    commissions: completed.reduce((sum, a) => sum + calculateCommission(a), 0),
    paidCommission,
    net: received - paidCommission,
    ticket: completed.length ? serviceValue / completed.length : 0,
    buckets,
    topClients,
    mostMissed,
    payments,
    statuses,
    occupation,
    professionals,
    missRate:
      completed.length + missed.length
        ? (missed.length / (completed.length + missed.length)) * 100
        : null,
  };
}
