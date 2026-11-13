import { describe, expect, it } from "vitest";
import {
  controlPresence,
  establishmentPresent,
  professionalPresent,
  ESTABLISHMENT,
  isPresent,
  localMoment,
  presenceAvailability,
  togglePresence,
  type PresenceEvent,
} from "./presence";
import { occupationStats, metricsReport } from "./metrics";
import { defaultSchedule, type Appointment } from "./domain";
const professional = "Ana";
const day = "2026-11-12";
const at = (time: string, date = day) => `${date}T${time}:00-03:00`;
const event = (
  scope: string,
  time: string,
  open: boolean,
  date = day,
): PresenceEvent => ({
  scope,
  at: new Date(at(time, date)).toISOString(),
  open,
});
const now = new Date(at("18:00")).toISOString();
const scheduled: [number, number][] = [[540, 1080]];
const available = (events: PresenceEvent[], date = day, reference = now) =>
  presenceAvailability(scheduled, events, professional, date, reference);
describe("controle de presença", () => {
  it("converte o relógio para São Paulo inclusive na virada do dia", () => {
    expect(localMoment("2026-11-13T01:30:00Z")).toEqual({
      date: day,
      minute: 1350,
    });
  });
  it("preserva jornada como referência quando não há registros", () => {
    expect(available([])).toEqual({ intervals: scheduled, tracked: false });
  });
  it("fecha a partir do horário registrado sem apagar o tempo anterior", () => {
    expect(available([event(ESTABLISHMENT, "14:00", false)]).intervals).toEqual(
      [[540, 840]],
    );
  });
  it("desconta saída e retorno do profissional", () => {
    expect(
      available([
        event(professional, "12:00", false),
        event(professional, "14:00", true),
      ]).intervals,
    ).toEqual([
      [540, 720],
      [840, 1080],
    ]);
  });
  it("cruza abertura do estabelecimento e presença individual sem contar duas vezes", () => {
    expect(
      available([
        event(ESTABLISHMENT, "13:00", false),
        event(ESTABLISHMENT, "15:00", true),
        event(professional, "12:00", false),
        event(professional, "16:00", true),
      ]).intervals,
    ).toEqual([
      [540, 720],
      [960, 1080],
    ]);
  });
  it("retoma a jornada no novo dia sem carregar o fechamento anterior", () => {
    const events = [
      event(ESTABLISHMENT, "16:00", false, "2026-11-11"),
      event(ESTABLISHMENT, "10:00", true),
    ];
    expect(available(events).intervals).toEqual([[540, 1080]]);
  });
  it("preserva dias anteriores ao controle e não projeta presença futura", () => {
    const events = [event(ESTABLISHMENT, "16:00", false)];
    expect(available(events, "2026-11-11")).toEqual({
      intervals: scheduled,
      tracked: false,
    });
    expect(available(events, "2026-11-13")).toEqual({
      intervals: [],
      tracked: true,
    });
  });
  it("limita presença aberta ao tempo decorrido", () => {
    expect(
      available(
        [
          event(professional, "10:00", false),
          event(professional, "11:00", true),
        ],
        day,
        new Date(at("12:00")).toISOString(),
      ).intervals,
    ).toEqual([
      [540, 600],
      [660, 720],
    ]);
  });
  it("não deixa saída de outro profissional mudar a disponibilidade", () => {
    expect(
      available([event("Outra pessoa", "10:00", false)]).intervals,
    ).toEqual(scheduled);
  });
  it("alterna estados e mantém histórico imutável", () => {
    const original: PresenceEvent[] = [];
    const closed = togglePresence(
      original,
      professional,
      new Date(at("12:00")).toISOString(),
    );
    const reopened = togglePresence(
      closed,
      professional,
      new Date(at("13:00")).toISOString(),
    );
    expect(original).toHaveLength(0);
    expect(closed).toHaveLength(1);
    expect(isPresent(closed, professional, now)).toBe(false);
    expect(isPresent(reopened, professional, now)).toBe(true);
    expect(isPresent(reopened, ESTABLISHMENT, now)).toBe(true);
  });
  it("aplica presença tanto no denominador quanto nos atendimentos, mantendo financeiro", () => {
    const schedule = defaultSchedule(professional);
    const appointments: Appointment[] = [
      {
        id: 1,
        client: "Teste",
        professional,
        procedure: "Serviço",
        date: day,
        time: "13:30",
        duration: 60,
        value: 100,
        commissionRate: 40,
        status: "Concluído",
        paymentMethod: "Pix",
      },
    ];
    const events = [event(ESTABLISHMENT, "14:00", false)];
    const stats = occupationStats(
      appointments,
      [],
      [schedule],
      [professional],
      "day",
      day,
      events,
      now,
    );
    expect(stats.availableMinutes).toBe(300);
    expect(stats.occupiedMinutes).toBe(30);
    expect(stats.rate).toBe(10);
    expect(stats.trackedDays).toBe(1);
    expect(stats.scheduledDays).toBe(0);
    const report = metricsReport(
      appointments,
      [],
      [schedule],
      [professional],
      "day",
      day,
      events,
      now,
    );
    expect(report.received).toBe(100);
    expect(report.occupation.availableMinutes).toBe(300);
    expect(report.professionals[0].availableMinutes).toBe(300);
  });
  it("continua descontando restrições e jornadas desligadas", () => {
    const schedule = {
      ...defaultSchedule(professional),
      restrictions: [
        {
          id: 1,
          date: day,
          start: "12:00",
          end: "13:00",
          allDay: false,
          reason: "Almoço",
        },
      ],
    };
    expect(
      occupationStats(
        [],
        [],
        [schedule],
        [professional],
        "day",
        day,
        [event(ESTABLISHMENT, "14:00", false)],
        now,
      ).availableMinutes,
    ).toBe(240);
    expect(
      occupationStats(
        [],
        [],
        [
          {
            ...schedule,
            days: schedule.days.map((d) => ({ ...d, enabled: false })),
          },
        ],
        [professional],
        "day",
        day,
        [],
        now,
      ).availableMinutes,
    ).toBe(0);
  });
});

