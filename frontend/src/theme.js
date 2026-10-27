import { useCallback, useEffect, useState } from "react";

const KEY = "fittmm_theme";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/** Applies the saved theme (or the system one) before React renders. */
export function initTheme() {
  applyTheme(readStored() || (systemPrefersDark() ? "dark" : "light"));
}

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => document.documentElement.dataset.theme || "light"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch (_) {}
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  return { theme, isDark: theme === "dark", setTheme, toggle };
}
