import {
  completeClientVisit,
  assignedProcedures,
  saveClient,
  createAppointment,
  paymentMethods,
  rescheduleAppointment,
  type Appointment,
  type Client,
  type Procedure,
  type WorkSchedule,
} from "../../src/domain";
import { createRecurringAppointments } from "../../src/recurrence";
import {
  HttpError,
  dataPath,
  professionalPath,
  usernameKey,
  passwordValue,
  randomToken,
  sessionKey,
  type BackendStore,
  type IdentityProvider,
  type Stored,
  type Write,
} from "./contracts";
export class AccessService {
  constructor(
    private db: BackendStore,
    private identity: IdentityProvider,
    private now = () => Date.now(),
    private instanceId = "demo",
  ) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(instanceId))
      throw new HttpError(503, "Instância inválida.");
  }
  private dataPath(key: string) {
    return dataPath(key, this.instanceId);
  }
  private professionalPath(id: string) {
    return professionalPath(id, this.instanceId);
  }
  private async professional(id: string) {
    if (!/^\d{1,16}$/.test(id))
      throw new HttpError(400, "Profissional inválido.");
    const doc = await this.db.get(this.professionalPath(id));
    if (!doc || doc.value.value?.active !== true || doc.value.value.deletedAt)
      throw new HttpError(403, "Profissional indisponível ou desabilitado.");
    return doc;
  }
  private async administrator(token: string) {
    const user = await this.identity.administrator(token),
      member = await this.db.get(`administrators/${user.uid}`);
    if (
      !member ||
      member.value.active !== true ||
      member.value.role !== "admin" ||
      member.value.email !== user.email
    )
      throw new HttpError(
        403,
        "Somente o administrador pode gerenciar acessos.",
      );
    return member;
  }
  async enabled() {
    const access = await this.db.query("professionalAccess", "active", true);
    for (const item of access) {
      try {
        await this.professional(String(item.value.professionalId));
        return true;
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 403)) throw error;
      }
    }
    return false;
  }
  async access(token: string, id: string) {
    await this.administrator(token);
    const record = await this.db.get(this.professionalPath(id));
    if (!record) throw new HttpError(404, "Profissional não encontrado.");
    const access = await this.db.get(`professionalAccess/${id}`);
    return {
      configured: !!access,
      username: access?.value.username ?? "",
      active:
        !!access?.value.active &&
        !!record.value.value.active &&
        !record.value.value.deletedAt,
    };
  }
  async setAccess(token: string, id: string, input: any) {
    const actor = await this.administrator(token),
      record = await this.professional(id);
    const username = usernameKey(input.username),
      password = passwordValue(input.password);
    const previous = await this.db.get(`professionalAccess/${id}`),
      index = await this.db.get(`professionalLogins/${username}`);
    if (index && String(index.value.professionalId) !== id)
      throw new HttpError(409, "Esse usuário já está em uso.");
    if (
      previous?.value.pendingSince &&
      this.now() - previous.value.pendingSince < 120000
    )
      throw new HttpError(
        409,
        "Uma redefinição está em andamento. Aguarde dois minutos antes de tentar novamente.",
      );
    const operation = randomToken(),
      version = (previous?.value.version ?? 0) + 1;
    const value = {
      professionalId: id,
      username,
      credentialUid: previous?.value.credentialUid ?? `staff-login-${id}`,
      aliasEmail:
        previous?.value.aliasEmail ??
        `${randomToken()}@professional-access.invalid`,
      version,
      active: false,
      pendingSince: this.now(),
      operation,
    };
    const writes: Write[] = [
      {
        path: `professionalAccess/${id}`,
        value,
        previous: previous ?? undefined,
      },
      {
        path: `professionalLogins/${username}`,
        value: { professionalId: id },
        previous: index ?? undefined,
      },
      { path: actor.path, verify: true, previous: actor },
      { path: record.path, verify: true, previous: record },
    ];
    if (previous && previous.value.username !== username) {
      const old = await this.db.get(
        `professionalLogins/${previous.value.username}`,
      );
      if (old) writes.push({ path: old.path, remove: true, previous: old });
    }
    // Suspend and invalidate old sessions before changing the provider password.
    await this.db.commit(writes);
    await this.identity.setPassword(
      value.credentialUid,
      value.aliasEmail,
      password,
    );
    const pending = await this.db.get(`professionalAccess/${id}`);
    if (!pending || pending.value.operation !== operation)
      throw new HttpError(409, "A configuração mudou. Refaça a redefinição.");
    const { pendingSince, operation: _, ...final } = value;
    await this.db.commit([
      {
        path: pending.path,
        value: {
          ...final,
          active: true,
          updatedAt: new Date(this.now()).toISOString(),
        },
        previous: pending,
      },
      { path: actor.path, verify: true, previous: actor },
      { path: record.path, verify: true, previous: record },
    ]);
    return { configured: true, username, active: true };
  }
  async revokeAccess(token: string, id: string) {
    const actor = await this.administrator(token),
      access = await this.db.get(`professionalAccess/${id}`);
    if (access)
      await this.db.commit([
        {
          path: access.path,
          value: {
            ...access.value,
            active: false,
            version: access.value.version + 1,
          },
          previous: access,
        },
        { path: actor.path, verify: true, previous: actor },
      ]);
    return { active: false };
  }
  async login(input: any) {
    let username = "";
    try {
      username = usernameKey(input.username);
    } catch {
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }
    if (
      typeof input.password !== "string" ||
      input.password.length < 1 ||
      input.password.length > 128
    )
      throw new HttpError(401, "Usuário ou senha inválidos.");
    const index = await this.db.get(`professionalLogins/${username}`);
    const access = index
      ? await this.db.get(`professionalAccess/${index.value.professionalId}`)
      : null;
    if (!access?.value.active || access.value.username !== username) {
      try {
        await this.identity.checkPassword(
          "unavailable@professional-access.invalid",
          input.password,
        );
      } catch {}
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }
    try {
      await this.professional(String(access.value.professionalId));
    } catch {
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }
    await this.identity.checkPassword(access.value.aliasEmail, input.password);
    const fresh = await this.db.get(access.path);
    if (!fresh?.value.active || fresh.value.version !== access.value.version)
      throw new HttpError(401, "Usuário ou senha inválidos.");
    const token = randomToken(),
      hash = await sessionKey(token),
      expiresAt = this.now() + 8 * 3600000;
    await this.db.commit([
      {
        path: `professionalSessions/${hash}`,
        value: {
          professionalId: String(access.value.professionalId),
          version: access.value.version,
          expiresAt,
        },
      },
      { path: access.path, verify: true, previous: fresh },
    ]);
    return { token, expiresAt };
  }
  private async session(token: string) {
    const hash = await sessionKey(token),
      session = await this.db.get(`professionalSessions/${hash}`);
    if (!session || session.value.expiresAt <= this.now())
      throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
    const access = await this.db.get(
      `professionalAccess/${session.value.professionalId}`,
    );
    if (!access?.value.active || access.value.version !== session.value.version)
      throw new HttpError(401, "O acesso mudou. Entre novamente.");
    const record = await this.professional(
      String(session.value.professionalId),
    );
    return { session, access, record };
  }
  async logout(token: string) {
    const hash = await sessionKey(token),
      session = await this.db.get(`professionalSessions/${hash}`);
    if (session)
      await this.db.commit([
        { path: session.path, remove: true, previous: session },
      ]);
  }
  async workspace(token: string) {
    const { record } = await this.session(token),
      professional = record.value.value;
    const [appointments, schedules] = await Promise.all([
      this.db.query(
        this.dataPath("appointments"),
        "value.professional",
        professional.name,
      ),
      this.db.query(
        this.dataPath("work-schedules"),
        "value.professional",
        professional.name,
      ),
    ]);
    const clients = await this.db.query(this.dataPath("clients"));
    const procedures = await this.bookingProcedures();
    return {
      professional: { id: professional.id, name: professional.name },
      appointments: appointments.map((doc) => ({
        ...doc.value.value,
        revision: doc.value.revision,
      })),
      schedule: schedules[0]?.value.value ?? null,
      clients: clients
        .filter((d) => !d.value.value.deletedAt)
        .map((d) => ({
          id: d.value.value.id,
          name: d.value.value.name,
          phone: d.value.value.phone,
        })),
      procedures: procedures
        .filter((p) => p.professionals?.includes(professional.name))
        .map((p) => ({
          ...p,
          professionals: [professional.name],
          individualRates: {
            [professional.name]: p.individualRates?.[professional.name] ?? 100,
          },
        })),
    };
  }
  private async bookingProcedures() {
    const [catalog, professionals] = await Promise.all([
      this.db.query(this.dataPath("procedures")),
      this.db.query(this.dataPath("professional-records")),
    ]);
    return assignedProcedures(
      catalog.map((d) => d.value.value),
      professionals.map((d) => d.value.value),
    );
  }
  async createClient(token: string, input: any) {
    const { record, access, session } = await this.session(token);
    if (
      typeof input.name !== "string" ||
      input.name.trim().length > 120 ||
      typeof input.phone !== "string"
    )
      throw new HttpError(400, "Informe nome e telefone válidos.");
    let phone = input.phone.replace(/\D/g, "");
    if (phone.length === 10 || phone.length === 11) phone = "55" + phone;
    if (phone.length < 10 || phone.length > 15)
      throw new HttpError(400, "Informe um telefone com DDD.");
    const clients = await this.db.query(this.dataPath("clients"));
    if (
      clients.some((d) => {
        let saved = String(d.value.value.phone ?? "").replace(/\D/g, "");
        if (saved.length === 10 || saved.length === 11) saved = "55" + saved;
        return saved === phone;
      })
    )
      throw new HttpError(
        409,
        "Já existe um cliente com esse telefone. Selecione o cadastro existente ou procure o administrador.",
      );
    const id = -Number(phone);
    let client: Client;
    try {
      client = saveClient(
        clients.map((d) => d.value.value),
        [],
        { id, name: input.name, phone, lastVisit: "", consent: false },
        "admin",
      ).clients.find((c) => c.id === id)!;
    } catch (error) {
      throw new HttpError(400, (error as Error).message);
    }
    // No document, visit date, consent or reminder history is accepted from the caller.
    await this.db.commit([
      {
        path: `${this.dataPath("clients")}/${id}`,
        value: { value: client, position: this.now(), revision: 0 },
      },
      { path: record.path, previous: record, verify: true },
      { path: access.path, previous: access, verify: true },
      { path: session.path, previous: session, verify: true },
    ]);
    return { saved: true, id };
  }
  async book(token: string, input: any) {
    const { record, access, session } = await this.session(token);
    if (
      !Number.isSafeInteger(input.id) ||
      input.id < 1 ||
      !Number.isSafeInteger(input.clientId) ||
      !Array.isArray(input.procedureIds) ||
      input.procedureIds.length > 30 ||
      input.procedureIds.some((id: unknown) => !Number.isSafeInteger(id))
    )
      throw new HttpError(400, "Dados do agendamento inválidos.");
    const client = await this.db.get(
      `${this.dataPath("clients")}/${input.clientId}`,
    );
    if (!client || client.value.value.deletedAt)
      throw new HttpError(400, "Selecione um cliente ativo.");
    const name = record.value.value.name;
    const [all, schedules, procedures] = await Promise.all([
      this.db.query(this.dataPath("appointments"), "value.professional", name),
      this.db.query(
        this.dataPath("work-schedules"),
        "value.professional",
        name,
      ),
      this.bookingProcedures(),
    ]);
    const base = {
      id: input.id,
      client: client.value.value.name,
      professional: name,
      date: input.date,
      time: input.time,
    };
    let created: Appointment[];
    try {
      created =
        input.recurring === true
          ? createRecurringAppointments(
              base,
              input.recurrenceEnd,
              input.weekdays,
              input.procedureIds,
              procedures,
              all.map((d) => d.value.value),
              schedules.map((d) => d.value.value),
            )
          : [
              createAppointment(
                base,
                input.procedureIds,
                procedures,
                all.map((d) => d.value.value),
                schedules.map((d) => d.value.value),
              ),
            ];
    } catch (error) {
      throw new HttpError(400, (error as Error).message);
    }
    if (created.length > 365)
      throw new HttpError(400, "Reduza o período da recorrência.");
    const writes: Write[] = created.map((a) => ({
      path: `${this.dataPath("appointments")}/${a.id}`,
      value: {
        value: { ...a, clientId: input.clientId },
        position: a.id,
        revision: 0,
      },
    }));
    // Serialize professional bookings against the professional record revision.
    writes.push(
      {
        path: record.path,
        previous: record,
        value: { ...record.value, revision: record.value.revision + 1 },
      },
      { path: client.path, previous: client, verify: true },
      { path: access.path, previous: access, verify: true },
      { path: session.path, previous: session, verify: true },
    );
    await this.db.commit(writes);
    return { saved: true, count: created.length };
  }
  async action(token: string, id: string, input: any) {
    const { record, access, session } = await this.session(token);
    if (!/^-?\d{1,16}$/.test(id))
      throw new HttpError(400, "Atendimento inválido.");
    const document = await this.db.get(
      `${this.dataPath("appointments")}/${id}`,
    );
    const original = document?.value.value as Appointment | undefined;
    if (
      !document ||
      !original ||
      original.professional !== record.value.value.name
    )
      throw new HttpError(404, "Atendimento indisponível.");
    if (input.revision !== document.value.revision)
      throw new HttpError(409, "O atendimento mudou. Atualize a agenda.");
    let updated: Appointment = { ...original };
    const scheduled = ["Agendado", "Confirmado"].includes(original.status);
    if (input.action === "confirm" && original.status === "Agendado")
      updated.status = "Confirmado";
    else if (input.action === "absent" && original.status === "Confirmado")
      updated.status = "Não compareceu";
    else if (input.action === "cancel" && scheduled)
      updated.status = "Cancelado";
    else if (
      (input.action === "complete" && scheduled) ||
      (input.action === "payment" && original.status === "Concluído")
    ) {
      if (![...paymentMethods, "Não pago"].includes(input.payment))
        throw new HttpError(400, "Escolha uma forma de pagamento válida.");
      updated.status = "Concluído";
      if (input.payment === "Não pago") delete updated.paymentMethod;
      else updated.paymentMethod = input.payment;
    } else if (input.action === "reschedule" && scheduled) {
      const [all, schedules] = await Promise.all([
        this.db.query(
          this.dataPath("appointments"),
          "value.professional",
          original.professional,
        ),
        this.db.query(
          this.dataPath("work-schedules"),
          "value.professional",
          original.professional,
        ),
      ]);
      try {
        updated = rescheduleAppointment(
          all.map((d) => d.value.value),
          [],
          original.id,
          input.date,
          input.time,
          "professional",
          schedules.map((d) => d.value.value),
          original.professional,
        ).find((a) => a.id === original.id)!;
      } catch (error) {
        throw new HttpError(
          400,
          error instanceof Error ? error.message : "Horário indisponível.",
        );
      }
    } else throw new HttpError(400, "Ação indisponível para este atendimento.");
    const writes: Write[] = [
      {
        path: document.path,
        value: {
          ...document.value,
          value: updated,
          revision: document.value.revision + 1,
        },
        previous: document,
      },
      { path: record.path, verify: true, previous: record },
      { path: access.path, verify: true, previous: access },
      { path: session.path, verify: true, previous: session },
    ];
    if (input.action === "complete" && original.clientId) {
      const client = await this.db.get(
        `${this.dataPath("clients")}/${original.clientId}`,
      );
      if (client)
        writes.push({
          path: client.path,
          previous: client,
          value: {
            ...client.value,
            value: completeClientVisit(
              client.value.value,
              original,
              new Date(this.now()).toISOString(),
            ),
            revision: client.value.revision + 1,
          },
        });
    }
    await this.db.commit(writes);
    return { saved: true };
  }
}
