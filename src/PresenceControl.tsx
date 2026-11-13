import { instance } from "./instance";
import type { WorkSchedule } from "./domain";
import { useState } from "react";
import {
  ESTABLISHMENT,
  establishmentPresent,
  professionalPresent,
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
  schedules,
}: {
  events: PresenceEvent[];
  schedules: WorkSchedule[];
  now: string;
  admin: boolean;
  professional: string;
  names: string[];
  onToggle: (scope: string) => void;
}) {
  const [scope, setScope] = useState(ESTABLISHMENT);
  const single = names.length === 1;
  const target = single
    ? names[0]
    : admin
      ? scope === ESTABLISHMENT || names.includes(scope)
        ? scope
        : ESTABLISHMENT
      : professional;
  const whole = target === ESTABLISHMENT;
  const individual = whole
    ? establishmentPresent(events, now, schedules)
    : professionalPresent(
        events,
        target,
        now,
        schedules.find((s) => s.professional === target),
      );
  const open =
    individual && (!single || establishmentPresent(events, now, schedules));
  const label = whole
    ? open
      ? "Aberto"
      : "Fechado"
    : open
      ? "Presente"
      : "Ausente";
  return (
    <div className="presence-control">
      {admin && !single && (
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
          <strong>Presença · registros de jornada</strong>
          <p>
            O botão registra o horário real de São Paulo, mesmo que a agenda
            esteja em outra data. Fechado ou ausente pausa a ocupação; reabrir
            retoma a contagem. Em um dia fora da jornada semanal, marque
            Presente para registrar uma presença excepcional a partir de agora.
            Restrições manuais de ausência continuam valendo; revise-as se o
            profissional voltou a trabalhar.
          </p>
          <p>
            Ao abrir o aplicativo, o indicador usa os dias e horários da jornada
            em São Paulo. Antes do início e a partir do término, fica Ausente;
            dentro do expediente, Presente. Marcações manuais valem para o dia
            atual: uma saída permanece até nova chegada ou o próximo dia. Uma
            chegada durante o expediente termina com a jornada; chegadas fora
            dela registram uma exceção somente para aquele dia. Antes do
            primeiro fechamento, considera-se a jornada cumprida até aquele
            momento. Dias anteriores ao início dos registros usam a jornada
            prevista. Sair do perfil ou fechar o aplicativo não marca saída.{" "}
            {instance.dataMode === "firebase"
              ? "As marcações manuais ficam salvas no banco e sincronizadas entre aparelhos."
              : "As marcações manuais ficam salvas neste navegador, sem sincronização entre aparelhos."}{" "}
            Com um único profissional, o botão controla a presença e a abertura
            juntos.
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
