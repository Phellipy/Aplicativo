import { useState } from "react";
import {
  TODAY,
  money,
  periodLabel,
  type Appointment,
  type Client,
  type Period,
} from "./domain";
import { financeRows, downloadFinance } from "./finance";
export default function FinancePage({
  appointments,
  clients,
  establishmentName,
  admin,
}: {
  appointments: Appointment[];
  clients: Client[];
  establishmentName: string;
  admin: boolean;
}) {
  const [period, setPeriod] = useState<Period>("day"),
    [date, setDate] = useState(TODAY),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = financeRows(appointments, clients, period, date);
  const received = rows.reduce((sum, r) => sum + r.received, 0),
    payout = rows.reduce((sum, r) => sum + r.payout, 0),
    paidPayout = rows.reduce((sum, r) => sum + r.paidPayout, 0);
  const range = periodLabel(period, date);
  return (
    <>
      <div className="export-toolbar">
        <div
          className="period-buttons"
          role="group"
          aria-label="Período financeiro"
        >
          {(
            [
              { value: "day", label: "Dia" },
              { value: "week", label: "Semana" },
              { value: "month", label: "Mês" },
              { value: "year", label: "Ano" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              aria-pressed={period === item.value}
              onClick={() => setPeriod(item.value)}
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
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await downloadFinance(rows, establishmentName, range, date);
            } catch {
              setError("Não foi possível gerar o Excel. Tente novamente.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Gerando Excel…" : "Exportar Excel"}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="notice">
        Dados demonstrativos. Recebido considera serviços concluídos com
        pagamento registrado. Repasses são valores calculados, sem comprovação
        de transferência. Não há integração bancária.
      </div>
      <div className="stats finance-stats">
        {[
          {
            label: admin ? "Recebido" : "Meus serviços pagos",
            value: received,
          },
          { label: "Repasses calculados", value: payout },
          {
            label: admin ? "Saldo antes de despesas" : "Meus ganhos",
            value: admin ? received - paidPayout : payout,
          },
        ].map((item) => (
          <div className="stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{money(item.value)}</strong>
            <small>{range}</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Serviços concluídos no período</h2>
          <small>{rows.length} registro(s)</small>
        </div>
        <div className="table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                {[
                  "Data / hora",
                  "Cliente",
                  "CPF/CNPJ",
                  "Profissional",
                  "Procedimentos",
                  "Valor",
                  "Pagamento",
                  "Recebido",
                  "A receber",
                  "Repasse",
                ].map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    {row.date.split("-").reverse().join("/")}
                    <br />
                    {row.time}
                  </td>
                  <td>{row.client}</td>
                  <td>{row.document || "—"}</td>
                  <td>{row.professional}</td>
                  <td>{row.procedure}</td>
                  <td>{money(row.value)}</td>
                  <td>{row.payment}</td>
                  <td>{money(row.received)}</td>
                  <td>{money(row.pending)}</td>
                  <td>{money(row.payout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="empty">Nenhum serviço concluído neste período.</div>
          )}
        </div>
        <div className="notice">
          CPF/CNPJ é opcional e reflete o cadastro atual, inclusive para
          clientes excluídos. Não há consulta ou validação fiscal. O saldo não
          inclui despesas, taxas ou tributos e não representa lucro.
        </div>
      </section>
    </>
  );
}
