"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("cbt-theme") as Theme | null;
    const initial = stored === "dark" ? "dark" : "light";
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    window.localStorage.setItem("cbt-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "light" as Theme, setTheme: () => undefined };
  }
  return context;
}
