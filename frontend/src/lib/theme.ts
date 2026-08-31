export type AionTheme = "emerald" | "amber" | "mono";

const THEME_KEY = "aion-color-theme";
const themes: AionTheme[] = ["emerald", "amber", "mono"];

export function getAionTheme(): AionTheme {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return themes.includes(savedTheme as AionTheme) ? (savedTheme as AionTheme) : "emerald";
}

export function setAionTheme(theme: AionTheme): void {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.aionTheme = theme;
}

setAionTheme(getAionTheme());