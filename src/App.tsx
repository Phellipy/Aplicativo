import AgendaStack from "./AgendaStack";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Scissors,
  Settings,
  UserRound,
  LogOut,
  Plus,
  Search,
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
  professionals,
  TODAY,
  money,
  procedureRate,
  hasConflict,
  calculateCommission,
  visibleAppointments,
  eligibleClients,
  type Appointment,
  type Client,
  type Procedure,
  type Campaign,
  type Role,
} from "./domain";
type Page =
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
  { name: "Clientes", icon: Users },
  { name: "Financeiro", icon: Wallet },
  { name: "Profissionais", icon: UserRound },
  { name: "Procedimentos", icon: Scissors },
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
  const [query, setQuery] = useState(""),
    [date, setDate] = useState(TODAY),
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
    "Olá, {nome}! Sentimos sua falta na Navalha & Co. Que tal reservar um horário com a gente?",
  );
  const [draftMessage, setDraftMessage] = useState(message);
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
        admin ||
        !["Clientes", "Profissionais", "Configurações"].includes(p.name),
    );
  const visible = visibleAppointments(appointments, role || "professional");
  const scoped = visible.filter(
      (a) => person === "Todos" || a.professional === person,
    ),
    today = scoped.filter((a) => a.date === TODAY && a.status !== "Cancelado");
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
    setQuery("");
    setPerson("Todos");
  };
  const close = () => {
    setModal(null);
    setCampaignClient(null);
    setCompletionAppointment(null);
    setRescheduleTarget(null);
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
      );
      setAppointments(updated);
      setDate(newDate);
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
      if (!str("name")) return;
      setClients([
        ...clients,
        {
          id: Date.now(),
          name: str("name"),
          phone: str("phone"),
          lastVisit: str("lastVisit"),
          consent: f.get("consent") === "on",
        },
      ]);
    }
    if (modal === "procedure") {
      const assigned = f.getAll("professionals").map(String);
      if (!assigned.length) {
        setFormError("Selecione ao menos um profissional.");
        return;
      }
      setProcedures([
        ...procedures,
        {
          id: Date.now(),
          name: str("name"),
          price: Number(f.get("price")),
          duration: Number(f.get("duration")),
          commission: Number(f.get("commission")),
          professionals: assigned,
        },
      ]);
    }
    if (modal === "appointment") {
      const proc = procedures.find((p) => p.id === Number(f.get("procedure")));
      const prof = admin ? str("professional") : professionals[0];
      if (!proc || !proc.professionals.includes(prof)) {
        setFormError(
          "Este profissional não está habilitado para o procedimento.",
        );
        return;
      }
      const conflict = hasConflict(
        appointments,
        procedures,
        prof,
        str("date"),
        str("time"),
        proc.duration,
      );
      if (conflict) {
        setFormError("Há um conflito de horário para este profissional.");
        return;
      }
      setAppointments([
        ...appointments,
        {
          id: Date.now(),
          client: str("client"),
          professional: prof,
          procedure: proc.name,
          date: str("date"),
          time: str("time"),
          value: proc.price,
          commissionRate: procedureRate(proc, prof),
          status: "Agendado",
        },
      ]);
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
  if (!role)
    return (
      <div className="login">
        <div className="login-story">
          <div className="brand">
            <span className="brand-icon">
              <Scissors />
            </span>
            Navalha & Co.
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
            <button
              className="secondary wide"
              onClick={() => setRole("professional")}
            >
              Explorar como Rafael Moura <ChevronRight size={18} />
            </button>
            <div className="notice">
              <ShieldCheck size={20} />
              <span>
                Ambiente demonstrativo com dados fictícios. A escolha de perfil
                não autentica usuários nem garante segurança. Nenhuma credencial
                é necessária.
              </span>
            </div>
          </div>
        </main>
      </div>
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
          <span className="brand-icon">
            <Scissors size={22} />
          </span>
          Navalha & Co.
          <button
            className="icon mobile-only"
            aria-label="Fechar menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-mark">N</span>
          <div>
            <strong>Seu estabelecimento</strong>
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
            <Avatar name={admin ? "Administrador" : professionals[0]} />
            <div>
              <strong>{admin ? "Administrador" : "Rafael Moura"}</strong>
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
            <span className="demo-tag">DEMONSTRAÇÃO</span>
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
            <Avatar name={admin ? "Administrador" : professionals[0]} />
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
                    : "Bom dia, Rafael."
                  : page}
              </h1>
              <p>
                {
                  {
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
                      "Serviços, preços e repasses em um único lugar.",
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
                <div className="segmented">
                  <span className="selected">Hoje</span>
                  <span>11 nov 2026</span>
                </div>
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
                    label: admin ? "Recebido hoje" : "Meus ganhos hoje",
                    value: money(admin ? revenue : payout),
                    note: "Concluídos com pagamento registrado",
                    icon: Wallet,
                  },
                  {
                    label: "Atendimentos",
                    value: String(today.length).padStart(2, "0"),
                    note: `${completed.length} concluído(s) no dia`,
                    icon: CalendarDays,
                  },
                  {
                    label: admin
                      ? "Repasses previstos"
                      : "Meus ganhos previstos",
                    value: money(today.reduce((s, a) => s + commission(a), 0)),
                    note: "Sobre a agenda de hoje",
                    icon: UserRound,
                  },
                  {
                    label: "Ocupação prevista",
                    value: `${Math.round((today.reduce((s, a) => s + (procedures.find((p) => p.name === a.procedure)?.duration || 60), 0) / ((admin && person === "Todos" ? 3 : 1) * 480)) * 100)}%`,
                    note: "Base: jornada demo de 8h",
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
              <div className="dashboard-grid">
                <section
                  className={`panel schedule-panel ${admin ? "admin" : ""}`}
                >
                  <div className="panel-head">
                    <div>
                      <h2>
                        Agendamentos de hoje{" "}
                        <span className="sub-count">{today.length}</span>
                      </h2>
                      <p>Seu dia, organizado do começo ao fim.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("Agenda")}
                    >
                      Ver agenda <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {appointmentRows(
                    today.sort((a, b) => a.time.localeCompare(b.time)),
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
                        <ShieldCheck size={16} /> Cada lembrete precisa da sua
                        aprovação.
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
                        onClick={() => navigate("Agenda")}
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
                      <p>Previsão de atendimentos para hoje</p>
                    </div>
                    <span className="badge blue">Hoje</span>
                  </div>
                  <div className="team-list">
                    {(admin ? professionals : [professionals[0]]).map(
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
                    <h2>Resumo do dia</h2>
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
                <label>
                  Data
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setExpandedAppointment(null);
                    }}
                  />
                </label>
                {admin && (
                  <label>
                    Profissional
                    <select
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                    >
                      <option>Todos</option>
                      {professionals.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button className="secondary" onClick={() => setDate(TODAY)}>
                  Hoje (demo)
                </button>
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
                    {admin ? "Agenda do estabelecimento" : "Minha agenda"}
                  </h2>
                  <span className="badge blue">
                    {scoped.filter((a) => a.date === date).length} atendimentos
                  </span>
                </div>
                {agendaView === "stack" ? (
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
                      admin={admin}
                      expanded={expandedAppointment}
                      onExpand={setExpandedAppointment}
                      onMove={(appointment, time) =>
                        moveAppointment(appointment, date, time)
                      }
                      onReschedule={setRescheduleTarget}
                      renderDetails={(appointment) =>
                        appointmentRows([appointment], true)
                      }
                    />
                  </>
                ) : (
                  appointmentRows(
                    scoped
                      .filter((a) => a.date === date)
                      .sort((a, b) => a.time.localeCompare(b.time)),
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
                  <h2>Um convite para voltar</h2>
                  <p>
                    {eligible.length} clientes elegíveis após 30 dias sem
                    atendimento. Revise e aprove cada mensagem.
                  </p>
                </div>
                <span className="badge amber">Envio não conectado</span>
              </section>
              <div className="search">
                <Search size={18} />
                <input
                  aria-label="Buscar cliente"
                  placeholder="Buscar por nome ou telefone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <section className="panel client-list">
                {clients
                  .filter((c) =>
                    (c.name + c.phone)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((c) => (
                    <div className="client-row" key={c.id}>
                      <Avatar name={c.name} />
                      <div className="client-info">
                        <strong>{c.name}</strong>
                        <small>
                          {c.phone} · Última visita:{" "}
                          {c.lastVisit.split("-").reverse().join("/")}
                        </small>
                      </div>
                      {eligible.some((e) => e.id === c.id) ? (
                        <button
                          className="secondary"
                          onClick={() => setCampaignClient(c)}
                        >
                          <MessageSquare size={16} /> Revisar lembrete
                        </button>
                      ) : (
                        <Badge
                          text={
                            campaigns.some((m) => m.clientId === c.id)
                              ? "Em campanha"
                              : !c.consent
                                ? "Sem autorização"
                                : "Em dia"
                          }
                        />
                      )}
                    </div>
                  ))}
                {!clients.some((c) =>
                  (c.name + c.phone)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ) && <div className="empty">Nenhum cliente encontrado.</div>}
              </section>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Fila de reativação</h2>
                    <p>
                      Aprovação local; nenhuma mensagem é enviada pelo
                      aplicativo.
                    </p>
                  </div>
                </div>
                {campaigns.length ? (
                  campaigns.map((m) => (
                    <div className="client-row" key={m.clientId}>
                      <MessageSquare size={20} />
                      <div className="client-info">
                        <strong>
                          {clients.find((c) => c.id === m.clientId)?.name}
                        </strong>
                        <small>
                          Criado em {m.created} · bloqueado para nova inclusão
                        </small>
                        <p className="queued-message">{m.message}</p>
                      </div>
                      {m.status === "pending" ? (
                        <button
                          className="primary"
                          onClick={() => {
                            setCampaigns(
                              campaigns.map((x) =>
                                x.clientId === m.clientId
                                  ? { ...x, status: "approved" }
                                  : x,
                              ),
                            );
                            setToast(
                              "Aprovação registrada localmente. Nenhuma mensagem foi enviada.",
                            );
                          }}
                        >
                          <Check size={16} /> Aprovar manualmente
                        </button>
                      ) : (
                        <Badge text="Aprovado · não enviado" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    Os lembretes revisados aparecerão aqui.
                  </div>
                )}
              </section>
            </>
          )}
          {page === "Financeiro" && (
            <>
              <div className="notice">
                <Wallet size={20} />
                <span>
                  Recebido considera somente atendimentos concluídos com
                  pagamento registrado. Repasses calculados incluem todos os
                  concluídos. Não há conexão bancária, cobrança ou pagamento de
                  repasses.
                </span>
              </div>
              <div className="stats finance-stats">
                {[
                  {
                    label: admin ? "Recebido" : "Meus serviços pagos",
                    value: revenue,
                  },
                  { label: "Repasses calculados", value: payout },
                  {
                    label: admin ? "Saldo antes de despesas" : "Meus ganhos",
                    value: admin ? revenue - paidPayout : payout,
                  },
                ].map((s) => (
                  <div className="stat" key={s.label}>
                    <span>{s.label}</span>
                    <strong>{money(s.value)}</strong>
                    <small>11 de novembro · dados demo</small>
                  </div>
                ))}
              </div>
              <section className="panel">
                <div className="panel-head">
                  <h2>
                    {admin
                      ? "Serviços concluídos hoje"
                      : "Meus serviços concluídos hoje"}
                  </h2>
                </div>
                {appointmentRows(completed)}
                <div className="notice">
                  O saldo não inclui despesas, taxas ou tributos e não
                  representa lucro.
                </div>
              </section>
            </>
          )}
          {page === "Profissionais" && admin && (
            <div className="professional-grid">
              {professionals.map((p) => (
                <section className="panel professional" key={p}>
                  <Avatar name={p} />
                  <h2>{p}</h2>
                  <Badge text="Ativo" />
                  <p>Profissional · Jornada demo: 09h às 18h</p>
                  <div className="divider" />
                  <h3>Procedimentos habilitados</h3>
                  {procedures
                    .filter((s) => s.professionals.includes(p))
                    .map((s) => (
                      <div className="service-line" key={s.id}>
                        <div>
                          <strong>{s.name}</strong>
                          <small>
                            {s.duration} min · {money(s.price)}
                          </small>
                        </div>
                        <label className="rate-label">
                          Repasse %
                          <input
                            aria-label={`Repasse de ${s.name} para ${p}`}
                            type="number"
                            min="0"
                            max="100"
                            value={procedureRate(s, p)}
                            onChange={(e) => {
                              const rate = Number(e.target.value);
                              if (rate >= 0 && rate <= 100)
                                setProcedures(
                                  procedures.map((x) =>
                                    x.id === s.id
                                      ? {
                                          ...x,
                                          individualRates: {
                                            ...x.individualRates,
                                            [p]: rate,
                                          },
                                        }
                                      : x,
                                  ),
                                );
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  <div className="notice">
                    Visualiza sua agenda, seus serviços e seus ganhos na
                    demonstração.
                  </div>
                  <button
                    className="secondary wide"
                    onClick={() => navigate("Procedimentos")}
                  >
                    Configurar procedimentos <ChevronRight size={16} />
                  </button>
                </section>
              ))}
            </div>
          )}
          {page === "Procedimentos" && (
            <>
              <div className="notice">
                <Scissors size={20} />
                <span>
                  {admin
                    ? "Preços e repasses são definidos pelo estabelecimento. Alterações valem para novos atendimentos; os já agendados mantêm seu percentual."
                    : "Apenas os serviços habilitados para Rafael Moura são exibidos."}
                </span>
              </div>
              <div className="procedure-grid">
                {procedures
                  .filter(
                    (p) => admin || p.professionals.includes(professionals[0]),
                  )
                  .map((p) => (
                    <section className="panel procedure" key={p.id}>
                      <div className="procedure-top">
                        <span className="service-icon">
                          <Scissors size={22} />
                        </span>
                        <Badge text="Ativo" />
                      </div>
                      <h2>{p.name}</h2>
                      <p>
                        <Clock size={14} /> {p.duration} minutos
                      </p>
                      <strong className="price">{money(p.price)}</strong>
                      <div className="divider" />
                      <label>
                        Repasse padrão (%){" "}
                        {admin ? (
                          <input
                            aria-label={`Repasse de ${p.name}`}
                            type="number"
                            min="0"
                            max="100"
                            value={p.commission}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (n >= 0 && n <= 100)
                                setProcedures(
                                  procedures.map((x) =>
                                    x.id === p.id ? { ...x, commission: n } : x,
                                  ),
                                );
                            }}
                          />
                        ) : (
                          <strong>{p.commission}%</strong>
                        )}
                      </label>
                      <small>
                        Ganho por atendimento:{" "}
                        {money((p.price * p.commission) / 100)}
                      </small>
                      <h3>Profissionais habilitados</h3>
                      {admin && (
                        <small>
                          Repasses individuais podem ser ajustados em
                          Profissionais.
                        </small>
                      )}
                      {admin ? (
                        professionals.map((prof) => (
                          <label className="check-row" key={prof}>
                            <input
                              type="checkbox"
                              checked={p.professionals.includes(prof)}
                              onChange={(e) =>
                                setProcedures(
                                  procedures.map((x) =>
                                    x.id === p.id
                                      ? {
                                          ...x,
                                          professionals: e.target.checked
                                            ? [...x.professionals, prof]
                                            : x.professionals.filter(
                                                (n) => n !== prof,
                                              ),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                            {prof}
                          </label>
                        ))
                      ) : (
                        <p>{professionals[0]}</p>
                      )}
                    </section>
                  ))}
              </div>
            </>
          )}
          {page === "Configurações" && admin && (
            <div className="settings-grid">
              <section className="panel settings">
                <h2>Lembretes de retorno</h2>
                <p>
                  Prepare um convite pessoal para quem não volta há algum tempo.
                </p>
                <div className="divider" />
                <div className="setting-line">
                  <div>
                    <strong>Prazo sem atendimento</strong>
                    <small>Clientes com última visita há 30 dias ou mais</small>
                  </div>
                  <span className="setting-value">30 dias</span>
                </div>
                <div className="setting-line">
                  <div>
                    <strong>Aprovação manual</strong>
                    <small>Cada mensagem exige uma ação do administrador</small>
                  </div>
                  <Badge text="Obrigatória" />
                </div>
                <div className="setting-line">
                  <div>
                    <strong>Proteção contra repetição</strong>
                    <small>
                      Um registro por cliente nesta versão, salvo no navegador
                    </small>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                <label>
                  Mensagem padrão
                  <textarea
                    rows={5}
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                  />
                </label>
                <p>Use {"{nome}"} para personalizar com o primeiro nome.</p>
                <button
                  className="primary"
                  disabled={!draftMessage.trim()}
                  onClick={() => {
                    setMessage(draftMessage);
                    setToast("Mensagem padrão salva neste navegador.");
                  }}
                >
                  Salvar configurações
                </button>
              </section>
              <div>
                <section className="panel settings">
                  <span className="eyebrow">PRÉ-VISUALIZAÇÃO</span>
                  <div className="message-preview">
                    {draftMessage.replaceAll("{nome}", "Gustavo")}
                  </div>
                  <div className="notice">
                    <MessageSquare size={20} />
                    WhatsApp não conectado. Não há envio, importação de contatos
                    ou automação ativa.
                  </div>
                </section>
                <section className="panel settings">
                  <h2>Sobre esta demonstração</h2>
                  <p>Versão 0.1 · React + TypeScript + Vite</p>
                  <p>
                    Dados locais fictícios. O controle de perfil é apenas
                    visual. Um ambiente real precisa de autenticação e
                    autorização no servidor.
                  </p>
                </section>
              </div>
            </div>
          )}
          <footer>
            Navalha & Co. <span>Feito para cuidar do seu negócio.</span>
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
                  ? "Revisar lembrete"
                  : modal === "appointment"
                    ? "Novo atendimento"
                    : modal === "client"
                      ? "Novo cliente"
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
            <div className="form-row">
              <label>
                Nova data
                <input
                  name="rescheduleDate"
                  type="date"
                  defaultValue={rescheduleTarget.date}
                  required
                />
              </label>
              <label>
                Novo horário
                <input
                  name="rescheduleTime"
                  type="time"
                  defaultValue={rescheduleTarget.time}
                  step="900"
                  min="08:00"
                  max="20:00"
                  required
                />
              </label>
            </div>
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
                        client.name === completionAppointment.client &&
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
              Cliente: <strong>{campaignClient.name}</strong>
            </p>
            <div className="message-preview">
              {message.replaceAll("{nome}", campaignClient.name.split(" ")[0])}
            </div>
            <p>
              Esta ação adiciona uma mensagem à fila para aprovação manual.
              Nenhum envio ao WhatsApp será realizado.
            </p>
            <button
              className="primary wide"
              onClick={() => {
                if (eligible.some((c) => c.id === campaignClient.id)) {
                  setCampaigns([
                    ...campaigns,
                    {
                      clientId: campaignClient.id,
                      status: "pending",
                      created: TODAY,
                      message: message.replaceAll(
                        "{nome}",
                        campaignClient.name.split(" ")[0],
                      ),
                    },
                  ]);
                  setToast(
                    "Lembrete na fila. Revise a aprovação manual abaixo.",
                  );
                }
                close();
              }}
            >
              Adicionar à fila de aprovação
            </button>
          </div>
        ) : (
          <form className="modal-body" onSubmit={save}>
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            {modal === "appointment" ? (
              <>
                <label>
                  Cliente
                  <select name="client" required>
                    {(admin
                      ? clients
                      : clients.filter((c) =>
                          visible.some((a) => a.client === c.name),
                        )
                    ).map((c) => (
                      <option key={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                {admin && (
                  <label>
                    Profissional
                    <select name="professional">
                      {professionals.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Procedimento
                  <select name="procedure" required>
                    {procedures
                      .filter(
                        (p) =>
                          admin || p.professionals.includes(professionals[0]),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {money(p.price)}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    Data
                    <input
                      type="date"
                      name="date"
                      defaultValue={date}
                      required
                    />
                  </label>
                  <label>
                    Horário
                    <input
                      type="time"
                      name="time"
                      required
                      min="08:00"
                      max="20:00"
                      step="900"
                    />
                  </label>
                </div>
                <small>
                  Habilitação e conflito de horários são verificados ao salvar.
                </small>
              </>
            ) : modal === "client" ? (
              <>
                <label>
                  Nome completo
                  <input name="name" required maxLength={80} />
                </label>
                <label>
                  Telefone demonstrativo
                  <input name="phone" required type="tel" maxLength={22} />
                </label>
                <label>
                  Último atendimento
                  <input
                    name="lastVisit"
                    type="date"
                    required
                    max={TODAY}
                    defaultValue={TODAY}
                  />
                </label>
                <label className="check-row">
                  <input type="checkbox" name="consent" />
                  Autorizou receber lembretes (registro demonstrativo)
                </label>
              </>
            ) : (
              <>
                <label>
                  Nome do procedimento
                  <input name="name" required maxLength={80} />
                </label>
                <div className="form-row">
                  <label>
                    Preço (R$)
                    <input
                      name="price"
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
                      type="number"
                      min="15"
                      max="480"
                      step="15"
                      required
                    />
                  </label>
                </div>
                <label>
                  Repasse (%)
                  <input
                    name="commission"
                    type="number"
                    min="0"
                    max="100"
                    required
                  />
                </label>
                <fieldset>
                  <legend>Profissionais habilitados</legend>
                  {professionals.map((p) => (
                    <label className="check-row" key={p}>
                      <input type="checkbox" name="professionals" value={p} />
                      {p}
                    </label>
                  ))}
                </fieldset>
              </>
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
