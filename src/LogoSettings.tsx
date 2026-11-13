import { instance } from "./instance";
import { useState, type ChangeEvent } from "react";
export const MAX_LOGO_FILE = 2 * 1024 * 1024;
export function validateLogoFile(file: Pick<File, "size" | "type">) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Escolha uma imagem PNG, JPEG ou WebP.");
  if (file.size > MAX_LOGO_FILE) throw new Error("A imagem deve ter até 2 MB.");
}
export async function prepareLogo(file: File): Promise<string> {
  validateLogoFile(file);
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("A imagem está inválida ou não é suportada."));
    img.src = original;
  });
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Não foi possível processar a imagem neste navegador.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL("image/webp", 0.9);
  if (result.length > 700000)
    throw new Error(
      "A imagem continua muito grande. Escolha uma logo mais simples.",
    );
  return result;
}
export default function LogoSettings({
  logo,
  name,
  onSave,
}: {
  logo: string;
  name: string;
  onSave: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onSave(await prepareLogo(file));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="logo-settings">
      <h3>Logo na tela de acesso</h3>
      <p>
        PNG, JPEG ou WebP, até 2 MB. A imagem é ajustada para até 512 px e
        {instance.dataMode === "firebase"
          ? "salva no banco do estabelecimento."
          : "armazenada apenas neste navegador."}
      </p>
      {logo && (
        <div className="logo-preview">
          <img src={logo} alt={`Logo de ${name}`} />
        </div>
      )}
      <label>
        Escolher logo
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={choose}
        />
      </label>
      {busy && <p role="status">Preparando imagem…</p>}
      {logo && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            try {
              onSave("");
              setError("");
            } catch (cause) {
              setError((cause as Error).message);
            }
          }}
        >
          Remover logo
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <small>
        Sem logo, a tela de acesso usa as iniciais do estabelecimento.
      </small>
    </section>
  );
}
