import { FirebaseBackend, type FirebaseConfig } from "./firebase";
import { AccessService } from "./service";
import { HttpError } from "./contracts";
type Limiter = { limit(input: { key: string }): Promise<{ success: boolean }> };
export type Env = FirebaseConfig & {
  ALLOWED_ORIGINS: string;
  INSTANCE_ID?: string;
  LOGIN_IP_LIMITER: Limiter;
  LOGIN_USER_LIMITER: Limiter;
  API_IP_LIMITER: Limiter;
};
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Informe os dados.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new HttpError(413, "Dados acima do limite.");
    }
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}
export async function handle(
  request: Request,
  env: Env,
  service?: AccessService,
) {
  const origin = request.headers.get("Origin") ?? "",
    url = new URL(request.url);
  const origins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const allowed = origins.includes(origin);
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (allowed)
    Object.assign(headers, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    });
  const response = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  try {
    if (url.pathname === "/health" && request.method === "GET")
      return response({
        service: "professional-access",
        configured: !!env.FIREBASE_SERVICE_ACCOUNT,
      });
    if (!allowed) throw new HttpError(403, "Origem não autorizada.");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const callerIp = request.headers.get("CF-Connecting-IP");
    if (!callerIp || !env.API_IP_LIMITER)
      throw new HttpError(503, "Proteção do serviço ainda não configurada.");
    if (!(await env.API_IP_LIMITER.limit({ key: callerIp })).success)
      throw new HttpError(429, "Muitas solicitações. Aguarde um minuto.");
    const api =
      service ??
      new AccessService(
        new FirebaseBackend(env),
        new FirebaseBackend(env),
        undefined,
        env.INSTANCE_ID || "demo",
      );
    const token = (request.headers.get("Authorization") ?? "").replace(
      /^Bearer /,
      "",
    );
    if (url.pathname === "/public/access" && request.method === "GET")
      return response({ enabled: await api.enabled() });
    if (url.pathname === "/professional/login" && request.method === "POST") {
      const input = await body(request),
        ip = request.headers.get("CF-Connecting-IP");
      if (!ip || !env.LOGIN_IP_LIMITER || !env.LOGIN_USER_LIMITER)
        throw new HttpError(503, "Proteção de acesso ainda não configurada.");
      const user =
        typeof input.username === "string"
          ? input.username.trim().toLowerCase().slice(0, 32)
          : "";
      if (
        !(await env.LOGIN_IP_LIMITER.limit({ key: ip })).success ||
        !(await env.LOGIN_USER_LIMITER.limit({ key: user })).success
      )
        throw new HttpError(
          429,
          "Muitas tentativas. Aguarde um minuto e tente novamente.",
        );
      return response(await api.login(input));
    }
    const admin = /^\/admin\/professionals\/(\d{1,16})\/access$/.exec(
      url.pathname,
    );
    if (admin) {
      if (request.method === "GET")
        return response(await api.access(token, admin[1]));
      if (request.method === "POST")
        return response(
          await api.setAccess(token, admin[1], await body(request)),
        );
      if (request.method === "DELETE")
        return response(await api.revokeAccess(token, admin[1]));
    }
    if (url.pathname === "/professional/workspace" && request.method === "GET")
      return response(await api.workspace(token));
    if (url.pathname === "/professional/logout" && request.method === "POST") {
      await api.logout(token);
      return response({ signedOut: true });
    }
    if (url.pathname === "/professional/clients" && request.method === "POST")
      return response(await api.createClient(token, await body(request)));
    if (
      url.pathname === "/professional/appointments" &&
      request.method === "POST"
    )
      return response(await api.book(token, await body(request)));
    const appointment =
      /^\/professional\/appointments\/(-?\d{1,16})\/action$/.exec(url.pathname);
    if (appointment && request.method === "POST")
      return response(
        await api.action(token, appointment[1], await body(request)),
      );
    throw new HttpError(404, "Recurso indisponível.");
  } catch (error) {
    return response(
      {
        error:
          error instanceof HttpError
            ? error.message
            : "Serviço indisponível. Tente novamente.",
      },
      error instanceof HttpError ? error.status : 503,
    );
  }
}
export default {
  fetch(request: Request, env: Env, _context?: unknown) {
    return handle(request, env);
  },
};
