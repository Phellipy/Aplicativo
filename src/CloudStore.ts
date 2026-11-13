import { instance } from "./instance";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import {
  cloudKeys,
  cloudDiff,
  documentsFor,
  materialize,
  type DocumentMap,
  type CloudKind,
} from "./cloudModel";
export class CloudStore {
  values = new Map<string, unknown>();
  private server = new Map<string, DocumentMap>();
  private staged = new Map<string, { value: unknown; base: DocumentMap }>();
  private listeners = new Set<() => void>();
  private stops: Unsubscribe[] = [];
  private inFlight = new Set<string>();
  private running = false;
  private scheduled = false;
  pending = 0;
  error = "";
  constructor(
    private db: Firestore,
    private onStatus: () => void,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.listeners.forEach((listener) => listener());
    this.onStatus();
  }
  start(onReady: () => void, onError: (error: string) => void) {
    const waiting = new Set(Object.keys(cloudKeys));
    for (const [key, kind] of Object.entries(cloudKeys)) {
      this.stops.push(
        onSnapshot(
          collection(this.db, "instances", instance.id, "data", key, "items"),
          (snapshot) => {
            const entries: DocumentMap = new Map(
              snapshot.docs.map((item) => [
                item.id,
                item.data() as {
                  value: unknown;
                  position: number;
                  revision: number;
                },
              ]),
            );
            this.server.set(key, entries);
            if (!this.staged.has(key) && !this.inFlight.has(key))
              this.values.set(key, materialize(kind, entries));
            waiting.delete(key);
            this.emit();
            if (waiting.size === 0) onReady();
          },
          () =>
            onError(
              "Não foi possível carregar os dados. Confira a conexão e o acesso ao banco.",
            ),
        ),
      );
    }
  }
  stop() {
    this.stops.forEach((stop) => stop());
    this.listeners.clear();
    this.values.clear();
    this.server.clear();
    this.staged.clear();
  }
  waitForIdle(): Promise<void> {
    if (!this.pending)
      return this.error
        ? Promise.reject(new Error(this.error))
        : Promise.resolve();
    return new Promise((resolve, reject) => {
      const stop = this.subscribe(() => {
        if (this.pending) return;
        stop();
        if (this.error) reject(new Error(this.error));
        else resolve();
      });
    });
  }
  change(key: string, value: unknown) {
    if (!cloudKeys[key]) throw new Error("Coleção não autorizada.");
    const current = this.values.get(key);
    if (JSON.stringify(current) === JSON.stringify(value)) return;
    const base =
      this.staged.get(key)?.base ?? new Map(this.server.get(key) ?? []);
    this.staged.set(key, { value, base });
    this.values.set(key, value);
    this.pending = this.staged.size + this.inFlight.size;
    this.emit();
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        void this.flush();
      });
    }
  }
  private async flush() {
    if (this.running || !this.staged.size) return;
    this.running = true;
    const staged = new Map(this.staged);
    this.staged.clear();
    this.inFlight = new Set(staged.keys());
    this.pending = this.inFlight.size;
    this.emit();
    try {
      const changes = [...staged].flatMap(([key, item]) =>
        cloudDiff(item.base, documentsFor(cloudKeys[key], item.value)).map(
          (change) => ({
            ...change,
            key,
            ref: doc(
              this.db,
              "instances",
              instance.id,
              "data",
              key,
              "items",
              change.id,
            ),
          }),
        ),
      );
      if (changes.length > 450)
        throw new Error(
          "Muitas alterações de uma vez. Divida a operação em lotes menores.",
        );
      if (
        changes.some(
          (change) =>
            change.after &&
            new TextEncoder().encode(JSON.stringify(change.after.value))
              .length > 800000,
        )
      )
        throw new Error(
          "Um registro ficou grande demais para salvar. Reduza os dados ou a imagem.",
        );
      const branding = [...staged.keys()].some((key) =>
        ["establishment-name", "logo", "appearance"].includes(key),
      );
      const brandingRef = doc(this.db, "publicBranding", instance.id);
      await runTransaction(this.db, async (transaction) => {
        const snapshots = await Promise.all(
          changes.map((change) => transaction.get(change.ref)),
        );
        const brandSnapshot = branding
          ? await transaction.get(brandingRef)
          : undefined;
        snapshots.forEach((snapshot, index) => {
          if (
            (snapshot.exists() ? snapshot.data().revision : 0) !==
            (changes[index].before?.revision ?? 0)
          )
            throw new Error(
              "Os dados foram alterados em outro dispositivo. Recarregue e refaça a alteração.",
            );
        });
        changes.forEach((change) => {
          if (change.after)
            transaction.set(change.ref, {
              value: change.after.value,
              position: change.after.position,
              revision: (change.before?.revision ?? 0) + 1,
            });
          else transaction.delete(change.ref);
        });
        if (branding) {
          const brand = { ...(brandSnapshot?.data() ?? {}) };
          for (const [key, item] of staged) {
            if (key === "establishment-name") brand.name = item.value;
            if (key === "logo") brand.logo = item.value;
            if (key === "appearance") brand.appearance = item.value;
          }
          transaction.set(brandingRef, brand);
        }
      });
      this.error = "";
      // Snapshot listeners provide committed document versions.
      for (const change of changes) {
        const map = this.server.get(change.key) ?? new Map();
        if (change.after)
          map.set(change.id, {
            ...change.after,
            revision: (change.before?.revision ?? 0) + 1,
          });
        else map.delete(change.id);
        this.server.set(change.key, map);
      }
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar no banco.";
      // Reject dependent optimistic edits rather than silently overwriting newer data.
      for (const key of this.staged.keys())
        this.values.set(
          key,
          materialize(cloudKeys[key], this.server.get(key) ?? new Map()),
        );
      this.staged.clear();
    } finally {
      for (const key of this.inFlight)
        if (!this.staged.has(key))
          this.values.set(
            key,
            materialize(cloudKeys[key], this.server.get(key) ?? new Map()),
          );
      this.inFlight.clear();
      this.running = false;
      this.pending = this.staged.size;
      this.emit();
      if (this.staged.size) void this.flush();
    }
  }
}
