import { useMemo, useState } from "react";
import {
  TODAY,
  money,
  agendaStatusTone,
  type Appointment,
  type Procedure,
  type WorkSchedule,
} from "./domain";
import {
  hours,
  formatPercentage,
  metricsReport,
  reportDates,
  type MetricsPeriod,
} from "./metrics";
import { TrendChart, RankingChart, PaymentChart } from "./MetricCharts";
type Props = {
  appointments: Appointment[];
  procedures: Procedure[];
  schedules: WorkSchedule[];
  names: string[];
};
export default function MetricsPage({
  appointments,
  procedures,
  schedules,
  names,
}: Props) {
  const [period, setPeriod] = useState<MetricsPeriod>("month"),
    [date, setDate] = useState(TODAY),
    [person, setPerson] = useState("Todos");
  const selectedNames = person === "Todos" ? names : [person];
  const report = useMemo(
    () =>
      metricsReport(
        appointments,
        procedures,
        schedules,
        selectedNames,
        period,
        date,
      ),
    [appointments, procedures, schedules, names, person, period, date],
  );
  const days = reportDates(period, date),
    range = days.length
      ? `${days[0].split("-").reverse().join("/")} a ${days.at(-1)!.split("-").reverse().join("/")}`
      : "Selecione uma data válida";
  const percentage = formatPercentage;
  return (
    <>
      <div className="metrics-filters">
        <div
          className="period-buttons"
          role="group"
          aria-label="Período das métricas"
        >
          {(
            [
              { key: "day", label: "Dia" },
              { key: "week", label: "Semana" },
              { key: "month", label: "Mês" },
              { key: "year", label: "Ano" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              aria-pressed={period === item.key}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label>
          Data de referência
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value);
            }}
          />
        </label>
        <label>
          Profissional
          <select
            value={person}
            onChange={(event) => setPerson(event.target.value)}
          >
            <option>Todos</option>
            {names.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => {
            setDate(TODAY);
            setPeriod("day");
          }}
        >
          Hoje (demo)
        </button>
      </div>
      <p className="metrics-range">
        {range} · {person === "Todos" ? "Estabelecimento consolidado" : person}
      </p>
      <div className="metrics-kpis">
        {[
          {
            label: "Taxa de ocupação",
            value: percentage(report.occupation.rate),
            detail: `${hours(report.occupation.occupiedMinutes)} atendidas / ${hours(report.occupation.availableMinutes)} disponíveis`,
          },
          {
            label: "Atendimentos concluídos",
            value: String(report.completed.length),
            detail: `${report.items.length} agendamentos no período`,
          },
          {
            label: "Valores recebidos",
            value: money(report.received),
            detail: "Concluídos com pagamento registrado",
          },
          {
            label: "A receber de concluídos",
            value: money(report.unpaid),
            detail: "Serviços concluídos marcados como não pagos",
          },
          {
            label: "Ticket médio",
            value: money(report.ticket),
            detail: "Valor dos serviços concluídos ÷ quantidade",
          },
          {
            label: "Taxa de faltas",
            value: percentage(report.missRate),
            detail: `${report.missed.length} faltas / ${report.completed.length + report.missed.length} presenças e faltas definidas`,
          },
        ].map((item) => (
          <section className="stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </section>
        ))}
      </div>
      <div className="notice metrics-method">
        <span>
          <strong>Como calculamos:</strong> ocupação = tempo de serviços
          concluídos dentro da jornada disponível ÷ tempo disponível da equipe.
          Descontamos ausências e não contamos sobreposições duas vezes. O tempo
          atendido é estimado pela duração cadastrada dos serviços, sem
          cronômetro. A jornada atual é aplicada ao período consultado. A
          disponibilidade inclui todo o período, inclusive dias futuros.
        </span>
      </div>
      <div className="metrics-grid">
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Atendimentos no período</h2>
              <p>
                Concluídos e faltas · distribuição por{" "}
                {period === "day" ? "hora" : period === "year" ? "mês" : "dia"}
              </p>
            </div>
          </div>
          <TrendChart buckets={report.buckets} />
        </section>
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Desempenho financeiro</h2>
              <p>
                Recebido e saldo após repasses dos serviços pagos, antes de
                despesas
              </p>
            </div>
          </div>
          <TrendChart buckets={report.buckets} financial />
          <p className="chart-footnote">
            Valores agrupados pela data do atendimento. Não há data de
            compensação, despesas, taxas ou tributos; o saldo não representa
            lucro.
          </p>
        </section>
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Top 10 clientes</h2>
              <p>Mais atendimentos concluídos no período</p>
            </div>
          </div>
          <RankingChart
            items={report.topClients.map((client) => ({
              name: client.name,
              value: client.visits,
              detail: `${money(client.value)} em serviços concluídos`,
            }))}
            suffix=" atend."
            empty="Nenhum atendimento concluído para classificar clientes."
          />
        </section>
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Clientes com mais faltas</h2>
              <p>Até 10 clientes marcados como Não compareceu</p>
            </div>
          </div>
          <RankingChart
            items={report.mostMissed.map((client) => ({
              name: client.name,
              value: client.missed,
              detail: `${client.absenceRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de faltas em ${client.visits + client.missed} atendimentos com resultado definido`,
            }))}
            suffix=" falta(s)"
            color="#bd8453"
            empty="Nenhuma falta registrada neste período."
          />
          <p className="chart-footnote">
            A taxa considera apenas concluídos e faltas. Agendados, confirmados
            e cancelados não entram nessa base; poucos registros podem gerar
            taxas altas.
          </p>
        </section>
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Recebimentos por forma de pagamento</h2>
              <p>
                Participação no valor recebido · crédito e débito agrupados em
                Cartão
              </p>
            </div>
          </div>
          <PaymentChart items={report.payments} />
        </section>
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Ocupação por profissional</h2>
              <p>Tempo concluído dentro da disponibilidade cadastrada</p>
            </div>
          </div>
          <RankingChart
            items={report.professionals
              .filter((prof) => prof.rate !== null)
              .map((prof) => ({
                name: prof.name,
                value: prof.rate!,
                detail: `${hours(prof.occupiedMinutes)} atendidas de ${hours(prof.availableMinutes)} disponíveis`,
              }))}
            suffix="%"
            maxValue={100}
            color="#4f9673"
            empty="Sem jornada disponível cadastrada para o período."
          />
          {report.professionals.some((prof) => prof.rate === null) && (
            <p className="chart-footnote">
              Sem disponibilidade:{" "}
              {report.professionals
                .filter((prof) => prof.rate === null)
                .map((prof) => prof.name)
                .join(", ")}
              .
            </p>
          )}
        </section>
        <section className="panel metric-panel">
          <div className="panel-head">
            <div>
              <h2>Situação dos agendamentos</h2>
              <p>Todos os registros do período, incluindo cancelados</p>
            </div>
          </div>
          <div className="status-metrics">
            {report.statuses.map((status) => (
              <div
                key={status.name}
                className={`stack-tone-${agendaStatusTone(status.name)}`}
              >
                <span>
                  <i />
                  {status.name}
                </span>
                <strong>{status.value}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel metric-panel metric-finance-summary">
          <div className="panel-head">
            <div>
              <h2>Resumo dos serviços concluídos</h2>
              <p>Valores demonstrativos do período selecionado</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Valor dos serviços</dt>
              <dd>{money(report.serviceValue)}</dd>
            </div>
            <div>
              <dt>Recebido</dt>
              <dd>{money(report.received)}</dd>
            </div>
            <div>
              <dt>A receber</dt>
              <dd>{money(report.unpaid)}</dd>
            </div>
            <div>
              <dt>Repasses gerados</dt>
              <dd>{money(report.commissions)}</dd>
            </div>
            <div>
              <dt>Repasses sobre serviços pagos</dt>
              <dd>{money(report.paidCommission)}</dd>
            </div>
            <div>
              <dt>Saldo recebido antes de despesas</dt>
              <dd>{money(report.net)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
