type InstanceEnv = Record<string, string | undefined>;
export function readInstance(env: InstanceEnv) {
  const id = (env.VITE_INSTANCE_ID || "demo").trim();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(id))
    throw new Error(
      "VITE_INSTANCE_ID deve conter apenas letras minúsculas, números e hífens (até 63 caracteres).",
    );
  return {
    id,
    name: env.VITE_ESTABLISHMENT_NAME?.trim() || "Meu estabelecimento",
    domain: env.VITE_INSTANCE_DOMAIN?.trim() || "",
    // Public Web SDK configuration; authorization is enforced by Firestore rules.
    firebase: {
      apiKey: env.VITE_FIREBASE_API_KEY || "",
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: env.VITE_FIREBASE_PROJECT_ID || "",
      appId: env.VITE_FIREBASE_APP_ID || "",
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    },
    dataMode:
      env.VITE_DATA_MODE === "firebase"
        ? ("firebase" as const)
        : ("demo-local" as const),
    adminEmail: env.VITE_ADMIN_EMAIL?.trim().toLowerCase() || "",
  };
}
export function instanceStorageKey(key: string, id: string) {
  // Retain existing demonstration data when no instance has been configured.
  return id === "demo" ? key : `${id}:${key}`;
}
export const instance = readInstance(import.meta.env ?? {});
export const storageKey = (key: string) => instanceStorageKey(key, instance.id);
