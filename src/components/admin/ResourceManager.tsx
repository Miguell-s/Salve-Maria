"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Field, ResourceDef } from "@/lib/resources";
import { brl } from "@/lib/format";
import { ImageUploader } from "./ImageUploader";

type Row = Record<string, unknown> & { id: string };
type Def = Omit<ResourceDef, "schema">;

const toInput = (f: Field, v: unknown): unknown => {
  if (f.type === "money") return v == null ? "" : ((v as number) / 100).toFixed(2).replace(".", ",");
  if (f.type === "datetime") return v ? new Date(v as string).toISOString().slice(0, 16) : "";
  return v ?? (f.type === "bool" ? false : f.type === "images" ? [] : "");
};
const parseMoney = (s: string) => Math.round(parseFloat(s.replace(/\./g, "").replace(",", ".")) * 100);

export function ResourceManager({ def, categories }: { def: Def; categories: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id?: string; values: Record<string, unknown> } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/${def.key}?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setRows(r.ok ? j.rows : []);
  }, [def.key, q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const fields: Field[] = def.fields.map((f) => (f.name === "categoryId" ? { ...f, options: [{ value: "", label: "— sem categoria —" }, ...categories.map((c) => ({ value: c.id, label: c.name }))] } : f));

  function open(row?: Row) {
    const values: Record<string, unknown> = {};
    for (const f of fields) values[f.name] = row ? toInput(f, row[f.name]) : f.type === "bool" ? (f.name === "active" ? true : false) : f.type === "images" ? [] : f.name === "colorHex" ? "#FFFFFF" : f.name === "status" ? "ACTIVE" : "";
    setErr(""); setEdit({ id: row?.id, values });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true); setErr("");
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = edit.values[f.name];
      if (f.type === "money") body[f.name] = v === "" ? (f.name.startsWith("sale") || f.name === "centsOff" ? null : 0) : parseMoney(String(v));
      else if (f.type === "number") body[f.name] = v === "" ? (["sizeMm", "weightGrams", "percentOff"].includes(f.name) ? null : 0) : Number(v);
      else if (f.type === "datetime") body[f.name] = v ? new Date(String(v)).toISOString() : null;
      else if (f.type === "images") body[f.name] = f.single ? ((v as string[])[0] ?? "") : v;
      else if (f.type === "select" && v === "") body[f.name] = null;
      else if (f.type === "text" && v === "" && ["modelUrl", "materials", "dimensions"].includes(f.name)) body[f.name] = null;
      else body[f.name] = v;
    }
    try {
      const r = await fetch(edit.id ? `/api/admin/${def.key}/${edit.id}` : `/api/admin/${def.key}`, { method: edit.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) {
        const issues = j.issues ? Object.entries(j.issues).map(([k, m]) => `${fields.find((f) => f.name === k)?.label ?? k}: ${(m as string[]).join(", ")}`).join(" · ") : "";
        throw new Error(issues || j.error || "Erro ao salvar");
      }
      setEdit(null); await load();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Erro"); } finally { setBusy(false); }
  }

  async function del(row: Row) {
    if (!confirm("Excluir este item? Esta ação não pode ser desfeita.")) return;
    const r = await fetch(`/api/admin/${def.key}/${row.id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json()).error ?? "Erro"); return; }
    await load();
  }

  const cell = (c: Def["columns"][number], row: Row) => {
    const v = row[c.name];
    if (c.type === "money") return v == null ? "—" : brl(v as number);
    if (c.type === "bool") return v ? <span className="chip bg-ok/20 text-ok">Sim</span> : <span className="chip">Não</span>;
    if (c.type === "image") { const src = Array.isArray(v) ? v[0] : (v as string | undefined); return src ? <span className="relative block h-10 w-10 overflow-hidden rounded-lg"><Image src={src} alt="" fill sizes="40px" className="photo object-cover" /></span> : <span className="block h-10 w-10 rounded-lg bg-bg-2" />; }
    if (c.type === "stock") {
      const stock = row.stock as number, reserved = (row.reserved as number) ?? 0, low = (row.lowStockAt as number) ?? 0;
      return <span className={stock <= 0 ? "font-bold text-danger" : stock <= low ? "font-bold text-pink" : "font-bold"}>{stock}{reserved > 0 && <span className="ml-1 text-xs text-fg-2">({reserved} reserv.)</span>}</span>;
    }
    return String(v ?? "—");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">{def.label}</h1>{def.help && <p className="text-sm text-fg-2">{def.help}</p>}</div>
        <div className="flex gap-2">
          <input className="input !w-48 !py-2" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          <button className="btn btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> Novo</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-x">
          <thead><tr>{def.columns.map((c) => <th key={c.name}>{c.label}</th>)}<th className="text-right">Ações</th></tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan={99} className="p-6 text-center"><span className="spinner" /></td></tr>}
            {rows?.length === 0 && <tr><td colSpan={99} className="p-6 text-center text-fg-2">Nada cadastrado ainda.</td></tr>}
            {rows?.map((row) => (
              <tr key={row.id}>
                {def.columns.map((c) => <td key={c.name} className="max-w-[260px] truncate">{cell(c, row)}</td>)}
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => open(row)} aria-label="Editar" className="mr-1 inline-grid h-9 w-9 place-items-center rounded-full hover:bg-bg-2"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(row)} aria-label="Excluir" className="inline-grid h-9 w-9 place-items-center rounded-full text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={`${edit.id ? "Editar" : "Novo"} ${def.singular}`}>
          <form onSubmit={save} className="card w-full max-w-2xl space-y-4 p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl capitalize">{edit.id ? "Editar" : "Novo"} {def.singular}</h2><button type="button" onClick={() => setEdit(null)} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-bg-2"><X /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => {
                const v = edit.values[f.name];
                const set = (nv: unknown) => setEdit((s) => (s ? { ...s, values: { ...s.values, [f.name]: nv } } : s));
                const span = f.half ? "" : "sm:col-span-2";
                return (
                  <div key={f.name} className={span}>
                    {f.type === "bool" ? (
                      <label className="flex items-center gap-2 pt-6 font-bold"><input type="checkbox" className="h-5 w-5" checked={!!v} onChange={(e) => set(e.target.checked)} />{f.label}</label>
                    ) : f.type === "images" ? (
                      <><span className="label">{f.label}</span><ImageUploader single={f.single} value={f.single ? (v ? [String(v)] : []) : (v as string[])} onChange={(n) => set(f.single ? n[0] ?? "" : n)} /></>
                    ) : (
                      <label className="block"><span className="label">{f.label}</span>
                        {f.type === "textarea" ? <textarea className="input" rows={4} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
                          : f.type === "select" ? <select className="input" value={String(v ?? "")} onChange={(e) => set(e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                          : f.type === "color" ? <span className="flex gap-2"><input type="color" className="h-12 w-16 rounded-xl border-2 border-line bg-bg p-1" value={String(v || "#ffffff")} onChange={(e) => set(e.target.value.toUpperCase())} /><input className="input" value={String(v ?? "")} onChange={(e) => set(e.target.value)} maxLength={7} /></span>
                          : <input className="input" type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : "text"} inputMode={f.type === "money" ? "decimal" : undefined} step={f.type === "number" ? "any" : undefined} placeholder={f.type === "money" ? "0,00" : undefined} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />}
                        {f.help && <span className="mt-1 block text-xs text-fg-2">{f.help}</span>}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            {err && <p role="alert" className="text-sm font-bold text-danger">{err}</p>}
            <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
