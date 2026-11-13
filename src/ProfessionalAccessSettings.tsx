import { useEffect, useState, type FormEvent } from "react";
import { useCloudSession } from "./CloudContext";
import { professionalApiUrl, professionalRequest } from "./professionalAccess";
export default function ProfessionalAccessSettings({
  id,
  active,
}: {
  id: number;
  active: boolean;
}) {
  const session = useCloudSession();
  const [username, setUsername] = useState(""),
    [configured, setConfigured] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!professionalApiUrl) {
      setLoading(false);
      return;
    }
    if (!session?.user) return;
    setLoading(true);
    setError("");
    session.user
      .getIdToken()
      .then((token) =>
        professionalRequest<{ username: string; configured: boolean }>(
          `/admin/professionals/${id}/access`,
          token,
        ),
      )
      .then((result) => {
        if (!cancelled) {
          setUsername(result.username);
          setConfigured(result.configured);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, session?.user]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !session?.user) return;
    const form = event.currentTarget,
      data = new FormData(form),
      password = String(data.get("password") || "");
    setError("");
    setNotice("");
    if (password !== String(data.get("confirmation") || "")) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      await professionalRequest(
        `/admin/professionals/${id}/access`,
        await session.user.getIdToken(),
        { username, password },
      );
      form.reset();
      setConfigured(true);
      setNotice(
        "Acesso salvo. A senha anterior e as sessões anteriores foram invalidadas.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!professionalApiUrl)
    return (
      <p className="notice">
        O acesso por usuário e senha está preparado, mas aguarda a conexão do
        serviço seguro. Nenhuma senha será salva enquanto o serviço não estiver
        disponível.
      </p>
    );
  if (loading) return <p role="status">Carregando acesso…</p>;
  return (
    <>
      <p>
        Somente o administrador define a senha. O profissional entra com usuário
        e senha e não possui recuperação por e-mail. A senha permanece até uma
        nova redefinição.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <form className="professional-access-form" onSubmit={save}>
        <label>
          Usuário de acesso
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9][a-z0-9._\-]{2,31}"
            disabled={busy || !active}
          />
        </label>
        <small>
          De 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado.
        </small>
        <label>
          {configured ? "Nova senha" : "Senha inicial"}
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            disabled={busy || !active}
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            name="confirmation"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            disabled={busy || !active}
          />
        </label>
        <small>
          Use uma senha de pelo menos 12 caracteres. Ela não é exibida novamente
          após salvar.
        </small>
        {!active && <p>Habilite o profissional para configurar seu acesso.</p>}
        <button className="primary" disabled={busy || !active}>
          {busy ? "Salvando…" : configured ? "Redefinir senha" : "Criar acesso"}
        </button>
      </form>
      {configured && (
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            if (!session?.user) return;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              await professionalRequest(
                `/admin/professionals/${id}/access`,
                await session.user.getIdToken(),
                undefined,
                "DELETE",
              );
              setNotice(
                "Acesso suspenso e sessões anteriores invalidadas. Para reativar, defina uma nova senha.",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Suspender acesso
        </button>
      )}
    </>
  );
}