describe("profissional único e presença em dia de folga", () => {
  const sunday = "2026-11-15";
  const schedule = defaultSchedule(professional);
  const arrive = new Date(at("10:00", sunday)).toISOString();
  const leave = new Date(at("12:00", sunday)).toISOString();
  const reference = new Date(at("15:00", sunday)).toISOString();
  it("inicia ausente na folga e registra chegada explicitamente", () => {
    expect(professionalPresent([], professional, arrive, schedule)).toBe(false);
    const events = controlPresence([], professional, arrive, [schedule]);
    expect(events[0].open).toBe(true);
    expect(professionalPresent(events, professional, reference, schedule)).toBe(
      true,
    );
    expect(
      occupationStats(
        [],
        [],
        [schedule],
        [professional],
        "day",
        sunday,
        events,
        reference,
      ).availableMinutes,
    ).toBe(300);
  });
  it("encerra presença excepcional na saída e preserva pausas", () => {
    let events = controlPresence([], professional, arrive, [schedule]);
    events = controlPresence(events, professional, leave, [schedule]);
    events = controlPresence(
      events,
      professional,
      new Date(at("14:00", sunday)).toISOString(),
      [schedule],
    );
    expect(
      occupationStats(
        [],
        [],
        [schedule],
        [professional],
        "day",
        sunday,
        events,
        reference,
      ).availableMinutes,
    ).toBe(180);
  });
  it("não presume trabalho no domingo por chegada no sábado", () => {
    const events = [event(professional, "10:00", true, "2026-11-14")];
    expect(professionalPresent(events, professional, reference, schedule)).toBe(
      false,
    );
    expect(
      occupationStats(
        [],
        [],
        [schedule],
        [professional],
        "day",
        sunday,
        events,
        reference,
      ).availableMinutes,
    ).toBe(0);
  });
  it("profissional único sincroniza o estabelecimento sem seletor nem bloqueio oculto", () => {
    const events = [event(ESTABLISHMENT, "09:00", false)];
    const reopened = controlPresence(
      events,
      professional,
      new Date(at("10:00")).toISOString(),
      [schedule],
      professional,
    );
    expect(isPresent(reopened, professional, now)).toBe(true);
    expect(isPresent(reopened, ESTABLISHMENT, now)).toBe(true);
    const closed = controlPresence(
      reopened,
      professional,
      new Date(at("14:00")).toISOString(),
      [schedule],
      professional,
    );
    expect(isPresent(closed, professional, now)).toBe(false);
    expect(isPresent(closed, ESTABLISHMENT, now)).toBe(false);
  });
  it("mantém registros e estado após serializar para armazenamento", () => {
    const events = controlPresence(
      [],
      professional,
      arrive,
      [schedule],
      professional,
    );
    const reloaded = JSON.parse(JSON.stringify(events));
    expect(
      professionalPresent(reloaded, professional, reference, schedule),
    ).toBe(true);
    expect(
      occupationStats(
        [],
        [],
        [schedule],
        [professional],
        "day",
        sunday,
        reloaded,
        reference,
      ).availableMinutes,
    ).toBe(300);
  });
  it("respeita bloqueio manual mesmo na chegada excepcional", () => {
    const blocked = {
      ...schedule,
      restrictions: [
        {
          id: 1,
          date: sunday,
          start: "00:00",
          end: "23:59",
          allDay: true,
          reason: "Ausência",
        },
      ],
    };
    const events = controlPresence([], professional, arrive, [blocked]);
    expect(
      occupationStats(
        [],
        [],
        [blocked],
        [professional],
        "day",
        sunday,
        events,
        reference,
      ).availableMinutes,
    ).toBe(0);
  });
});

