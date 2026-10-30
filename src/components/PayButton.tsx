"use client";

import { useState } from "react";

export function PayButton({ orderId, token }: { orderId: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pay() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, token }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      window.location.href = j.paymentUrl;
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setBusy(false); }
  }
  return (
    <div className="card p-5">
      <p className="font-bold">Aguardando pagamento.</p>
      <button onClick={pay} disabled={busy} className="btn btn-yellow mt-3">{busy ? "Abrindo…" : "Pagar agora (PIX ou cartão)"}</button>
      {err && <p role="alert" className="mt-2 text-sm font-bold text-danger">{err}</p>}
    </div>
  );
}
