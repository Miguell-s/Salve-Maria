"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, ShieldCheck, MailQuestion } from "lucide-react";

export function AuthForm({ adminMode = false }: { adminMode?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "google">("login");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", code: "" });
  const [consent, setConsent] = useState(false);
  const [needCode, setNeedCode] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "google") {
        const r = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: f.email, name: f.name || undefined, code: f.code || undefined })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Erro");
        if (j.sent) { setSent(true); setNeedCode(true); return; }
        router.push("/conta"); router.refresh();
        return;
      }

      const body = mode === "login" ? { email: f.email, password: f.password, code: f.code || undefined } : { name: f.name, email: f.email, phone: f.phone || undefined, password: f.password, consent };
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      if (j.mfa) { setNeedCode(true); return; }
      router.push(adminMode ? "/admin" : "/conta"); router.refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Erro"); } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <form onSubmit={submit} className="card space-y-6 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/20 text-brand">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Verifique seu e-mail</h2>
          <p className="text-sm text-fg-2">Enviamos um código de 6 dígitos para <b>{f.email}</b></p>
        </div>
        <label className="block text-left">
          <span className="label text-center">Código de acesso</span>
          <input className="input text-center text-2xl font-bold tracking-[0.5em]" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus value={f.code} onChange={set("code")} placeholder="000000" />
        </label>
        {err && <p role="alert" className="text-sm font-bold text-danger">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Verificando..." : "Entrar agora"}</button>
        <button type="button" onClick={() => { setSent(false); setNeedCode(false); setF(s => ({ ...s, code: "" })); }} className="text-sm font-bold text-fg-2 underline">Tentar outro e-mail</button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card space-y-4 p-6">
        {!adminMode && (
          <div className="grid grid-cols-3 gap-1 rounded-full bg-bg-2 p-1" role="tablist">
            {(["login", "register", "google"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(""); setNeedCode(false); }} className={`rounded-full py-2 text-xs font-display font-extrabold sm:text-sm ${mode === m ? "bg-brand text-onaccent shadow-soft" : "text-fg-2"}`}>
                {m === "login" ? "Entrar" : m === "register" ? "Criar conta" : "E-mail/Google"}
              </button>
            ))}
          </div>
        )}

        {mode === "google" && (
          <div className="rounded-2xl bg-brand/10 p-4 text-center">
            <p className="text-sm font-bold text-brand-deep">Acesso rápido sem senha</p>
            <p className="text-xs text-fg-2">Você receberá um código por e-mail para confirmar.</p>
          </div>
        )}

        {(mode === "register" || (mode === "google" && !needCode)) && (
          <label className="block"><span className="label">Nome completo</span><input className="input" required value={f.name} onChange={set("name")} placeholder="Como quer ser chamado?" /></label>
        )}
        
        <label className="block"><span className="label">E-mail</span><input className="input" type="email" required value={f.email} onChange={set("email")} autoComplete="email" placeholder="exemplo@email.com" /></label>
        
        {mode !== "google" && (
          <>
            {mode === "register" && <label className="block"><span className="label">Telefone (opcional)</span><input className="input" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></label>}
            <label className="block"><span className="label">Senha</span><input className="input" type="password" required minLength={mode === "register" ? 10 : 1} value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              {mode === "register" && <span className="mt-1 block text-xs text-fg-2">Mínimo 10 caracteres, com letras e números.</span>}</label>
          </>
        )}

        {needCode && mode !== "google" && <label className="block"><span className="label">Código do app autenticador (6 dígitos)</span><input className="input" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus value={f.code} onChange={set("code")} autoComplete="one-time-code" /></label>}
        
        {mode === "register" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4" />Aceito a Política de Privacidade (LGPD).</label>}
        
        {err && <p role="alert" className="text-sm font-bold text-danger">{err}</p>}
        
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar minha conta" : "Enviar código por e-mail"}
        </button>
      </form>

      {mode === "login" && !adminMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 py-2 text-fg-2">
            <hr className="flex-1 border-line" />
            <span className="text-xs font-bold uppercase">Ou continue com</span>
            <hr className="flex-1 border-line" />
          </div>
          
          <button onClick={() => setMode("google")} className="card flex w-full items-center justify-center gap-3 p-4 font-bold transition-all hover:bg-bg-2 hover:shadow-soft">
            <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.53l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>

          <button onClick={() => setMode("google")} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line p-4 text-sm font-bold transition-colors hover:bg-bg-2">
            <MailQuestion className="h-4 w-4 text-brand" /> Entrar sem senha (e-mail rápido)
          </button>
        </div>
      )}
    </div>
  );
}
