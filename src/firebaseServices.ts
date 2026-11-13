import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { instance } from "./instance";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
export function firebaseOptions(
  config: typeof instance.firebase,
): FirebaseOptions {
  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  )
    throw new Error(
      "Preencha a configuração Web do projeto Firebase em .env.local antes de iniciar os serviços.",
    );
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId))
    throw new Error("Informe um ID de projeto Firebase válido.");
  return { ...config };
}
export type FirebaseServices = { app: FirebaseApp; auth: Auth; db: Firestore };
let pending: Promise<FirebaseServices> | undefined;
/** Initializes SDK clients. Provisioning and authorization are managed separately. */
export async function getFirebaseServices(): Promise<FirebaseServices> {
  if (!pending) {
    pending = (async () => {
      const config = firebaseOptions(instance.firebase);
      const { initializeApp, getApps } = await import("firebase/app");
      const existing = getApps().find((app) => app.name === instance.id);
      if (existing && existing.options.projectId !== config.projectId)
        throw new Error(
          "O aplicativo Firebase existente pertence a outro projeto.",
        );
      const app = existing ?? initializeApp(config, instance.id);
      return { app, auth: getAuth(app), db: getFirestore(app) };
    })().catch((error) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}
