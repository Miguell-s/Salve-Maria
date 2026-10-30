"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCart } from "./CartProvider";
import { FavoriteButton } from "./FavoriteButton";
import { RosaryIllustration } from "./RosaryIllustration";
import { brl } from "@/lib/format";

export type CardProduct = {
  id: string; slug: string; name: string; image?: string; priceCents: number; salePriceCents?: number | null;
  available: number; isNew?: boolean; isDemo?: boolean; category?: string;
};

export function ProductCard({ p, index = 0 }: { p: CardProduct; index?: number }) {
  const { addReady } = useCart();
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();
  
  useEffect(() => setMounted(true), []);

  const out = p.available <= 0;
  const price = p.salePriceCents ?? p.priceCents;

  function add() {
    addReady(p.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  const initial = mounted && !reduce ? { opacity: 0, y: 16 } : false;

  return (
    <motion.article
      initial={initial} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.05 }}
      className="card card-hover group flex flex-col overflow-hidden">
      <Link href={`/loja/${p.slug}`} className="relative block aspect-square overflow-hidden bg-bg-2">
        {p.image ? (
          <Image src={p.image} alt={p.name} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="photo object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center p-6"><RosaryIllustration className="h-full w-full max-w-[70%]" hue={index} /></div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {out && <span className="rounded-full bg-fg px-2.5 py-1 text-xs font-extrabold text-bg">Esgotado</span>}
          {!out && p.salePriceCents != null && <span className="rounded-full bg-pink px-2.5 py-1 text-xs font-extrabold text-onaccent">Promoção</span>}
          {!out && p.isNew && <span className="rounded-full bg-yellow px-2.5 py-1 text-xs font-extrabold text-onaccent">Novo</span>}
          {p.isDemo && <span className="rounded-full bg-purple2 px-2.5 py-1 text-[10px] font-extrabold uppercase text-onpurple">Demonstração</span>}
        </div>
        <FavoriteButton id={p.id} className="absolute right-3 top-3" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {p.category && <span className="text-xs font-bold uppercase tracking-wide text-fg-2">{p.category}</span>}
        <h3 className="line-clamp-2 min-h-[2.8rem] text-base leading-snug"><Link href={`/loja/${p.slug}`} className="hover:text-brand-deep">{p.name}</Link></h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            {p.salePriceCents != null && <div className="text-xs text-fg-2 line-through">{brl(p.priceCents)}</div>}
            <div className="font-display text-xl font-extrabold text-brand-deep">{brl(price)}</div>
          </div>
          <button type="button" onClick={add} disabled={out} aria-label={`Adicionar ${p.name} ao carrinho`} className="btn btn-yellow btn-sm shrink-0">
            {added ? <><Check className="h-4 w-4" /> Ok</> : out ? "Esgotado" : <><ShoppingBag className="h-4 w-4" /> Comprar</>}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
