import { money } from "./domain";
import { formatPercentage, type MetricBucket } from "./metrics";
const compact = (value: number, currency = false) =>
  currency
    ? `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 1, notation: Math.abs(value) >= 10000 ? "compact" : "standard" })}`
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export function TrendChart({
  buckets,
  financial = false,
}: {
  buckets: MetricBucket[];
  financial?: boolean;
}) {
  const keys = financial
    ? (["received", "net"] as const)
    : (["completed", "missed"] as const);
  const labels = financial
    ? ["Recebido", "Saldo antes de despesas"]
    : ["Concluídos", "Não compareceu"];
  const colors = financial ? ["#2879c4", "#3a9169"] : ["#4b8ccc", "#c5874d"];
  const rawMax = Math.max(
      1,
      ...buckets.flatMap((b) => keys.map((key) => b[key])),
    ),
    max = financial ? rawMax : Math.max(4, Math.ceil(rawMax / 4) * 4),
    left = 65,
    right = 500,
    top = 20,
    bottom = 230;
  const x = (i: number) =>
      left + ((i + 0.5) * (right - left)) / Math.max(1, buckets.length),
    y = (value: number) => bottom - (value / max) * (bottom - top);
  const empty = buckets.every((b) => keys.every((key) => b[key] === 0));
  return (
    <>
      <div className="chart-legend">
        {labels.map((label, i) => (
          <span key={label}>
            <i style={{ background: colors[i] }} />
            {label}
          </span>
        ))}
      </div>
      {empty ? (
        <div className="chart-empty">Sem registros para este período.</div>
      ) : (
        <div className="trend-scroll">
          <svg
            className="metric-svg"
            viewBox="0 0 520 265"
            role="img"
            aria-label={
              financial
                ? "Recebimentos e saldo antes de despesas por período"
                : "Atendimentos concluídos e faltas por período"
            }
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <g key={ratio}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(max * ratio)}
                  y2={y(max * ratio)}
                  stroke="#e8edf3"
                />
                <text
                  x={left - 9}
                  y={y(max * ratio) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#8996a7"
                >
                  {compact(max * ratio, financial)}
                </text>
              </g>
            ))}
            {financial
              ? keys.map((key, series) => (
                  <g key={key}>
                    <polyline
                      fill="none"
                      stroke={colors[series]}
                      strokeWidth="2.5"
                      points={buckets
                        .map((b, i) => `${x(i)},${y(b[key])}`)
                        .join(" ")}
                    />
                    {buckets.map((bucket, i) => (
                      <circle
                        key={bucket.key}
                        cx={x(i)}
                        cy={y(bucket[key])}
                        r="3.5"
                        fill={colors[series]}
                        tabIndex={0}
                      >
                        <title>
                          {bucket.label}: {labels[series]} {money(bucket[key])}
                        </title>
                      </circle>
                    ))}
                  </g>
                ))
              : buckets.map((bucket, i) => (
                  <g key={bucket.key}>
                    {keys.map((key, series) => {
                      const width = Math.min(
                        14,
                        ((right - left) / buckets.length) * 0.3,
                      );
                      return (
                        <rect
                          key={key}
                          x={x(i) + (series === 0 ? -width - 1 : 1)}
                          y={y(bucket[key])}
                          width={width}
                          height={bottom - y(bucket[key])}
                          fill={colors[series]}
                          rx="2"
                          tabIndex={0}
                        >
                          <title>
                            {bucket.label}: {labels[series]} {bucket[key]}
                          </title>
                        </rect>
                      );
                    })}
                  </g>
                ))}
            {buckets.map((bucket, i) =>
              i % Math.max(1, Math.ceil(buckets.length / 12)) === 0 ? (
                <text
                  key={bucket.key}
                  x={x(i)}
                  y="251"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#8390a0"
                >
                  {bucket.label}
                </text>
              ) : null,
            )}
          </svg>
        </div>
      )}
      <details className="chart-data">
        <summary>Ver dados do gráfico</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Período</th>
                {labels.map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.key}>
                  <td>{bucket.label}</td>
                  {keys.map((key) => (
                    <td key={key}>
                      {financial ? money(bucket[key]) : bucket[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function RankingChart({
  items,
  suffix = "",
  color = "#5d92c8",
  empty = "Sem dados para este período.",
  maxValue,
}: {
  items: { name: string; value: number; detail?: string }[];
  suffix?: string;
  color?: string;
  empty?: string;
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(1, ...items.map((item) => item.value));
  return items.length ? (
    <div className="ranking-chart" role="list">
      {items.map((item, index) => (
        <div className="ranking-row" key={item.name} role="listitem">
          <div className="ranking-label">
            <span>
              <small>{index + 1}.</small> {item.name}
            </span>
            <strong>
              {suffix === "%"
                ? formatPercentage(item.value)
                : `${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`}
            </strong>
          </div>
          <div className="ranking-track">
            <i
              style={{
                width: `${Math.min(100, (item.value / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
          {item.detail && <small>{item.detail}</small>}
        </div>
      ))}
    </div>
  ) : (
    <div className="chart-empty">{empty}</div>
  );
}
export function PaymentChart({
  items,
}: {
  items: { name: string; value: number; color: string; count: number }[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0),
    circumference = 2 * Math.PI * 70;
  let offset = 0;
  return (
    <div className="payment-chart">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={
          total
            ? `Recebimentos: ${items.map((item) => `${item.name} ${money(item.value)}`).join(", ")}`
            : "Sem recebimentos no período"
        }
      >
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke="#edf0f5"
          strokeWidth="25"
          fill="none"
        />
        {total > 0 &&
          items
            .filter((item) => item.value > 0)
            .map((item) => {
              const length = (item.value / total) * circumference;
              const start = offset;
              offset += length;
              return (
                <circle
                  key={item.name}
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="25"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 100 100)"
                >
                  <title>
                    {item.name}: {money(item.value)} (
                    {((item.value / total) * 100).toFixed(1)}%)
                  </title>
                </circle>
              );
            })}
        <text x="100" y="94" textAnchor="middle" fontSize="10" fill="#8592a1">
          Recebido
        </text>
        <text
          x="100"
          y="116"
          textAnchor="middle"
          fontSize="13"
          fill="#43566d"
          fontWeight="600"
        >
          {money(total)}
        </text>
      </svg>
      <div className="payment-chart-legend">
        {items.map((item) => (
          <div key={item.name}>
            <span>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
            <strong>{money(item.value)}</strong>
            <small>
              {total
                ? ((item.value / total) * 100).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })
                : "0"}
              % · {item.count} atendimento(s)
            </small>
          </div>
        ))}
      </div>
      {!total && (
        <p className="availability-note">
          Nenhum pagamento registrado em serviços concluídos.
        </p>
      )}
    </div>
  );
}
