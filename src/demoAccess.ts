// Apenas demonstração local: não substitui autenticação/autorização no servidor.
export type DemoCredential = { salt: string; hash: string };
const hex = (buffer: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
const bytes = (value: string) =>
  Uint8Array.from(value.match(/.{2}/g) || [], (pair) =>
    Number.parseInt(pair, 16),
  );
async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: Uint8Array.from(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
export async function createDemoCredential(
  password: string,
): Promise<DemoCredential> {
  if (password.length < 6 || password.length > 128)
    throw new Error("Use de 6 a 128 caracteres na senha de demonstração.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: await derive(password, salt) };
}
export async function verifyDemoCredential(
  password: string,
  credential: DemoCredential,
) {
  return (await derive(password, bytes(credential.salt))) === credential.hash;
}
