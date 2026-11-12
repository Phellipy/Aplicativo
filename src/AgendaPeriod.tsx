import {
  agendaStatusTone,
  filterPeriod,
  periodDates,
  periodLabel,
  money,
  type Appointment,
  type Period,
} from "./domain";
export default function AgendaPeriod({
  appointments,
  period,
  date,
  onOpen,
}: {
  appointments: Appointment[];
  period: Period;
  date: string;
  onOpen: (date: string, period: Period) => void;
}) {
  if (period === "year")
    return (
      <div className="year-grid">
        {Array.from(
          { length: 12 },
          (_, index) =>
            `${date.slice(0, 4)}-${String(index + 1).padStart(2, "0")}-01`,
        ).map((month) => {
          const items = filterPeriod(appointments, "month", month);
          return (
            <button
              key={month}
              className="month-summary"
              onClick={() => onOpen(month, "month")}
            >
              <strong>
                {periodLabel("month", month).replace(
                  ` de ${date.slice(0, 4)}`,
                  "",
                )}
              </strong>
              <span>{items.length} atendimento(s)</span>
              <small>
                {money(
                  items
                    .filter(
                      (a) =>
                        !["Cancelado", "Não compareceu"].includes(a.status),
                    )
                    .reduce((sum, a) => sum + a.value, 0),
                )}{" "}
                em serviços
              </small>
              <span className="month-statuses">
                {[
                  "Agendado",
                  "Confirmado",
                  "Concluído",
                  "Cancelado",
                  "Não compareceu",
                ]
                  .filter((status) => items.some((a) => a.status === status))
                  .map((status) => (
                    <i
                      key={status}
                      className={`stack-tone-${agendaStatusTone(status)}`}
                      title={status}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>
    );
  const dates = periodDates("month", date),
    offset = dates.length
      ? (new Date(`${dates[0]}T12:00:00Z`).getUTCDay() + 6) % 7
      : 0;
  return (
    <>
      <p className="period-calendar-hint">
        Selecione um dia para abrir os horários e os atendimentos.
      </p>
      <div
        className="month-calendar"
        aria-label={`Calendário de ${periodLabel("month", date)}`}
      >
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <span className="calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} className="calendar-blank" />
        ))}
        {dates.map((day) => {
          const items = filterPeriod(appointments, "day", day).sort((a, b) =>
            a.time.localeCompare(b.time),
          );
          return (
            <button
              key={day}
              className={`calendar-day ${items.length ? "has-events" : ""}`}
              aria-label={`${day.split("-").reverse().join("/")} · ${items.length} atendimentos`}
              onClick={() => onOpen(day, "day")}
            >
              <strong>{Number(day.slice(8))}</strong>
              <span className="calendar-day-count">
                {items.length ? `${items.length} atend.` : "—"}
              </span>
              <span className="calendar-day-events">
                {items.slice(0, 2).map((a) => (
                  <span
                    key={a.id}
                    className={`stack-tone-${agendaStatusTone(a.status)}`}
                  >
                    {a.time} {a.client.split(" ")[0]}
                  </span>
                ))}
                {items.length > 2 && <small>+{items.length - 2}</small>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
