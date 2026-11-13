"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle({ className }) {
  const [theme, setTheme] = useState(null);
  useEffect(() => setTheme(currentTheme()), []);

  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("tn-theme", next); } catch { /* ignore */ }
    setTheme(next);
  };

  return (
    <button onClick={toggle} className={cn("size-9 grid place-items-center rounded-lg text-muted hover:text-paper hover:bg-ink-3", className)}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "light" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
    </button>
  );
}
