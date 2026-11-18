import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import { CloudStore } from "./CloudStore";
import { initialCloudKeys } from "./cloudLoading";
const mock = vi.hoisted(() => ({
  listeners: new Map<
    string,
    { next: (snapshot: any) => void; error: () => void }
  >(),
  writes: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => ({ key: args.at(-2) }),
  doc: vi.fn(),
  onSnapshot: (
    ref: { key: string },
    next: (snapshot: any) => void,
    error: () => void,
  ) => {
    mock.listeners.set(ref.key, { next, error });
    return () => mock.listeners.delete(ref.key);
  },
  runTransaction: mock.writes,
}));
const deliver = (key: string) => mock.listeners.get(key)!.next({ docs: [] });
beforeEach(() => {
  mock.listeners.clear();
  mock.writes.mockClear();
});
describe("carregamento progressivo do estabelecimento", () => {
  it("abre com os dados do Início sem aguardar clientes, campanhas, logo ou mensagens", () => {
    const store = new CloudStore({} as Firestore, () => {}),
      ready = vi.fn();
    store.start(ready, vi.fn());
    expect([...mock.listeners.keys()]).toEqual(initialCloudKeys);
    initialCloudKeys.slice(0, -1).forEach(deliver);
    expect(ready).not.toHaveBeenCalled();
    deliver(initialCloudKeys.at(-1)!);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(store.isLoaded(["clients"])).toBe(false);
    expect(store.isLoaded(initialCloudKeys)).toBe(true);
    store.stop();
  });
  it("carrega a área solicitada uma vez e só a libera após o snapshot", () => {
    const store = new CloudStore({} as Firestore, () => {});
    store.start(vi.fn(), vi.fn());
    store.ensure(["clients", "clients"]);
    const listener = mock.listeners.get("clients");
    store.ensure(["clients"]);
    expect(mock.listeners.get("clients")).toBe(listener);
    expect(store.isLoaded(["clients"])).toBe(false);
    deliver("clients");
    expect(store.values.get("clients")).toEqual([]);
    expect(store.isLoaded(["clients"])).toBe(true);
    store.stop();
  });
  it("bloqueia gravação antes da leitura sem alterar dados ou iniciar transação", () => {
    const store = new CloudStore({} as Firestore, () => {});
    store.start(vi.fn(), vi.fn());
    expect(() =>
      store.change("clients", [{ id: 1, name: "Fictício" }]),
    ).toThrow("Aguarde o carregamento");
    expect(store.values.has("clients")).toBe(false);
    expect(store.pending).toBe(0);
    expect(mock.writes).not.toHaveBeenCalled();
    store.stop();
  });
  it("falha em dados secundários não bloqueia o Início nem apresenta lista vazia como carregada", () => {
    const store = new CloudStore({} as Firestore, () => {}),
      fatal = vi.fn();
    store.start(vi.fn(), fatal);
    initialCloudKeys.forEach(deliver);
    store.ensure(["campaigns"]);
    mock.listeners.get("campaigns")!.error();
    expect(fatal).not.toHaveBeenCalled();
    expect(store.isLoaded(["campaigns"])).toBe(false);
    expect(store.loadError(["campaigns"])).toContain("Não foi possível");
    store.stop();
  });
  it("reinicia assinaturas e prontidão após encerrar a sessão", () => {
    const store = new CloudStore({} as Firestore, () => {});
    store.start(vi.fn(), vi.fn());
    initialCloudKeys.forEach(deliver);
    store.stop();
    expect(mock.listeners.size).toBe(0);
    expect(store.isLoaded(initialCloudKeys)).toBe(false);
    store.start(vi.fn(), vi.fn());
    expect(mock.listeners.size).toBe(initialCloudKeys.length);
    store.stop();
  });
});
