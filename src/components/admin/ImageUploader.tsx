"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";

export function ImageUploader({ value, onChange, single = false }: { value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      [...files].slice(0, 12).forEach((f) => fd.append("files", f));
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha no envio");
      onChange(single ? [j.urls[0]] : [...value, ...j.urls]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  const move = (i: number, d: number) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <li key={src} className="relative h-24 w-24 overflow-hidden rounded-xl border border-line bg-bg-2">
            <Image src={src} alt={`Imagem ${i + 1}`} fill sizes="96px" className="photo object-cover" />
            <button type="button" onClick={() => onChange(value.filter((x) => x !== src))} aria-label="Remover imagem" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"><X className="h-3.5 w-3.5" /></button>
            {!single && value.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 text-white">
                <button type="button" onClick={() => move(i, -1)} aria-label="Mover para trás"><ArrowLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Mover para frente"><ArrowRight className="h-4 w-4" /></button>
              </div>
            )}
          </li>
        ))}
        <li>
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-line text-fg-2 hover:border-brand hover:text-brand-deep">
            {busy ? <span className="spinner" /> : <span className="flex flex-col items-center text-xs font-bold"><ImagePlus className="h-6 w-6" />Enviar</span>}
          </button>
        </li>
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={!single} hidden onChange={(e) => upload(e.target.files)} />
      <p className="mt-1 text-xs text-fg-2">JPG, PNG ou WebP até 8 MB. A primeira imagem é a principal.</p>
      {err && <p role="alert" className="text-sm font-bold text-danger">{err}</p>}
    </div>
  );
}
