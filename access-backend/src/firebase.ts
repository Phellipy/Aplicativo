import {
  HttpError,
  type BackendStore,
  type IdentityProvider,
  type Stored,
  type Write,
} from "./contracts";
export type FirebaseConfig = {
  FIREBASE_SERVICE_ACCOUNT: string;
  FIREBASE_WEB_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
};
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const encoded = (value: unknown) =>
  b64(new TextEncoder().encode(JSON.stringify(value)));
let cached:
  { email: string; keyId: string; token: string; until: number } | undefined;
export function encode(value: any): any {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encode) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, encode(v)]),
      ),
    },
  };
}
export function decode(value: any): any {
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  if ("mapValue" in value)
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [
        k,
        decode(v),
      ]),
    );
  throw new HttpError(503, "Formato de dados indisponível.");
}
export class FirebaseBackend implements BackendStore, IdentityProvider {
  private root: string;
  constructor(private env: FirebaseConfig) {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(env.FIREBASE_PROJECT_ID))
      throw new HttpError(503, "Projeto não configurado.");
    this.root = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  }
  private async token() {
    const service = JSON.parse(this.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    if (
      service.project_id !== this.env.FIREBASE_PROJECT_ID ||
      !service.private_key ||
      !service.client_email
    )
      throw new HttpError(503, "Serviço de acesso ainda não configurado.");
    if (
      cached &&
      cached.email === service.client_email &&
      cached.keyId === service.private_key_id &&
      cached.until > Date.now() + 60000
    )
      return cached.token;
    const now = Math.floor(Date.now() / 1000);
    const input =
      encoded({ alg: "RS256", typ: "JWT" }) +
      "." +
      encoded({
        iss: service.client_email,
        scope:
          "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      });
    const der = Uint8Array.from(
      atob(service.private_key.replace(/-----[^-]+-----|\s/g, "")),
      (c) => c.charCodeAt(0),
    );
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(input),
    );
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: input + "." + b64(new Uint8Array(signature)),
      }),
    });
    if (!response.ok)
      throw new HttpError(503, "Não foi possível autenticar o serviço.");
    const result: any = await response.json();
    cached = {
      email: service.client_email,
      keyId: service.private_key_id,
      token: result.access_token,
      until: Date.now() + Number(result.expires_in) * 1000,
    };
    return cached.token;
  }
  private async call(path: string, method = "GET", body?: unknown) {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/${this.root}${path}`,
      {
        method,
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    if (response.status === 404) return null;
    if (response.status === 409 || response.status === 412)
      throw new HttpError(
        409,
        "Os dados foram alterados. Atualize a página e tente novamente.",
      );
    if (!response.ok)
      throw new HttpError(
        503,
        "Não foi possível acessar o banco. Tente novamente.",
      );
    return (await response.json()) as any;
  }
  private stored(doc: any): Stored {
    return {
      path: doc.name.slice(this.root.length + 1),
      value: decode({ mapValue: { fields: doc.fields } }),
      updateTime: doc.updateTime,
    };
  }
  async get(path: string) {
    const doc = await this.call("/" + path);
    return doc ? this.stored(doc) : null;
  }
  async query(path: string, field?: string, value?: string | boolean) {
    const maximum = /^instances\/[a-z0-9-]+\/data\/clients\/items$/.test(path)
      ? 10000
      : 5000;
    const split = path.lastIndexOf("/"),
      parent = split < 0 ? "" : path.slice(0, split),
      collectionId = path.slice(split + 1);
    const result = await this.call(
      (parent ? "/" + parent : "") + ":runQuery",
      "POST",
      {
        structuredQuery: {
          from: [{ collectionId }],
          ...(field
            ? {
                where: {
                  fieldFilter: {
                    field: { fieldPath: field },
                    op: "EQUAL",
                    value: encode(value),
                  },
                },
              }
            : {}),
          limit: maximum + 1,
        },
      },
    );
    const docs = (result || [])
      .filter((r: any) => r.document)
      .map((r: any) => this.stored(r.document));
    if (docs.length > maximum)
      throw new HttpError(
        503,
        "Volume de dados acima do limite desta etapa. Contate o administrador.",
      );
    return docs;
  }
  async commit(writes: Write[]) {
    await this.call(":commit", "POST", {
      writes: writes.map((write) => {
        const name = `${this.root}/${write.path}`;
        const currentDocument = write.previous
          ? { updateTime: write.previous.updateTime }
          : { exists: false };
        return write.verify
          ? { verify: name, currentDocument }
          : write.remove
            ? { delete: name, currentDocument }
            : {
                update: { name, fields: encode(write.value).mapValue.fields },
                currentDocument,
              };
      }),
    });
  }
  async administrator(token: string) {
    if (token.length > 4096) throw new HttpError(401, "Entre novamente.");
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(this.env.FIREBASE_WEB_API_KEY)}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      },
    );
    if (!response.ok)
      throw new HttpError(401, "Entre novamente como administrador.");
    const result: any = await response.json(),
      user = result.users?.[0];
    if (!user || user.disabled || !user.email)
      throw new HttpError(401, "Entre novamente como administrador.");
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(
        atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")),
      );
      if (
        claims.aud !== this.env.FIREBASE_PROJECT_ID ||
        claims.iss !==
          `https://securetoken.google.com/${this.env.FIREBASE_PROJECT_ID}` ||
        claims.sub !== user.localId ||
        claims.exp * 1000 <= Date.now() ||
        (user.validSince && claims.auth_time < Number(user.validSince))
      )
        throw new Error();
    } catch {
      throw new HttpError(401, "Entre novamente como administrador.");
    }
    return {
      uid: user.localId as string,
      email: (user.email as string).toLowerCase(),
    };
  }
  async setPassword(uid: string, email: string, password: string) {
    const auth = async (endpoint: string, body: unknown) =>
      fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${this.env.FIREBASE_PROJECT_ID}/${endpoint}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${await this.token()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
    const lookup = await auth("accounts:lookup", { localId: [uid] });
    if (!lookup.ok)
      throw new HttpError(503, "Não foi possível configurar a conta.");
    const result: any = await lookup.json();
    const existing = result.users?.find((u: any) => u.localId === uid);
    if (existing && existing.email !== email)
      throw new HttpError(
        503,
        "A conta técnica existente não corresponde ao vínculo. Revise a configuração do serviço.",
      );
    const exists = !!existing;
    const response = await auth(
      exists ? "accounts:update" : "accounts",
      exists
        ? { localId: uid, password, disableUser: false }
        : {
            localId: uid,
            email,
            password,
            emailVerified: false,
            disabled: false,
          },
    );
    if (!response.ok)
      throw new HttpError(
        503,
        "Não foi possível definir a senha. O acesso permanece suspenso; tente redefinir novamente.",
      );
  }
  async checkPassword(email: string, password: string) {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(this.env.FIREBASE_WEB_API_KEY)}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    if (!response.ok) throw new HttpError(401, "Usuário ou senha inválidos.");
    // Provider tokens are never returned or stored in the professional's browser.
    await response.arrayBuffer();
  }
}
