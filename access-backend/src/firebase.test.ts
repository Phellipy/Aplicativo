import { afterEach, describe, expect, it, vi } from "vitest";
import { FirebaseBackend, encode, decode } from "./firebase";
afterEach(() => vi.unstubAllGlobals());
const env = {
  FIREBASE_PROJECT_ID: "dalisson-2f074",
  FIREBASE_SERVICE_ACCOUNT: "",
  FIREBASE_WEB_API_KEY: "test-public-web-key",
};
const token = (override: Record<string, unknown> = {}) =>
  "eyJhbGciOiJSUzI1NiJ9." +
  btoa(
    JSON.stringify({
      aud: "dalisson-2f074",
      iss: "https://securetoken.google.com/dalisson-2f074",
      sub: "admin",
      exp: Math.floor(Date.now() / 1000) + 1000,
      auth_time: 200,
      ...override,
    }),
  ) +
  ".provider-validates-signature";
describe("integração REST segura com Firebase", () => {
  it("codifica e decodifica dados sem campos indefinidos", () => {
    const original = {
      name: "Ana",
      enabled: true,
      version: 2,
      price: 1.25,
      values: [null, "x"],
      optional: undefined,
    };
    expect(decode(encode(original))).toEqual({
      name: "Ana",
      enabled: true,
      version: 2,
      price: 1.25,
      values: [null, "x"],
    });
  });
  it("verifica o token pelo provedor antes de aceitar um administrador", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        users: [
          { localId: "admin", email: "ADMIN@example.test", validSince: "100" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await new FirebaseBackend(env).administrator(token())).toEqual({
      uid: "admin",
      email: "admin@example.test",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("recusa token de outro projeto, expirado ou anterior à revogação", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          users: [
            {
              localId: "admin",
              email: "admin@example.test",
              validSince: "100",
            },
          ],
        }),
      ),
    );
    for (const value of [
      token({ aud: "outro-projeto" }),
      token({ exp: 1 }),
      token({ auth_time: 10 }),
      token({ sub: "outra-conta" }),
    ])
      await expect(
        new FirebaseBackend(env).administrator(value),
      ).rejects.toMatchObject({ status: 401 });
  });
  it("não aceita senha quando o provedor recusa e não devolve tokens de login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          idToken: "segredo-do-provedor",
          refreshToken: "outro-segredo",
        }),
      ),
    );
    expect(
      await new FirebaseBackend(env).checkPassword(
        "internal@example.invalid",
        "senha-ficticia",
      ),
    ).toBeUndefined();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "INVALID_LOGIN_CREDENTIALS" } },
          { status: 400 },
        ),
      ),
    );
    await expect(
      new FirebaseBackend(env).checkPassword(
        "internal@example.invalid",
        "senha-ficticia",
      ),
    ).rejects.toMatchObject({
      status: 401,
      message: "Usuário ou senha inválidos.",
    });
  });
});

it("não redefine uma conta técnica cujo e-mail diverge do vínculo", async () => {
  const backend = new FirebaseBackend(env);
  Object.defineProperty(backend, "token", {
    value: async () => "server-token-only-for-test",
  });
  const fetcher = vi.fn(async () =>
    Response.json({
      users: [
        {
          localId: "staff-login-10",
          email: "conta-divergente@example.invalid",
        },
      ],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  await expect(
    backend.setPassword(
      "staff-login-10",
      "vinculo-esperado@example.invalid",
      "senha-ficticia-teste",
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(fetcher).toHaveBeenCalledOnce();
});

it("lê a data nativa do vínculo administrativo criado pelo Firebase", () => {
  expect(decode({mapValue:{fields:{active:{booleanValue:true},createdAt:{timestampValue:"2026-11-13T12:00:00Z"}}}})).toEqual({active:true,createdAt:"2026-11-13T12:00:00Z"});
});
