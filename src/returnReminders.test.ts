import { describe, it, expect } from "vitest";
import {
  normalizeReturnDays,
  eligibleClients,
  returnReminderStats,
  completeClientVisit,
  inReminderCycle,
  saveClient,
  canOpenWhatsApp,
  type Client,
  type Campaign,
  type Appointment,
} from "./domain";
const client: Client = {
  id: 1,
  name: "Cliente teste",
  phone: "11900000000",
  consent: true,
  lastVisit: "2026-10-12",
};
const now = "2026-11-11T12:00:00Z";
const opened = (at: string, cycleResetAt?: string): Campaign => ({
  clientId: 1,
  status: "opened",
  created: at,
  openedAt: at,
  message: "Convite",
  ...(cycleResetAt !== undefined ? { cycleResetAt } : {}),
});
const appointment: Appointment = {
  id: 20,
  client: client.name,
  clientId: 1,
  professional: "Ana",
  procedure: "Serviço",
  date: "2026-11-11",
  time: "09:00",
  value: 100,
  commissionRate: 40,
  status: "Confirmado",
};
describe("prazo e ciclos de convite de retorno", () => {
  it("valida prazo inteiro entre 1 e 3650 dias e recupera configuração inválida", () => {
    expect(normalizeReturnDays(15)).toBe(15);
    for (const value of [0, -1, 1.5, 3651, "15", null])
      expect(normalizeReturnDays(value)).toBe(30);
  });
  it("usa o limite configurado, incluindo exatamente o dia do prazo", () => {
    expect(eligibleClients([client], [], "2026-11-11", 30)).toHaveLength(1);
    expect(eligibleClients([client], [], "2026-11-11", 31)).toHaveLength(0);
    expect(
      eligibleClients(
        [{ ...client, lastVisit: "2026-11-01" }],
        [],
        "2026-11-11",
        10,
      ),
    ).toHaveLength(1);
  });
  it("só libera convite com autorização, telefone válido, cadastro ativo e sem abertura recente", () => {
    const recent = [opened("2026-11-10T12:00:00Z")];
    for (const value of [
      { ...client, consent: false },
      { ...client, phone: "123" },
      { ...client, deletedAt: now },
    ])
      expect(
        eligibleClients([value], [], "2026-11-11", 30, Date.parse(now)),
      ).toHaveLength(0);
    expect(
      eligibleClients([client], recent, "2026-11-11", 30, Date.parse(now)),
    ).toHaveLength(0);
    expect(
      eligibleClients(
        [client],
        [opened("2026-11-04T12:00:00Z")],
        "2026-11-11",
        30,
        Date.parse(now),
      ),
    ).toHaveLength(1);
  });
  it("conta só aberturas do cliente e destaca a partir da terceira", () => {
    const entries = [
      opened("2026-10-15T12:00:00Z"),
      opened("2026-10-23T12:00:00Z"),
      opened("2026-11-01T12:00:00Z"),
    ];
    expect(returnReminderStats(client, entries.slice(0, 2))).toEqual({
      count: 2,
      lastOpenedAt: "2026-10-23T12:00:00Z",
      warning: false,
    });
    expect(
      returnReminderStats(client, [
        ...entries,
        { ...entries[0], clientId: 2 },
        { clientId: 1, status: "pending", created: now },
      ]),
    ).toEqual({
      count: 3,
      lastOpenedAt: "2026-11-01T12:00:00Z",
      warning: true,
    });
  });
  it("concluir visita zera ciclo e mantém histórico anterior intacto", () => {
    const history = [opened("2026-11-01T12:00:00Z", "")];
    const updated = completeClientVisit(client, appointment, now);
    expect(updated.lastVisit).toBe(appointment.date);
    expect(updated.reminderResetAt).toBe(now);
    expect(returnReminderStats(updated, history)).toEqual({
      count: 0,
      lastOpenedAt: undefined,
      warning: false,
    });
    expect(history).toHaveLength(1);
    expect(
      returnReminderStats(updated, [...history, opened(now, now)]).count,
    ).toBe(1);
  });
  it("alteração de pagamento e conclusão de outro cliente não zeram o ciclo", () => {
    const updated = { ...client, reminderResetAt: now };
    expect(
      completeClientVisit(
        updated,
        { ...appointment, status: "Concluído" },
        "2026-11-12T12:00:00Z",
      ),
    ).toBe(updated);
    expect(
      completeClientVisit(updated, { ...appointment, clientId: 9 }, now),
    ).toBe(updated);
  });
  it("não reinicia o ciclo ao concluir retroativamente uma visita anterior à última", () => {
    expect(
      completeClientVisit(client, { ...appointment, date: "2026-10-01" }, now),
    ).toBe(client);
  });
  it("mantém o ciclo ao editar nome, telefone ou documento", () => {
    const saved = { ...client, reminderResetAt: now };
    expect(
      saveClient([saved], [], { ...client, name: "Nome editado" }, "admin")
        .clients[0].reminderResetAt,
    ).toBe(now);
  });
  it("descarta aberturas antigas na proteção de repetição do novo ciclo", () => {
    const updated = { ...client, reminderResetAt: now };
    const history = [opened("2026-11-10T12:00:00Z", "")];
    expect(
      canOpenWhatsApp(
        history.filter((entry) => inReminderCycle(entry, updated)),
        client.id,
        "Convite",
        Date.parse(now),
      ),
    ).toBe(true);
  });
  it("migra histórico antigo por timestamp e preserva contador após recarregar", () => {
    const updated = { ...client, reminderResetAt: now };
    const history = [
      opened("2026-11-10T12:00:00Z"),
      opened("2026-11-12T12:00:00Z"),
    ];
    expect(
      returnReminderStats(
        JSON.parse(JSON.stringify(updated)),
        JSON.parse(JSON.stringify(history)),
      ).count,
    ).toBe(1);
  });
});
