// Only data used by the first dashboard render blocks entry.
export const initialCloudKeys = [
  "establishment-name",
  "appearance",
  "appointments",
  "procedures",
  "work-schedules",
  "professional-records",
  "presence",
];
export const reminderCloudKeys = [
  "clients",
  "appointment-message",
  "appointment-reminders",
];
export const returnCloudKeys = [
  "clients",
  "campaigns",
  "return-days",
  "message",
];
export const pageCloudKeys: Record<string, string[]> = {
  Dashboard: initialCloudKeys,
  Agenda: [...initialCloudKeys, ...reminderCloudKeys],
  Clientes: [...initialCloudKeys, ...returnCloudKeys],
  Financeiro: [...initialCloudKeys, "clients"],
  Métricas: initialCloudKeys,
  Profissionais: initialCloudKeys,
  Procedimentos: initialCloudKeys,
  Configurações: [
    ...initialCloudKeys,
    "logo",
    "return-days",
    "message",
    "appointment-message",
  ],
};
export const appointmentCloudKeys = [...initialCloudKeys, ...reminderCloudKeys];
