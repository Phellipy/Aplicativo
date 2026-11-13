import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
let env: RulesTestEnvironment;
const admin = () =>
  env
    .authenticatedContext("admin-uid", { email: "admin@example.test" })
    .firestore();
const other = () =>
  env
    .authenticatedContext("other-uid", { email: "other@example.test" })
    .firestore();
const path = "instances/demo/data/clients/items/1";
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dalisson-rules",
    firestore: {
      host: "127.0.0.1",
      port: 8086,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "administrators/admin-uid"), {
      role: "admin",
      active: true,
      email: "admin@example.test",
    });
    await setDoc(doc(context.firestore(), path), {
      value: { id: 1, name: "Cliente teste" },
      position: 0,
      revision: 1,
    });
  });
});
describe("regras Firestore da publicação administrativa", () => {
  it("bloqueia leitura e gravação sem login", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, path)));
    await assertFails(
      setDoc(doc(db, path), { value: {}, position: 0, revision: 2 }),
    );
  });
  it("bloqueia usuário autenticado sem autorização administrativa", async () => {
    await assertFails(getDoc(doc(other(), path)));
    await assertFails(
      getDocs(collection(other(), "instances/demo/data/clients/items")),
    );
  });
  it("permite CRUD e consulta ao administrador", async () => {
    const db = admin();
    await assertSucceeds(
      getDocs(collection(db, "instances/demo/data/clients/items")),
    );
    await assertSucceeds(
      setDoc(doc(db, path), {
        value: { id: 1, name: "Editado" },
        position: 0,
        revision: 2,
      }),
    );
    expect((await getDoc(doc(db, path))).data()?.revision).toBe(2);
    await assertSucceeds(deleteDoc(doc(db, path)));
  });
  it("impede criação ou edição de autorização pela própria interface", async () => {
    await assertFails(
      setDoc(doc(other(), "administrators/other-uid"), {
        role: "admin",
        active: true,
        email: "other@example.test",
      }),
    );
    await assertFails(
      updateDoc(doc(admin(), "administrators/admin-uid"), { active: true }),
    );
  });
  it("bloqueia acesso com e-mail divergente e administrador revogado", async () => {
    await assertFails(
      getDoc(
        doc(
          env
            .authenticatedContext("admin-uid", { email: "outro@example.test" })
            .firestore(),
          path,
        ),
      ),
    );
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "administrators/admin-uid"), {
        active: false,
      });
    });
    await assertFails(getDoc(doc(admin(), path)));
  });
  it("bloqueia outro estabelecimento e coleções não previstas", async () => {
    await assertFails(
      setDoc(doc(admin(), "instances/outro/data/clients/items/1"), {
        value: {},
        position: 0,
        revision: 1,
      }),
    );
    await assertFails(
      setDoc(
        doc(admin(), "instances/demo/data/admin-account/items/value"),
        { value: {}, position: 0, revision: 1 },
      ),
    );
  });
  it("rejeita gravação com revisão antiga ou campos extras", async () => {
    await assertFails(
      setDoc(doc(admin(), path), { value: {}, position: 0, revision: 1 }),
    );
    await assertFails(
      setDoc(doc(admin(), path), {
        value: {},
        position: 0,
        revision: 2,
        role: "admin",
      }),
    );
  });
  it("expõe apenas a marca pública e não permite modificá-la sem ser administrador", async () => {
    await assertSucceeds(
      setDoc(doc(admin(), "publicBranding/demo"), {
        name: "Dalisson",
        logo: "",
        appearance: { mode: "dark", accent: "pink" },
      }),
    );
    await assertSucceeds(
      getDoc(
        doc(
          env.unauthenticatedContext().firestore(),
          "publicBranding/demo",
        ),
      ),
    );
    await assertFails(
      setDoc(doc(other(), "publicBranding/demo"), { name: "Outro" }),
    );
    await assertFails(
      getDocs(
        collection(env.unauthenticatedContext().firestore(), "publicBranding"),
      ),
    );
  });
  it("impede publicar informações privadas na marca", async () => {
    await assertFails(
      setDoc(doc(admin(), "publicBranding/demo"), {
        name: "Dalisson",
        clients: [],
      }),
    );
    await assertFails(
      setDoc(doc(admin(), "publicBranding/demo"), {
        logo: "javascript:alert(1)",
      }),
    );
  });
});

