"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import clsx from "clsx";

const KEY = "sm-favs-v1";
const EVT = "sm-favs-changed";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const toggle = (id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-100);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignora */ }
    window.dispatchEvent(new Event(EVT));
  };
  return { ids, toggle };
}

export function FavoriteButton({ id, className }: { id: string; className?: string }) {
  const { ids, toggle } = useFavorites();
  const on = ids.includes(id);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}
      aria-pressed={on} aria-label={on ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={clsx("grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow-soft transition active:scale-90", className)}>
      <Heart className={clsx("h-5 w-5 transition", on ? "scale-110 fill-pink text-pink" : "text-fg-2")} />
    </button>
  );
}

/** Lista só os favoritos na página /loja?favoritos=1 (filtra os cartões já renderizados). */
export function FavoritesOnly({ children }: { children: (ids: string[]) => React.ReactNode }) {
  const { ids } = useFavorites();
  return <>{children(ids)}</>;
}
