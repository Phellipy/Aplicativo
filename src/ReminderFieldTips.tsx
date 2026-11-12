import { useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
export default function ReminderFieldTips({
  appointment,
}: {
  appointment: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fields = [
    { field: "{nome}", meaning: "Primeiro nome do cliente", example: "Marcos" },
    {
      field: "{estabelecimento}",
      meaning: "Nome do estabelecimento salvo nas configurações",
      example: "Navalha & Co.",
    },
    ...(appointment
      ? [
          {
            field: "{data}",
            meaning: "Data do agendamento (dia/mês/ano)",
            example: "11/11/2026",
          },
          {
            field: "{horario}",
            meaning: "Horário de início do atendimento",
            example: "09:00",
          },
          {
            field: "{profissional}",
            meaning: "Nome do profissional do agendamento",
            example: "Rafael Moura",
          },
          {
            field: "{procedimentos}",
            meaning: "Todos os procedimentos do agendamento",
            example: "Corte + barba",
          },
        ]
      : []),
  ];
  const id = `reminder-field-tips-${appointment ? "appointment" : "return"}`;
  return (
    <div className="reminder-field-tips">
      <button
        type="button"
        className="secondary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Lightbulb size={17} />
        Dicas de campos
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <section
          id={id}
          className="field-tips-panel"
          aria-label="Como personalizar a mensagem"
        >
          <h3>Campos disponíveis neste lembrete</h3>
          <p>
            Digite os campos na mensagem exatamente como aparecem abaixo, em
            letras minúsculas e entre chaves. Ao abrir o WhatsApp, eles são
            substituídos pelos dados do cliente
            {appointment ? " e do agendamento" : " e do estabelecimento"}.
          </p>
          <dl>
            {fields.map((item) => (
              <div key={item.field}>
                <dt>
                  <code>{item.field}</code>
                </dt>
                <dd>
                  {item.meaning}
                  <small>Exemplo: {item.example}</small>
                </dd>
              </div>
            ))}
          </dl>
          <p>
            <strong>Exemplo de mensagem:</strong>{" "}
            {appointment
              ? "Olá, {nome}! Seu atendimento é em {data}, às {horario}. Procedimentos: {procedimentos}."
              : "Olá, {nome}! Sentimos sua falta na {estabelecimento}. Vamos agendar um retorno?"}
          </p>
          <small>
            {appointment
              ? "Os dados vêm do atendimento selecionado na agenda."
              : "O lembrete de retorno não está ligado a um agendamento. Por isso, data, horário, profissional e procedimentos não estão disponíveis aqui."}{" "}
            Campos diferentes dos listados permanecem como texto. Confira o
            resultado na pré-visualização.
          </small>
        </section>
      )}
    </div>
  );
}
