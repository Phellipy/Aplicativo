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
export function isPresent(events: PresenceEvent[], scope: string, now: string) {
  const last = events
    .filter((e) => e.scope === scope && e.at <= now)
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
  return last?.open ?? true;
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
  let open = !first.open,
    cursor = 0;
  const intervals: TimeInterval[] = [];
  for (const event of ordered) {
    const at = localMoment(event.at);
    if (at.date < day) {
      open = event.open;
      continue;
    }
    if (at.date > day) break;
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
