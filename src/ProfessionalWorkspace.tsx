import { useEffect, useRef, useState } from "react";
import {
  appointmentsInAgenda,
  businessDate,
  businessDateLabel,
  calculateCommission,
  filterPeriod,
  money,
  paymentMethods,
  type Appointment,
  type Period,
} from "./domain";
import ProfessionalBooking from "./ProfessionalBooking";
import PeriodControls from "./PeriodControls";
import AgendaStack from "./AgendaStack";
import { RescheduleFields } from "./AppointmentFields";
import {
  ProfessionalApiError,
  professionalRequest,
  type ProfessionalWorkspaceData,
  type ProfessionalAppointment,
} from "./professionalAccess";
export default function ProfessionalWorkspace({
  token,
  onLogout,
}: {
  token: string;
  onLogout: (message?: string) => void;
}) {
  const [data, setData] = useState<ProfessionalWorkspaceData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState("agenda"),
    [view, setView] = useState("list"),
    [period, setPeriod] = useState<Period>("day"),
    [date, setDate] = useState(businessDate()),
    [expanded, setExpanded] = useState<number | null>(null),
    [target, setTarget] = useState<{
      appointment: ProfessionalAppointment;
      kind: "payment" | "reschedule";
    } | null>(null);
  const [creation, setCreation] = useState<"client" | "booking" | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const fail = (e: unknown) => {
    setError((e as Error).message);
    if (
      e instanceof ProfessionalApiError &&
      (e.status === 401 || e.status === 403)
    )
      onLogout((e as Error).message);
  };
  async function load() {
    const result = await professionalRequest<ProfessionalWorkspaceData>(
      "/professional/workspace",
      token,
    );
    setData(result);
  }
  useEffect(() => {
    let active = true;
    professionalRequest<ProfessionalWorkspaceData>(
      "/professional/workspace",
      token,
    )
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) fail(e);
      });
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    if (target) dialog.current?.showModal();
    else dialog.current?.close();
  }, [target]);
  async function action(
    appointment: ProfessionalAppointment,
    kind: string,
    extra: Record<string, unknown> = {},
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await professionalRequest(
        `/professional/appointments/${appointment.id}/action`,
        token,
        { action: kind, revision: appointment.revision, ...extra },
      );
      setTarget(null);
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await professionalRequest("/professional/logout", token, {});
    } catch {
    } finally {
      onLogout();
    }
  }
  if (!data)
    return (
      <main className="cloud-loading">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => onLogout()}>Voltar ao acesso</button>
          </>
        ) : (
          "Carregando sua agenda…"
        )}
      </main>
    );
  const items = filterPeriod(
    appointmentsInAgenda(data.appointments),
    period,
    date,
  ).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const completed = filterPeriod(data.appointments, period, date).filter(
    (a) => a.status === "Concluído",
  );
  const controls = (appointment: Appointment) => {
    const a = data.appointments.find((item) => item.id === appointment.id)!;
    const scheduled = ["Agendado", "Confirmado"].includes(a.status);
    return (
      <div className="staff-actions">
        {a.status === "Agendado" && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => action(a, "confirm")}
          >
            Confirmar presença
          </button>
        )}
        {a.status === "Confirmado" && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => action(a, "absent")}
          >
            Não compareceu
          </button>
        )}
        {scheduled && (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() => setTarget({ appointment: a, kind: "payment" })}
            >
              Atendimento Concluído
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setTarget({ appointment: a, kind: "reschedule" })}
            >
              Reagendar
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => action(a, "cancel")}
            >
              Cancelar
            </button>
          </>
        )}
        {a.status === "Concluído" && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setTarget({ appointment: a, kind: "payment" })}
          >
            Alterar pagamento
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="staff-workspace">
      <header className="staff-header">
        <div>
          <strong>{data.professional.name}</strong>
          <small>Acesso profissional · {businessDateLabel()}</small>
        </div>
        <button className="secondary" onClick={logout}>
          Sair
        </button>
      </header>
      <main className="content">
        <div className="settings-tabs">
          <button
            aria-pressed={page === "agenda"}
            onClick={() => setPage("agenda")}
          >
            Minha agenda
          </button>
          <button
            aria-pressed={page === "results"}
            onClick={() => setPage("results")}
          >
            Meus resultados
          </button>
          <button
            aria-pressed={page === "schedule"}
            onClick={() => setPage("schedule")}
          >
            Minha jornada
          </button>
        </div>
        <p className="availability-note">
          Agende na sua própria agenda e cadastre clientes do estabelecimento.
          Jornada, procedimentos, repasses e senha são geridos pelo
          administrador.
        </p>
        <div className="filter-row">
          <button
            className="primary"
            onClick={() => {
              setNotice("");
              setCreation("booking");
            }}
          >
            Novo atendimento
          </button>
          <button
            className="secondary"
            onClick={() => {
              setNotice("");
              setCreation("client");
            }}
          >
            Cadastrar cliente
          </button>
          <button
            className="secondary"
            aria-pressed={page === "clients"}
            onClick={() => setPage("clients")}
          >
            Clientes
          </button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {page !== "schedule" && page !== "clients" && (
          <div className="filter-row">
            <PeriodControls
              label="da minha agenda"
              period={period}
              date={date}
              onPeriod={setPeriod}
              onDate={setDate}
            />
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setError("");
                try {
                  await load();
                } catch (e) {
                  fail(e);
                }
              }}
            >
              Atualizar agenda
            </button>
          </div>
        )}
        {page === "clients" ? (
          <section className="panel">
            <div className="panel-head">
              <h2>Clientes</h2>
            </div>
            <div className="modal-body">
              <label>
                Buscar cliente
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </label>
              <p>
                {data.clients.length} clientes cadastrados · exibindo até 100
                resultados
              </p>
              {data.clients
                .filter((c) =>
                  `${c.name} ${c.phone}`
                    .toLocaleLowerCase("pt-BR")
                    .includes(clientSearch.toLocaleLowerCase("pt-BR")),
                )
                .slice(0, 100)
                .map((c) => (
                  <div className="staff-appointment" key={c.id}>
                    <strong>{c.name}</strong>
                    <span>{c.phone}</span>
                  </div>
                ))}
            </div>
          </section>
        ) : page === "results" ? (
          <section className="panel">
            <div className="panel-head">
              <h2>Meus resultados do período</h2>
            </div>
            <div className="modal-body">
              <p>{completed.length} atendimentos concluídos</p>
              <p>
                Meus repasses:{" "}
                <strong>
                  {money(
                    completed.reduce(
                      (sum, a) => sum + calculateCommission(a),
                      0,
                    ),
                  )}
                </strong>
              </p>
              <p>
                Meus repasses de serviços pagos:{" "}
                <strong>
                  {money(
                    completed
                      .filter((a) => a.paymentMethod)
                      .reduce((sum, a) => sum + calculateCommission(a), 0),
                  )}
                </strong>
              </p>
              <small>
                Valores calculados sobre seus atendimentos. Não representam
                confirmação de repasse efetuado pelo estabelecimento.
              </small>
            </div>
          </section>
        ) : page === "schedule" ? (
          <section className="panel">
            <div className="panel-head">
              <h2>Minha jornada cadastrada</h2>
            </div>
            <div className="modal-body">
              {data.schedule ? (
                data.schedule.days.map((day) => (
                  <p key={day.day}>
                    {
                      [
                        "Domingo",
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                        "Sábado",
                      ][day.day]
                    }
                    :{" "}
                    {day.enabled
                      ? `${day.start} às ${day.end}`
                      : "Não trabalha"}
                  </p>
                ))
              ) : (
                <p>Jornada ainda não cadastrada.</p>
              )}
              <h3>Ausências cadastradas</h3>
              {data.schedule?.restrictions.map((block) => (
                <p key={block.id}>
                  {block.date.split("-").reverse().join("/")}:{" "}
                  {block.allDay ? "Dia todo" : `${block.start} às ${block.end}`}{" "}
                  · {block.reason}
                </p>
              ))}
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-head">
              <h2>Minha agenda</h2>
              <div className="agenda-view-switch">
                <button
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  Lista
                </button>
                <button
                  disabled={period !== "day"}
                  aria-pressed={view === "stack"}
                  onClick={() => setView("stack")}
                >
                  Pilha diária
                </button>
              </div>
            </div>
            {view === "stack" && period === "day" ? (
              <AgendaStack
                appointments={items}
                allAppointments={data.appointments}
                procedures={[]}
                schedules={data.schedule ? [data.schedule] : []}
                date={date}
                laneNames={[data.professional.name]}
                admin={false}
                expanded={expanded}
                onExpand={setExpanded}
                onMove={(a, time) =>
                  action(
                    data.appointments.find((item) => item.id === a.id)!,
                    "reschedule",
                    { date, time },
                  )
                }
                onReschedule={(a) =>
                  setTarget({
                    appointment: data.appointments.find(
                      (item) => item.id === a.id,
                    )!,
                    kind: "reschedule",
                  })
                }
                renderReminder={() => null}
                renderDetails={controls}
              />
            ) : items.length ? (
              items.map((a) => (
                <article className="staff-appointment" key={a.id}>
                  <div>
                    <strong>{a.client}</strong>
                    <span>
                      {a.date.split("-").reverse().join("/")} · {a.time}
                    </span>
                  </div>
                  <p>
                    {a.procedure} · {money(a.value)}
                  </p>
                  <small>
                    {a.status}
                    {a.status === "Concluído"
                      ? ` · ${a.paymentMethod ?? "Não pago"}`
                      : ""}
                  </small>
                  {controls(a)}
                </article>
              ))
            ) : (
              <div className="empty">Nenhum atendimento neste período.</div>
            )}
          </section>
        )}
        <footer>
          <a href="/manual.html" target="_blank" rel="noopener noreferrer">
            Manual do usuário
          </a>
          <small>
            Alterações confirmadas pelo servidor. Use Atualizar agenda para
            consultar mudanças de outros aparelhos.
          </small>
        </footer>
      </main>
      {creation && (
        <ProfessionalBooking
          kind={creation}
          token={token}
          data={data}
          date={date}
          onClose={() => setCreation(null)}
          onSaved={async () => {
            await load();
            setNotice(
              creation === "client"
                ? "Cliente cadastrado."
                : "Agendamento salvo.",
            );
          }}
        />
      )}
      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) setTarget(null);
        }}
      >
        <div className="modal-head">
          <h2>
            {target?.kind === "reschedule"
              ? "Reagendar"
              : "Pagamento do atendimento"}
          </h2>
          <button
            disabled={busy}
            onClick={() => setTarget(null)}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {target?.kind === "reschedule" ? (
          <form
            className="modal-body"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              action(target.appointment, "reschedule", {
                date: form.get("rescheduleDate"),
                time: form.get("rescheduleTime"),
              });
            }}
          >
            <RescheduleFields
              appointment={target.appointment}
              appointments={data.appointments}
              procedures={[]}
              schedules={data.schedule ? [data.schedule] : []}
            />
            {error && <p role="alert">{error}</p>}
            <button className="primary" disabled={busy}>
              Salvar horário
            </button>
          </form>
        ) : (
          <div className="modal-body">
            {target && (
              <>
                <p>
                  {target.appointment.client} ·{" "}
                  {money(target.appointment.value)}
                </p>
                {[...paymentMethods, "Não pago"].map((payment) => (
                  <button
                    key={payment}
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      action(
                        target.appointment,
                        target.appointment.status === "Concluído"
                          ? "payment"
                          : "complete",
                        { payment },
                      )
                    }
                  >
                    {payment}
                  </button>
                ))}
                {error && <p role="alert">{error}</p>}
              </>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
