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
}: BaseProps & {
  clients: Client[];
  admin: boolean;
  initialDate: string;
  professionalNames: string[];
  currentProfessional: string;
}) {
  const [professional, setProfessional] = useState(
    admin ? (professionalNames[0] ?? "") : currentProfessional,
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [date, setDate] = useState(initialDate),
    [time, setTime] = useState("");
  const enabled = procedures.filter((p) =>
    p.professionals?.includes(professional),
  );
  const chosen = enabled.filter((p) => selected.includes(p.id));
  const duration = chosen.reduce((sum, p) => sum + p.duration, 0),
    price = chosen.reduce((sum, p) => sum + p.price, 0);
  const available = getAvailableTimes(
    appointments,
    procedures,
    schedules,
    professional,
    date,
    duration,
  );
  return (
    <>
      <label>
        Cliente
        <select name="client" required>
          {clients.map((client) => (
            <option key={client.id}>{client.name}</option>
          ))}
        </select>
      </label>
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
        {!enabled.length && (
          <p>Nenhum procedimento habilitado para este profissional.</p>
        )}
      </fieldset>
      <div className="booking-total" role="status">
        <span>
          {chosen.length} procedimento(s) · <strong>{duration} min</strong>
        </span>
        <strong>{money(price)}</strong>
      </div>
      <div className="form-row">
        <label>
          Data
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
          Horário disponível
          <select
            name="time"
            required
            value={available.includes(time) ? time : ""}
            onChange={(e) => setTime(e.target.value)}
            disabled={!chosen.length || !available.length}
          >
            <option value="">Selecione um horário</option>
            {available.map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="availability-note" role="status">
        {!chosen.length
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
      <div className="form-row">
        <label>
          Nova data
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
          Novo horário
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
