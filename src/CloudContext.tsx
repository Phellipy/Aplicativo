import {
  createContext,
  useContext,
  useRef,
  useMemo,
  useSyncExternalStore,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { User } from "firebase/auth";
import { cloudKey, cloudKeys } from "./cloudModel";
import type { CloudStore } from "./CloudStore";
export const CloudContext = createContext<{
  store: CloudStore;
  user: User;
  logout: () => Promise<void>;
} | null>(null);
export const useCloudSession = () => useContext(CloudContext);
export function useRemoteStored<T>(
  key: string,
  initial: T,
  normalize: (value: T) => T,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const session = useContext(CloudContext);
  if (!session) throw new Error("O banco exige uma sessão autorizada.");
  const id = cloudKey(key),
    kind = cloudKeys[id];
  const fallback = useRef<T>(
    kind === "array" ? ([] as T) : kind === "map" ? ({} as T) : initial,
  );
  const raw = useSyncExternalStore(
    session.store.subscribe,
    () => session.store.values.get(id) ?? fallback.current,
  );
  const value = useMemo(() => normalize(raw as T), [raw]);
  const setter = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      const current = normalize(
        (session.store.values.get(id) ?? fallback.current) as T,
      );
      session.store.change(
        id,
        typeof next === "function" ? (next as (value: T) => T)(current) : next,
      );
    },
    [session.store, id],
  );
  return [value, setter] as const;
}
