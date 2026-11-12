import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripVertical, CalendarClock } from "lucide-react";
import {
  appointmentDuration,
  getAvailableTimes,
  timelineLayout,
  timeMinutes,
  minuteTime,
  fitsWorkSchedule,
  type Procedure,
  type WorkSchedule,
  agendaStatusTone,
  canReschedule,
  money,
  type Appointment,
} from "./domain";

type Props = {
  appointments: Appointment[];
  allAppointments: Appointment[];
  procedures: Procedure[];
  schedules: WorkSchedule[];
  date: string;
  laneNames: string[];
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
  allAppointments,
  procedures,
  schedules,
  date,
  laneNames,
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
  const scrollArea = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expanded !== null)
      detailsRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [expanded]);
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
        const area = scrollArea.current;
        const bounds = area?.getBoundingClientRect();
        const areaSpeed = bounds
          ? current.y < bounds.top + 50
            ? -8
            : current.y > bounds.bottom - 50
              ? 8
              : 0
          : 0;
        if (area && areaSpeed) area.scrollBy(0, areaSpeed);
        else if (speed) window.scrollBy(0, speed);
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

  const layout = timelineLayout(appointments, procedures);
  const workTimes = schedules
    .filter((s) => laneNames.includes(s.professional))
    .flatMap((s) =>
      s.days
        .filter(
          (d) =>
            d.enabled && d.day === new Date(`${date}T12:00:00Z`).getUTCDay(),
        )
        .flatMap((d) => [timeMinutes(d.start), timeMinutes(d.end)]),
    );
  const first =
    Math.floor(
      Math.min(480, ...workTimes, ...layout.map((p) => p.start)) / 60,
    ) * 60;
  const last =
    Math.ceil(Math.max(1200, ...workTimes, ...layout.map((p) => p.end)) / 60) *
    60;
  const scale = 2;
  const height = (last - first) * scale;
  const selected = appointments.find((a) => a.id === expanded);
  const available = drag
    ? getAvailableTimes(
        allAppointments,
        procedures,
        schedules,
        drag.appointment.professional,
        date,
        appointmentDuration(drag.appointment, procedures),
        drag.appointment.id,
      )
    : [];
  const ticks = Array.from(
    { length: (last - first) / 15 },
    (_, index) => first + index * 15,
  );
  const laneStyle = {
    gridTemplateColumns: `52px repeat(${laneNames.length},minmax(220px,1fr))`,
    minWidth: 52 + 220 * laneNames.length,
  };
  return (
    <div className={`agenda-stack ${drag ? "is-dragging" : ""}`} ref={root}>
      <p className="drag-instructions">
        A altura representa a duração total. Arraste pela alça ⋮⋮ (segure no
        celular), ou selecione a caixa para reagendar. Encaixe de 15 minutos.
      </p>
      <div className="sr-only" role="status">
        {drag
          ? `Arrastando ${drag.appointment.client}. ${drag.target ? `Novo horário: ${drag.target}.` : "Escolha um horário disponível na coluna do profissional."} Escape cancela.`
          : ""}
      </div>
      <div className="timeline-scroll" ref={scrollArea}>
        <div className="timeline-header" style={laneStyle}>
          <span>Hora</span>
          {laneNames.map((name) => (
            <strong key={name}>{admin ? name : "Minha agenda"}</strong>
          ))}
        </div>
        <div className="timeline-board" style={{ ...laneStyle, height }}>
          <div className="timeline-axis">
            {ticks
              .filter((minute) => minute % 60 === 0)
              .map((minute) => (
                <time key={minute} style={{ top: (minute - first) * scale }}>
                  {minuteTime(minute)}
                </time>
              ))}
          </div>
          {laneNames.map((name) => (
            <div
              className="timeline-lane"
              key={name}
              aria-label={`Horários de ${name}`}
            >
              {ticks
                .filter(
                  (minute) =>
                    !fitsWorkSchedule(
                      schedules.find((s) => s.professional === name),
                      date,
                      minuteTime(minute),
                      15,
                    ),
                )
                .map((minute) => (
                  <div
                    className="timeline-unavailable"
                    key={`unavailable-${minute}`}
                    style={{
                      top: (minute - first) * scale,
                      height: 15 * scale,
                    }}
                  >
                    {minute % 60 === 0 ? <span>Indisponível</span> : null}
                  </div>
                ))}
              {drag &&
                drag.appointment.professional === name &&
                ticks.map((minute) => {
                  const time = minuteTime(minute),
                    allowed = available.includes(time);
                  return (
                    <div
                      key={time}
                      data-drop-time={allowed ? time : undefined}
                      aria-label={`${time} ${allowed ? "disponível" : "indisponível"}`}
                      className={`timeline-drop-target ${allowed ? "" : "unavailable"} ${drag.target === time ? "is-over" : ""}`}
                      style={{
                        top: (minute - first) * scale,
                        height: 15 * scale,
                      }}
                    >
                      {time}
                      {!allowed ? " · indisponível" : ""}
                    </div>
                  );
                })}
              {layout
                .filter((item) => item.appointment.professional === name)
                .map((item) => {
                  const a = item.appointment;
                  return (
                    <div
                      key={a.id}
                      className={`timeline-event stack-tone-${agendaStatusTone(a.status)} ${drag?.appointment.id === a.id ? "timeline-source-dragging" : ""} ${item.end - item.start <= 30 ? "timeline-compact" : ""} ${item.end - item.start < 30 ? "timeline-short" : ""}`}
                      style={{
                        top: (item.start - first) * scale,
                        height: (item.end - item.start) * scale,
                        left: `calc(${(item.column / item.columns) * 100}% + 3px)`,
                        width: `calc(${100 / item.columns}% - 6px)`,
                      }}
                    >
                      {canReschedule(a) ? (
                        <button
                          className="stack-drag-handle"
                          aria-label={`Arrastar atendimento de ${a.client} às ${a.time}`}
                          title="Arrastar para outro horário"
                          onPointerDown={(event) => start(event, a)}
                          onPointerMove={move}
                          onPointerUp={finish}
                          onPointerCancel={reset}
                          onLostPointerCapture={reset}
                        >
                          <GripVertical size={18} />
                        </button>
                      ) : (
                        <span
                          className="stack-handle-space"
                          aria-hidden="true"
                        />
                      )}
                      <button
                        className="timeline-event-content"
                        aria-label={`${a.time} a ${minuteTime(item.end)} · ${a.client} · ${a.procedure} · ${money(a.value)} · ${a.status}`}
                        aria-expanded={expanded === a.id}
                        aria-controls="timeline-selected-details"
                        onClick={() => {
                          if (!active.current)
                            onExpand(expanded === a.id ? null : a.id);
                        }}
                        title={`${a.client} · ${a.procedure} · ${a.status}`}
                      >
                        <span className="timeline-event-heading">
                          <span className="timeline-event-status">
                            {a.status}
                          </span>
                          <span className="timeline-event-time">
                            {a.time}–{minuteTime(item.end)} ·{" "}
                            {item.end - item.start} min
                          </span>
                        </span>
                        <strong>{a.client}</strong>
                        <span className="timeline-event-service">
                          {a.procedure}
                        </span>
                        <span className="timeline-event-value">
                          {money(a.value)}
                        </span>
                        {canReschedule(a) &&
                          !fitsWorkSchedule(
                            schedules.find((s) => s.professional === name),
                            date,
                            a.time,
                            item.end - item.start,
                          ) && (
                            <span className="timeline-warning">
                              Revisar disponibilidade
                            </span>
                          )}
                      </button>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div
          ref={detailsRef}
          className="timeline-selected"
          id="timeline-selected-details"
        >
          <div className="timeline-selected-head">
            <strong>Atendimento selecionado</strong>
            {canReschedule(selected) && (
              <button
                className="secondary"
                onClick={() => onReschedule(selected)}
              >
                <CalendarClock size={16} />
                Reagendar
              </button>
            )}
            <button className="text-button" onClick={() => onExpand(null)}>
              Fechar detalhes
            </button>
          </div>
          {renderDetails(selected)}
        </div>
      )}
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
              : "Escolha um horário disponível"}
          </span>
        </div>
      )}
    </div>
  );
}
