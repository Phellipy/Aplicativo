import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  createDemoAdmin,
  verifyDemoAdmin,
  type DemoAdminAccount,
} from "./adminAccess";
export default function AdminLogin({
  account,
  onSetup,
  onLogin,
}: {
  account: DemoAdminAccount | null;
  onSetup: (account: DemoAdminAccount) => void;
  onLogin: () => void;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recover, setRecover] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!account) {
        onSetup(await createDemoAdmin(email, password, confirmation));
      } else if (!(await verifyDemoAdmin(account, email, password))) {
        throw new Error("E-mail ou senha do administrador incorretos.");
      }
      setPassword("");
      setConfirmation("");
      onLogin();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-login" aria-label="Acesso do administrador">
      <form onSubmit={submit}>
        {!account && (
          <p className="availability-note">
            Primeiro acesso neste navegador: cadastre o e-mail e uma senha
            demonstrativa do administrador. Use uma senha fictícia; este acesso
            local não protege os dados.
          </p>
        )}
        <label>
          E-mail do administrador
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          {account ? "Senha do administrador" : "Criar senha demonstrativa"}
          <input
            type="password"
            autoComplete={account ? "current-password" : "new-password"}
            minLength={6}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {!account && (
          <label>
            Confirmar senha
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={128}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary wide" disabled={busy}>
          {busy
            ? "Verificando…"
            : account
              ? "Entrar como administrador"
              : "Cadastrar acesso e entrar"}
          <ArrowUpRight size={18} />
        </button>
      </form>
      <button
        type="button"
        className="text-button"
        aria-expanded={recover}
        aria-controls="admin-recovery"
        onClick={() => setRecover(!recover)}
      >
        Esqueci a senha do administrador
      </button>
      {recover && (
        <div
          id="admin-recovery"
          className="notice admin-recovery"
          role="status"
        >
          <strong>Recuperação exclusiva do administrador</strong>
          <p>
            A recuperação por e-mail será feita pelo Firebase Authentication
            quando o projeto estiver conectado. Nenhum e-mail é enviado nesta
            versão local e não há recuperação automática da senha demonstrativa.
          </p>
          <p>
            As senhas dos profissionais continuam sendo redefinidas apenas pelo
            administrador.
          </p>
          <button type="button" className="secondary" disabled>
            Recuperação ainda não conectada
          </button>
        </div>
      )}
    </section>
  );
}
