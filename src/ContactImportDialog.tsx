import { useRef, useState } from "react";
import {
  parseVCard,
  contactImportPreview,
  importedClients,
  type ImportedContact,
} from "./contactImport";
import type { Client } from "./domain";
export default function ContactImport({
  clients,
  onImport,
}: {
  clients: Client[];
  onImport: (
    contacts: Client[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    importing = useRef(false);
  const [contacts, setContacts] = useState<ImportedContact[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [page, setPage] = useState(0);
  const preview = contactImportPreview(contacts, clients);
  const selectedIds = new Set(selected);
  const pageCount = Math.max(1, Math.ceil(preview.length / 100));
  const close = () => {
    if (importing.current) return;
    dialog.current?.close();
    setContacts([]);
    setSelected([]);
    setError("");
    trigger.current?.focus();
  };
  return (
    <>
      <button
        ref={trigger}
        className="secondary"
        onClick={() => {
          importing.current = false;
          dialog.current?.showModal();
        }}
      >
        Importar contatos (.vcf)
      </button>
      <dialog
        ref={dialog}
        className="modal"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="modal-head">
          <h2>Importar contatos do celular</h2>
          <button aria-label="Fechar importação" onClick={close}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            Exporte os contatos do celular ou do iCloud/Google Contatos como
            arquivo vCard (.vcf). Selecione o arquivo e revise quem será
            cadastrado. Apenas celulares serão carregados; números fixos são
            ignorados. Se houver vários celulares, usamos o primeiro válido
            (priorizando o tipo celular indicado no arquivo).
          </p>
          <p className="availability-note">
            A prévia é processada neste aparelho. Somente nome e telefone dos
            contatos selecionados serão salvos como clientes. Importar não
            autoriza lembretes e não envia mensagens.
          </p>
          <label>
            Arquivo de contatos (até 20 MB; 10.000 contatos)
            <input
              type="file"
              disabled={busy}
              accept=".vcf,.vcard,text/vcard,text/x-vcard"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                setError("");
                setContacts([]);
                setSelected([]);
                setPage(0);
                if (!file) return;
                try {
                  if (file.size > 20_000_000)
                    throw new Error("O arquivo deve ter até 20 MB.");
                  setContacts(parseVCard(await file.text()));
                } catch (e) {
                  importing.current = false;
                  setError((e as Error).message);
                }
              }}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {!!contacts.length && (
            <>
              <p role="status">
                {contacts.length} contatos encontrados ·{" "}
                {selected.filter((i) => !preview[i]?.reason).length}{" "}
                selecionados. A gravação é automática em lotes de 200. Nomes ou
                telefones repetidos, inclusive em clientes excluídos, ficam
                bloqueados para revisão manual.
              </p>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  setSelected(
                    selected.length
                      ? []
                      : preview.flatMap((row, i) => (row.reason ? [] : [i])),
                  )
                }
              >
                {selected.length
                  ? "Desmarcar todos"
                  : "Selecionar todos os válidos"}
              </button>
              <div className="contact-import-list">
                {preview
                  .slice(page * 100, (page + 1) * 100)
                  .map((row, index) => {
                    const i = page * 100 + index;
                    return (
                      <label className="contact-import-row" key={i}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(i) && !row.reason}
                          disabled={busy || !!row.reason}
                          onChange={(event) =>
                            setSelected((old) =>
                              event.target.checked
                                ? [...old, i]
                                : old.filter((id) => id !== i),
                            )
                          }
                        />
                        <span>
                          <strong>{row.name}</strong>
                          <small>{row.phone || "Sem telefone"}</small>
                          {row.reason && <small>{row.reason}</small>}
                        </span>
                      </label>
                    );
                  })}
              </div>
              <div className="contact-import-pagination">
                <button
                  className="secondary"
                  disabled={busy || page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {page + 1} de {pageCount}
                </span>
                <button
                  className="secondary"
                  disabled={busy || page + 1 >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </button>
              </div>
            </>
          )}
          {busy && (
            <p role="status">
              {progress} contatos processados. Aguarde a confirmação dos lotes e
              mantenha a janela aberta.
            </p>
          )}
          <div className="modal-actions">
            <button className="secondary" disabled={busy} onClick={close}>
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy || !selected.length}
              onClick={async () => {
                if (importing.current) return;
                importing.current = true;
                setBusy(true);
                setProgress(0);
                setError("");
                try {
                  const added = importedClients(
                    selected
                      .map((i) => preview[i])
                      .filter((row) => !row.reason),
                    clients,
                  );
                  if (!added.length)
                    throw new Error("Selecione contatos válidos.");
                  await onImport(added, (done) => setProgress(done));
                  importing.current = false;
                  close();
                } catch (e) {
                  importing.current = false;
                  setError(
                    `A importação foi interrompida: ${(e as Error).message} Os lotes já confirmados foram mantidos. Recarregue e importe novamente para continuar sem duplicar.`,
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Importando…" : "Importar selecionados"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
