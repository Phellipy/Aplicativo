import SettingsPage from "./SettingsPage";
import AppointmentReminderLink from "./AppointmentReminderLink";
import {
  defaultAppointmentMessage,
  type ReminderOpening,
} from "./appointmentReminder";
import FinancePage from "./FinancePage";
import PresenceControl from "./PresenceControl";
import { controlPresence, type PresenceEvent } from "./presence";
import { createRecurringAppointments } from "./recurrence";
import AgendaStack from "./AgendaStack";
import MetricsPage from "./MetricsPage";
import { occupationStats, hours, formatPercentage } from "./metrics";
import ClientsPanel from "./ClientsPanel";
import ProfessionalsPanel from "./ProfessionalsPanel";
import { verifyDemoCredential } from "./demoAccess";
import PeriodControls from "./PeriodControls";
import AgendaPeriod from "./AgendaPeriod";
import AppointmentFields, { RescheduleFields } from "./AppointmentFields";
import WorkScheduleEditor from "./WorkScheduleEditor";
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  ClipboardList,
  Settings,
  UserRound,
  LogOut,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Bell,
  Menu,
  X,
  Check,
  Clock,
  MessageSquare,
  ShieldCheck,
  Banknote,
  QrCode,
  CreditCard,
  CircleAlert,
} from "lucide-react";
import {
  filterPeriod,
  periodLabel,
  type Period,
  initialWorkSchedules,
  createAppointment,
  getAvailableTimes,
  appointmentDuration,
  fitsWorkSchedule,
  type WorkSchedule,
  rescheduleAppointment,
  canReschedule,
  agendaStatusTone,
  paymentMethods,
  normalizeAppointments,
  completeAppointment,
  receivedTotal,
  initialAppointments,
  initialClients,
  initialProcedures,
  professionals as demoProfessionals,
  initialProfessionalRecords,
  assignedProcedures,
  cleanProcedure,
  createProfessional,
  updateProfessional,
  effectiveSchedules,
  defaultSchedule,
  type ProfessionalRecord,
  TODAY,
  money,
  procedureRate,
  calculateCommission,
  visibleAppointments,
  eligibleClients,
  saveClient,
  deleteClient,
  restoreClient,
  deleteProfessional,
  restoreProfessional,
  whatsAppLink,
  canOpenWhatsApp,
  type Appointment,
  type Client,
  type Procedure,
  type Campaign,
  type Role,
} from "./domain";
type Page =
  | "Métricas"
  | "Dashboard"
  | "Agenda"
  | "Clientes"
  | "Financeiro"
  | "Profissionais"
  | "Procedimentos"
  | "Configurações";
