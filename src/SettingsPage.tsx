import ReminderFieldTips from "./ReminderFieldTips";
import LogoSettings from "./LogoSettings";
import AppearanceSettings from "./AppearanceSettings";
import type { Appearance } from "./appearance";
import { useState } from "react";
import { appointmentMessage } from "./appointmentReminder";
import { initialAppointments } from "./domain";
export default function SettingsPage({
  name,
  returnDays,
  onReturnDays,
  message,
  appointmentTemplate,
  logo,
  onLogo,
  appearance,
  onAppearance,
  onName,
  onReturn,
  onAppointment,
}: {
  logo: string;
  onLogo: (value: string) => void;
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
  name: string;
  returnDays: number;
  onReturnDays: (days: number) => void;
  message: string;
  appointmentTemplate: string;
  onName: (value: string) => void;
  onReturn: (value: string) => void;
  onAppointment: (value: string) => void;
}) {
  const [tab, setTab] = useState("establishment"),
    [draftName, setDraftName] = useState(name),
    [draftReturn, setDraftReturn] = useState(message),
    [draftAppointment, setDraftAppointment] = useState(appointmentTemplate);
  const [draftDays, setDraftDays] = useState(String(returnDays));
  const validDays =
    Number.isInteger(Number(draftDays)) &&
    Number(draftDays) >= 1 &&
    Number(draftDays) <= 3650;
  const tabs = [
    { key: "establishment", label: "Estabelecimento" },
    { key: "appointment", label: "Lembrete de Agendamento" },
    { key: "return", label: "Lembrete de Retorno" },
  ];
  const isAppointment = tab === "appointment",
    draft = isAppointment ? draftAppointment : draftReturn;
  return (
    <>
      <div className="settings-tabs" role="tablist" aria-label="Configurações">
        {tabs.map((item, index) => (
          <button
            id={`settings-tab-${item.key}`}
            role="tab"
            aria-selected={tab === item.key}
            aria-controls="settings-panel"
            tabIndex={tab === item.key ? 0 : -1}
            key={item.key}
            onClick={() => setTab(item.key)}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              if (event.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              if (event.key === "Home") next = 0;
              if (event.key === "End") next = tabs.length - 1;
              if (next !== undefined) {
                event.preventDefault();
                setTab(tabs[next].key);
                document
                  .getElementById(`settings-tab-${tabs[next].key}`)
                  ?.focus();
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id="settings-panel"
        role="tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
      >
        {tab === "establishment" ? (
          <section className="panel settings">
            <h2>Estabelecimento</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (draftName.trim()) {
                  onName(draftName.trim());
                  setDraftName(draftName.trim());
                }
              }}
            >
              <label>
                Nome do estabelecimento
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <p>As iniciais da marca são atualizadas automaticamente.</p>
              <button
                className="primary"
                disabled={!draftName.trim() || draftName.trim() === name}
              >
                Salvar nome
              </button>
            </form>
            <LogoSettings logo={logo} name={name} onSave={onLogo} />
            <AppearanceSettings value={appearance} onChange={onAppearance} />
            <div className="notice">
              Versão 0.1 · Dados demonstrativos locais. O controle de perfil não
              oferece segurança real e não há sincronização entre aparelhos.
            </div>
          </section>
        ) : (
          <div className="settings-grid">
            <section className="panel settings">
              <h2>
                {isAppointment
                  ? "Lembrete de Agendamento"
                  : "Lembrete de Retorno"}
              </h2>
              <p>
                {isAppointment
                  ? "No dia do atendimento, use o ícone do WhatsApp na agenda para abrir a mensagem pronta. Você revisa e envia no WhatsApp. Também pode abrir antecipadamente se precisar."
                  : `Convite para clientes há ${returnDays} dias ou mais sem atendimento. Revise cada mensagem e abra o WhatsApp manualmente na aba Clientes.`}
              </p>
              {!isAppointment && (
                <div className="return-days-settings">
                  <label>
                    Dias sem atendimento
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      step={1}
                      value={draftDays}
                      onChange={(event) => setDraftDays(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    disabled={!validDays || Number(draftDays) === returnDays}
                    onClick={() => onReturnDays(Number(draftDays))}
                  >
                    Salvar prazo
                  </button>
                  <small>
                    A partir deste número de dias, o cliente recebe um
                    sinalizador na aba Clientes. O novo prazo vale imediatamente
                    para os filtros.
                  </small>
                </div>
              )}
              <label>
                Mensagem padrão
                <textarea
                  rows={6}
                  value={draft}
                  onChange={(event) =>
                    isAppointment
                      ? setDraftAppointment(event.target.value)
                      : setDraftReturn(event.target.value)
                  }
                />
              </label>
              <ReminderFieldTips key={tab} appointment={isAppointment} />
              <button
                className="primary"
                disabled={!draft.trim()}
                onClick={() =>
                  isAppointment
                    ? onAppointment(draft.trim())
                    : onReturn(draft.trim())
                }
              >
                Salvar mensagem
              </button>
              <div className="notice">
                {isAppointment
                  ? "O ícone fica discreto após abrir a conversa e continua clicável. Isso não confirma envio ou leitura. Ao reagendar ou mudar o conteúdo, o lembrete volta a ficar destacado."
                  : "Proteção contra repetição: o mesmo texto para o mesmo cliente fica bloqueado por 7 dias após abrir a conversa. Não há envio automático."}
              </div>
            </section>
            <section className="panel settings">
              <span className="eyebrow">PRÉ-VISUALIZAÇÃO · EXEMPLO</span>
              <div className="message-preview">
                {isAppointment
                  ? appointmentMessage(draft, initialAppointments[0], name)
                  : draft
                      .replaceAll("{nome}", "Gustavo")
                      .replaceAll("{estabelecimento}", name)}
              </div>
              <p>
                Sem API de mensagens. O envio é concluído por você no WhatsApp.
              </p>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
