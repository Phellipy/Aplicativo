import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, X, ChevronRight, UserRound } from "lucide-react";
import { createDemoCredential } from "./demoAccess";
import WorkScheduleEditor from "./WorkScheduleEditor";
import {
  money,
  type ProfessionalRecord,
  type Procedure,
  type WorkSchedule,
  type Appointment,
} from "./domain";
type Props = {
  records: ProfessionalRecord[];
  procedures: Procedure[];
  schedules: WorkSchedule[];
  appointments: Appointment[];
  onCreate: (name: string) => void;
  onUpdate: (record: ProfessionalRecord) => void;
  onSchedule: (schedule: WorkSchedule) => void;
};
export default function ProfessionalsPanel({
  records,
  procedures,
  schedules,
  appointments,
  onCreate,
  onUpdate,
  onSchedule,
}: Props) {
  const [selected, setSelected] = useState<number | "new" | null>(null),
    [tab, setTab] = useState<"access" | "schedule" | "services">("access"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [services, setServices] = useState<ProfessionalRecord["services"]>([]);
  const dialog = useRef<HTMLDialogElement>(null),
    previousFocus = useRef<HTMLElement | null>(null);
  const record = records.find((p) => p.id === selected);
  useEffect(() => {
    setError("");
    setNotice("");
    setTab("access");
    if (selected !== null) {
      previousFocus.current = document.activeElement as HTMLElement;
      setServices(
        records
          .find((p) => p.id === selected)
          ?.services.map((s) => ({ ...s })) ?? [],
      );
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      previousFocus.current?.focus();
    }
  }, [selected]);
  function close() {
    if (!busy) setSelected(null);
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onCreate(String(new FormData(event.currentTarget).get("name") || ""));
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    if (password !== data.get("confirmation")) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const credential = await createDemoCredential(password);
      onUpdate({ ...record, credential });
      form.reset();
      setError("");
      setNotice(
        "Senha demonstrativa atualizada. A verificação de acesso é local e não protege os dados.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="professionals-toolbar">
        <span>
          {records.filter((p) => p.active).length} ativos · {records.length}{" "}
          cadastrados
        </span>
        <button className="primary" onClick={() => setSelected("new")}>
          <Plus size={18} />
          Novo profissional
        </button>
      </div>
      <section className="panel professionals-list">
        {records.map((p) => (
          <div className="professional-list-row" key={p.id}>
            <span className="avatar">
              <UserRound size={18} />
            </span>
            <button
              className="professional-name"
              onClick={() => setSelected(p.id)}
            >
              <strong>{p.name}</strong>
              <small>
                {
                  p.services.filter(
                    (s) =>
                      s.enabled &&
                      procedures.some((proc) => proc.id === s.procedureId),
                  ).length
                }{" "}
                procedimentos habilitados
              </small>
            </button>
            <span className={`badge ${p.active ? "green" : "neutral"}`}>
              {p.active ? "Ativo" : "Desabilitado"}
            </span>
            <button
              className="secondary"
              onClick={() => onUpdate({ ...p, active: !p.active })}
            >
              {p.active ? "Desabilitar" : "Habilitar"}
            </button>
            <button
              className="icon"
              aria-label={`Configurar ${p.name}`}
              onClick={() => setSelected(p.id)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        ))}
      </section>
      <p className="availability-note">
        Desabilitar bloqueia novos agendamentos e o acesso demonstrativo. O
        histórico de atendimentos é preservado.
      </p>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else close();
        }}
        className="professional-dialog"
        aria-labelledby="professional-title"
      >
        <div className="modal-head">
          <h2 id="professional-title">
            {selected === "new" ? "Novo profissional" : record?.name}
          </h2>
          <button
            className="icon"
            aria-label="Fechar configuração do profissional"
            disabled={busy}
            onClick={close}
          >
            <X />
          </button>
        </div>
        {selected === "new" ? (
          <form className="modal-body" onSubmit={add}>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <label>
              Nome do profissional
              <input name="name" required minLength={2} maxLength={80} />
            </label>
            <p className="availability-note">
              Após cadastrar, clique no nome para configurar jornada, serviços,
              repasses e senha demonstrativa.
            </p>
            <div className="modal-actions">
              <button className="secondary" type="button" onClick={close}>
                Cancelar
              </button>
              <button className="primary">Cadastrar profissional</button>
            </div>
          </form>
        ) : (
          record && (
            <>
              <div
                className="professional-tabs"
                role="group"
                aria-label="Configuração do profissional"
              >
                {(
                  [
                    { key: "access", label: "Acesso" },
                    { key: "schedule", label: "Jornada" },
                    { key: "services", label: "Procedimentos e repasses" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    aria-pressed={tab === item.key}
                    disabled={busy}
                    onClick={() => {
                      setTab(item.key);
                      setError("");
                      setNotice("");
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="modal-body">
                {error && (
                  <div className="form-error" role="alert">
                    {error}
                  </div>
                )}
                {notice && (
                  <div className="schedule-notice" role="status">
                    {notice}
                  </div>
                )}
                {tab === "access" && (
                  <>
                    <span
                      className={`badge ${record.active ? "green" : "neutral"}`}
                    >
                      {record.active
                        ? "Profissional habilitado"
                        : "Profissional desabilitado"}
                    </span>
                    <p className="availability-note">
                      Somente o administrador define ou altera a senha. Esta é
                      uma demonstração local, sem autenticação segura no
                      servidor. Use uma senha fictícia, diferente de suas senhas
                      reais.
                    </p>
                    <p className="availability-note">
                      {record.credential
                        ? "Senha demonstrativa configurada."
                        : "Nenhuma senha demonstrativa configurada."}
                    </p>
                    <form
                      className="professional-access-form"
                      onSubmit={savePassword}
                    >
                      <label>
                        Nova senha de demonstração
                        <input
                          type="password"
                          name="password"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          maxLength={128}
                        />
                      </label>
                      <label>
                        Confirmar senha de demonstração
                        <input
                          type="password"
                          name="confirmation"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          maxLength={128}
                        />
                      </label>
                      <button className="primary" disabled={busy}>
                        {busy ? "Salvando…" : "Salvar senha demonstrativa"}
                      </button>
                    </form>
                  </>
                )}
                {tab === "schedule" && (
                  <WorkScheduleEditor
                    schedule={schedules.find(
                      (s) => s.professional === record.name,
                    )!}
                    onSave={onSchedule}
                    appointments={appointments}
                    procedures={procedures}
                  />
                )}
                {tab === "services" && (
                  <form
                    className="professional-services-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      try {
                        onUpdate({ ...record, services });
                        setNotice(
                          "Procedimentos e repasses salvos. Valem apenas para novos atendimentos.",
                        );
                        setError("");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <p className="availability-note">
                      Habilitação e repasse por procedimento são alterados
                      apenas pelo administrador. Atendimentos existentes mantêm
                      os valores combinados.
                    </p>
                    {procedures.map((proc) => {
                      const assignment = services.find(
                        (s) => s.procedureId === proc.id,
                      );
                      return (
                        <div className="professional-service-row" key={proc.id}>
                          <label className="check-row">
                            <input
                              type="checkbox"
                              checked={assignment?.enabled ?? false}
                              onChange={(event) =>
                                setServices((items) => [
                                  ...items.filter(
                                    (s) => s.procedureId !== proc.id,
                                  ),
                                  {
                                    procedureId: proc.id,
                                    enabled: event.target.checked,
                                    commissionRate:
                                      assignment?.commissionRate ?? 0,
                                  },
                                ])
                              }
                            />
                            <span>
                              <strong>{proc.name}</strong>
                              <small>
                                {proc.duration} min · {money(proc.price)}
                              </small>
                            </span>
                          </label>
                          <label>
                            Repasse (%)
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              disabled={!assignment?.enabled}
                              value={assignment?.commissionRate ?? 0}
                              onChange={(event) =>
                                setServices((items) => [
                                  ...items.filter(
                                    (s) => s.procedureId !== proc.id,
                                  ),
                                  {
                                    procedureId: proc.id,
                                    enabled: assignment?.enabled ?? false,
                                    commissionRate: Number(event.target.value),
                                  },
                                ])
                              }
                            />
                          </label>
                        </div>
                      );
                    })}
                    {!procedures.length && (
                      <p>
                        Nenhum procedimento cadastrado. Cadastre em
                        Procedimentos primeiro.
                      </p>
                    )}
                    <button className="primary" type="submit">
                      Salvar procedimentos e repasses
                    </button>
                  </form>
                )}
              </div>
            </>
          )
        )}
      </dialog>
    </>
  );
}
