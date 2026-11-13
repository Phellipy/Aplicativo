import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessService } from "./service";
import {
  HttpError,
  professionalPath,
  dataPath,
  type BackendStore,
  type IdentityProvider,
  type Stored,
  type Write,
} from "./contracts";
import worker, { handle, type Env } from "./index";
class Memory implements BackendStore {
  docs = new Map<string, Stored>();
  sequence = 0;
  seed(path: string, value: any) {
    const doc = {
      path,
      value: structuredClone(value),
      updateTime: String(++this.sequence),
    };
    this.docs.set(path, doc);
    return doc;
  }
  async get(path: string) {
    return structuredClone(this.docs.get(path) ?? null);
  }
  async query(path: string, field?: string, value?: string | boolean) {
    return structuredClone(
      [...this.docs.values()].filter(
        (doc) =>
          doc.path.startsWith(path + "/") &&
          doc.path.slice(path.length + 1).indexOf("/") === -1 &&
          (!field ||
            field.split(".").reduce((v, k) => v?.[k], doc.value) === value),
      ),
    );
  }
  async commit(writes: Write[]) {
    for (const write of writes) {
      const current = this.docs.get(write.path);
      if (
        write.previous
          ? current?.updateTime !== write.previous.updateTime
          : !!current
      )
        throw new HttpError(409, "Conflito de revisão.");
    }
    for (const write of writes) {
      if (write.verify) continue;
      if (write.remove) this.docs.delete(write.path);
      else this.seed(write.path, write.value);
    }
  }
}
class Identity implements IdentityProvider {
  passwords = new Map<string, string>();
  async administrator(token: string) {
    if (token === "admin-token")
      return { uid: "admin", email: "admin@example.test" };
    if (token === "unauthorized")
      return { uid: "not-admin", email: "other@example.test" };
    throw new HttpError(401, "Inválido");
  }
  async setPassword(uid: string, email: string, password: string) {
    this.passwords.set(email, password);
  }
  async checkPassword(email: string, password: string) {
    if (this.passwords.get(email) !== password)
      throw new HttpError(401, "Usuário ou senha inválidos.");
  }
}
let db: Memory, identity: Identity, api: AccessService, clock: number;
const password = "senha-ficticia-de-teste-01";
const configure = () =>
  api.setAccess("admin-token", "10", { username: "ana.silva", password });
