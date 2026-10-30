"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    // sincroniza abas abertas e acompanha o sistema enquanto o visitante não escolheu manualmente
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sm-theme" && (e.newValue === "light" || e.newValue === "dark")) apply(e.newValue, false);
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => {
      if (!localStorage.getItem("sm-theme")) apply(mq.matches ? "dark" : "light", false);
    };
    window.addEventListener("storage", onStorage);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("storage", onStorage);
      mq.removeEventListener("change", onMq);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(next: "light" | "dark", persist: boolean) {
    const root = document.documentElement;
    root.classList.add("theme-switching"); // transição suave só durante a troca
    root.setAttribute("data-theme", next);
    if (persist) {
      try { localStorage.setItem("sm-theme", next); } catch { /* modo privado */ }
    }
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-switching"), 450);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => apply(dark ? "light" : "dark", true)}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className={`relative grid h-11 w-11 place-items-center rounded-full border-2 border-line bg-card text-fg transition hover:border-brand active:scale-95 ${className}`}
    >
      <Sun className={`absolute h-5 w-5 text-yellow transition-all duration-300 ${dark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"}`} aria-hidden />
      <Moon className={`absolute h-5 w-5 text-purple transition-all duration-300 ${dark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`} aria-hidden />
    </button>
  );
}
