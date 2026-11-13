export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type Stored = { path: string; value: any; updateTime: string };
export type Write = {
  path: string;
  value?: any;
  previous?: Stored;
  remove?: boolean;
  verify?: boolean;
};
export interface BackendStore {
  get(path: string): Promise<Stored | null>;
  query(
    path: string,
    field?: string,
    value?: string | boolean,
  ): Promise<Stored[]>;
  commit(writes: Write[]): Promise<void>;
}
export interface IdentityProvider {
  administrator(token: string): Promise<{ uid: string; email: string }>;
  setPassword(uid: string, email: string, password: string): Promise<void>;
  checkPassword(email: string, password: string): Promise<void>;
}
export const professionalPath = (id: string, instanceId = "demo") =>
  `instances/${instanceId}/data/professional-records/items/${id}`;
export const dataPath = (key: string, instanceId = "demo") =>
  `instances/${instanceId}/data/${key}/items`;
export const usernameKey = (value: unknown) => {
  const name = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(name))
    throw new HttpError(
      400,
      "Use de 3 a 32 letras, números, ponto, hífen ou sublinhado no usuário.",
    );
  return name;
};
export function passwordValue(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new HttpError(400, "A senha deve ter de 12 a 128 caracteres.");
  return value;
}
export const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function sessionKey(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Entre novamente.");
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