describe("presença automática pela jornada de São Paulo", () => {
  const schedule = defaultSchedule(professional);
  const presentAt = (time: string, events: PresenceEvent[] = []) =>
    professionalPresent(
      events,
      professional,
      new Date(at(time)).toISOString(),
      schedule,
    );
  it("inicia ausente antes das 9h, presente das 9h às 18h e ausente no término", () => {
    expect(presentAt("08:59")).toBe(false);
    expect(presentAt("09:00")).toBe(true);
    expect(presentAt("17:59")).toBe(true);
    expect(presentAt("18:00")).toBe(false);
    expect(presentAt("23:00")).toBe(false);
  });
  it("não carrega entrada ou saída do dia anterior", () => {
    for (const open of [true, false]) {
      const events = [event(professional, "10:00", open, "2026-11-11")];
      expect(presentAt("08:00", events)).toBe(false);
      expect(presentAt("10:00", events)).toBe(true);
    }
  });
  it("preserva saída manual no mesmo dia e encerra chegada regular no fim do expediente", () => {
    const events = [
      event(professional, "10:00", false),
      event(professional, "11:00", true),
    ];
    expect(presentAt("10:30", events)).toBe(false);
    expect(presentAt("12:00", events)).toBe(true);
    expect(presentAt("18:00", events)).toBe(false);
  });
  it("fica ausente durante restrição e retorna à jornada ao terminar", () => {
    const blocked = {
      ...schedule,
      restrictions: [
        {
          id: 1,
          date: day,
          allDay: false,
          start: "12:00",
          end: "13:00",
          reason: "Ausência",
        },
      ],
    };
    expect(professionalPresent([], professional, at("12:30"), blocked)).toBe(
      false,
    );
    expect(professionalPresent([], professional, at("13:00"), blocked)).toBe(
      true,
    );
    expect(
      professionalPresent([], professional, at("13:00"), {
        ...blocked,
        restrictions: [{ ...blocked.restrictions[0], allDay: true }],
      }),
    ).toBe(false);
  });
  it("considera a jornada ao abrir o estabelecimento e ignora fechamento de ontem", () => {
    const events = [event(ESTABLISHMENT, "16:00", false, "2026-11-11")];
    expect(establishmentPresent(events, at("08:00"), [schedule])).toBe(false);
    expect(establishmentPresent(events, at("10:00"), [schedule])).toBe(true);
    expect(establishmentPresent(events, at("18:00"), [schedule])).toBe(false);
    const next = controlPresence(
      events,
      professional,
      new Date(at("10:00")).toISOString(),
      [schedule],
      professional,
    );
    expect(next.slice(-2).every((e) => !e.open)).toBe(true);
  });
});
