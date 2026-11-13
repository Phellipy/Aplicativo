import { instance } from "./instance";
import type { Appointment, WorkSchedule, Client, Procedure } from "./domain";
export const professionalApiUrl = (
  import.meta.env.VITE_PROFESSIONAL_API_URL || ""
).replace(/\/$/, "");
export const professionalSessionKey = `${instance.id}-professional-session`;
export type ProfessionalAppointment = Appointment & { revision: number };
export type ProfessionalWorkspaceData = {
  professional: { id: number; name: string };
  appointments: ProfessionalAppointment[];
  schedule: WorkSchedule | null;
  clients: Pick<Client, "id" | "name" | "phone">[];
  procedures: Procedure[];
};
export class ProfessionalApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function professionalRequest<T>(
  path: string,
  token?: string,
  input?: unknown,
  method?: string,
): Promise<T> {
  if (!professionalApiUrl)
    throw new Error("O acesso dos profissionais ainda não foi conectado.");
  if (!professionalApiUrl.startsWith("https://") && !import.meta.env.DEV)
    throw new Error("Endereço do serviço inválido.");
  const response = await fetch(professionalApiUrl + path, {
    method: method ?? (input === undefined ? "GET" : "POST"),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(input !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: input === undefined ? undefined : JSON.stringify(input),
    cache: "no-store",
    credentials: "omit",
  });
  const result = await response
    .json()
    .catch(() => ({ error: "Não foi possível conectar ao serviço." }));
  if (!response.ok || result?.error)
    throw new ProfessionalApiError(
      response.ok ? 503 : response.status,
      result.error || "Não foi possível concluir a operação.",
    );
  return result;
}
