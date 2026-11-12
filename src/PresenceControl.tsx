import { useState } from "react";
import {
  ESTABLISHMENT,
  isPresent,
  localMoment,
  type PresenceEvent,
} from "./presence";
export default function PresenceControl({
  events,
  now,
  admin,
  professional,
  names,
  onToggle,
}: {
  events: PresenceEvent[];
  now: string;
  admin: boolean;
  professional: string;
  names: string[];
  onToggle: (scope: string) => void;
}) {
  const [scope, setScope] = useState(ESTABLISHMENT);
  const target = admin
    ? scope === ESTABLISHMENT || names.includes(scope)
      ? scope
      : ESTABLISHMENT
    : professional;
  const open = isPresent(events, target, now),
    whole = target === ESTABLISHMENT;
  const label = whole
    ? open
      ? "Aberto"
      : "Fechado"
    : open
      ? "Presente"
      : "Ausente";
  return (
    <div className="presence-control">
      {admin && (
        <select
          aria-label="Controlar presença de"
          value={target}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value={ESTABLISHMENT}>Estabelecimento</option>
          {names.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      )}
      <button
        className={`presence-toggle ${open ? "is-open" : "is-closed"}`}
        aria-label={`${whole ? "Estabelecimento" : target}: ${label}. ${open ? (whole ? "Fechar agora" : "Registrar saída agora") : whole ? "Abrir agora" : "Registrar chegada agora"}`}
        aria-pressed={open}
        onClick={() => onToggle(target)}
        title="Registra o horário atual de São Paulo. Altera apenas a métrica de ocupação; não cancela agendamentos."
      >
        <span aria-hidden="true" />
        {label}
      </button>
      <details className="presence-history">
        <summary aria-label="Sobre os registros de presença">i</summary>
        <div>
          <strong>Presença · registro local demonstrativo</strong>
          <p>
            O botão registra o horário real de São Paulo, mesmo que a agenda
            esteja em outra data. Fechado ou ausente pausa a ocupação; reabrir
            retoma a contagem, respeitando jornada e ausências cadastradas.
          </p>
          <p>
            Antes do primeiro fechamento, considera-se a jornada cumprida até
            aquele momento. Dias anteriores ao início dos registros usam a
            jornada prevista. Não há sincronização entre aparelhos.
          </p>
          <ul>
            {events
              .filter((e) => e.scope === target)
              .slice(-6)
              .reverse()
              .map((event, index) => {
                const moment = localMoment(event.at);
                return (
                  <li key={index}>
                    {moment.date.split("-").reverse().join("/")} ·{" "}
                    {String(Math.floor(moment.minute / 60)).padStart(2, "0")}:
                    {String(Math.floor(moment.minute % 60)).padStart(2, "0")} ·{" "}
                    {whole
                      ? event.open
                        ? "Aberto"
                        : "Fechado"
                      : event.open
                        ? "Presente"
                        : "Ausente"}
                  </li>
                );
              })}
          </ul>
        </div>
      </details>
    </div>
  );
}
