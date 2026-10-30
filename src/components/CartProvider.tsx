"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// O carrinho guarda só REFERÊNCIAS (ids e quantidades). Preços, nomes e estoque são
// recalculados no servidor em /api/cart/price e no checkout — o navegador nunca decide valores.
export type CartConfig = {
  templateId: string; beadId: string; extraBeadId?: string; spacerId: string; crossId: string;
  medalId?: string; charmIds: string[]; finishId?: string; packagingId?: string;
};
export type LocalItem =
  | { key: string; type: "READY"; productId: string; qty: number }
  | { key: string; type: "CUSTOM"; config: CartConfig; qty: number };

type Ctx = {
  items: LocalItem[];
  count: number;
  ready: boolean;
  bump: number; // incrementa a cada adição (dispara animação do ícone)
  addReady: (productId: string, qty?: number) => void;
  addCustom: (config: CartConfig, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "sm-cart-v1";
const uid = () => Math.random().toString(36).slice(2, 10);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LocalItem[]>([]);
  const [ready, setReady] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignora */ }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) try { setItems(JSON.parse(e.newValue)); } catch { /* ignora */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignora */ }
  }, [items, ready]);

  const addReady = useCallback((productId: string, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.type === "READY" && i.productId === productId);
      if (found) return cur.map((i) => (i === found ? { ...found, qty: Math.min(20, found.qty + qty) } : i));
      return [...cur, { key: uid(), type: "READY", productId, qty }];
    });
    setBump((b) => b + 1);
  }, []);

  const addCustom = useCallback((config: CartConfig, qty = 1) => {
    setItems((cur) => [...cur, { key: uid(), type: "CUSTOM", config, qty }]);
    setBump((b) => b + 1);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.type === "READY" ? 20 : 10, qty)) } : i)));
  }, []);
  const remove = useCallback((key: string) => setItems((cur) => cur.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Ctx>(
    () => ({ items, count: items.reduce((a, i) => a + i.qty, 0), ready, bump, addReady, addCustom, setQty, remove, clear }),
    [items, ready, bump, addReady, addCustom, setQty, remove, clear],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}

/** Converte o carrinho local para o formato que a API valida. */
export const toApiItems = (items: LocalItem[]) =>
  items.map((i) => (i.type === "READY" ? { type: "READY" as const, productId: i.productId, qty: i.qty } : { type: "CUSTOM" as const, config: i.config, qty: i.qty }));
