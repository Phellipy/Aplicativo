function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a9 9 0 0 1-13.4 7.8L3 21l1.6-4.7A9 9 0 1 1 21 11.5Z" />
      <path d="m8.2 7.3 1.6 2.4-1 1.1c.9 1.9 2.1 3.1 4.1 4l1.1-1 2.5 1.5c-.3 1.5-1.4 2-2.6 1.7-4-1-6.9-3.9-7.8-7.7-.3-1.2.5-2 2.1-2Z" />
    </svg>
  );
}
import {
  appointmentReminder,
  type ReminderOpening,
} from "./appointmentReminder";
import type { Appointment, Client } from "./domain";
export default function AppointmentReminderLink({
  appointment,
  clients,
  template,
  establishment,
  opening,
  onOpen,
  onError,
}: {
  appointment: Appointment;
  clients: Client[];
  template: string;
  establishment: string;
  opening?: ReminderOpening;
  onOpen: (signature: string) => void;
  onError: (message: string) => void;
}) {
  let reminder: ReturnType<typeof appointmentReminder> | undefined,
    error = "";
  try {
    reminder = appointmentReminder(
      appointment,
      clients,
      template,
      establishment,
    );
  } catch (cause) {
    error = (cause as Error).message;
  }
  const opened = !!reminder && opening?.signature === reminder.signature;
  const label = `${opened ? "Lembrete aberto; abrir novamente" : "Abrir lembrete de agendamento"} · ${appointment.client} às ${appointment.time}`;
  if (!reminder)
    return (
      <button
        type="button"
        className="appointment-whatsapp unavailable"
        aria-label={`Lembrete indisponível · ${appointment.client}`}
        title={error}
        onClick={() => onError(error)}
      >
        <WhatsAppIcon />
      </button>
    );
  return (
    <a
      className={`appointment-whatsapp ${opened ? "was-opened" : ""}`}
      href={reminder.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={`${label}. Envio manual no WhatsApp; não há confirmação de envio.`}
      onClick={() => onOpen(reminder.signature)}
    >
      <WhatsAppIcon />
    </a>
  );
}
