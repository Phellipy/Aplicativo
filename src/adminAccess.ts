import {
  createDemoCredential,
  verifyDemoCredential,
  type DemoCredential,
} from "./demoAccess";
export type DemoAdminAccount = { email: string; credential: DemoCredential };
export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}
export async function createDemoAdmin(
  email: string,
  password: string,
  confirmation: string,
): Promise<DemoAdminAccount> {
  const normalized = normalizeAdminEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    throw new Error("Informe um e-mail válido para o administrador.");
  if (password !== confirmation)
    throw new Error("A confirmação da senha não confere.");
  return {
    email: normalized,
    credential: await createDemoCredential(password),
  };
}
export async function verifyDemoAdmin(
  account: DemoAdminAccount,
  email: string,
  password: string,
) {
  return (
    normalizeAdminEmail(email) === account.email &&
    (await verifyDemoCredential(password, account.credential))
  );
}
// Future integration boundary: implement with Firebase Authentication + server-side
// administrator authorization. Never put passwords or reset tokens in Firestore.
export interface AdminAuthService {
  signIn(email: string, password: string): Promise<void>;
  requestPasswordRecovery(email: string): Promise<void>;
  signOut(): Promise<void>;
}