const pages: { name: Page; icon: typeof Users }[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Agenda", icon: CalendarDays },
  { name: "Métricas", icon: ChartNoAxesCombined },
  { name: "Clientes", icon: Users },
  { name: "Financeiro", icon: Wallet },
  { name: "Profissionais", icon: UserRound },
  { name: "Procedimentos", icon: ClipboardList },
  { name: "Configurações", icon: Settings },
];
function useStored<T>(
  key: string,
  initial: T,
  normalize: (value: T) => T = (value) => value,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key);
      return normalize(v ? JSON.parse(v) : initial);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar">
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
function Badge({ text }: { text: string }) {
  return (
    <span
      className={`badge ${text === "Concluído" || text === "Ativo" || text.startsWith("Pago") ? "green" : text === "Confirmado" ? "blue" : text === "Cancelado" ? "red" : text === "Não compareceu" ? "neutral" : text === "Agendado" || text.toLowerCase().includes("pendente") || text === "Não pago" ? "amber" : "blue"}`}
    >
      {text === "Concluído" ? <Check size={12} /> : <i />}
      {text}
    </span>
  );
}
export default function App() {
  const [establishmentName, setEstablishmentName] = useStored(
    "navalha-v01-establishment-name",
    "Navalha & Co.",
  );

  const [confirmProcedureDelete, setConfirmProcedureDelete] = useState(false);
  const nameWords =
    establishmentName
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter(
        (word) =>
          !["e", "de", "da", "do", "das", "dos"].includes(word.toLowerCase()),
      ) ?? [];
  const establishmentInitials = (
    nameWords.length > 1
      ? nameWords
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
      : (nameWords[0] ?? "E").slice(0, 2)
  ).toLocaleUpperCase("pt-BR");
  useEffect(() => {
    document.title = `${establishmentName} — Gestão do seu espaço`;
  }, [establishmentName]);
  const [presence, setPresence] = useStored<PresenceEvent[]>(
    "navalha-v01-presence",
    [],
  );
  const [presenceNow, setPresenceNow] = useState(() =>
    new Date().toISOString(),
  );
  useEffect(() => {
    const timer = window.setInterval(
      () => setPresenceNow(new Date().toISOString()),
      30000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const [role, setRole] = useState<Role | null>(null),
    [page, setPage] = useState<Page>("Dashboard"),
    [mobile, setMobile] = useState(false);
  const [appointments, setAppointments] = useStored<Appointment[]>(
      "navalha-v01-appointments",
      initialAppointments,
      normalizeAppointments,
    ),
    [clients, setClients] = useStored<Client[]>(
      "navalha-v01-clients",
      initialClients,
    ),
    [procedures, setProcedures] = useStored<Procedure[]>(
      "navalha-v01-procedures",
      initialProcedures,
    ),
    [campaigns, setCampaigns] = useStored<Campaign[]>(
      "navalha-v01-campaigns",
      [],
    );
  const [schedules, setSchedules] = useStored<WorkSchedule[]>(
    "navalha-v01-work-schedules",
    initialWorkSchedules,
  );
  const [records, setRecords] = useStored<ProfessionalRecord[]>(
    "navalha-v01-professional-records",
    initialProfessionalRecords(procedures),
  );
  const professionals = records.map((record) => record.name);
  const activeProfessionals = records
    .filter((record) => record.active && !record.deletedAt)
    .map((record) => record.name);
  const bookingProcedures = assignedProcedures(procedures, records);
  const workingSchedules = effectiveSchedules(schedules, records);
  const [currentProfessional, setCurrentProfessional] = useState(
    demoProfessionals[0],
  );
  const [loginName, setLoginName] = useState(demoProfessionals[0]),
    [loginPassword, setLoginPassword] = useState(""),
    [loginError, setLoginError] = useState(""),
    [loginBusy, setLoginBusy] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const whatsappClicked = useRef(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(
    null,
  );
  useEffect(() => {
    setProcedures((items) =>
      items.some(
        (p) =>
          p.professionals !== undefined ||
          p.commission !== undefined ||
          p.individualRates !== undefined,
      )
        ? items.map(cleanProcedure)
        : items,
    );
  }, []);
  async function enterProfessional() {
    const record = records.find(
      (record) =>
        record.name === loginName && record.active && !record.deletedAt,
    );
    if (!record) {
      setLoginError("Selecione um profissional habilitado.");
      return;
    }
    setLoginBusy(true);
    try {
      if (
        record.credential &&
        !(await verifyDemoCredential(loginPassword, record.credential))
      ) {
        setLoginError("Senha demonstrativa incorreta.");
        return;
      }
      setCurrentProfessional(record.name);
      setLoginPassword("");
      setLoginError("");
      setPage("Dashboard");
      setRole("professional");
    } catch {
      setLoginError("A verificação local não está disponível neste navegador.");
    } finally {
      setLoginBusy(false);
    }
  }
  const [date, setDate] = useState(TODAY),
    [person, setPerson] = useState("Todos"),
    [modal, setModal] = useState<"appointment" | "client" | "procedure" | null>(
      null,
    ),
    [toast, setToast] = useState(""),
    [campaignClient, setCampaignClient] = useState<Client | null>(null);
  const [agendaView, setAgendaView] = useStored<"list" | "stack">(
    "navalha-v01-agenda-view",
    "list",
  );
  const [dashboardPeriod, setDashboardPeriod] = useState<Period>("day"),
    [dashboardDate, setDashboardDate] = useState(TODAY);
  const [agendaPeriod, setAgendaPeriod] = useState<Period>("day");
  const [expandedAppointment, setExpandedAppointment] = useState<number | null>(
    null,
  );
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(
    null,
  );
  const [completionAppointment, setCompletionAppointment] =
    useState<Appointment | null>(null);
  const [message, setMessage] = useStored(
    "navalha-v01-message",
    "Olá, {nome}! Sentimos sua falta na {estabelecimento} Que tal reservar um horário com a gente?",
  );
  const [appointmentTemplate, setAppointmentTemplate] = useStored(
    "navalha-v01-appointment-message",
    defaultAppointmentMessage,
  );
  const [reminderOpenings, setReminderOpenings] = useStored<
    Record<number, ReminderOpening>
  >("navalha-v01-appointment-reminders", {});
  const [formError, setFormError] = useState("");
  const modalRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (modal || campaignClient || completionAppointment || rescheduleTarget) {
      setFormError("");
      lastFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.showModal();
    } else {
      modalRef.current?.close();
      lastFocus.current?.focus();
    }
  }, [modal, campaignClient, completionAppointment, rescheduleTarget]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const admin = role === "admin",
    allowed = pages.filter(
      (p) =>
        admin || !["Clientes", "Profissionais", "Métricas"].includes(p.name),
    );
  const visible = visibleAppointments(
    appointments,
    role || "professional",
    currentProfessional,
  );
  const agendaProfessionals = admin
    ? activeProfessionals.length
      ? activeProfessionals
      : records
          .filter((record) => !record.deletedAt)
          .map((record) => record.name)
    : [currentProfessional];
  const agendaPerson =
    agendaProfessionals.length === 1
      ? agendaProfessionals[0]
      : agendaProfessionals.includes(person)
        ? person
        : "Todos";
  const scoped = visible.filter((a) => {
      if (page !== "Agenda")
        return person === "Todos" || a.professional === person;
      return agendaPerson === "Todos"
        ? agendaProfessionals.includes(a.professional)
        : a.professional === agendaPerson;
    }),
    today = filterPeriod(
      scoped,
      page === "Dashboard" ? dashboardPeriod : "day",
      page === "Dashboard" ? dashboardDate : TODAY,
    ).filter((a) => !["Cancelado", "Não compareceu"].includes(a.status));
  const reportLabel = periodLabel(
    page === "Dashboard" ? dashboardPeriod : "day",
    page === "Dashboard" ? dashboardDate : TODAY,
  );
  const agendaItems = filterPeriod(scoped, agendaPeriod, date);
  const occupancy = useMemo(
    () =>
      occupationStats(
        visible,
        procedures,
        workingSchedules,
        admin
          ? person === "Todos"
            ? professionals
            : [person]
          : [currentProfessional],
        dashboardPeriod,
        dashboardDate,
        presence,
        presenceNow,
      ),
    [
      appointments,
      procedures,
      schedules,
      records,
      admin,
      person,
      currentProfessional,
      dashboardPeriod,
      dashboardDate,
      presence,
      presenceNow,
    ],
  );
  const completed = today.filter((a) => a.status === "Concluído"),
    revenue = receivedTotal(completed);
  const paidPayout = completed
    .filter((a) => a.paymentMethod)
    .reduce((s, a) => s + calculateCommission(a), 0);
  const commission = calculateCommission;
  const payout = completed.reduce((s, a) => s + commission(a), 0),
    eligible = eligibleClients(clients, campaigns);
  const navigate = (p: Page) => {
    setPage(p);
    setMobile(false);
    setPerson("Todos");
  };
  const close = () => {
    setModal(null);
    setCampaignClient(null);
    setCompletionAppointment(null);
    setRescheduleTarget(null);
    setEditingProcedure(null);
    setConfirmProcedureDelete(false);
    setEditingClient(null);
  };
  function moveAppointment(
    appointment: Appointment,
    newDate: string,
    newTime: string,
  ) {
    try {
      if (!role) return false;
      const updated = rescheduleAppointment(
        appointments,
        procedures,
        appointment.id,
        newDate,
        newTime,
        role,
        workingSchedules,
        currentProfessional,
      );
      setAppointments(updated);
      setDate(newDate);
      setAgendaPeriod("day");
      setExpandedAppointment(null);
      setToast(
        `Horário de ${appointment.client} alterado de ${appointment.time} para ${newTime} em ${newDate.split("-").reverse().join("/")}.`,
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível reagendar.";
      if (rescheduleTarget) setFormError(message);
      else setToast(message);
      return false;
    }
  }
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) || "").trim();
    if (modal === "client") {
      try {
        const result = saveClient(
          clients,
          appointments,
          {
            id: editingClient?.id ?? Date.now(),
            name: str("name"),
            phone: str("phone"),
            document: str("document"),
            lastVisit: str("lastVisit"),
            consent: f.get("consent") === "on",
          },
          role!,
        );
        setClients(result.clients);
        setAppointments(result.appointments);
      } catch (error) {
        setFormError((error as Error).message);
        return;
      }
    }
    if (modal === "procedure") {
      if (!admin) {
        setFormError("Somente o administrador altera procedimentos.");
        return;
      }
      const updated: Procedure = {
        id: editingProcedure?.id ?? Date.now(),
        name: str("name"),
        price: Number(f.get("price")),
        duration: Number(f.get("duration")),
      };
      if (
        !updated.name ||
        updated.duration < 15 ||
        updated.duration > 480 ||
        updated.duration % 15 !== 0 ||
        updated.price < 0 ||
        !Number.isFinite(updated.price)
      ) {
        setFormError("Informe nome, valor e duração válidos.");
        return;
      }
      if (editingProcedure) {
        setAppointments((items) =>
          items.map((a) =>
            !a.services?.length && a.procedure === editingProcedure.name
              ? {
                  ...a,
                  duration: appointmentDuration(a, procedures),
                  services: [
                    {
                      procedureId: editingProcedure.id,
                      name: a.procedure,
                      duration: appointmentDuration(a, procedures),
                      price: a.value,
                      commissionRate: a.commissionRate,
                    },
                  ],
                }
              : a,
          ),
        );
        setProcedures((items) =>
          items.map((p) => (p.id === updated.id ? updated : p)),
        );
      } else setProcedures((items) => [...items, updated]);
    }
    if (modal === "appointment") {
      try {
        const input = {
          id: Date.now(),
          client: str("client"),
          professional: admin ? str("professional") : currentProfessional,
          date: str("date"),
          time: str("time"),
        };
        const ids = f.getAll("procedureIds").map(Number);
        const created = f.has("recurring")
          ? createRecurringAppointments(
              input,
              str("recurrenceEnd"),
              f.getAll("weekdays").map(Number),
              ids,
              bookingProcedures,
              appointments,
              workingSchedules,
            )
          : [
              createAppointment(
                input,
                ids,
                bookingProcedures,
                appointments,
                workingSchedules,
              ),
            ];
        setAppointments([
          ...appointments,
          ...created.map((appointment) => ({
            ...appointment,
            clientId: clients.find(
              (client) => client.name === appointment.client,
            )?.id,
          })),
        ]);
        close();
        setToast(
          `${created.length} atendimento(s) agendado(s) neste navegador.`,
        );
        return;
      } catch (error) {
        setFormError((error as Error).message);
        return;
      }
    }
    close();
    setToast("Cadastro salvo neste navegador.");
  }
  function updateStatus(a: Appointment, status: string) {
    setAppointments((items) =>
      items.map((x) => (x.id === a.id ? { ...x, status } : x)),
    );
    if (status === "Concluído")
      setClients(
        clients.map((c) =>
          c.name === a.client ? { ...c, lastVisit: a.date } : c,
        ),
      );
    setToast("Atendimento atualizado.");
  }
  let whatsappURL = "",
    whatsappError = "";
  if (campaignClient) {
    try {
      whatsappURL = whatsAppLink(campaignClient, whatsappDraft);
    } catch (error) {
      whatsappError = (error as Error).message;
    }
  }
  const whatsappRepeat = campaignClient
    ? !canOpenWhatsApp(campaigns, campaignClient.id, whatsappDraft)
    : false;
  const whatsappAllowed = Boolean(admin && whatsappURL && !whatsappRepeat);
  function openWhatsAppPreview(client: Client) {
    whatsappClicked.current = false;
    setWhatsappDraft(
      message
        .replaceAll("{nome}", client.name.split(" ")[0])
        .replaceAll("{estabelecimento}", establishmentName),
    );
    setCampaignClient(client);
  }
  if (!role)
    return (
      <div className="login">
        <div className="login-story">
          <div className="brand">
            <span className="brand-icon">{establishmentInitials}</span>
            {establishmentName}
          </div>
          <div>
            <span className="eyebrow">SEU ESPAÇO. SEU RITMO.</span>
            <h1>
              Mais tempo para
              <br />
              cuidar do que
              <br />
              você faz bem.
            </h1>
            <p>
              Agenda, equipe e resultados.
              <br />
              Tudo no mesmo lugar.
            </p>
          </div>
          <small>GESTÃO SIMPLES, TODOS OS DIAS.</small>
        </div>
        <main className="login-main">
          <div className="login-box">
            <span className="demo-tag">VERSÃO 0.1 · DEMONSTRAÇÃO</span>
            <h1>Bem-vindo de volta.</h1>
            <p>Escolha um perfil para explorar o seu espaço.</p>
            <div className="login-choice">
              <ShieldCheck />
              <div>
                <strong>Administrador</strong>
                <p>Visão completa do estabelecimento</p>
              </div>
            </div>
            <button className="primary wide" onClick={() => setRole("admin")}>
              Entrar como administrador <ArrowUpRight size={18} />
            </button>
            <div className="login-professional">
              <label>
                Perfil profissional
                <select
                  value={
                    activeProfessionals.includes(loginName) ? loginName : ""
                  }
                  onChange={(event) => {
                    setLoginName(event.target.value);
                    setLoginPassword("");
                    setLoginError("");
                  }}
                >
                  <option value="" disabled>
                    Selecione um profissional
                  </option>
                  {activeProfessionals.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              {records.find((p) => p.name === loginName)?.credential && (
                <label>
                  Senha de demonstração
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    autoComplete="off"
                  />
                </label>
              )}
              {loginError && (
                <div className="form-error" role="alert">
                  {loginError}
                </div>
              )}
              <button
                className="secondary wide"
                disabled={loginBusy || !activeProfessionals.includes(loginName)}
                onClick={enterProfessional}
              >
                {loginBusy ? "Verificando…" : `Explorar como ${loginName}`}
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="notice">
              <ShieldCheck size={20} />
              <span>
                Ambiente demonstrativo com dados fictícios. A escolha de perfil
                não garante segurança. Senhas configuradas pelo administrador
                são verificadas apenas localmente e não protegem os dados.
              </span>
            </div>
          </div>
        </main>
      </div>
    );
  const renderReminder = (appointment: Appointment) => (
    <AppointmentReminderLink
      appointment={appointment}
      clients={clients}
      template={appointmentTemplate}
      establishment={establishmentName}
      opening={reminderOpenings[appointment.id]}
      onOpen={(signature) =>
        setReminderOpenings((items) => ({
          ...items,
          [appointment.id]: { signature, openedAt: new Date().toISOString() },
        }))
      }
      onError={setToast}
    />
  );
  const appointmentRows = (list: Appointment[], actions = false) =>
    actions ? (
      <div className="agenda-list">
        {list.map((a) => (
          <article
            className="agenda-card"
            key={a.id}
            aria-label={`Atendimento de ${a.client} às ${a.time}`}
          >
            <div className="agenda-card-head">
              <div className="agenda-time">
                <strong>{a.time}</strong>
                <small>{a.date.split("-").reverse().join("/")}</small>
              </div>
              <div className="agenda-client">
                <Avatar name={a.client} />
                <div>
                  <h3>{a.client}</h3>
                  <p>
                    {a.procedure}
                    {admin && <> · {a.professional}</>}
                  </p>
                </div>
              </div>
              <Badge text={a.status} />
              {renderReminder(a)}
            </div>
            <div className="agenda-card-bottom">
              <div className="agenda-payment">
                <strong>{money(a.value)}</strong>
                <Badge
                  text={
                    a.paymentMethod ? `Pago · ${a.paymentMethod}` : "Não pago"
                  }
                />
                {a.status === "Concluído" && (
                  <button
                    className="text-button"
                    onClick={() => setCompletionAppointment(a)}
                  >
                    Alterar pagamento
                  </button>
                )}
              </div>
              {canReschedule(a) && (
                <button
                  className="text-button"
                  onClick={() => setRescheduleTarget(a)}
                >
                  Reagendar
                </button>
              )}
              {["Agendado", "Confirmado"].includes(a.status) && (
                <div className="agenda-card-actions">
                  {a.status === "Agendado" ? (
                    <button
                      className="primary action-confirm"
                      onClick={() => updateStatus(a, "Confirmado")}
                    >
                      <Check size={16} />
                      Confirmar presença
                    </button>
                  ) : (
                    <button
                      className="secondary action-absent"
                      onClick={() => updateStatus(a, "Não compareceu")}
                    >
                      <UserRound size={16} />
                      Não compareceu
                    </button>
                  )}
                  <button
                    className="primary action-complete"
                    onClick={() => setCompletionAppointment(a)}
                  >
                    <Check size={16} />
                    Atendimento Concluído
                  </button>
                  <button
                    className="secondary action-cancel"
                    onClick={() => updateStatus(a, "Cancelado")}
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
        {!list.length && (
          <div className="empty">Nenhum atendimento neste período.</div>
        )}
      </div>
    ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Horário</th>
              <th>Cliente / Procedimento</th>
              {admin && <th>Profissional</th>}
              <th>Status</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="time">
                  {a.time}
                  <small>{a.date.split("-").reverse().join("/")}</small>
                </td>
                <td>
                  <div className="person-cell">
                    <Avatar name={a.client} />
                    <div>
                      <strong>{a.client}</strong>
                      <small>{a.procedure}</small>
                    </div>
                  </div>
                </td>
                {admin && <td>{a.professional}</td>}
                <td>
                  <Badge text={a.status} />
                </td>

                <td>
                  <div className="payment-control">
                    <span>{money(a.value)}</span>
                    <Badge
                      text={
                        a.paymentMethod
                          ? `Pago · ${a.paymentMethod}`
                          : "Não pago"
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="empty">Nenhum atendimento neste período.</div>
        )}
      </div>
    );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-icon">{establishmentInitials}</span>
          {establishmentName}
          <button
            className="icon mobile-only"
            aria-label="Fechar menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-mark">{establishmentInitials}</span>
          <div>
            <strong>{establishmentName}</strong>
            <small>Espaço de trabalho</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="nav-label">PRINCIPAL</span>
        <nav>
          {allowed.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              aria-current={page === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              {name === "Dashboard" ? "Início" : name}
              {name === "Clientes" && eligible.length > 0 && (
                <span className="count">{eligible.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="live-dot" /> Ambiente de demonstração
            <small>Dados fictícios · versão 0.1</small>
          </div>
          <div className="account">
            <Avatar name={admin ? "Administrador" : currentProfessional} />
            <div>
              <strong>{admin ? "Administrador" : currentProfessional}</strong>
              <small>
                {admin
                  ? "Acesso demonstrativo completo"
                  : "Perfil profissional · demonstração"}
              </small>
            </div>
            <button
              className="icon"
              aria-label="Sair"
              onClick={() => {
                setRole(null);
                setPerson("Todos");
                setPage("Dashboard");
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon mobile-only"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>
              Seu espaço <ChevronRight size={14} />{" "}
              <strong>{page === "Dashboard" ? "Início" : page}</strong>
            </span>
          </div>
          <div>
            <PresenceControl
              events={presence}
              now={presenceNow}
              admin={admin}
              professional={currentProfessional}
              names={activeProfessionals}
              schedules={workingSchedules}
              onToggle={(scope) => {
                if (!admin && scope !== currentProfessional) return;
                const now = new Date().toISOString();
                setPresence((items) =>
                  controlPresence(
                    items,
                    scope,
                    now,
                    workingSchedules,
                    activeProfessionals.length === 1
                      ? activeProfessionals[0]
                      : undefined,
                  ),
                );
                setPresenceNow(now);
                setToast(
                  "Presença registrada no horário atual de São Paulo. Métrica de ocupação atualizada neste navegador.",
                );
              }}
            />
            <button
              className="icon"
              aria-label="Ver alertas de demonstração"
              onClick={() =>
                setToast(
                  "Os alertas exibidos usam apenas dados demonstrativos.",
                )
              }
            >
              <Bell size={19} />
            </button>
            <Avatar name={admin ? "Administrador" : currentProfessional} />
          </div>
        </header>
        <main className="content">
          <div className="page-head">
            <div>
              <div className="date-line">
                QUARTA-FEIRA, 11 DE NOVEMBRO DE 2026 · DATA DEMO
              </div>
              <h1>
                {page === "Dashboard"
                  ? admin
                    ? "Seu negócio, em dia."
                    : `Bom dia, ${currentProfessional.split(" ")[0]}.`
                  : page}
              </h1>
              <p>
                {
                  {
                    Métricas:
                      "Acompanhe ocupação, atendimentos, clientes e resultados do estabelecimento.",
                    Dashboard: admin
                      ? "Um olhar sobre o que acontece no seu estabelecimento."
                      : "Sua agenda e seus resultados, em um só lugar.",
                    Agenda: admin
                      ? "Organize os atendimentos e acompanhe toda a equipe."
                      : "Seus atendimentos e horários.",
                    Clientes:
                      "Boas relações começam com cuidado e continuidade.",
                    Financeiro: admin
                      ? "Acompanhe as entradas e os repasses do estabelecimento."
                      : "Acompanhe seus ganhos e repasses demonstrativos.",
                    Profissionais: "Uma equipe alinhada faz toda a diferença.",
                    Procedimentos:
                      "Nome, duração e valor dos serviços do estabelecimento.",
                    Configurações:
                      "Ajuste a experiência do seu estabelecimento.",
                  }[page]
                }
              </p>
            </div>
            {["Dashboard", "Agenda"].includes(page) && (
              <button
                className="primary"
                onClick={() => setModal("appointment")}
              >
                <Plus size={18} /> Novo atendimento
              </button>
            )}
            {admin && page === "Clientes" && (
              <button className="primary" onClick={() => setModal("client")}>
                <Plus size={18} /> Novo cliente
              </button>
            )}
            {admin && page === "Procedimentos" && (
              <button className="primary" onClick={() => setModal("procedure")}>
                <Plus size={18} /> Novo procedimento
              </button>
            )}
          </div>
          {page === "Dashboard" && (
            <>
              <div className="filter-row">
                <PeriodControls
                  label="do início"
                  period={dashboardPeriod}
                  date={dashboardDate}
                  onPeriod={setDashboardPeriod}
                  onDate={setDashboardDate}
                />
                {admin && (
                  <select
                    aria-label="Filtrar resultados por profissional"
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                  >
                    <option value="Todos">Estabelecimento consolidado</option>
                    {professionals.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="stats">
                {[
                  {
                    label: admin
                      ? "Recebido no período"
                      : "Meus ganhos no período",
                    value: money(admin ? revenue : payout),
                    note: "Concluídos com pagamento registrado",
                    icon: Wallet,
                  },
                  {
                    label: "Atendimentos",
                    value: String(today.length).padStart(2, "0"),
                    note: `${completed.length} concluído(s) no período`,
                    icon: CalendarDays,
                  },
                  {
                    label: admin
                      ? "Repasses previstos"
                      : "Meus ganhos previstos",
                    value: money(today.reduce((s, a) => s + commission(a), 0)),
                    note: "Sobre a agenda do período",
                    icon: UserRound,
                  },
                  {
                    label: "Taxa de ocupação",
                    value: formatPercentage(occupancy.rate),
                    note: `${hours(occupancy.occupiedMinutes)} atendidas / ${hours(occupancy.availableMinutes)} disponíveis`,
                    icon: Clock,
                  },
                ].map((s, i) => (
                  <div className={`stat stat-${i}`} key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <s.icon size={18} />
                    </div>
                    <strong>{s.value}</strong>
                    <small>{s.note}</small>
                  </div>
                ))}
              </div>
              <p className="occupancy-caption">
                Serviços concluídos ÷ tempo disponível, respeitando jornada,
                ausências e registros de presença.{" "}
                {occupancy.scheduledDays > 0
                  ? "Há dias sem registros: usamos a jornada prevista como referência."
                  : "Base limitada ao tempo de presença registrado até agora."}{" "}
                Agendamentos futuros não contam como tempo atendido.
              </p>
              <div className="dashboard-grid">
                <section
                  className={`panel schedule-panel ${admin ? "admin" : ""}`}
                >
                  <div className="panel-head">
                    <div>
                      <h2>
                        Agendamentos do período{" "}
                        <span className="sub-count">{today.length}</span>
                      </h2>
                      <p>{reportLabel}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        navigate("Agenda");
                        setDate(dashboardDate);
                        setAgendaPeriod(dashboardPeriod);
                      }}
                    >
                      Ver agenda <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {appointmentRows(
                    today.sort(
                      (a, b) =>
                        a.date.localeCompare(b.date) ||
                        a.time.localeCompare(b.time),
                    ),
                  )}
                </section>
                <section className="panel alerts">
                  <div className="panel-head">
                    <h2>Para ficar de olho</h2>
                    <span className="little-dot" />
                  </div>
                  {admin ? (
                    <>
                      <div className="alert-icon">
                        <MessageSquare size={23} />
                      </div>
                      <h3>É hora de se reconectar</h3>
                      <p>
                        {eligible.length} clientes estão há 30 dias ou mais sem
                        atendimento.
                      </p>
                      <button
                        className="secondary wide"
                        onClick={() => navigate("Clientes")}
                      >
                        Revisar lembretes <ChevronRight size={16} />
                      </button>
                      <div className="alert-foot">
                        <ShieldCheck size={16} /> Cada mensagem é enviada por
                        você no WhatsApp.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="alert-icon">
                        <CalendarDays size={23} />
                      </div>
                      <h3>Seu próximo atendimento</h3>
                      <p>
                        {today.find((a) => a.status === "Confirmado")?.client ||
                          "Nenhum atendimento confirmado"}
                      </p>
                      <button
                        className="secondary"
                        onClick={() => {
                          navigate("Agenda");
                          setDate(dashboardDate);
                          setAgendaPeriod(dashboardPeriod);
                        }}
                      >
                        Ver minha agenda
                      </button>
                    </>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>
                        {admin
                          ? "Agenda por profissional"
                          : "Minha agenda em números"}
                      </h2>
                      <p>Previsão de atendimentos · {reportLabel}</p>
                    </div>
                    <span className="badge blue">{reportLabel}</span>
                  </div>
                  <div className="team-list">
                    {(admin ? professionals : [currentProfessional]).map(
                      (p, i) => (
                        <div className="team-row" key={p}>
                          <Avatar name={p} />
                          <div>
                            <strong>{p}</strong>
                            <small>
                              {today.filter((a) => a.professional === p).length}{" "}
                              atendimentos
                            </small>
                          </div>
                          <div className="mini-bar">
                            <i style={{ width: `${25 + i * 17}%` }} />
                          </div>
                          <span>
                            {money(
                              today
                                .filter((a) => a.professional === p)
                                .reduce((s, a) => s + a.value, 0),
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </section>
                <section className="panel day-summary">
                  <div className="panel-head">
                    <h2>Resumo do período</h2>
                    <Wallet size={19} />
                  </div>
                  <div>
                    <span>Serviços previstos</span>
                    <strong>
                      {money(today.reduce((s, a) => s + a.value, 0))}
                    </strong>
                  </div>
                  <div>
                    <span>Repasses previstos</span>
                    <strong>
                      {money(today.reduce((s, a) => s + commission(a), 0))}
                    </strong>
                  </div>
                  <div className="summary-total">
                    <span>
                      {admin
                        ? "Saldo antes de despesas"
                        : "Meus ganhos concluídos"}
                    </span>
                    <strong>
                      {money(admin ? revenue - paidPayout : payout)}
                    </strong>
                  </div>
                  <p>
                    {admin
                      ? "Recebido menos repasses dos serviços pagos. Custos, taxas e despesas não estão cadastrados. Este saldo não representa lucro."
                      : "Valores de demonstração, sem processamento de pagamentos."}
                  </p>
                </section>
              </div>
            </>
          )}
          {page === "Agenda" && (
            <>
              <section className="toolbar">
                <PeriodControls
                  label="da agenda"
                  period={agendaPeriod}
                  date={date}
                  onPeriod={(value) => {
                    setAgendaPeriod(value);
                    setExpandedAppointment(null);
                  }}
                  onDate={(value) => {
                    setDate(value);
                    setExpandedAppointment(null);
                  }}
                />
                {admin && agendaProfessionals.length > 1 && (
                  <label>
                    Profissional
                    <select
                      value={agendaPerson}
                      onChange={(e) => {
                        setPerson(e.target.value);
                        setExpandedAppointment(null);
                      }}
                    >
                      <option>Todos</option>
                      {agendaProfessionals.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div
                  className="agenda-view-switch"
                  role="group"
                  aria-label="Visualização da agenda"
                >
                  <button
                    aria-pressed={agendaView === "list"}
                    onClick={() => setAgendaView("list")}
                  >
                    Lista
                  </button>
                  <button
                    aria-pressed={agendaView === "stack"}
                    onClick={() => setAgendaView("stack")}
                  >
                    Pilha
                  </button>
                </div>
              </section>
              <section className="panel">
                <div className="panel-head">
                  <h2>
                    {admin
                      ? agendaPerson !== "Todos"
                        ? `Agenda de ${agendaPerson}`
                        : "Agenda do estabelecimento"
                      : "Minha agenda"}
                  </h2>
                  <span className="badge blue">
                    {agendaItems.length} atendimentos ·{" "}
                    {periodLabel(agendaPeriod, date)}
                  </span>
                </div>
                {agendaProfessionals.length === 0 ? (
                  <div className="empty">
                    Cadastre um profissional para visualizar a agenda.
                  </div>
                ) : agendaView === "stack" && agendaPeriod !== "day" ? (
                  <AgendaPeriod
                    appointments={scoped}
                    period={agendaPeriod}
                    date={date}
                    onOpen={(value, period) => {
                      setDate(value);
                      setAgendaPeriod(period);
                      setExpandedAppointment(null);
                    }}
                  />
                ) : agendaView === "stack" ? (
                  <>
                    <div
                      className="agenda-legend"
                      aria-label="Cores dos status"
                    >
                      {[
                        "Agendado",
                        "Confirmado",
                        "Concluído",
                        "Cancelado",
                        "Não compareceu",
                      ].map((status) => (
                        <span
                          className={`stack-tone-${agendaStatusTone(status)}`}
                          key={status}
                        >
                          <i />
                          {status}
                        </span>
                      ))}
                    </div>
                    <p className="stack-help">
                      Toque em um atendimento para ver as ações. Horários
                      locais.
                    </p>
                    <AgendaStack
                      appointments={scoped.filter((a) => a.date === date)}
                      allAppointments={appointments}
                      procedures={procedures}
                      schedules={workingSchedules}
                      date={date}
                      laneNames={
                        agendaPerson === "Todos"
                          ? agendaProfessionals
                          : [agendaPerson]
                      }
                      admin={admin}
                      expanded={expandedAppointment}
                      onExpand={setExpandedAppointment}
                      onMove={(appointment, time) =>
                        moveAppointment(appointment, date, time)
                      }
                      onReschedule={setRescheduleTarget}
                      renderReminder={renderReminder}
                      renderDetails={(appointment) =>
                        appointmentRows([appointment], true)
                      }
                    />
                  </>
                ) : (
                  appointmentRows(
                    [...agendaItems].sort(
                      (a, b) =>
                        a.date.localeCompare(b.date) ||
                        a.time.localeCompare(b.time),
                    ),
                    true,
                  )
                )}
              </section>
            </>
          )}
          {page === "Clientes" && admin && (
            <>
              <section className="campaign-banner">
                <div className="alert-icon">
                  <MessageSquare />
                </div>
                <div>
                  <h2>Contato manual pelo WhatsApp</h2>
                  <p>
                    Revise a mensagem e abra o WhatsApp. O envio é confirmado
                    por você, sem automação.
                  </p>
                </div>
                <span className="badge blue">Envio manual</span>
              </section>
              <ClientsPanel
                clients={clients}
                appointments={appointments}
                campaigns={campaigns}
                onEdit={(client) => {
                  setEditingClient(client);
                  setModal("client");
                }}
                onDelete={(id) => {
                  setClients(deleteClient(clients, id, role!));
                  setToast(
                    "Cliente excluído do cadastro ativo. Histórico preservado.",
                  );
                }}
                onRestore={(id) => {
                  setClients(restoreClient(clients, id, role!));
                  setToast("Cliente restaurado.");
                }}
                onWhatsApp={openWhatsAppPreview}
              />
            </>
          )}
          {page === "Financeiro" && (
            <FinancePage
              appointments={visible}
              clients={clients}
              establishmentName={establishmentName}
              admin={admin}
            />
          )}
          {page === "Métricas" && admin && (
            <MetricsPage
              appointments={appointments}
              procedures={procedures}
              schedules={workingSchedules}
              names={professionals}
              presence={presence}
              now={presenceNow}
              establishmentName={establishmentName}
            />
          )}
          {page === "Profissionais" && admin && (
            <ProfessionalsPanel
              records={records}
              procedures={procedures}
              schedules={schedules}
              appointments={appointments}
              onCreate={(name) => {
                const created = createProfessional(
                  records,
                  name,
                  Date.now(),
                  role!,
                );
                setRecords((items) => [...items, created]);
                setSchedules((items) => [
                  ...items,
                  defaultSchedule(created.name),
                ]);
                setToast(
                  "Profissional cadastrado. Configure seus procedimentos e repasses.",
                );
              }}
              onUpdate={(updated) => {
                setRecords(updateProfessional(records, updated, role!));
                setToast("Configuração do profissional salva neste navegador.");
              }}
              onDelete={(id) => {
                setRecords(deleteProfessional(records, id, role!));
                setToast("Profissional excluído. Histórico preservado.");
              }}
              onRestore={(id) => {
                setRecords(restoreProfessional(records, id, role!));
                setToast("Profissional restaurado como desabilitado.");
              }}
              onSchedule={(updated) => {
                if (admin)
                  setSchedules((items) =>
                    items.map((s) =>
                      s.professional === updated.professional ? updated : s,
                    ),
                  );
              }}
            />
          )}
          {page === "Procedimentos" && (
            <>
              <div className="notice">
                <ClipboardList size={20} />
                <span>
                  {admin
                    ? "Cadastre e edite nome, duração e valor. As alterações valem para novos atendimentos; os anteriores preservam os dados combinados."
                    : "Seus procedimentos habilitados, com os valores definidos pelo estabelecimento."}
                </span>
              </div>
              <div className="procedure-grid">
                {procedures
                  .filter(
                    (p) =>
                      admin ||
                      bookingProcedures
                        .find((proc) => proc.id === p.id)
                        ?.professionals?.includes(currentProfessional),
                  )
                  .map((p) => (
                    <section className="panel procedure" key={p.id}>
                      <div className="procedure-top">
                        <span className="service-icon">
                          <ClipboardList size={22} />
                        </span>
                      </div>
                      <h2>{p.name}</h2>
                      <p>
                        <Clock size={14} />
                        {p.duration} minutos
                      </p>
                      <strong className="price">{money(p.price)}</strong>
                      {admin && (
                        <button
                          className="secondary wide procedure-edit"
                          onClick={() => {
                            setEditingProcedure(p);
                            setModal("procedure");
                          }}
                        >
                          Editar procedimento
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </section>
                  ))}
              </div>
            </>
          )}
          {page === "Configurações" && !admin && (
            <section className="panel settings">
              <h2>Minha jornada e ausências</h2>
              <p>Configure somente a sua disponibilidade demonstrativa.</p>
              <WorkScheduleEditor
                schedule={schedules.find(
                  (s) => s.professional === currentProfessional,
                )!}
                onSave={(updated) =>
                  setSchedules((items) =>
                    items.map((s) =>
                      s.professional === currentProfessional
                        ? { ...updated, professional: currentProfessional }
                        : s,
                    ),
                  )
                }
                appointments={visible}
                procedures={procedures}
              />
            </section>
          )}
          {page === "Configurações" && admin && (
            <SettingsPage
              name={establishmentName}
              message={message}
              appointmentTemplate={appointmentTemplate}
              onName={(value) => {
                setEstablishmentName(value);
                setToast("Nome do estabelecimento salvo neste navegador.");
              }}
              onReturn={(value) => {
                setMessage(value);
                setToast("Lembrete de retorno salvo neste navegador.");
              }}
              onAppointment={(value) => {
                setAppointmentTemplate(value);
                setToast("Lembrete de agendamento salvo neste navegador.");
              }}
            />
          )}
          <footer>
            {establishmentName} <span>Feito para cuidar do seu negócio.</span>
            <small>
              v0.1 · Dados demonstrativos armazenados neste navegador
            </small>
          </footer>
        </main>
      </div>
      <dialog ref={modalRef} onCancel={close} aria-labelledby="modal-title">
        <div className="modal-head">
          <h2 id="modal-title">
            {rescheduleTarget
              ? "Reagendar atendimento"
              : completionAppointment
                ? "Como o cliente pagou?"
                : campaignClient
                  ? "Revisar mensagem do WhatsApp"
                  : modal === "appointment"
                    ? "Novo atendimento"
                    : modal === "client"
                      ? editingClient
                        ? "Editar cliente"
                        : "Novo cliente"
                      : editingProcedure
                        ? "Editar procedimento"
                        : "Novo procedimento"}
          </h2>
          <button className="icon" aria-label="Fechar" onClick={close}>
            <X />
          </button>
        </div>
        {rescheduleTarget ? (
          <form
            className="modal-body"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              if (
                moveAppointment(
                  rescheduleTarget,
                  String(data.get("rescheduleDate")),
                  String(data.get("rescheduleTime")),
                )
              )
                close();
            }}
          >
            <p>
              <strong>{rescheduleTarget.client}</strong>
              <br />
              {rescheduleTarget.procedure} · {rescheduleTarget.professional}
              <br />
              Horário atual:{" "}
              {rescheduleTarget.date.split("-").reverse().join("/")} às{" "}
              {rescheduleTarget.time}
            </p>
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            <RescheduleFields
              appointment={rescheduleTarget}
              appointments={appointments}
              procedures={bookingProcedures}
              schedules={workingSchedules}
            />
            <small>
              Intervalos de 15 minutos. O profissional, o procedimento, o valor,
              o status e o pagamento são mantidos. Conflitos bloqueiam a
              alteração.
            </small>
            <div className="modal-actions">
              <button className="secondary" type="button" onClick={close}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                Salvar novo horário
              </button>
            </div>
          </form>
        ) : completionAppointment ? (
          <div className="modal-body">
            <p>
              <strong>{completionAppointment.client}</strong>
              <br />
              {completionAppointment.procedure} ·{" "}
              {money(completionAppointment.value)}
            </p>
            <p>
              Escolha uma opção para concluir o atendimento e registrar o
              pagamento integral.
            </p>
            <div className="payment-options">
              {[...paymentMethods, "Não pago"].map((option) => (
                <button
                  key={option}
                  className={`payment-option payment-${[...paymentMethods, "Não pago"].indexOf(option)}`}
                  onClick={() => {
                    const method = option === "Não pago" ? "" : option;
                    setAppointments((items) =>
                      items.map((item) =>
                        item.id === completionAppointment.id
                          ? completeAppointment(item, method)
                          : item,
                      ),
                    );
                    setClients((items) =>
                      items.map((client) =>
                        (client.id === completionAppointment.clientId ||
                          (!completionAppointment.clientId &&
                            client.name === completionAppointment.client)) &&
                        client.lastVisit < completionAppointment.date
                          ? { ...client, lastVisit: completionAppointment.date }
                          : client,
                      ),
                    );
                    close();
                    setToast(
                      option === "Não pago"
                        ? "Atendimento concluído com pagamento pendente."
                        : `Atendimento concluído. Pagamento em ${option} registrado manualmente.`,
                    );
                  }}
                >
                  {option === "Dinheiro" ? (
                    <Banknote size={23} />
                  ) : option === "Pix" ? (
                    <QrCode size={23} />
                  ) : option === "Não pago" ? (
                    <CircleAlert size={23} />
                  ) : (
                    <CreditCard size={23} />
                  )}
                  {option}
                </button>
              ))}
            </div>
            <small>
              Registro demonstrativo local. Nenhuma cobrança é processada.
            </small>
            <button className="text-button" onClick={close}>
              Cancelar e voltar à agenda
            </button>
          </div>
        ) : campaignClient ? (
          <div className="modal-body">
            <p>
              <strong>{campaignClient.name}</strong>
              <br />
              {campaignClient.phone}
            </p>
            <label>
              Mensagem para o WhatsApp
              <textarea
                rows={5}
                value={whatsappDraft}
                onChange={(event) => {
                  whatsappClicked.current = false;
                  setWhatsappDraft(event.target.value);
                }}
              />
            </label>
            {whatsappError && (
              <div className="form-error" role="alert">
                {whatsappError}
              </div>
            )}
            {whatsappRepeat && (
              <div className="schedule-notice" role="status">
                Esta mesma mensagem já teve abertura solicitada para este
                cliente nos últimos 7 dias. O aplicativo não confirma se ela foi
                enviada.
              </div>
            )}
            <p className="availability-note">
              Você será direcionado ao WhatsApp com o texto pronto. Revise o
              destinatário e toque em Enviar no WhatsApp. Nada é enviado
              automaticamente.
            </p>
            <a
              className={`primary wide whatsapp-link ${!whatsappAllowed ? "is-disabled" : ""}`}
              href={whatsappURL || undefined}
              tabIndex={whatsappAllowed ? 0 : -1}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!whatsappAllowed}
              onClick={(event) => {
                if (
                  !whatsappAllowed ||
                  !campaignClient ||
                  whatsappClicked.current
                ) {
                  event.preventDefault();
                  return;
                }
                whatsappClicked.current = true;
                const openedAt = new Date().toISOString();
                setCampaigns((items) => [
                  ...items,
                  {
                    clientId: campaignClient.id,
                    status: "opened",
                    created: openedAt,
                    openedAt,
                    message: whatsappDraft.trim(),
                  },
                ]);
                setToast(
                  "Abertura do WhatsApp solicitada. O envio precisa ser feito no WhatsApp.",
                );
              }}
            >
              <MessageSquare size={18} />
              Abrir no WhatsApp
            </a>
            <small>
              Proteção local contra repetição do mesmo texto por 7 dias.
              Registra apenas a solicitação de abertura, sem confirmação de
              envio.
            </small>
          </div>
        ) : (
          <form className="modal-body" onSubmit={save}>
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            {modal === "appointment" ? (
              <AppointmentFields
                appointments={appointments}
                procedures={bookingProcedures}
                schedules={workingSchedules}
                professionalNames={activeProfessionals}
                currentProfessional={currentProfessional}
                clients={
                  admin
                    ? clients.filter((c) => !c.deletedAt)
                    : clients.filter(
                        (c) =>
                          !c.deletedAt &&
                          visible.some((a) => a.client === c.name),
                      )
                }
                admin={admin}
                initialDate={date}
              />
            ) : modal === "client" ? (
              <>
                <label>
                  Nome completo
                  <input
                    name="name"
                    defaultValue={editingClient?.name ?? ""}
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Telefone demonstrativo
                  <input
                    name="phone"
                    defaultValue={editingClient?.phone ?? ""}
                    required
                    type="tel"
                    maxLength={22}
                  />
                </label>
                <label>
                  CPF ou CNPJ (opcional)
                  <input
                    name="document"
                    defaultValue={editingClient?.document ?? ""}
                    inputMode="numeric"
                    maxLength={18}
                    placeholder="11 dígitos para CPF ou 14 para CNPJ"
                  />
                </label>
                <label>
                  Último atendimento
                  <input
                    name="lastVisit"
                    type="date"
                    required
                    max={TODAY}
                    defaultValue={editingClient?.lastVisit ?? TODAY}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    name="consent"
                    defaultChecked={editingClient?.consent ?? false}
                  />
                  Autorizou receber lembretes (registro demonstrativo)
                </label>
              </>
            ) : (
              <>
                <label>
                  Nome do procedimento
                  <input
                    name="name"
                    defaultValue={editingProcedure?.name ?? ""}
                    required
                    maxLength={80}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Preço (R$)
                    <input
                      name="price"
                      defaultValue={editingProcedure?.price}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Duração (min)
                    <input
                      name="duration"
                      defaultValue={editingProcedure?.duration}
                      type="number"
                      min="15"
                      max="480"
                      step="15"
                      required
                    />
                  </label>
                </div>
              </>
            )}
            {modal === "procedure" && editingProcedure && admin && (
              <div className="procedure-delete">
                {confirmProcedureDelete ? (
                  <>
                    <p>
                      Excluir “{editingProcedure.name}” do catálogo? Os
                      atendimentos existentes serão preservados.
                    </p>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setConfirmProcedureDelete(false)}
                    >
                      Manter procedimento
                    </button>
                    <button
                      type="button"
                      className="secondary danger"
                      onClick={() => {
                        setAppointments((items) =>
                          items.map((a) =>
                            !a.services?.length &&
                            a.procedure === editingProcedure.name
                              ? {
                                  ...a,
                                  duration: appointmentDuration(a, procedures),
                                  services: [
                                    {
                                      procedureId: editingProcedure.id,
                                      name: a.procedure,
                                      duration: appointmentDuration(
                                        a,
                                        procedures,
                                      ),
                                      price: a.value,
                                      commissionRate: a.commissionRate,
                                    },
                                  ],
                                }
                              : a,
                          ),
                        );
                        setRecords((items) =>
                          items.map((record) => ({
                            ...record,
                            services: record.services.filter(
                              (service) =>
                                service.procedureId !== editingProcedure.id,
                            ),
                          })),
                        );
                        setProcedures((items) =>
                          items.filter((p) => p.id !== editingProcedure.id),
                        );
                        close();
                        setToast(
                          "Procedimento excluído. Atendimentos preservados.",
                        );
                      }}
                    >
                      Confirmar exclusão
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() => setConfirmProcedureDelete(true)}
                  >
                    Excluir procedimento
                  </button>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={close}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                Salvar{" "}
                {modal === "appointment"
                  ? "atendimento"
                  : modal === "client"
                    ? "cliente"
                    : "procedimento"}
              </button>
            </div>
          </form>
        )}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon"
            aria-label="Dispensar aviso"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
