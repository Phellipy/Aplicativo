export function instanceFiles({ id, name, domain, project }) {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(id || "") || id === "demo")
    throw new Error(
      "Informe --id exclusivo, com letras minúsculas, números e hífens; demo é reservado.",
    );
  if (!name?.trim() || name.trim().length > 80 || /[\r\n]/.test(name))
    throw new Error(
      "Informe --name com 1 a 80 caracteres, sem quebras de linha.",
    );
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project || ""))
    throw new Error(
      "Informe --project com o ID do projeto Firebase (6 a 30 caracteres).",
    );
  let host;
  try {
    const url = new URL(`https://${domain}`);
    if (
      !domain ||
      url.hostname !== domain ||
      url.port ||
      url.pathname !== "/" ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)
    )
      throw new Error();
    host = url.hostname;
  } catch {
    throw new Error(
      "Informe --domain apenas com o domínio, em minúsculas, sem https://, porta ou caminho.",
    );
  }
  const values = {
    VITE_INSTANCE_ID: id,
    VITE_ESTABLISHMENT_NAME: name.trim(),
    VITE_INSTANCE_DOMAIN: host,
    VITE_FIREBASE_PROJECT_ID: project,
    VITE_FIREBASE_API_KEY: "",
    VITE_FIREBASE_AUTH_DOMAIN: "",
    VITE_FIREBASE_APP_ID: "",
    VITE_FIREBASE_STORAGE_BUCKET: "",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "",
  };
  return {
    ".env.local":
      "# Configuração local da instância. Firebase ainda não conectado na v0.1.\n" +
      Object.entries(values)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("\n") +
      "\n",
    ".firebaserc":
      JSON.stringify({ projects: { default: project } }, null, 2) + "\n",
  };
}
