import { TODAY, type Period } from "./domain";
export default function PeriodControls({
  period,
  date,
  onPeriod,
  onDate,
  label,
}: {
  period: Period;
  date: string;
  onPeriod: (period: Period) => void;
  onDate: (date: string) => void;
  label: string;
}) {
  return (
    <div className="period-controls">
      <div
        className="period-buttons"
        role="group"
        aria-label={`Período ${label}`}
      >
        {(
          [
            { value: "day", text: "Hoje" },
            { value: "week", text: "Semana" },
            { value: "month", text: "Mês" },
            { value: "year", text: "Ano" },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            aria-pressed={period === item.value}
            onClick={() => {
              onPeriod(item.value);
              if (item.value === "day") onDate(TODAY);
            }}
          >
            {item.text}
          </button>
        ))}
      </div>
      <label className="period-date">
        <span className="sr-only">
          {period === "day" || period === "week"
            ? "Data"
            : period === "month"
              ? "Mês"
              : "Ano"}{" "}
          de referência {label}
        </span>
        {period === "year" ? (
          <select
            value={date.slice(0, 4)}
            onChange={(e) => onDate(`${e.target.value}-01-01`)}
          >
            {Array.from({ length: 101 }, (_, index) => 2000 + index).map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ),
            )}
          </select>
        ) : (
          <input
            type={period === "month" ? "month" : "date"}
            value={period === "month" ? date.slice(0, 7) : date}
            onChange={(e) => {
              if (e.target.value)
                onDate(
                  period === "month" ? `${e.target.value}-01` : e.target.value,
                );
            }}
          />
        )}
      </label>
    </div>
  );
}