const login = () => api.login({ username: "ANA.SILVA", password });
beforeEach(() => {
  db = new Memory();
  identity = new Identity();
  clock = Date.parse("2026-11-13T12:00:00Z");
  api = new AccessService(db, identity, () => clock);
  db.seed("administrators/admin", {
    active: true,
    role: "admin",
    email: "admin@example.test",
  });
  db.seed(professionalPath("10"), {
    value: { id: 10, name: "Ana", active: true, services: [] },
    position: 0,
    revision: 1,
  });
  db.seed(professionalPath("20"), {
    value: { id: 20, name: "Outro", active: true, services: [] },
    position: 1,
    revision: 1,
  });
  db.seed(`${dataPath("appointments")}/1`, {
    value: {
      id: 1,
      clientId: 5,
      client: "Cliente da Ana",
      professional: "Ana",
      date: "2026-11-13",
      time: "09:00",
      duration: 30,
      value: 100,
      commissionRate: 50,
      procedure: "Corte",
      status: "Agendado",
    },
    position: 0,
    revision: 1,
  });
  db.seed(`${dataPath("appointments")}/2`, {
    value: {
      id: 2,
      client: "Cliente privado",
      professional: "Outro",
      date: "2026-11-13",
      time: "09:00",
      value: 999,
      status: "Agendado",
    },
    position: 1,
    revision: 1,
  });
  db.seed(`${dataPath("clients")}/5`, {
    value: {
      id: 5,
      name: "Cliente da Ana",
      phone: "11999998888",
      lastVisit: "",
      consent: false,
    },
    position: 0,
    revision: 1,
  });
});
describe("autorização e senhas profissionais no servidor", () => {
  it("somente o administrador cria ou redefine credenciais", async () => {
    await expect(
      api.setAccess("unauthorized", "10", { username: "ana", password }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      api.setAccess("invalid", "10", { username: "ana", password }),
    ).rejects.toMatchObject({ status: 401 });
    expect(db.docs.has("professionalAccess/10")).toBe(false);
  });
  it("não armazena senha no Firestore e retorna somente sessão opaca", async () => {
    await configure();
    const session = await login();
    expect(session.token).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify([...db.docs.values()])).not.toContain(password);
    expect(JSON.stringify([...db.docs.values()])).not.toContain(session.token);
    expect(Object.keys(session).sort()).toEqual(["expiresAt", "token"]);
  });
  it("recusa senha incorreta e usuário inexistente com resposta genérica", async () => {
    await configure();
    await expect(
      api.login({ username: "ana.silva", password: "incorreta" }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Usuário ou senha inválidos.",
    });
    await expect(
      api.login({ username: "nao-existe", password }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Usuário ou senha inválidos.",
    });
  });
  it("impede usuários duplicados em profissionais diferentes", async () => {
    await configure();
    await expect(
      api.setAccess("admin-token", "20", { username: "ANA.SILVA", password }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("redefinir invalida a senha e todas as sessões anteriores", async () => {
    await configure();
    const old = await login();
    await api.setAccess("admin-token", "10", {
      username: "ana.silva",
      password: "outra-senha-ficticia-02",
    });
    await expect(api.workspace(old.token)).rejects.toMatchObject({
      status: 401,
    });
    await expect(login()).rejects.toMatchObject({ status: 401 });
    expect(
      (
        await api.login({
          username: "ana.silva",
          password: "outra-senha-ficticia-02",
        })
      ).token,
    ).toBeTruthy();
  });
  it("desabilitar ou excluir o profissional impede uso de sessão existente", async () => {
    await configure();
    const session = await login();
    const doc = (await db.get(professionalPath("10")))!;
    db.seed(doc.path, {
      ...doc.value,
      value: { ...doc.value.value, active: false },
    });
    await expect(api.workspace(session.token)).rejects.toMatchObject({
      status: 403,
    });
    await expect(login()).rejects.toMatchObject({ status: 401 });
  });
  it("suspender acesso e sair revogam sessões", async () => {
    await configure();
    const session = await login();
    await api.logout(session.token);
    await expect(api.workspace(session.token)).rejects.toMatchObject({
      status: 401,
    });
    const second = await login();
    await api.revokeAccess("admin-token", "10");
    await expect(api.workspace(second.token)).rejects.toMatchObject({
      status: 401,
    });
    await expect(login()).rejects.toMatchObject({ status: 401 });
  });
  it("a sessão expira e uma redefinição incompleta mantém o acesso suspenso", async () => {
    await configure();
    const session = await login();
    clock += 8 * 3600000 + 1;
    await expect(api.workspace(session.token)).rejects.toMatchObject({
      status: 401,
    });
    vi.spyOn(identity, "setPassword").mockRejectedValueOnce(
      new Error("provider offline"),
    );
    await expect(configure()).rejects.toThrow("provider offline");
    await expect(login()).rejects.toMatchObject({ status: 401 });
    clock += 121000;
    await configure();
    expect((await login()).token).toBeTruthy();
  });
  it("não ativa acesso se o administrador for revogado durante a redefinição", async () => {
    vi.spyOn(identity, "setPassword").mockImplementationOnce(async () => {
      db.seed("administrators/admin", {
        role: "admin",
        active: false,
        email: "admin@example.test",
      });
    });
    await expect(configure()).rejects.toMatchObject({ status: 409 });
    expect((await db.get("professionalAccess/10"))?.value.active).toBe(false);
  });
  it("não expõe credenciais ou agenda de outros profissionais", async () => {
    await configure();
    const session = await login(),
      workspace = await api.workspace(session.token);
    expect(workspace.appointments).toHaveLength(1);
    expect(workspace.professional).toEqual({ id: 10, name: "Ana" });
    const text = JSON.stringify(workspace);
    for (const secret of [
      "Cliente privado",
      "aliasEmail",
      "credentialUid",
      password,
    ])
      expect(text).not.toContain(secret);
    await expect(
      api.action(session.token, "2", { action: "cancel", revision: 1 }),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      (await db.get(`${dataPath("appointments")}/2`))?.value.value.status,
    ).toBe("Agendado");
  });
  it("permite concluir somente atendimento próprio e atualiza a visita na mesma gravação", async () => {
    await configure();
    const session = await login();
    await api.action(session.token, "1", {
      action: "complete",
      payment: "Pix",
      revision: 1,
      professional: "Outro",
      commissionRate: 99,
    });
    const saved = (await db.get(`${dataPath("appointments")}/1`))!.value.value;
    expect(saved).toMatchObject({
      status: "Concluído",
      paymentMethod: "Pix",
      professional: "Ana",
      commissionRate: 50,
    });
    expect(
      (await db.get(`${dataPath("clients")}/5`))!.value.value.lastVisit,
    ).toBe("2026-11-13");
    await expect(
      api.action(session.token, "1", {
        action: "payment",
        payment: "Dinheiro",
        revision: 1,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("mantém horário original ao tentar reagendar fora da jornada", async () => {
    await configure();
    const session = await login();
    await expect(
      api.action(session.token, "1", {
        action: "reschedule",
        revision: 1,
        date: "2026-11-13",
        time: "23:00",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      (await db.get(`${dataPath("appointments")}/1`))!.value.value.time,
    ).toBe("09:00");
  });
});
describe("rotas do Worker", () => {
  const env = () =>
    ({
      FIREBASE_PROJECT_ID: "dalisson-2f074",
      FIREBASE_SERVICE_ACCOUNT: "",
      FIREBASE_WEB_API_KEY: "public-test-key",
      ALLOWED_ORIGINS: "https://example.test",
      LOGIN_IP_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
      LOGIN_USER_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
      API_IP_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    }) satisfies Env;
  const request = (path: string, body?: unknown) =>
    new Request("https://worker.test" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: "https://example.test",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.1",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  it("não oferece troca ou recuperação de senha ao profissional", async () => {
    const response = await handle(
      request("/professional/reset-password", {}),
      env(),
      api,
    );
    expect(response.status).toBe(404);
  });
  it("aplica limite de tentativas antes de validar credenciais", async () => {
    const config = env();
    config.LOGIN_USER_LIMITER.limit.mockResolvedValueOnce({ success: false });
    const spy = vi.spyOn(api, "login");
    const response = await handle(
      request("/professional/login", { username: "ana", password }),
      config,
      api,
    );
    expect(response.status).toBe(429);
    expect(spy).not.toHaveBeenCalled();
  });
  it("bloqueia origem inesperada e tamanho excessivo", async () => {
    const response = await handle(
      new Request("https://worker.test/public/access", {
        headers: { Origin: "https://evil.test" },
      }),
      env(),
      api,
    );
    expect(response.status).toBe(403);
    expect(
      (
        await handle(
          request("/professional/login", {
            username: "ana",
            password: "x".repeat(9000),
          }),
          env(),
          api,
        )
      ).status,
    ).toBe(413);
  });
  it("não permite administrar acesso usando uma sessão de profissional", async () => {
    await configure();
    const session = await login();
    const response = await handle(
      new Request("https://worker.test/admin/professionals/10/access", {
        method: "POST",
        headers: {
          Origin: "https://example.test",
          Authorization: `Bearer ${session.token}`,
          "CF-Connecting-IP": "192.0.2.1",
        },
        body: JSON.stringify({ username: "ana", password }),
      }),
      env(),
      api,
    );
    expect(response.status).toBe(401);
  });
});

afterEach(() => vi.restoreAllMocks());
it("o contexto nativo do Worker não substitui o serviço de autorização", async () => {
  const enabled = vi
    .spyOn(AccessService.prototype, "enabled")
    .mockResolvedValue(true);
  const limiter = { limit: async () => ({ success: true }) };
  const response = await worker.fetch(
    new Request("https://worker.test/public/access", {
      headers: {
        Origin: "https://example.test",
        "CF-Connecting-IP": "192.0.2.1",
      },
    }),
    {
      FIREBASE_PROJECT_ID: "dalisson-2f074",
      FIREBASE_SERVICE_ACCOUNT: "",
      FIREBASE_WEB_API_KEY: "test",
      ALLOWED_ORIGINS: "https://example.test",
      LOGIN_IP_LIMITER: limiter,
      LOGIN_USER_LIMITER: limiter,
      API_IP_LIMITER: limiter,
    },
    { waitUntil: () => {} },
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ enabled: true });
  expect(enabled).toHaveBeenCalledOnce();
});

describe("cadastros pelo profissional", () => {
  async function setup() {
    const record = db.docs.get(professionalPath("10"))!;
    db.seed(record.path, {
      ...record.value,
      value: {
        ...record.value.value,
        services: [{ procedureId: 7, enabled: true, commissionRate: 60 }],
      },
    });
    db.seed(`${dataPath("procedures")}/7`, {
      value: { id: 7, name: "Corte", duration: 30, price: 80 },
      revision: 0,
      position: 0,
    });
    db.seed(`${dataPath("procedures")}/8`, {
      value: { id: 8, name: "Privado", duration: 60, price: 500 },
      revision: 0,
      position: 1,
    });
    db.seed(`${dataPath("work-schedules")}/0`, {
      value: {
        professional: "Ana",
        days: Array.from({ length: 7 }, (_, day) => ({
          day,
          enabled: true,
          start: "08:00",
          end: "18:00",
        })),
        restrictions: [],
      },
      revision: 0,
      position: 0,
    });
    await configure();
    return (await login()).token;
  }
  const booking = {
    id: 1000,
    clientId: 5,
    procedureIds: [7],
    date: "2026-11-13",
    time: "10:00",
  };
  it("cria cliente sem permitir documento, consentimento ou histórico forjados", async () => {
    const token = await setup();
    const r = await api.createClient(token, {
      name: "Novo",
      phone: "(11) 98888-7777",
      consent: true,
      document: "123",
      lastVisit: "2026-01-01",
    });
    const c = (await db.get(`${dataPath("clients")}/${r.id}`))!.value.value;
    expect(c).toMatchObject({
      name: "Novo",
      phone: "5511988887777",
      consent: false,
      lastVisit: "",
    });
    expect(c.document).toBe("");
    await expect(
      api.createClient(token, {
        name: "Outro nome",
        phone: "+55 11 98888-7777",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("agenda somente para si com preço e repasse definidos pelo servidor", async () => {
    const token = await setup();
    await api.book(token, {
      ...booking,
      professional: "Outro",
      value: 1,
      commissionRate: 100,
      status: "Concluído",
    });
    expect(
      (await db.get(`${dataPath("appointments")}/1000`))!.value.value,
    ).toMatchObject({
      professional: "Ana",
      value: 80,
      commissionRate: 60,
      status: "Agendado",
      clientId: 5,
    });
    await expect(
      api.book(token, { ...booking, id: 1001 }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rejeita procedimento desabilitado, cliente ausente e horário fora da jornada", async () => {
    const token = await setup();
    for (const input of [
      { ...booking, procedureIds: [8] },
      { ...booking, clientId: 999 },
      { ...booking, time: "23:00" },
    ])
      await expect(api.book(token, input)).rejects.toMatchObject({
        status: 400,
      });
    expect(db.docs.has(`${dataPath("appointments")}/1000`)).toBe(false);
  });
  it("valida toda recorrência antes de gravar e bloqueia sessão suspensa", async () => {
    const token = await setup();
    await api.book(token, {
      ...booking,
      recurring: true,
      recurrenceEnd: "2026-11-20",
      weekdays: [5],
    });
    expect(
      (await db.get(`${dataPath("appointments")}/1001`))!.value.value.date,
    ).toBe("2026-11-20");
    await api.revokeAccess("admin-token", "10");
    await expect(
      api.createClient(token, { name: "Negado", phone: "11988776655" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      api.book(token, { ...booking, id: 2000 }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("expõe somente contatos básicos e os próprios procedimentos habilitados", async () => {
    const token = await setup();
    const c = db.docs.get(`${dataPath("clients")}/5`)!;
    db.seed(c.path, {
      ...c.value,
      value: { ...c.value.value, document: "12345678901", consent: true },
    });
    const data = await api.workspace(token);
    expect(data.clients[0]).toEqual({
      id: 5,
      name: "Cliente da Ana",
      phone: "11999998888",
    });
    expect(data.procedures.map((p) => p.id)).toEqual([7]);
    expect(Object.keys(data.procedures[0].individualRates!)).toEqual(["Ana"]);
  });
});
describe("configuração independente por instalação", () => {
  it("usa somente os caminhos da instância configurada no Worker", async () => {
    const record = db.docs.get(professionalPath("10"))!;
    db.seed(professionalPath("10", "empresa-b"), {
      ...record.value,
      value: { ...record.value.value, name: "Equipe B" },
    });
    db.seed(`${dataPath("appointments", "empresa-b")}/8`, {
      value: {
        id: 8,
        professional: "Equipe B",
        client: "Cliente B",
        date: "2026-11-13",
        time: "10:00",
        status: "Agendado",
      },
      revision: 1,
      position: 0,
    });
    const other = new AccessService(db, identity, () => clock, "empresa-b");
    await other.setAccess("admin-token", "10", {
      username: "equipe.b",
      password,
    });
    const { token } = await other.login({ username: "equipe.b", password });
    const data = await other.workspace(token);
    expect(data.professional.name).toBe("Equipe B");
    expect(data.appointments.map((a) => a.id)).toEqual([8]);
    expect(data.clients).toEqual([]);
  });
  it("recusa caminhos arbitrários na configuração da instância", () => {
    expect(
      () => new AccessService(db, identity, () => clock, "../outra"),
    ).toThrow("Instância inválida");
  });
});
