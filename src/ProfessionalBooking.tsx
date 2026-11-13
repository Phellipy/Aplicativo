import { useEffect, useRef, useState } from "react";
import AppointmentFields from "./AppointmentFields";
import {
  professionalRequest,
  type ProfessionalWorkspaceData,
} from "./professionalAccess";
export default function ProfessionalBooking({
  token,
  data,
  date,
  kind,
  onClose,
  onSaved,
}: {
  token: string;
  data: ProfessionalWorkspaceData;
  date: string;
  kind: "client" | "booking";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestId] = useState(
    () => Date.now() * 1000 + Math.floor(Math.random() * 1000),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{kind === "client" ? "Novo cliente" : "Novo atendimento"}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      <form
        className="modal-body"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            if (kind === "client")
              await professionalRequest("/professional/clients", token, {
                name: f.get("name"),
                phone: f.get("phone"),
              });
            else
              await professionalRequest("/professional/appointments", token, {
                id: requestId,
                clientId: Number(f.get("clientId")),
                procedureIds: f.getAll("procedureIds").map(Number),
                date: f.get("date"),
                time: f.get("time"),
                recurring: f.has("recurring"),
                recurrenceEnd: f.get("recurrenceEnd"),
                weekdays: f.getAll("weekdays").map(Number),
              });
            await onSaved();
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {kind === "client" ? (
          <>
            <label>
              Nome
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
            <label>
              Celular com DDD
              <input
                name="phone"
                type="tel"
                required
                maxLength={24}
                autoComplete="tel"
              />
            </label>
            <p className="availability-note">
              O cadastro é compartilhado com o estabelecimento. Telefones já
              cadastrados não serão duplicados.
            </p>
          </>
        ) : (
          <>
            <label>
              Cliente
              <select name="clientId" required defaultValue="">
                <option value="" disabled>
                  Selecione um cliente
                </option>
                {data.clients.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </label>
            <AppointmentFields
              hideClient
              appointments={data.appointments}
              procedures={data.procedures}
              schedules={data.schedule ? [data.schedule] : []}
              clients={[]}
              admin={false}
              initialDate={date}
              professionalNames={[data.professional.name]}
              currentProfessional={data.professional.name}
            />
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary"
          disabled={busy || (kind === "booking" && !data.clients.length)}
        >
          {busy
            ? "Salvando…"
            : kind === "client"
              ? "Cadastrar cliente"
              : "Agendar"}
        </button>
      </form>
    </dialog>
  );
}
