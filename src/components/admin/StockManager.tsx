"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, Package, Gem, AlertTriangle, Save, Plus, Minus } from "lucide-react";
import { brl } from "@/lib/format";

type StockItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reserved: number;
  lowStockAt: number;
  images: string[];
  kind?: string;
};

export function StockManager() {
  const [data, setData] = useState<{ products: StockItem[]; materials: StockItem[] } | null>(null);
  const [tab, setTab] = useState<"products" | "materials">("products");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const r = await fetch("/api/admin/stock");
    const j = await r.json();
    if (r.ok) setData(j);
  }

  useEffect(() => { load(); }, []);

  const items = data ? (tab === "products" ? data.products : data.materials) : [];
  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(q.toLowerCase()) || 
    i.sku.toLowerCase().includes(q.toLowerCase())
  );

  async function update(id: string, table: "Product" | "Material") {
    const delta = deltas[id];
    if (!delta) return;

    setBusy(id);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, table, delta, reason: "Ajuste manual rápido" })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      
      setDeltas(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setMsg({ ok: true, text: "Estoque atualizado!" });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro" });
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="grid place-items-center py-20"><span className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Estoque de Terços e Materiais</h1>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-2" />
          <input className="input !pl-10" placeholder="Buscar por nome ou SKU..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 rounded-2xl bg-bg-2 p-1 w-fit">
        <button onClick={() => setTab("products")} className={`btn btn-sm px-6 ${tab === "products" ? "bg-card shadow-soft" : "btn-ghost"}`}>
          <Package className="mr-2 h-4 w-4" /> Terços Prontos
        </button>
        <button onClick={() => setTab("materials")} className={`btn btn-sm px-6 ${tab === "materials" ? "bg-card shadow-soft" : "btn-ghost"}`}>
          <Gem className="mr-2 h-4 w-4" /> Materiais
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl p-4 font-bold ${msg.ok ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`}>
          {msg.text}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table-x">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Status</th>
              <th className="text-center">Estoque Atual</th>
              <th className="text-right">Ajustar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const delta = deltas[item.id] || 0;
              const isLow = item.stock <= item.lowStockAt;
              const isOut = item.stock <= 0;
              
              return (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-bg-2">
                        {item.images[0] ? (
                          <Image src={item.images[0]} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center"><Package className="h-6 w-6 text-fg-2" /></div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{item.name}</div>
                        {item.kind && <div className="text-xs text-fg-2">{item.kind}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{item.sku}</td>
                  <td>
                    {isOut ? (
                      <span className="chip bg-danger/10 text-danger"><AlertTriangle className="mr-1 h-3 w-3" /> Esgotado</span>
                    ) : isLow ? (
                      <span className="chip bg-pink/10 text-pink"><AlertTriangle className="mr-1 h-3 w-3" /> Baixo</span>
                    ) : (
                      <span className="chip bg-ok/10 text-ok">Ok</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="text-lg font-bold">{item.stock}</div>
                    {item.reserved > 0 && <div className="text-xs text-fg-2">{item.reserved} reservados</div>}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center rounded-lg border border-line bg-bg overflow-hidden">
                        <button onClick={() => setDeltas(d => ({ ...d, [item.id]: (d[item.id] || 0) - 1 }))} className="p-2 hover:bg-bg-2 transition-colors border-r border-line">
                          <Minus className="h-4 w-4" />
                        </button>
                        <input 
                          type="number" 
                          className="w-16 bg-transparent text-center font-bold focus:outline-none" 
                          value={delta === 0 ? "" : delta}
                          placeholder="0"
                          onChange={e => setDeltas(d => ({ ...d, [item.id]: parseInt(e.target.value) || 0 }))}
                        />
                        <button onClick={() => setDeltas(d => ({ ...d, [item.id]: (d[item.id] || 0) + 1 }))} className="p-2 hover:bg-bg-2 transition-colors border-l border-line">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button 
                        disabled={delta === 0 || busy === item.id}
                        onClick={() => update(item.id, tab === "products" ? "Product" : "Material")}
                        className="btn btn-primary btn-sm h-10 w-10 !p-0"
                        title="Salvar ajuste"
                      >
                        {busy === item.id ? <span className="spinner !h-4 !w-4" /> : <Save className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-fg-2">Nenhum item encontrado.</div>
        )}
      </div>
    </div>
  );
}
