import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useCloudSession } from "./CloudContext";
export default function CloudDataBoundary({
  keys,
  children,
  fallback,
}: {
  keys: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const session = useCloudSession(),
    store = session?.store;
  const signature = keys.join("|");
  const state = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    () =>
      !store ? "ready" : store.loadError(keys) || (store.isLoaded(keys) ? "ready" : "loading"),
  );
  useEffect(() => {
    store?.ensure(keys);
  }, [store, signature]);
  if (state === "ready") return <>{children}</>;
  if (state !== "loading")
    return (
      <div className="cloud-section-loading" role="alert">
        <p>{state}</p>
        <button className="secondary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  return (
    <>
      {fallback ?? (
        <div className="cloud-section-loading" role="status">
          Carregando dados desta área…
        </div>
      )}
    </>
  );
}
