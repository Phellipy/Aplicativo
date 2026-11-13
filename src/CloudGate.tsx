import { instance } from "./instance";
import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseServices, type FirebaseServices } from "./firebaseServices";
import { CloudStore } from "./CloudStore";
import { CloudContext } from "./CloudContext";
import CloudLogin from "./CloudLogin";
import ProfessionalWorkspace from "./ProfessionalWorkspace";
import { professionalSessionKey } from "./professionalAccess";
import { applyAppearance, normalizeAppearance } from "./appearance";
function Workspace({
  services,
  user,
  children,
}: {
  services: FirebaseServices;
  user: User;
  children: ReactNode;
}) {
  const [store] = useState(
    () => new CloudStore(services.db, () => setTick((value) => value + 1)),
  );
  const [, setTick] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    store.start(() => setReady(true), setError);
    return () => store.stop();
  }, [store]);
  if (error)
    return (
      <main className="cloud-loading">
        <h1>Não foi possível carregar o banco</h1>
        <p role="alert">{error}</p>
        <button className="primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
        <button className="secondary" onClick={() => signOut(services.auth)}>
          Sair
        </button>
      </main>
    );
  if (!ready)
    return (
      <main className="cloud-loading" role="status">
        Carregando dados do estabelecimento…
      </main>
    );
  return (
    <CloudContext.Provider
      value={{ store, user, logout: () => signOut(services.auth) }}
    >
      {children}
      <div
        className={`cloud-save-status ${store.error ? "has-error" : ""}`}
        role={store.error ? "alert" : "status"}
      >
        {store.error ? (
          <>
            {store.error}{" "}
            <button onClick={() => window.location.reload()}>
              Recarregar dados
            </button>
          </>
        ) : store.pending ? (
          "Salvando no Firebase…"
        ) : (
          "Dados sincronizados com o Firebase"
        )}
      </div>
    </CloudContext.Provider>
  );
}
export default function CloudGate({ children }: { children: ReactNode }) {
  const [staffToken, setStaffToken] = useState(() => {
    try {
      return sessionStorage.getItem(professionalSessionKey) || "";
    } catch {
      return "";
    }
  });
  const staffLogin = (token: string) => {
    try {
      sessionStorage.setItem(professionalSessionKey, token);
    } catch {}
    setStaffToken(token);
  };
  const staffLogout = (message?: string) => {
    try {
      sessionStorage.removeItem(professionalSessionKey);
    } catch {}
    setStaffToken("");
    setError(message ?? "");
  };

  const [services, setServices] = useState<FirebaseServices | null>(null),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [authorized, setAuthorized] = useState(false),
    [error, setError] = useState("");
  const [branding, setBranding] = useState<{ name?: string; logo?: string }>(
    {},
  );
  useEffect(() => {
    let stopAuth = () => {},
      stopMember = () => {},
      stopBrand = () => {},
      cancelled = false;
    getFirebaseServices()
      .then((api) => {
        if (cancelled) return;
        setServices(api);
        stopBrand = onSnapshot(
          doc(api.db, "publicBranding", instance.id),
          (snapshot) => {
            const value = snapshot.data();
            setBranding(value ?? {});
            if (value?.appearance)
              applyAppearance(normalizeAppearance(value.appearance));
          },
          () => {},
        );
        stopAuth = onAuthStateChanged(api.auth, (current) => {
          stopMember();
          setAuthorized(false);
          setReady(false);
          setUser(current);
          if (!current) {
            setReady(true);
            return;
          }
          stopMember = onSnapshot(
            doc(api.db, "administrators", current.uid),
            (snapshot) => {
              const member = snapshot.data();
              if (
                member?.active &&
                member.role === "admin" &&
                member.email === current.email?.toLowerCase()
              ) {
                setAuthorized(true);
                setReady(true);
                setError("");
              } else {
                setError("Esta conta não está autorizada como administradora.");
                void signOut(api.auth);
              }
            },
            () => {
              setError("Não foi possível validar a autorização da conta.");
              void signOut(api.auth);
            },
          );
        });
      })
      .catch(() =>
        setError(
          "Não foi possível iniciar a conexão com o Firebase. Confira a configuração e tente novamente.",
        ),
      );
    return () => {
      cancelled = true;
      stopAuth();
      stopMember();
      stopBrand();
    };
  }, []);
  if (staffToken)
    return <ProfessionalWorkspace token={staffToken} onLogout={staffLogout} />;
  if (!services)
    return (
      <main className="cloud-loading" role="status">
        {error || "Conectando…"}
      </main>
    );
  if (!ready)
    return (
      <main className="cloud-loading" role="status">
        Validando acesso…
      </main>
    );
  if (!user || !authorized)
    return (
      <CloudLogin
        auth={services.auth}
        branding={branding}
        blocked={error}
        onProfessional={staffLogin}
      />
    );
  return (
    <Workspace key={user.uid} services={services} user={user}>
      {children}
    </Workspace>
  );
}
