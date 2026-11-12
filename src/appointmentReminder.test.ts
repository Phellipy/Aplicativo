import { describe, it, expect } from "vitest";
import {
  appointmentMessage,
  appointmentReminder,
  defaultAppointmentMessage,
} from "./appointmentReminder";
import { initialAppointments, type Client } from "./domain";
const appointment = { ...initialAppointments[0], clientId: 7 };
const client: Client = {
  id: 7,
  name: appointment.client,
  phone: "11900000000",
  lastVisit: appointment.date,
  consent: true,
};
describe("lembrete manual de agendamento", () => {
  it("inclui data, hora, procedimentos e profissional no link codificado", () => {
    const reminder = appointmentReminder(
      appointment,
      [client],
      defaultAppointmentMessage,
      "Empresa demo",
    );
    const url = new URL(reminder.url);
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/5511900000000");
    const message = url.searchParams.get("text")!;
    expect(message).toContain(appointment.time);
    expect(message).toContain(appointment.procedure);
    expect(message).toContain(appointment.professional);
    expect(message).toContain("11/11/2026");
    expect(message).toContain("Empresa demo");
  });
  it("mantém a indicação de aberto até mudar horário, procedimentos ou mensagem", () => {
    const original = appointmentReminder(
      appointment,
      [client],
      defaultAppointmentMessage,
      "Demo",
    );
    expect(
      appointmentReminder(
        { ...appointment, status: "Confirmado" },
        [client],
        defaultAppointmentMessage,
        "Demo",
      ).signature,
    ).toBe(original.signature);
    for (const changed of [
      { ...appointment, time: "15:00" },
      { ...appointment, date: "2026-11-12" },
      { ...appointment, procedure: "Outro procedimento" },
    ])
      expect(
        appointmentReminder(
          changed,
          [client],
          defaultAppointmentMessage,
          "Demo",
        ).signature,
      ).not.toBe(original.signature);
    expect(
      appointmentReminder(appointment, [client], "Mensagem alterada", "Demo")
        .signature,
    ).not.toBe(original.signature);
  });
  it("permite repetir a abertura e resolve o cliente por id", () => {
    const first = appointmentReminder(
      appointment,
      [{ ...client, name: "Nome alterado" }],
      defaultAppointmentMessage,
      "Demo",
    );
    expect(
      appointmentReminder(
        appointment,
        [client],
        defaultAppointmentMessage,
        "Demo",
      ).url,
    ).toBe(first.url);
  });
  it("não gera links sem autorização, para clientes excluídos ou sem telefone válido", () => {
    for (const changed of [
      { ...client, consent: false },
      { ...client, deletedAt: "2026-11-12" },
      { ...client, phone: "123" },
    ])
      expect(() =>
        appointmentReminder(
          appointment,
          [changed],
          defaultAppointmentMessage,
          "Demo",
        ),
      ).toThrow();
    expect(() =>
      appointmentReminder(appointment, [], defaultAppointmentMessage, "Demo"),
    ).toThrow();
    expect(() =>
      appointmentReminder(
        { ...appointment, status: "Cancelado" },
        [client],
        defaultAppointmentMessage,
        "Demo",
      ),
    ).toThrow();
  });
  it("substitui variáveis sem interpretar o texto do cliente como novas variáveis", () => {
    expect(
      appointmentMessage(
        "{nome} · {horario}",
        { ...appointment, client: "{horario} Teste" },
        "Demo",
      ),
    ).toBe(`{horario} · ${appointment.time}`);
  });
});
