"use client";

import { useEffect, useState } from "react";

type ThemeMode = "theme-dark" | "theme-light";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("theme-dark");

  useEffect(() => {
    const root = document.documentElement;
    const hasLight = root.classList.contains("theme-light");
    setTheme(hasLight ? "theme-light" : "theme-dark");
  }, []);

  const applyTheme = (next: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(next);
    localStorage.setItem("theme", next === "theme-light" ? "light" : "dark");
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === "theme-dark" ? "theme-light" : "theme-dark")}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50 ${className}`}
      aria-label="Toggle theme"
    >
      <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-300" />
      {theme === "theme-dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    </button>
  );
}
