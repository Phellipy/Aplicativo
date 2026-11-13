import { recurrenceDates } from "./recurrence";
import { useState } from "react";
import {
  getAvailableTimes,
  appointmentDuration,
  money,
  type Appointment,
  type Client,
  type Procedure,
  type WorkSchedule,
} from "./domain";

type BaseProps = {
  appointments: Appointment[];
  procedures: Procedure[];
  schedules: WorkSchedule[];
};
export default function AppointmentFields({
  appointments,
  procedures,
  schedules,
  clients,
  admin,
  initialDate,
  professionalNames,
  currentProfessional,
  hideClient = false,
}: BaseProps & {
  clients: Client[];
  admin: boolean;
  initialDate: string;
  professionalNames: string[];
  currentProfessional: string;
  hideClient?: boolean;
}) {
  const [professional, setProfessional] = useState(
    admin ? (professionalNames[0] ?? "") : currentProfessional,
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [date, setDate] = useState(initialDate),
    [time, setTime] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  let dates: string[] = [],
    recurrenceError = "";
  if (recurring) {
    try {
      dates = recurrenceDates(date, until, weekdays);
    } catch (error) {
      recurrenceError = (error as Error).message;
    }
  }
  const enabled = procedures.filter((p) =>
    p.professionals?.includes(professional),
  );
  const chosen = enabled.filter((p) => selected.includes(p.id));
  const setupHint = !professional
    ? "Cadastre e habilite um profissional antes de agendar."
    : !procedures.length
      ? "Cadastre um procedimento na aba Procedimentos e depois habilite-o em Profissionais → nome do profissional → Procedimentos e repasses."
      : !enabled.length
        ? "Habilite os procedimentos deste profissional em Profissionais → nome do profissional → Procedimentos e repasses."
        : "";
  const duration = chosen.reduce((sum, p) => sum + p.duration, 0),
    price = chosen.reduce((sum, p) => sum + p.price, 0);
  const available = getAvailableTimes(
    appointments,
    procedures,
    schedules,
    professional,
    recurring ? (dates[0] ?? date) : date,
    duration,
  );
  return (
    <>
      {!hideClient && (
        <label>
          Cliente
          <select name="client" required>
            {clients.map((client) => (
              <option key={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
      )}
      {admin ? (
        <label>
          Profissional
          <select
            name="professional"
            value={professional}
            onChange={(e) => {
              setProfessional(e.target.value);
              setSelected([]);
              setTime("");
            }}
          >
            {professionalNames.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="professional" value={professional} />
      )}
      <fieldset className="appointment-services">
        <legend>Procedimentos · selecione um ou mais</legend>
        {enabled.map((p) => (
          <label className="service-choice" key={p.id}>
            <input
              type="checkbox"
              name="procedureIds"
              value={p.id}
              checked={selected.includes(p.id)}
              onChange={(e) => {
                setSelected(
                  e.target.checked
                    ? [...selected, p.id]
                    : selected.filter((id) => id !== p.id),
                );
                setTime("");
              }}
            />
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.duration} min · {money(p.price)}
              </small>
            </span>
          </label>
        ))}
        {!enabled.length && <p role="status">{setupHint}</p>}
      </fieldset>
      <div className="booking-total" role="status">
        <span>
          {chosen.length} procedimento(s) · <strong>{duration} min</strong>
        </span>
        <strong>{money(price)}</strong>
      </div>
      <fieldset className="recurrence-fields">
        <legend>Repetição</legend>
        <label className="check-row">
          <input
            type="checkbox"
            name="recurring"
            checked={recurring}
            onChange={(event) => {
              setRecurring(event.target.checked);
              setTime("");
            }}
          />
          Atendimento recorrente
        </label>
        {recurring && (
          <>
            <p>
              Repete semanalmente no mesmo horário, com o mesmo profissional e
              procedimentos.
            </p>
            <div className="recurrence-weekdays">
              {[
                "Domingo",
                "Segunda",
                "Terça",
                "Quarta",
                "Quinta",
                "Sexta",
                "Sábado",
              ].map((name, day) => (
                <label className="check-row" key={day}>
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={day}
                    checked={weekdays.includes(day)}
                    onChange={(event) => {
                      setWeekdays(
                        event.target.checked
                          ? [...weekdays, day]
                          : weekdays.filter((value) => value !== day),
                      );
                      setTime("");
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
            <label>
              Repetir até
              <input
                type="date"
                name="recurrenceEnd"
                required
                min={date}
                value={until}
                onChange={(event) => {
                  setUntil(event.target.value);
                  setTime("");
                }}
              />
            </label>
            <p role="status">
              {recurrenceError ||
                `${dates.length} atendimento(s), de ${dates[0].split("-").reverse().join("/")} até ${dates[dates.length - 1].split("-").reverse().join("/")}.`}
            </p>
            <small>
              Máximo de um ano. Se houver conflito ou ausência em qualquer data,
              nenhum atendimento será salvo. Ajuste o período ou horário para
              continuar.
            </small>
          </>
        )}
      </fieldset>
      <div className="form-row booking-datetime">
        <label>
          <span>{recurring ? "A partir de" : "Data"}</span>
          <input
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime("");
            }}
          />
        </label>
        <label>
          <span>
            {recurring ? "Horário (primeira ocorrência)" : "Horário disponível"}
          </span>
          <select
            name="time"
            required
            value={available.includes(time) ? time : ""}
            onChange={(e) => setTime(e.target.value)}
            disabled={
              !chosen.length ||
              !available.length ||
              (recurring && !!recurrenceError)
            }
          >
            <option value="">
              {setupHint
                ? "Configure os procedimentos primeiro"
                : !chosen.length
                  ? "Selecione um procedimento primeiro"
                  : !available.length
                    ? "Nenhum horário disponível"
                    : "Selecione um horário"}
            </option>
            {available.map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="availability-note" role="status">
        {setupHint
          ? setupHint
          : !chosen.length
            ? "Selecione os procedimentos para consultar horários."
            : available.length
              ? `${available.length} horários disponíveis para os ${duration} minutos do atendimento.`
              : "Sem horários disponíveis nessa data para a duração total. Verifique a jornada e as ausências ou escolha outra data."}
      </p>
    </>
  );
}
export function RescheduleFields({
  appointment,
  appointments,
  procedures,
  schedules,
}: BaseProps & { appointment: Appointment }) {
  const [date, setDate] = useState(appointment.date),
    [time, setTime] = useState(appointment.time);
  const duration = appointmentDuration(appointment, procedures);
  const available = getAvailableTimes(
    appointments,
    procedures,
    schedules,
    appointment.professional,
    date,
    duration,
    appointment.id,
  );
  return (
    <>
      <div className="form-row booking-datetime">
        <label>
          <span>Nova data</span>
          <input
            type="date"
            name="rescheduleDate"
            value={date}
            required
            onChange={(e) => {
              setDate(e.target.value);
              setTime("");
            }}
          />
        </label>
        <label>
          <span>Novo horário</span>
          <select
            name="rescheduleTime"
            required
            value={available.includes(time) ? time : ""}
            onChange={(e) => setTime(e.target.value)}
            disabled={!available.length}
          >
            <option value="">Selecione um horário</option>
            {available.map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="availability-note">
        {available.length
          ? `Somente horários disponíveis para os ${duration} minutos do atendimento.`
          : "Nenhum horário disponível. Escolha outra data ou ajuste a jornada."}
      </p>
    </>
  );
}
