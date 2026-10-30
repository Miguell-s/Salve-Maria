"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard, type CardProduct } from "@/components/ProductCard";
import { useFavorites } from "@/components/FavoriteButton";

export default function Favoritos() {
  const { ids } = useFavorites();
  const [items, setItems] = useState<CardProduct[] | null>(null);

  useEffect(() => {
    if (ids.length === 0) { setItems([]); return; }
    fetch(`/api/products?ids=${ids.join(",")}`).then((r) => r.json()).then((j) => setItems(j.products ?? [])).catch(() => setItems([]));
  }, [ids]);

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl">Meus favoritos</h1>
      <p className="mt-1 text-fg-2">Guardados neste aparelho.</p>
      <div className="mt-8">
        {items === null ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton aspect-[3/4]" />)}</div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-bold">Você ainda não favoritou nenhum terço.</p>
            <Link href="/loja" className="btn btn-primary mt-4">Ver terços prontos</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{items.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
        )}
      </div>
    </div>
  );
}
