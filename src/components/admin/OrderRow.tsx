"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/lib/format";

type Props = { id: string; number: number; status: string; needsAttention: boolean; total: string; date: string; name: string; paymentStatus: string | null; details: string };

export function OrderRow(p: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(p.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function patch(body: object) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/admin/orders/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) setErr((await r.json()).error ?? "Erro"); else router.refresh();
    setBusy(false);
  }

  return (
    <li className={`card p-4 ${p.needsAttention ? "!border-danger" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><b className="text-lg">#{p.number}</b> <span className="text-fg-2">· {p.name} · {p.date}</span>
          {p.needsAttention && <span className="chip ml-2 bg-danger/15 text-danger">Atenção</span>}</div>
        <div className="flex items-center gap-3"><b className="text-brand-deep">{p.total}</b>
          <label className="sr-only" htmlFor={`s${p.id}`}>Status</label>
          <select id={`s${p.id}`} className="input !w-auto !py-1.5 text-sm" value={status} disabled={busy}
            onChange={(e) => { if (e.target.value === "CANCELED" && !confirm("Cancelar o pedido? O estoque será devolvido.")) return; setStatus(e.target.value); patch({ status: e.target.value }); }}>
            {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-bold text-danger">{err}</p>}
      <details className="mt-2"><summary className="cursor-pointer text-sm font-bold text-brand-deep">Detalhes, materiais e personalização</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-bg-2 p-3 font-sans text-sm">{p.details}{p.paymentStatus ? `\n\nPagamento: ${p.paymentStatus}` : ""}</pre>
        {p.needsAttention && <button className="btn btn-ghost btn-sm mt-2" onClick={() => patch({ needsAttention: false })}>Marcar como resolvido</button>}
      </details>
    </li>
  );
}
