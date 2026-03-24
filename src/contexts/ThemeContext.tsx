import React, { createContext, useContext, useEffect, useState } from "react";

type Palette = "salvia" | "noche" | "arena" | "lavanda" | "bruma";
type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  palette: Palette;
  setPalette: (palette: Palette) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<Palette>(() => {
    return (localStorage.getItem("flowday-palette") as Palette) || "salvia";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("flowday-theme") as Theme) || "auto";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-palette", palette);
    localStorage.setItem("flowday-palette", palette);
  }, [palette]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("flowday-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ palette, setPalette, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
