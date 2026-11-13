export type CloudKind = "array" | "scalar" | "map";
export const cloudKeys: Record<string, CloudKind> = {
  "establishment-name": "scalar",
  presence: "array",
  appearance: "scalar",
  logo: "scalar",
  "return-days": "scalar",
  appointments: "array",
  clients: "array",
  procedures: "array",
  campaigns: "array",
  "work-schedules": "array",
  "professional-records": "array",
  message: "scalar",
  "appointment-message": "scalar",
  "appointment-reminders": "map",
};
export const cloudKey = (key: string) => key.replace(/^navalha-v01-/, "");
export type StoredDocument = {
  value: unknown;
  position: number;
  revision: number;
};
export type DocumentMap = Map<string, StoredDocument>;
export function cleanCloudValue(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, item) =>
      key === "credential" ? undefined : item,
    ),
  );
}
export function documentsFor(kind: CloudKind, value: unknown): DocumentMap {
  if (kind === "scalar")
    return new Map([
      ["value", { value: cleanCloudValue(value), position: 0, revision: 0 }],
    ]);
  const entries =
    kind === "array"
      ? (value as unknown[]).map(
          (item, index) =>
            [String((item as { id?: unknown })?.id ?? index), item] as const,
        )
      : Object.entries(value as Record<string, unknown>);
  return new Map(
    entries.map(([id, item], index) => [
      encodeURIComponent(id),
      { value: cleanCloudValue(item), position: index, revision: 0 },
    ]),
  );
}
export function materialize(kind: CloudKind, docs: DocumentMap) {
  const entries = [...docs.entries()].sort(
    (a, b) => a[1].position - b[1].position,
  );
  if (kind === "scalar") return docs.get("value")?.value;
  if (kind === "array") return entries.map(([, entry]) => entry.value);
  return Object.fromEntries(
    entries.map(([id, entry]) => [decodeURIComponent(id), entry.value]),
  );
}
export type CloudChange = {
  id: string;
  before?: StoredDocument;
  after?: StoredDocument;
};
export function cloudDiff(
  before: DocumentMap,
  after: DocumentMap,
): CloudChange[] {
  const ids = new Set([...before.keys(), ...after.keys()]);
  return [...ids]
    .filter(
      (id) =>
        JSON.stringify(before.get(id)?.value) !==
          JSON.stringify(after.get(id)?.value) ||
        before.get(id)?.position !== after.get(id)?.position,
    )
    .map((id) => ({ id, before: before.get(id), after: after.get(id) }));
}
