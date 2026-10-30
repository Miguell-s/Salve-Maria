"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toApiItems, useCart } from "@/components/CartProvider";
import { RosaryIllustration } from "@/components/RosaryIllustration";
import { brl } from "@/lib/format";
import type { PricedCart } from "@/lib/cart";

type Priced = PricedCart & { shipping: { cents: number; label: string } | null; totalCents: number };

export default function Carrinho() {
  const { items, ready, setQty, remove } = useCart();
  const [data, setData] = useState<Priced | null>(null);
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) { setData(null); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch("/api/cart/price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: toApiItems(items), coupon: applied || undefined }) })
        .then((r) => r.json()).then(setData).finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [items, ready, applied]);

  if (ready && items.length === 0)
    return (
      <div className="container-x py-20 text-center">
        <RosaryIllustration className="mx-auto h-40 w-40" />
        <h1 className="mt-4 text-3xl">Seu carrinho está vazio</h1>
        <p className="mt-2 text-fg-2">Que tal montar um terço do seu jeitinho?</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/personalizar" className="btn btn-yellow">Criar meu terço</Link>
          <Link href="/loja" className="btn btn-ghost">Ver terços prontos</Link>
        </div>
      </div>
    );

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl">Carrinho</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const p = data?.items.find((x) => x.index === items.indexOf(it));
              return (
                <motion.li key={it.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="card p-4">
                  <div className="flex gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-bg-2">
                      {p?.image ? <Image src={p.image} alt="" fill sizes="96px" className="photo object-cover" /> : <RosaryIllustration className="h-full w-full p-2" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <div>
                          <h2 className="text-base">{p ? (p.slug ? <Link href={`/loja/${p.slug}`} className="hover:underline">{p.name}</Link> : p.name) : "…"}</h2>
                          {it.type === "CUSTOM" && <p className="text-xs text-fg-2">Personalizado por você</p>}
                        </div>
                        <button onClick={() => remove(it.key)} aria-label="Remover item" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-2 hover:bg-bg-2 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      {p && !p.ok && <p role="alert" className="mt-1 text-sm font-bold text-danger">{p.problems[0]}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border-2 border-line">
                          <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Diminuir" className="grid h-9 w-9 place-items-center"><Minus className="h-4 w-4" /></button>
                          <span className="w-7 text-center font-extrabold">{it.qty}</span>
                          <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Aumentar" className="grid h-9 w-9 place-items-center"><Plus className="h-4 w-4" /></button>
                        </div>
                        <div className="text-right"><div className="text-xs text-fg-2">{p ? brl(p.unitCents) : ""} un.</div><div className="font-display text-lg font-extrabold text-brand-deep">{p ? brl(p.totalCents) : "…"}</div></div>
                      </div>
                      {p?.materialLines && (
                        <details className="mt-2 text-sm"><summary className="cursor-pointer font-bold text-brand-deep">Ver materiais</summary>
                          <ul className="mt-1 space-y-0.5 text-fg-2">{p.materialLines.map((l, i) => <li key={i}>{l.qty * it.qty} × {l.name} — {brl(l.totalCents * it.qty)}</li>)}</ul>
                        </details>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24" aria-label="Resumo">
          <h2 className="text-xl">Resumo</h2>
          <form onSubmit={(e) => { e.preventDefault(); setApplied(coupon.trim()); }} className="flex gap-2">
            <label htmlFor="cp" className="sr-only">Cupom</label>
            <input id="cp" className="input !py-2" placeholder="Cupom de desconto" value={coupon} onChange={(e) => setCoupon(e.target.value)} maxLength={40} />
            <button className="btn btn-ghost btn-sm">Aplicar</button>
          </form>
          {data?.couponError && <p role="alert" className="text-sm font-bold text-danger">{data.couponError}</p>}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-fg-2">Subtotal</dt><dd className="font-bold">{data ? brl(data.subtotalCents) : "…"}</dd></div>
            {!!data?.discountCents && <div className="flex justify-between text-ok"><dt>Desconto {data.couponCode}</dt><dd className="font-bold">-{brl(data.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-fg-2">Frete</dt><dd className="text-fg-2">calculado no checkout</dd></div>
          </dl>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold">Total (sem frete)</span>
            <span className={`font-display text-2xl font-extrabold text-brand-deep ${loading ? "opacity-50" : ""}`}>{data ? brl(data.subtotalCents - data.discountCents) : "…"}</span>
          </div>
          {data && !data.ok ? (
            <p role="alert" className="text-sm font-bold text-danger">Ajuste os itens indisponíveis para continuar.</p>
          ) : (
            <Link href={`/checkout${applied ? `?cupom=${encodeURIComponent(applied)}` : ""}`} className="btn btn-yellow w-full py-3.5 text-base">Finalizar compra</Link>
          )}
        </aside>
      </div>
    </div>
  );
}
