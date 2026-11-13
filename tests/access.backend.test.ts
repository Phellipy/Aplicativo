import { beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { FirebaseBackend } from "../access-backend/src/firebase";
import { AccessService } from "../access-backend/src/service";
import {
  dataPath,
  professionalPath,
  HttpError,
} from "../access-backend/src/contracts";
let env: RulesTestEnvironment, db: FirebaseBackend, service: AccessService;
const project = "demo-dalisson-access";
const fetchOriginal = globalThis.fetch;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: project,
    firestore: {
      host: "127.0.0.1",
      port: 8086,
      rules:
        'rules_version = "2"; service cloud.firestore { match /databases/{db}/documents { match /{path=**} { allow read, write: if false; } } }',
    },
  });
  vi.stubGlobal("fetch", async (input: any, init: any) => {
    const original = String(input);
    if (original.startsWith("http://127.0.0.1:8086/"))
      return fetchOriginal(input, init);
    if (
      !original.startsWith(
        "https://firestore.googleapis.com/v1/projects/dalisson-2f074/",
      )
    )
      throw new Error("Acesso externo bloqueado neste teste");
    const url = original
      .replace("https://firestore.googleapis.com", "http://127.0.0.1:8086")
      .replaceAll("dalisson-2f074", project);
    const response = await fetchOriginal(url, {
      ...init,
      headers: { ...init?.headers, Authorization: "Bearer owner" },
      body:
        typeof init?.body === "string"
          ? init.body.replaceAll("dalisson-2f074", project)
          : init?.body,
    });
    return new Response(
      (await response.text()).replaceAll(project, "dalisson-2f074"),
      { status: response.status, headers: response.headers },
    );
  });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "administrators/admin"), {
      active: true,
      role: "admin",
      email: "admin@example.test",
      createdAt: new Date("2026-11-13T12:00:00Z"),
    });
    await setDoc(doc(firestore, professionalPath("10")), {
      value: {
        id: 10,
        name: "Profissional de teste",
        active: true,
        services: [],
      },
      position: 0,
      revision: 1,
    });
    await setDoc(doc(firestore, `${dataPath("appointments")}/1`), {
      value: {
        id: 1,
        clientId: 5,
        client: "Cliente de teste",
        professional: "Profissional de teste",
        date: "2026-11-13",
        time: "09:00",
        duration: 30,
        value: 100,
        commissionRate: 50,
        procedure: "Corte",
        status: "Agendado",
      },
      position: 0,
      revision: 1,
    });
    await setDoc(doc(firestore, `${dataPath("clients")}/5`), {
      value: {
        id: 5,
        name: "Cliente de teste",
        phone: "11999998888",
        lastVisit: "",
        consent: false,
      },
      position: 0,
      revision: 1,
    });
  });
  db = new FirebaseBackend({
    FIREBASE_PROJECT_ID: "dalisson-2f074",
    FIREBASE_SERVICE_ACCOUNT: "",
    FIREBASE_WEB_API_KEY: "test",
  });
  Object.defineProperty(db, "token", { value: async () => "owner" });
  const passwords = new Map<string, string>();
  service = new AccessService(
    db,
    {
      administrator: async (token) => {
        if (token !== "admin-token") throw new HttpError(401, "Inválido");
        return { uid: "admin", email: "admin@example.test" };
      },
      setPassword: async (uid, email, password) => {
        passwords.set(email, password);
      },
      checkPassword: async (email, password) => {
        if (passwords.get(email) !== password)
          throw new HttpError(401, "Inválido");
      },
    },
    () => Date.parse("2026-11-13T12:00:00Z"),
  );
});
it("executa criação, sessão, conclusão e revogação contra o Firestore emulado", async () => {
  await service.setAccess("admin-token", "10", {
    username: "profissional.teste",
    password: "senha-ficticia-teste-123",
  });
  const login = await service.login({
    username: "profissional.teste",
    password: "senha-ficticia-teste-123",
  });
  expect((await service.workspace(login.token)).appointments).toHaveLength(1);
  await service.action(login.token, "1", {
    action: "complete",
    payment: "Não pago",
    revision: 1,
  });
  expect(
    (await db.get(`${dataPath("appointments")}/1`))!.value.value.status,
  ).toBe("Concluído");
  expect(
    (await db.get(`${dataPath("clients")}/5`))!.value.value.lastVisit,
  ).toBe("2026-11-13");
  await service.setAccess("admin-token", "10", {
    username: "profissional.teste",
    password: "outra-senha-teste-123",
  });
  await expect(service.workspace(login.token)).rejects.toMatchObject({
    status: 401,
  });
});
it("não aceita gravar com revisão antiga no backend real", async () => {
  await service.setAccess("admin-token", "10", {
    username: "profissional.teste",
    password: "senha-ficticia-teste-123",
  });
  const { token } = await service.login({
    username: "profissional.teste",
    password: "senha-ficticia-teste-123",
  });
  await service.action(token, "1", { action: "confirm", revision: 1 });
  await expect(
    service.action(token, "1", { action: "cancel", revision: 1 }),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    (await db.get(`${dataPath("appointments")}/1`))!.value.value.status,
  ).toBe("Confirmado");
});
it("persiste cliente e agendamento profissional com valores definidos pelo catálogo", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, `${dataPath("procedures")}/7`), {
      value: { id: 7, name: "Corte", price: 90, duration: 30 },
      revision: 0,
      position: 0,
    });
    await setDoc(doc(firestore, `${dataPath("work-schedules")}/0`), {
      value: {
        professional: "Profissional de teste",
        days: Array.from({ length: 7 }, (_, day) => ({
          day,
          enabled: true,
          start: "08:00",
          end: "18:00",
        })),
        restrictions: [],
      },
      revision: 0,
      position: 0,
    });
  });
  await service.setAccess("admin-token", "10", {
    username: "profissional.teste",
    password: "senha-ficticia-teste-123",
  });
  const { token } = await service.login({
    username: "profissional.teste",
    password: "senha-ficticia-teste-123",
  });
  const client = await service.createClient(token, {
    name: "Novo cliente",
    phone: "11988887777",
  });
  await service.book(token, {
    id: 1000,
    clientId: client.id,
    procedureIds: [7],
    date: "2026-11-13",
    time: "10:00",
    professional: "Outro",
    value: 1,
  });
  const workspace = await service.workspace(token);
  expect(workspace.clients).toHaveLength(2);
  expect(workspace.appointments.find((a) => a.id === 1000)).toMatchObject({
    client: "Novo cliente",
    professional: "Profissional de teste",
    value: 90,
    commissionRate: 100,
  });
  await expect(
    service.book(token, {
      id: 1001,
      clientId: client.id,
      procedureIds: [7],
      date: "2026-11-13",
      time: "10:00",
    }),
  ).rejects.toMatchObject({ status: 400 });
});
