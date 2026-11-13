import type { Client } from "./domain";
export type ImportedContact = { name: string; phone: string };
export const phoneKey = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (/^(\+|00)/.test(phone.trim())) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};
export function isMobilePhone(phone: string, declaredMobile = false) {
  const key = phoneKey(phone);
  if (key.startsWith("55")) return /^55\d{2}9\d{8}$/.test(key);
  return (
    declaredMobile &&
    /^(\+|00)/.test(phone.trim()) &&
    key.length >= 10 &&
    key.length <= 15
  );
}
const unescape = (value: string) =>
  value
    .replace(/\\[nN]/g, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
function propertyValue(header: string, value: string) {
  if (/ENCODING=QUOTED-PRINTABLE/i.test(header)) {
    const bytes: number[] = [];
    for (let i = 0; i < value.length; i++) {
      if (
        value[i] === "=" &&
        /^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))
      ) {
        bytes.push(parseInt(value.slice(i + 1, i + 3), 16));
        i += 2;
      } else bytes.push(...new TextEncoder().encode(value[i]));
    }
    value = new TextDecoder(
      /CHARSET=(ISO-8859-1|WINDOWS-1252)/i.test(header)
        ? "windows-1252"
        : "utf-8",
    ).decode(new Uint8Array(bytes));
  }
  return unescape(value);
}
export function parseVCard(text: string): ImportedContact[] {
  if (new TextEncoder().encode(text).length > 20_000_000)
    throw new Error("O arquivo deve ter até 20 MB.");
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/=\n(?=[^\n])/g, "")
    .replace(/\n[ \t]/g, "")
    .split("\n");
  const result: ImportedContact[] = [];
  let cardCount = 0;
  let current: {
    name: string;
    fallback: string;
    phones: { value: string; mobile: boolean }[];
  } | null = null;
  for (const line of lines) {
    if (line.trim().toUpperCase() === "BEGIN:VCARD") {
      if (++cardCount > 10000)
        throw new Error("Importe arquivos com até 10.000 contatos por vez.");
      current = { name: "", fallback: "", phones: [] };
      continue;
    }
    if (line.trim().toUpperCase() === "END:VCARD") {
      if (current) {
        const phone =
          current.phones
            .filter((phone) => isMobilePhone(phone.value, phone.mobile))
            .sort((a, b) => Number(b.mobile) - Number(a.mobile))[0]?.value ??
          "";
        const name = current.name || current.fallback;
        if (name && phone) result.push({ name: name.slice(0, 80), phone });
        if (result.length > 10000)
          throw new Error("Importe arquivos com até 10.000 contatos por vez.");
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const header = line.slice(0, colon),
      raw = line.slice(colon + 1);
    const key = header.split(";")[0].split(".").pop()?.toUpperCase();
    if (key === "FN" && !/ENCODING=B/i.test(header))
      current.name = propertyValue(header, raw);
    if (key === "N")
      current.fallback = raw
        .split(/(?<!\\);/)
        .slice(0, 3)
        .reverse()
        .map((part) => propertyValue(header, part))
        .filter(Boolean)
        .join(" ");
    if (key === "TEL") {
      const value = propertyValue(header, raw).replace(/^tel:/i, "");
      if (
        /^\+?[\d\s().-]+$/.test(value) &&
        phoneKey(value).length >= 10 &&
        phoneKey(value).length <= 15
      )
        current.phones.push({ value, mobile: /CELL|MOBILE/i.test(header) });
    }
  }
  if (!result.length)
    throw new Error(
      "Nenhum contato com nome e celular válido foi encontrado. Números fixos são ignorados. Escolha um arquivo vCard (.vcf) com números de celular e DDD.",
    );
  return result;
}
export function contactImportPreview(
  contacts: ImportedContact[],
  clients: Client[],
) {
  const phones = new Set(
    clients.map((client) => phoneKey(client.phone)).filter(Boolean),
  );
  const importedIds = new Set(clients.map((client) => client.id));
  const names = new Set(
    clients.map((client) => client.name.trim().toLocaleLowerCase("pt-BR")),
  );
  return contacts.map((contact) => {
    const key = phoneKey(contact.phone),
      name = contact.name.trim().toLocaleLowerCase("pt-BR");
    const reason = !key
      ? "Sem telefone válido"
      : phones.has(key)
        ? "Telefone já cadastrado ou repetido"
        : importedIds.has(-Number(key))
          ? "Contato já importado; confira o cadastro alterado"
          : names.has(name)
            ? "Nome já cadastrado ou repetido"
            : "";
    phones.add(key);
    names.add(name);
    return { ...contact, reason };
  });
}
export function importedClients(
  contacts: ImportedContact[],
  clients: Client[],
): Client[] {
  if (contacts.length > 10000)
    throw new Error("Selecione até 10.000 contatos por importação.");
  const valid = contactImportPreview(contacts, clients);
  if (valid.some((contact) => contact.reason))
    throw new Error(
      "A lista de clientes mudou ou há contatos inválidos. Revise a prévia novamente.",
    );
  return valid.map((contact) => ({
    // Stable numeric identity also makes simultaneous imports target one document.
    id: -Number(phoneKey(contact.phone)),
    name: contact.name,
    phone: contact.phone,
    lastVisit: "",
    consent: false,
  }));
}

export async function importContactBatches(
  contacts: ImportedContact[],
  getClients: () => Client[],
  save: (added: Client[]) => Promise<void>,
  onProgress: (done: number, total: number) => void,
) {
  if (contacts.length > 10000)
    throw new Error("Selecione até 10.000 contatos por importação.");
  let imported = 0;
  for (let offset = 0; offset < contacts.length; offset += 200) {
    const current = getClients();
    const valid = contactImportPreview(
      contacts.slice(offset, offset + 200),
      current,
    ).filter((row) => !row.reason);
    const added = importedClients(valid, current);
    if (added.length) {
      await save(added);
      imported += added.length;
    }
    onProgress(Math.min(offset + 200, contacts.length), contacts.length);
  }
  return imported;
}
