import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  TODAY,
  weekdayLabels,
  validateWorkDays,
  validateRestriction,
  fitsWorkSchedule,
  appointmentDuration,
  canReschedule,
  type WorkSchedule,
  type Appointment,
  type Procedure,
  type Restriction,
} from "./domain";
type Props = {
  schedule: WorkSchedule;
  onSave: (schedule: WorkSchedule) => void;
  appointments: Appointment[];
  procedures: Procedure[];
};
export default function WorkScheduleEditor({
  schedule,
  onSave,
  appointments,
  procedures,
}: Props) {
  const [days, setDays] = useState(schedule.days),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [allDay, setAllDay] = useState(false);
  useEffect(() => setDays(schedule.days), [schedule.days]);
  const affected = appointments.filter(
    (a) =>
      a.professional === schedule.professional &&
      a.date >= TODAY &&
      canReschedule(a) &&
      !fitsWorkSchedule(
        schedule,
        a.date,
        a.time,
        appointmentDuration(a, procedures),
      ),
  );
  function saveDays(event: FormEvent) {
    event.preventDefault();
    try {
      validateWorkDays(days);
      onSave({ ...schedule, days });
      setError("");
      setNotice("Jornada semanal salva neste navegador.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function addRestriction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const str = (key: string) => String(f.get(key) || "");
    const block: Restriction = {
      id: Date.now(),
      date: str("blockDate"),
      allDay,
      start: allDay ? "00:00" : str("blockStart"),
      end: allDay ? "23:59" : str("blockEnd"),
      reason: str("reason").trim(),
    };
    try {
      validateRestriction(block);
      if (
        schedule.restrictions.some(
          (b) =>
            b.date === block.date &&
            b.allDay === block.allDay &&
            b.start === block.start &&
            b.end === block.end,
        )
      )
        throw new Error("Esta restrição já está cadastrada.");
      onSave({ ...schedule, restrictions: [...schedule.restrictions, block] });
      setError("");
      setNotice("Ausência salva. Novos horários respeitam o bloqueio.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="work-editor">
      <h3>Jornada semanal</h3>
      <p>
        Desmarque os dias sem expediente. Configure início e fim de cada dia.
      </p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="schedule-notice" role="status">
          {notice}
        </div>
      )}
      <form onSubmit={saveDays} className="work-days">
        {[1, 2, 3, 4, 5, 6, 0].map((index) => {
          const day = days.find((d) => d.day === index)!;
          return (
            <div className="work-day" key={index}>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) =>
                    setDays(
                      days.map((d) =>
                        d.day === index
                          ? { ...d, enabled: e.target.checked }
                          : d,
                      ),
                    )
                  }
                />
                {weekdayLabels[index]}
              </label>
              <input
                aria-label={`Início ${weekdayLabels[index]} de ${schedule.professional}`}
                type="time"
                value={day.start}
                disabled={!day.enabled}
                required={day.enabled}
                step="900"
                onChange={(e) =>
                  setDays(
                    days.map((d) =>
                      d.day === index ? { ...d, start: e.target.value } : d,
                    ),
                  )
                }
              />
              <span>às</span>
              <input
                aria-label={`Fim ${weekdayLabels[index]} de ${schedule.professional}`}
                type="time"
                value={day.end}
                disabled={!day.enabled}
                required={day.enabled}
                step="900"
                onChange={(e) =>
                  setDays(
                    days.map((d) =>
                      d.day === index ? { ...d, end: e.target.value } : d,
                    ),
                  )
                }
              />
            </div>
          );
        })}
        <button className="primary" type="submit">
          Salvar jornada semanal
        </button>
      </form>
      <div className="divider" />
      <h3>Ausências e restrições</h3>
      <p>
        Bloqueie um dia inteiro ou um intervalo específico. Use também para
        almoço, saída ou compromisso.
      </p>
      <form className="restriction-form" onSubmit={addRestriction}>
        <label>
          Data da ausência
          <input name="blockDate" type="date" defaultValue={TODAY} required />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          Ausente o dia inteiro
        </label>
        {!allDay && (
          <div className="form-row">
            <label>
              Início da ausência
              <input
                type="time"
                name="blockStart"
                defaultValue="12:00"
                step="900"
                required
              />
            </label>
            <label>
              Fim da ausência
              <input
                type="time"
                name="blockEnd"
                defaultValue="13:00"
                step="900"
                required
              />
            </label>
          </div>
        )}
        <label>
          Motivo (opcional)
          <input
            name="reason"
            maxLength={120}
            placeholder="Ex.: saída, almoço ou folga"
          />
        </label>
        <button type="submit" className="secondary">
          Adicionar restrição
        </button>
      </form>
      <div className="restriction-list">
        {schedule.restrictions.map((block) => (
          <div key={block.id}>
            <span>
              <strong>{block.date.split("-").reverse().join("/")}</strong>
              <small>
                {block.allDay ? "Dia inteiro" : `${block.start}–${block.end}`}
                {block.reason ? ` · ${block.reason}` : ""}
              </small>
            </span>
            <button
              className="icon"
              aria-label={`Remover restrição de ${schedule.professional} em ${block.date} ${block.start}`}
              onClick={() => {
                onSave({
                  ...schedule,
                  restrictions: schedule.restrictions.filter(
                    (b) => b.id !== block.id,
                  ),
                });
                setNotice("Restrição removida.");
                setError("");
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {!schedule.restrictions.length && (
          <small>Nenhuma restrição pontual cadastrada.</small>
        )}
      </div>
      {affected.length > 0 && (
        <div className="schedule-conflicts" role="status">
          <strong>{affected.length} atendimento(s) precisam de revisão</strong>
          <p>
            O bloqueio não cancela atendimentos existentes. Reagende ou cancele
            estes horários:
          </p>
          <ul>
            {affected.map((a) => (
              <li key={a.id}>
                {a.date.split("-").reverse().join("/")} às {a.time} · {a.client}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
