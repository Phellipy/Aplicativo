import { useState } from "react";
import { maximumProcedureMinutes } from "./procedureDuration";
export default function ProcedureDurationFields({
  initialMinutes = 30,
}: {
  initialMinutes?: number;
}) {
  const [mode, setMode] = useState(initialMinutes >= 60 ? "hours" : "minutes");
  const [hours, setHours] = useState(String(Math.floor(initialMinutes / 60)));
  const [minutes, setMinutes] = useState(String(initialMinutes % 60));
  const [total, setTotal] = useState(String(initialMinutes));
  const duration =
    mode === "minutes" ? Number(total) : Number(hours) * 60 + Number(minutes);
  return (
    <fieldset className="procedure-duration">
      <legend>Duração</legend>
      <label>
        Informar em
        <select
          value={mode}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "hours") {
              setHours(String(Math.floor(Number(total) / 60)));
              setMinutes(String(Number(total) % 60));
            } else setTotal(String(Number(hours) * 60 + Number(minutes)));
            setMode(next);
          }}
        >
          <option value="minutes">Minutos</option>
          <option value="hours">Horas e minutos</option>
        </select>
      </label>
      {mode === "minutes" ? (
        <label>
          Minutos
          <input
            type="number"
            min="1"
            max={maximumProcedureMinutes}
            step="1"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            required
          />
        </label>
      ) : (
        <div className="form-row">
          <label>
            Horas
            <input
              type="number"
              min="0"
              max="9"
              step="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </label>
          <label>
            Minutos
            <input
              type="number"
              min="0"
              max={Number(hours) === 9 ? 0 : 59}
              step="1"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              required
            />
          </label>
        </div>
      )}
      <input type="hidden" name="duration" value={duration} />
      <small>
        De 1 minuto a 9 horas (540 minutos), sem intervalos obrigatórios.
      </small>
    </fieldset>
  );
}
