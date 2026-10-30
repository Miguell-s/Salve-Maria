"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { FavoriteButton } from "./FavoriteButton";

export function BuyBox({ productId, available }: { productId: string; available: number }) {
  const { addReady } = useCart();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const max = Math.min(20, Math.max(available, 1));

  function add() {
    addReady(productId, qty);
    setDone(true);
    window.setTimeout(() => setDone(false), 2500);
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border-2 border-line bg-card" role="group" aria-label="Quantidade">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir" className="grid h-11 w-11 place-items-center"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-extrabold" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Aumentar" className="grid h-11 w-11 place-items-center"><Plus className="h-4 w-4" /></button>
        </div>
        <button type="button" onClick={add} disabled={available <= 0} className="btn btn-yellow flex-1 px-8 py-3.5 text-base">
          {available <= 0 ? "Esgotado" : done ? <><Check className="h-5 w-5" /> Adicionado!</> : <><ShoppingBag className="h-5 w-5" /> Adicionar ao carrinho</>}
        </button>
        <FavoriteButton id={productId} className="border-2 border-line" />
      </div>
      {done && <Link href="/carrinho" className="inline-block font-bold text-brand-deep underline">Ver carrinho e finalizar →</Link>}
    </div>
  );
}
