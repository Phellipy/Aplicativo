import { instance } from "./instance";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Pencil,
  Trash2,
  MessageSquare,
  RotateCcw,
  X,
} from "lucide-react";
import {
  TODAY,
  daysSinceVisit,
  returnReminderStats,
  eligibleClients,
  canReschedule,
  type Client,
  type Appointment,
  type Campaign,
} from "./domain";
type Props = {
  clients: Client[];
  appointments: Appointment[];
  campaigns: Campaign[];
  returnDays: number;
  onEdit: (client: Client) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onWhatsApp: (client: Client) => void;
};
export default function ClientsPanel({
  clients,
  appointments,
  campaigns,
  returnDays,
  onEdit,
  onDelete,
  onRestore,
  onWhatsApp,
}: Props) {
  const [query, setQuery] = useState(""),
    [excluded, setExcluded] = useState(false),
    [deleting, setDeleting] = useState<Client | null>(null),
    [error, setError] = useState("");
  const [returnFilter, setReturnFilter] = useState("all"),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [query, excluded, returnFilter]);
  const eligibleIds = new Set(
    eligibleClients(clients, campaigns, TODAY, returnDays).map(
      (client) => client.id,
    ),
  );
  const dialog = useRef<HTMLDialogElement>(null),
    previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setError("");
    if (deleting) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      previousFocus.current?.focus();
    }
  }, [deleting]);
  const visible = clients.filter(
    (client) =>
      Boolean(client.deletedAt) === excluded &&
      (returnFilter === "all" ||
        (returnFilter === "overdue" && daysSinceVisit(client) >= returnDays) ||
        (returnFilter === "eligible" && eligibleIds.has(client.id)) ||
        (returnFilter === "warning" &&
          returnReminderStats(client, campaigns).warning)) &&
      (client.name + client.phone)
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / 100));
  const currentPage = Math.min(page, pageCount - 1);
  const openings = campaigns.filter((campaign) => campaign.status === "opened");
  const pending = deleting
    ? appointments.filter(
        (a) =>
          (a.clientId === deleting.id ||
            (!a.clientId && a.client === deleting.name)) &&
          canReschedule(a),
      ).length
    : 0;
  return (
    <>
      <div className="client-tools">
        <div
          className="period-buttons"
          role="group"
          aria-label="Situação dos clientes"
        >
          <button aria-pressed={!excluded} onClick={() => setExcluded(false)}>
            Ativos
          </button>
          <button aria-pressed={excluded} onClick={() => setExcluded(true)}>
            Excluídos ({clients.filter((client) => client.deletedAt).length})
          </button>
        </div>
        <label className="return-client-filter">
          Convites de retorno
          <select
            aria-label="Convites de retorno"
            value={returnFilter}
            onChange={(event) => setReturnFilter(event.target.value)}
          >
            <option value="all">Todos os clientes</option>
            <option value="overdue">Sem retorno há {returnDays}+ dias</option>
            <option value="eligible">Pode convidar agora</option>
            <option value="warning">Mais de 2 lembretes abertos</option>
          </select>
        </label>
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Buscar cliente"
            placeholder="Buscar por nome ou telefone…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <p className="return-filter-note">
        Prazo configurado: {returnDays} dias sem atendimento · referência
        {instance.dataMode === "firebase" ? "atual" : "demonstrativa"}{" "}
        {TODAY.split("-").reverse().join("/")}. “Pode convidar agora” exige
        autorização e ausência de lembrete aberto nos últimos 7 dias. O contador
        registra aberturas, não confirma envio.
      </p>
      <section className="panel client-list">
        {visible
          .slice(currentPage * 100, (currentPage + 1) * 100)
          .map((client) => {
            const stats = returnReminderStats(client, campaigns),
              overdue = daysSinceVisit(client) >= returnDays;
            return (
              <div className="client-row" key={client.id}>
                <span className="avatar">
                  {client.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="client-info">
                  <strong>{client.name}</strong>
                  <small>
                    {client.phone} · Última visita:{" "}
                    {client.lastVisit
                      ? client.lastVisit.split("-").reverse().join("/")
                      : "Sem atendimento registrado"}
                  </small>
                  {!client.deletedAt && (
                    <div className="return-client-indicators">
                      {overdue && (
                        <span className="return-overdue">
                          Sem retorno · {daysSinceVisit(client)} dias
                        </span>
                      )}
                      {!client.consent && (
                        <small>Sem autorização para mensagens</small>
                      )}
                      <span
                        className={`return-count ${stats.warning ? "is-warning" : ""}`}
                      >
                        {stats.count} lembrete(s) aberto(s) neste ciclo
                        {stats.warning
                          ? " · Atenção à frequência de contato"
                          : ""}
                      </span>
                      <small>
                        Última abertura:{" "}
                        {stats.lastOpenedAt
                          ? new Date(stats.lastOpenedAt).toLocaleString(
                              "pt-BR",
                              {
                                timeZone: "America/Sao_Paulo",
                              },
                            )
                          : "Nenhuma neste ciclo"}
                      </small>
                    </div>
                  )}
                </div>
                <div className="client-actions">
                  {excluded ? (
                    <button
                      className="secondary"
                      onClick={() => onRestore(client.id)}
                    >
                      <RotateCcw size={15} />
                      Restaurar
                    </button>
                  ) : (
                    <>
                      <button
                        className="secondary"
                        aria-label={`Editar ${client.name}`}
                        onClick={() => onEdit(client)}
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                      <button
                        className="secondary whatsapp-button"
                        aria-label={`WhatsApp de ${client.name}`}
                        disabled={!client.consent}
                        onClick={() => onWhatsApp(client)}
                      >
                        <MessageSquare size={15} />
                        WhatsApp
                      </button>
                      <button
                        className="secondary danger-button"
                        aria-label={`Excluir ${client.name}`}
                        onClick={() => setDeleting(client)}
                      >
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        {pageCount > 1 && (
          <div className="modal-actions client-pagination">
            <button
              className="secondary"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span>
              {visible.length} clientes · Página {currentPage + 1} de{" "}
              {pageCount}
            </span>
            <button
              className="secondary"
              disabled={currentPage + 1 >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Próxima
            </button>
          </div>
        )}
        {!visible.length && (
          <div className="empty">
            {excluded
              ? "Nenhum cliente excluído encontrado."
              : "Nenhum cliente encontrado."}
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Histórico de aberturas do WhatsApp</h2>
            <p>
              O aplicativo prepara o link. Você confirma o envio no WhatsApp;
              não recebemos confirmação de envio.
            </p>
          </div>
        </div>
        {openings.length ? (
          openings
            .slice()
            .reverse()
            .map((entry, index) => (
              <div
                className="client-row"
                key={`${entry.clientId}-${entry.openedAt}-${index}`}
              >
                <MessageSquare size={19} />
                <div className="client-info">
                  <strong>
                    {clients.find((client) => client.id === entry.clientId)
                      ?.name ?? "Cliente do histórico"}
                  </strong>
                  <small>
                    {entry.openedAt
                      ? new Date(entry.openedAt).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })
                      : entry.created}{" "}
                    · Abertura solicitada · envio não confirmado
                  </small>
                  <details className="message-history">
                    <summary>Ver mensagem preparada</summary>
                    <p>{entry.message}</p>
                  </details>
                </div>
              </div>
            ))
        ) : (
          <div className="empty">
            Nenhuma abertura solicitada. Nenhuma mensagem é enviada
            automaticamente.
          </div>
        )}
      </section>
      <dialog
        ref={dialog}
        aria-labelledby="delete-client-title"
        onCancel={() => setDeleting(null)}
      >
        <div className="modal-head">
          <h2 id="delete-client-title">Excluir cliente</h2>
          <button
            className="icon"
            aria-label="Cancelar exclusão do cliente"
            onClick={() => setDeleting(null)}
          >
            <X />
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <p>
            Excluir <strong>{deleting?.name}</strong> do cadastro ativo?
          </p>
          <p>
            O histórico e os valores dos atendimentos serão preservados.{" "}
            {pending > 0
              ? `${pending} agendamento(s) em aberto continuam na agenda e precisam ser revisados.`
              : ""}{" "}
            Você poderá restaurar o cliente em Excluídos.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <button
              className="primary danger-button"
              onClick={() => {
                if (!deleting) return;
                try {
                  onDelete(deleting.id);
                  setDeleting(null);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Excluir cliente
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
