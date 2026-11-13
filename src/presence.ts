import { validTime, timeMinutes, type WorkSchedule } from "./domain";
export type PresenceEvent = { scope: string; at: string; open: boolean };
export const ESTABLISHMENT = "@establishment";
export type TimeInterval = [number, number];
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
export function localMoment(at: string) {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(at)).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute:
      Number(parts.hour) * 60 +
      Number(parts.minute) +
      Number(parts.second) / 60,
  };
}
export function isPresent(
  events: PresenceEvent[],
  scope: string,
  now: string,
  fallback = true,
) {
  const last = events
    .filter((e) => e.scope === scope && e.at <= now)
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
  return last?.open ?? fallback;
}
export function togglePresence(
  events: PresenceEvent[],
  scope: string,
  now: string,
): PresenceEvent[] {
  return [...events, { scope, at: now, open: !isPresent(events, scope, now) }];
}
export function intersectIntervals(
  left: TimeInterval[],
  right: TimeInterval[],
): TimeInterval[] {
  return left.flatMap(([a, b]) =>
    right.flatMap(([c, d]): TimeInterval[] =>
      Math.min(b, d) > Math.max(a, c) ? [[Math.max(a, c), Math.min(b, d)]] : [],
    ),
  );
}
function scopeIntervals(
  events: PresenceEvent[],
  scope: string,
  day: string,
  now: string,
): { intervals: TimeInterval[]; tracked: boolean } {
  const ordered = events
    .filter((e) => e.scope === scope && e.at <= now)
    .sort((a, b) => a.at.localeCompare(b.at));
  const first = ordered[0];
  // Before tracking began, preserve the scheduled reference instead of inventing presence.
  if (!first || day < localMoment(first.at).date)
    return { intervals: [[0, 1440]], tracked: false };
  const moment = localMoment(now);
  if (day > moment.date) return { intervals: [], tracked: true };
  const end = day === moment.date ? moment.minute : 1440;
  let open = localMoment(first.at).date === day ? !first.open : true,
    cursor = 0;
  const intervals: TimeInterval[] = [];
  for (const event of ordered) {
    const at = localMoment(event.at);
    if (at.date < day) continue;
    if (at.date > day) break;
    if (event.open === open) continue;
    if (open && at.minute > cursor)
      intervals.push([cursor, Math.min(at.minute, end)]);
    cursor = at.minute;
    open = event.open;
  }
  if (open && end > cursor) intervals.push([cursor, end]);
  return { intervals, tracked: true };
}
export function presenceAvailability(
  availability: TimeInterval[],
  events: PresenceEvent[],
  professional: string,
  day: string,
  now: string,
) {
  const establishment = scopeIntervals(events, ESTABLISHMENT, day, now);
  const person = scopeIntervals(events, professional, day, now);
  return {
    intervals: intersectIntervals(
      intersectIntervals(availability, establishment.intervals),
      person.intervals,
    ),
    tracked: establishment.tracked || person.tracked,
  };
}

function scheduledNow(schedule: WorkSchedule | undefined, now: string) {
  const moment = localMoment(now);
  const day = schedule?.days.find(
    (d) => d.day === new Date(`${moment.date}T12:00:00Z`).getUTCDay(),
  );
  return (
    !!day?.enabled &&
    validTime(day.start) &&
    validTime(day.end) &&
    moment.minute >= timeMinutes(day.start) &&
    moment.minute < timeMinutes(day.end)
  );
}
function manuallyAbsent(schedule: WorkSchedule | undefined, now: string) {
  const moment = localMoment(now);
  return (
    schedule?.restrictions.some(
      (block) =>
        block.date === moment.date &&
        (block.allDay ||
          (moment.minute >= timeMinutes(block.start) &&
            moment.minute < timeMinutes(block.end))),
    ) ?? false
  );
}
function dailyPresence(
  events: PresenceEvent[],
  scope: string,
  now: string,
  scheduled: (at: string) => boolean,
) {
  const day = localMoment(now).date;
  const last = events
    .filter(
      (e) => e.scope === scope && e.at <= now && localMoment(e.at).date === day,
    )
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
  if (!last) return scheduled(now);
  if (!last.open) return false;
  // A regular arrival expires at the end of the shift. An explicit off-hours
  // arrival remains an exception for this date only.
  return scheduled(now) || !scheduled(last.at);
}
export function professionalPresent(
  events: PresenceEvent[],
  name: string,
  now: string,
  schedule?: WorkSchedule,
) {
  if (manuallyAbsent(schedule, now)) return false;
  return dailyPresence(events, name, now, (at) => scheduledNow(schedule, at));
}
export function establishmentPresent(
  events: PresenceEvent[],
  now: string,
  schedules: WorkSchedule[],
) {
  return dailyPresence(events, ESTABLISHMENT, now, (at) =>
    schedules.some((s) => scheduledNow(s, at) && !manuallyAbsent(s, at)),
  );
}
export function controlPresence(
  events: PresenceEvent[],
  scope: string,
  now: string,
  schedules: WorkSchedule[],
  soleProfessional?: string,
) {
  const open =
    scope === ESTABLISHMENT
      ? establishmentPresent(events, now, schedules)
      : professionalPresent(
          events,
          scope,
          now,
          schedules.find((s) => s.professional === scope),
        );
  const effective =
    scope === soleProfessional
      ? open && establishmentPresent(events, now, schedules)
      : open;
  const scopes = scope === soleProfessional ? [scope, ESTABLISHMENT] : [scope];
  return [
    ...events,
    ...scopes.map((target) => ({ scope: target, at: now, open: !effective })),
  ];
}
// An exceptional off-day requires an explicit arrival on that date.
export function exceptionalPresenceIntervals(
  events: PresenceEvent[],
  name: string,
  day: string,
  now: string,
): TimeInterval[] {
  if (day > localMoment(now).date) return [];
  const entries = events
    .filter(
      (e) => e.scope === name && e.at <= now && localMoment(e.at).date === day,
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  let start: number | null = null;
  const intervals: TimeInterval[] = [];
  for (const entry of entries) {
    const minute = localMoment(entry.at).minute;
    if (entry.open && start === null) start = minute;
    if (!entry.open && start !== null) {
      if (minute > start) intervals.push([start, minute]);
      start = null;
    }
  }
  if (start !== null) {
    const end = day === localMoment(now).date ? localMoment(now).minute : 1440;
    if (end > start) intervals.push([start, end]);
  }
  return intervals;
}
