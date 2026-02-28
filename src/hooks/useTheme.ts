"use client";

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "developer-soundtrack-theme";

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return null;
}

// Subscribe to system color scheme changes
function subscribeToColorScheme(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemThemeSnapshot(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

export function useThemeProvider(): ThemeContextValue {
  // User's explicit preference (null = follow system)
  const [userPreference, setUserPreference] = useState<Theme | null>(getStoredTheme);

  // Track system preference
  const systemTheme = useSyncExternalStore(
    subscribeToColorScheme,
    getSystemThemeSnapshot,
    getServerSnapshot,
  );

  // Effective theme: user preference wins, otherwise system
  const theme: Theme = userPreference ?? systemTheme;

  // Apply the theme class whenever effective theme changes
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setUserPreference(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setUserPreference((prev) => {
      const current = prev ?? (typeof window !== "undefined" ? getSystemThemeSnapshot() : "dark");
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
