import { useEffect, useState, type FormEvent } from "react";
import {
  ProfessionalApiError,
  professionalApiUrl,
  professionalRequest,
} from "./professionalAccess";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type Auth,
} from "firebase/auth";
import { instance } from "./instance";
export default function CloudLogin({
  auth,
  branding,
  blocked,
  onProfessional,
}: {
  auth: Auth;
  branding: { name?: string; logo?: string };
  blocked: string;
  onProfessional: (token: string) => void;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<"admin" | "professional">("admin"),
    [professionalEnabled, setProfessionalEnabled] = useState(false);
  useEffect(() => {
    if (!professionalApiUrl) return;
    let active = true;
    professionalRequest<{ enabled: boolean }>("/public/access")
      .then((result) => {
        if (active) setProfessionalEnabled(result.enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (profile === "professional") {
        const session = await professionalRequest<{ token: string }>(
          "/professional/login",
          undefined,
          { username: email.trim(), password },
        );
        setPassword("");
        onProfessional(session.token);
      } else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      if (
        error instanceof ProfessionalApiError &&
        [429, 503].includes(error.status)
      ) {
        setError(error.message);
        return;
      }
      setError(
        profile === "professional"
          ? "Não foi possível entrar. Confira usuário e senha. Se o acesso estiver desabilitado ou você esqueceu a senha, procure o administrador."
          : "Não foi possível entrar. Confira e-mail e senha e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    setError("");
    setNotice("");
    if (email.trim().toLowerCase() !== instance.adminEmail) {
      setError("Informe o e-mail do administrador no campo acima.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(
        "Se houver uma conta administrativa para esse e-mail, você receberá um link para definir ou recuperar a senha. Confira também o spam.",
      );
    } catch {
      setError(
        "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.",
      );
    } finally {
      setBusy(false);
    }
  }
  const name = branding.name || instance.name;
  return (
    <main className="cloud-login">
      <section className="panel cloud-login-box">
        {branding.logo && (
          <img
            className="cloud-login-logo"
            src={branding.logo}
            alt={`Logo de ${name}`}
          />
        )}
        <h1>{name}</h1>
        <p>
          {profile === "admin"
            ? "Acesso do administrador"
            : "Acesso do profissional"}
        </p>
        {professionalEnabled && (
          <div
            className="login-choice"
            role="group"
            aria-label="Perfil de acesso"
          >
            {(["admin", "professional"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="secondary"
                aria-pressed={profile === value}
                disabled={busy}
                onClick={() => {
                  setProfile(value);
                  setEmail("");
                  setPassword("");
                  setError("");
                  setNotice("");
                }}
              >
                {value === "admin" ? "Administrador" : "Profissional"}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={login}>
          <label>
            {profile === "admin" ? "E-mail" : "Usuário"}
            <input
              type={profile === "admin" ? "email" : "text"}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              maxLength={128}
            />
          </label>
          <button className="primary wide" disabled={busy}>
            {busy ? "Aguarde…" : "Entrar"}
          </button>
        </form>
        {profile === "admin" && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={recover}
          >
            Primeiro acesso ou esqueci minha senha
          </button>
        )}
        {(error || blocked) && (
          <p role="alert" className="form-error">
            {error || blocked}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <a href="/manual.html" target="_blank" rel="noopener noreferrer">
          Manual do usuário
        </a>
        <small>
          {profile === "professional"
            ? "Somente o administrador pode redefinir sua senha. O acesso é restrito à sua agenda e às informações autorizadas."
            : "Dados protegidos por autorização. Não compartilhe sua senha administrativa."}
        </small>
      </section>
    </main>
  );
}
