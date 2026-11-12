import { whatsAppLink, type Appointment, type Client } from "./domain";
export const defaultAppointmentMessage =
  "Olá, {nome}! Seu atendimento na {estabelecimento} está agendado para {data}, às {horario}, com {profissional}. Procedimentos: {procedimentos}. Até lá!";
export type ReminderOpening = { signature: string; openedAt: string };
export function appointmentMessage(
  template: string,
  appointment: Appointment,
  establishment: string,
) {
  const values: Record<string, string> = {
    nome: appointment.client.split(" ")[0],
    estabelecimento: establishment,
    data: appointment.date.split("-").reverse().join("/"),
    horario: appointment.time,
    profissional: appointment.professional,
    procedimentos: appointment.procedure,
  };
  return template.replace(
    /\{(nome|estabelecimento|data|horario|profissional|procedimentos)\}/g,
    (_, key: string) => values[key],
  );
}
export function appointmentReminder(
  appointment: Appointment,
  clients: Client[],
  template: string,
  establishment: string,
) {
  const client = appointment.clientId
    ? clients.find((c) => c.id === appointment.clientId)
    : clients.find((c) => c.name === appointment.client);
  if (!client)
    throw new Error(
      "Cadastre o telefone e a autorização do cliente para abrir o lembrete.",
    );
  if (
    appointment.status === "Cancelado" ||
    appointment.status === "Não compareceu"
  )
    throw new Error("Este atendimento não está ativo para lembrete.");
  const message = appointmentMessage(template, appointment, establishment);
  const url = whatsAppLink(client, message);
  return {
    url,
    message,
    signature: JSON.stringify([
      appointment.id,
      appointment.date,
      appointment.time,
      appointment.professional,
      appointment.procedure,
      url,
    ]),
  };
}
