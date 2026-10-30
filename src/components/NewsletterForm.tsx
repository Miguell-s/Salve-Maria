"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      setState("done");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro");
      setState("error");
    }
  }

  if (state === "done")
    return <p className="flex items-center gap-2 font-bold text-ok" role="status"><Check className="h-5 w-5" /> Cadastro feito! Obrigada 💙</p>;

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2 sm:flex-row"}>
        <label htmlFor={compact ? "nl-f" : "nl"} className="sr-only">Seu e-mail</label>
        <input id={compact ? "nl-f" : "nl"} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu melhor e-mail" className="input" maxLength={200} />
        <button className="btn btn-pink" disabled={state === "loading"}>{state === "loading" ? "Enviando…" : "Quero receber"}</button>
      </div>
      <label className="flex items-start gap-2 text-xs text-fg-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-primary))]" />
        Aceito receber novidades por e-mail e concordo com a Política de Privacidade.
      </label>
      {state === "error" && <p role="alert" className="text-sm font-bold text-danger">{msg}</p>}
    </form>
  );
}
