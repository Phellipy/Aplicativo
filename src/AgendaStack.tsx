import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripVertical, CalendarClock } from "lucide-react";
import {
  agendaHours,
  agendaStatusTone,
  canReschedule,
  money,
  type Appointment,
} from "./domain";

type Props = {
  appointments: Appointment[];
  admin: boolean;
  expanded: number | null;
  onExpand: (id: number | null) => void;
  onMove: (appointment: Appointment, time: string) => void;
  onReschedule: (appointment: Appointment) => void;
  renderDetails: (appointment: Appointment) => ReactNode;
};
type Drag = {
  appointment: Appointment;
  x: number;
  y: number;
  target: string | null;
};
export default function AgendaStack({
  appointments,
  admin,
  expanded,
  onExpand,
  onMove,
  onReschedule,
  renderDetails,
}: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const active = useRef<Drag | null>(null);
  const pending = useRef<{
    id: number;
    appointment: Appointment;
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const reset = () => {
    if (pending.current?.timer) clearTimeout(pending.current.timer);
    pending.current = null;
    active.current = null;
    setDrag(null);
  };
  useEffect(
    () => () => {
      if (pending.current?.timer) clearTimeout(pending.current.timer);
    },
    [],
  );
  useEffect(() => {
    if (!drag) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        reset();
      }
    };
    const blur = () => reset();
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    let frame = 0;
    const tick = () => {
      const current = active.current;
      if (current) {
        const viewport = window.innerHeight;
        const speed = current.y < 80 ? -10 : current.y > viewport - 80 ? 10 : 0;
        if (speed) window.scrollBy(0, speed);
        const element = document
          .elementFromPoint(current.x, current.y)
          ?.closest<HTMLElement>("[data-drop-time]");
        const target =
          element && root.current?.contains(element)
            ? element.dataset.dropTime || null
            : null;
        if (target !== current.target) {
          active.current = { ...current, target };
          setDrag(active.current);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", blur);
    };
  }, [Boolean(drag)]);
  function start(
    event: PointerEvent<HTMLButtonElement>,
    appointment: Appointment,
  ) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const begin = () => {
      const p = pending.current;
      if (!p) return;
      onExpand(null);
      const value = {
        appointment: p.appointment,
        x: p.x,
        y: p.y,
        target: null,
      };
      active.current = value;
      setDrag(value);
    };
    pending.current = {
      id: event.pointerId,
      appointment,
      x: event.clientX,
      y: event.clientY,
      timer: null,
    };
    if (event.pointerType === "touch")
      pending.current.timer = setTimeout(begin, 300);
    else begin();
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const p = pending.current;
    if (!p || p.id !== event.pointerId) return;
    if (!active.current) {
      if (Math.hypot(event.clientX - p.x, event.clientY - p.y) > 10) reset();
      return;
    }
    event.preventDefault();
    active.current = { ...active.current, x: event.clientX, y: event.clientY };
    setDrag(active.current);
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (pending.current?.id !== event.pointerId) return;
    const current = active.current;
    const moved =
      Math.hypot(
        event.clientX - pending.current.x,
        event.clientY - pending.current.y,
      ) > 8;
    // Resolve again at release; never trust a stale highlight from a previous frame.
    const element = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-drop-time]");
    const target =
      element && root.current?.contains(element)
        ? element.dataset.dropTime
        : null;
    reset();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (current && target && moved) onMove(current.appointment, target);
  }
  return (
    <div className={`agenda-stack ${drag ? "is-dragging" : ""}`} ref={root}>
      <p className="drag-instructions">
        Arraste pela alça ⋮⋮. No celular, segure a alça por um instante. Ou use
        Reagendar. Encaixe a cada 15 minutos.
      </p>
      <div className="sr-only" role="status">
        {drag
          ? `Arrastando ${drag.appointment.client}. ${drag.target ? `Novo horário: ${drag.target}.` : "Escolha um horário destacado."} Escape cancela.`
          : ""}
      </div>
      {agendaHours(appointments).map((slot) => (
        <section
          className="stack-slot"
          aria-label={`Horário ${slot.label}`}
          key={slot.label}
        >
          <time className="stack-hour">{slot.label}</time>
          <div className="stack-slot-items">
            {drag && (
              <div className="stack-drop-grid">
                {["00", "15", "30", "45"]
                  .map((minute) => `${slot.label.slice(0, 2)}:${minute}`)
                  .filter((time) => time >= "08:00" && time <= "20:00")
                  .map((time) => (
                    <div
                      key={time}
                      data-drop-time={time}
                      className={`stack-drop-target ${drag.target === time ? "is-over" : ""}`}
                    >
                      {time}
                    </div>
                  ))}
              </div>
            )}
            {slot.appointments.length ? (
              slot.appointments.map((a) => (
                <div
                  className={
                    drag?.appointment.id === a.id ? "stack-source-dragging" : ""
                  }
                  key={a.id}
                >
                  <div
                    className={`stack-draggable-box stack-tone-${agendaStatusTone(a.status)}`}
                  >
                    {canReschedule(a) && (
                      <button
                        className="stack-drag-handle"
                        aria-label={`Arrastar atendimento de ${a.client} às ${a.time}`}
                        title="Arrastar para outro horário; use Reagendar para teclado"
                        onPointerDown={(event) => start(event, a)}
                        onPointerMove={move}
                        onPointerUp={finish}
                        onPointerCancel={reset}
                        onLostPointerCapture={reset}
                      >
                        <GripVertical size={22} />
                      </button>
                    )}
                    <button
                      className="stack-appointment"
                      aria-expanded={expanded === a.id}
                      aria-controls={`stack-details-${a.id}`}
                      onClick={() => {
                        if (!active.current)
                          onExpand(expanded === a.id ? null : a.id);
                      }}
                    >
                      <span className="stack-box-head">
                        <strong>
                          {a.time} · {a.client}
                        </strong>
                        <span className="stack-status">{a.status}</span>
                      </span>
                      <span className="stack-box-body">
                        <span>{a.procedure}</span>
                        <strong>{money(a.value)}</strong>
                      </span>
                      {admin && <small>{a.professional}</small>}
                    </button>
                  </div>
                  {canReschedule(a) && (
                    <button
                      className="text-button stack-reschedule"
                      onClick={() => onReschedule(a)}
                    >
                      <CalendarClock size={14} />
                      Reagendar
                    </button>
                  )}
                  {expanded === a.id && (
                    <div className="stack-detail" id={`stack-details-${a.id}`}>
                      {renderDetails(a)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <span className="stack-empty">Sem agendamentos</span>
            )}
          </div>
        </section>
      ))}
      {drag && (
        <div
          className={`stack-drag-preview stack-tone-${agendaStatusTone(drag.appointment.status)}`}
          style={{
            left: Math.max(8, Math.min(drag.x + 14, window.innerWidth - 220)),
            top: Math.max(8, Math.min(drag.y - 66, window.innerHeight - 80)),
          }}
        >
          <strong>{drag.appointment.client}</strong>
          <span>
            {drag.target
              ? `Soltar às ${drag.target}`
              : "Arraste até um horário"}
          </span>
        </div>
      )}
    </div>
  );
}