import { CloudStore } from "../src/CloudStore";
const waitUntil = async (condition: () => boolean) => {
  const deadline = Date.now() + 10000;
  while (!condition()) {
    if (Date.now() > deadline)
      throw new Error("Estado do banco não atualizado no prazo");
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
};
async function startStore() {
  const store = new CloudStore(admin() as never, () => {});
  await new Promise<void>((resolve, reject) =>
    store.start(resolve, (error) => reject(new Error(error))),
  );
  return store;
}
describe("gravação real no emulador", () => {
  it("salva atendimento e cliente no mesmo lote e restaura após recarga", async () => {
    const store = await startStore();
    try {
      store.change("clients", [
        {
          id: 1,
          name: "Cliente atualizado",
          reminderResetAt: "2026-11-12T10:00:00Z",
        },
      ]);
      store.change("appointments", [
        { id: 10, clientId: 1, status: "Concluído", value: 100 },
      ]);
      await waitUntil(() => store.pending === 0);
      expect(store.error).toBe("");
      expect(
        (
          await getDoc(
            doc(admin(), "instances/demo/data/appointments/items/10"),
          )
        ).data()?.value.status,
      ).toBe("Concluído");
      const reloaded = await startStore();
      try {
        expect(
          (reloaded.values.get("clients") as { reminderResetAt: string }[])[0]
            .reminderResetAt,
        ).toBe("2026-11-12T10:00:00Z");
      } finally {
        reloaded.stop();
      }
    } finally {
      store.stop();
    }
  });
  it("preserva inclusões concorrentes de registros diferentes", async () => {
    const a = await startStore(),
      b = await startStore();
    try {
      a.change("procedures", [{ id: 11, name: "A" }]);
      b.change("procedures", [{ id: 22, name: "B" }]);
      await waitUntil(() => a.pending === 0 && b.pending === 0);
      expect(a.error).toBe("");
      expect(b.error).toBe("");
      const docs = await getDocs(
        collection(admin(), "instances/demo/data/procedures/items"),
      );
      expect(docs.size).toBe(2);
    } finally {
      a.stop();
      b.stop();
    }
  });
  it("não transporta credenciais locais e atualiza a marca em transação", async () => {
    const store = await startStore();
    try {
      store.change("professional-records", [
        {
          id: 9,
          name: "Profissional",
          credential: { hash: "segredo-ficticio" },
        },
      ]);
      store.change("establishment-name", "Marca atualizada");
      await waitUntil(() => store.pending === 0);
      expect(store.error).toBe("");
      expect(
        (
          await getDoc(
            doc(
              admin(),
              "instances/demo/data/professional-records/items/9",
            ),
          )
        ).data()?.value.credential,
      ).toBeUndefined();
      expect(
        (await getDoc(doc(admin(), "publicBranding/demo"))).data()?.name,
      ).toBe("Marca atualizada");
    } finally {
      store.stop();
    }
  });
});

import { importedClients, importContactBatches } from "../src/contactImport";
it("duas importações simultâneas do mesmo telefone não criam dois clientes", async () => {
  const a = await startStore(),
    b = await startStore();
  try {
    const one = importedClients(
      [{ name: "Contato importado", phone: "11977776666" }],
      [],
    );
    const two = importedClients(
      [{ name: "Mesmo contato", phone: "+55 11 97777-6666" }],
      [],
    );
    a.change("clients", [...(a.values.get("clients") as unknown[]), ...one]);
    b.change("clients", [...(b.values.get("clients") as unknown[]), ...two]);
    await waitUntil(() => a.pending === 0 && b.pending === 0);
    const saved = await getDocs(
      collection(admin(), "instances/demo/data/clients/items"),
    );
    expect(saved.size).toBe(2); // One seeded client and one imported client.
    expect(saved.docs.filter((d) => d.data().value.phone)).toHaveLength(1);
  } finally {
    a.stop();
    b.stop();
  }
});

it("importa mais de mil contatos no Firestore em lotes e não duplica na reimportação", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), path));
  });
  const store = await startStore();
  try {
    const contacts = Array.from({ length: 1001 }, (_, i) => ({
      name: `Importação grande ${i}`,
      phone: String(11950000000 + i),
    }));
    const read = () =>
      store.values.get("clients") as import("../src/domain").Client[];
    const save = async (added: import("../src/domain").Client[]) => {
      store.change("clients", [...read(), ...added]);
      await store.waitForIdle();
    };
    expect(await importContactBatches(contacts, read, save, () => {})).toBe(
      1001,
    );
    expect(await importContactBatches(contacts, read, save, () => {})).toBe(0);
    expect(
      (
        await getDocs(
          collection(admin(), "instances/demo/data/clients/items"),
        )
      ).size,
    ).toBe(1001);
  } finally {
    store.stop();
  }
}, 60000);

it("mantém vínculos, credenciais técnicas e sessões profissionais inacessíveis pelo SDK", async () => {
  const paths = [
    "professionalAccess/10",
    "professionalLogins/ana",
    "professionalSessions/hash-de-teste",
  ];
  await env.withSecurityRulesDisabled(async (context) => {
    for (const path of paths)
      await setDoc(doc(context.firestore(), path), {
        professionalId: "10",
        active: true,
      });
  });
  for (const path of paths) {
    for (const db of [
      admin(),
      other(),
      env.unauthenticatedContext().firestore(),
    ]) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(
        setDoc(doc(db, path), { professionalId: "10", active: true }),
      );
    }
  }
});
