export const accentColors = [
  {
    id: "blue",
    name: "Azul",
    fill: "#0869c8",
    text: "#ffffff",
    light: "#0869c8",
    dark: "#83bcff",
  },
  {
    id: "pink",
    name: "Rosa",
    fill: "#be185d",
    text: "#ffffff",
    light: "#be185d",
    dark: "#f9a8d4",
  },
  {
    id: "purple",
    name: "Roxo",
    fill: "#7e22ce",
    text: "#ffffff",
    light: "#7e22ce",
    dark: "#d8b4fe",
  },
  {
    id: "black",
    name: "Preto",
    fill: "#191919",
    text: "#ffffff",
    light: "#191919",
    dark: "#eeeeee",
  },
  {
    id: "white",
    name: "Branco",
    fill: "#ffffff",
    text: "#242629",
    light: "#424951",
    dark: "#ffffff",
  },
  {
    id: "gray",
    name: "Cinza",
    fill: "#525965",
    text: "#ffffff",
    light: "#525965",
    dark: "#cbd0d8",
  },
  {
    id: "brown",
    name: "Marrom",
    fill: "#795038",
    text: "#ffffff",
    light: "#795038",
    dark: "#deb99e",
  },
  {
    id: "orange",
    name: "Laranja",
    fill: "#b94708",
    text: "#ffffff",
    light: "#b94708",
    dark: "#ffb789",
  },
  {
    id: "red",
    name: "Vermelho",
    fill: "#b91c1c",
    text: "#ffffff",
    light: "#b91c1c",
    dark: "#fca5a5",
  },
  {
    id: "green",
    name: "Verde",
    fill: "#15803d",
    text: "#ffffff",
    light: "#15803d",
    dark: "#86efac",
  },
  {
    id: "yellow",
    name: "Amarelo",
    fill: "#facc15",
    text: "#242629",
    light: "#806000",
    dark: "#fde047",
  },
  {
    id: "dark-turquoise",
    name: "Turquesa escuro",
    fill: "#0f6666",
    text: "#ffffff",
    light: "#0f6666",
    dark: "#7cdddd",
  },
] as const;
export type Appearance = {
  mode: "light" | "dark";
  accent: (typeof accentColors)[number]["id"];
};
export function normalizeAppearance(value: unknown): Appearance {
  const saved = value as Partial<Appearance> | null;
  return {
    mode: saved?.mode === "dark" ? "dark" : "light",
    accent: accentColors.some((color) => color.id === saved?.accent)
      ? saved!.accent!
      : "blue",
  };
}
export function applyAppearance(value: Appearance) {
  const accent = accentColors.find((color) => color.id === value.accent)!;
  const root = document.documentElement;
  root.dataset.theme = value.mode;
  root.style.setProperty("--button-bg", accent.fill);
  root.style.setProperty("--button-text", accent.text);
  root.style.setProperty("--blue", accent[value.mode]);
}
