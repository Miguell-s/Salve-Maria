"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toApiItems, useCart } from "@/components/CartProvider";
import { brl } from "@/lib/format";

type Priced = { subtotalCents: number; discountCents: number; couponCode?: string; ok: boolean; shipping: { cents: number; label: string } | null; shippingError?: string; totalCents: number; items: { name: string; qty: number; totalCents: number; problems: string[] }[] };

function Inner() {
  const { items, ready, clear } = useCart();
  const coupon = useSearchParams().get("cupom") ?? undefined;
  const [f, setF] = useState({ name: "", email: "", phone: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", notes: "" });
  const [consent, setConsent] = useState(false);
  const [data, setData] = useState<Priced | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ number: number; orderId: string; token: string; paymentUrl: string | null; message: string | null } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  // Frete e totais sempre vindos do servidor.
  useEffect(() => {
    if (!ready || items.length === 0) return;
    const t = setTimeout(() => {
      fetch("/api/cart/price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: toApiItems(items), coupon, cep: f.cep.replace(/\D/g, "").length === 8 ? f.cep : undefined }) })
        .then((r) => r.json()).then(setData);
    }, 300);
    return () => clearTimeout(t);
  }, [items, ready, coupon, f.cep]);

  // Preenche endereço pelo CEP (ViaCEP é chamado pelo navegador; só preenche campos vazios).
  async function lookupCep() {
    const d = f.cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
      if (!j.erro) setF((s) => ({ ...s, street: s.street || j.logradouro || "", district: s.district || j.bairro || "", city: s.city || j.localidade || "", state: s.state || j.uf || "" }));
    } catch { /* digitação manual */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toApiItems(items), coupon, consent,
          customer: { name: f.name, email: f.email, phone: f.phone },
          address: { cep: f.cep, street: f.street, number: f.number, complement: f.complement || undefined, district: f.district, city: f.city, state: f.state },
          notes: f.notes || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível finalizar.");
      clear();
      if (j.paymentUrl) { window.location.href = j.paymentUrl; return; }
      setDone(j);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Erro"); } finally { setBusy(false); }
  }

  if (done)
    return (
      <div className="container-x max-w-xl py-16 text-center">
        <h1 className="text-3xl">Pedido #{done.number} registrado 💙</h1>
        <p className="mt-3 text-fg-2">{done.message}</p>
        <Link href={`/pedido/${done.orderId}?t=${done.token}`} className="btn btn-primary mt-6">Acompanhar pedido</Link>
      </div>
    );

  if (ready && items.length === 0)
    return <div className="container-x py-20 text-center"><p className="text-lg font-bold">Seu carrinho está vazio.</p><Link href="/loja" className="btn btn-primary mt-4">Ver terços</Link></div>;

  const Field = ({ k, label, ...p }: { k: keyof typeof f; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block"><span className="label">{label}</span><input className="input" value={f[k]} onChange={set(k)} {...p} /></label>
  );

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl">Finalizar compra</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <fieldset className="card space-y-4 p-5"><legend className="px-1 font-display text-lg font-extrabold">Seus dados</legend>
            <Field k="name" label="Nome completo" required autoComplete="name" maxLength={120} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field k="email" label="E-mail" type="email" required autoComplete="email" />
              <Field k="phone" label="WhatsApp / telefone" type="tel" required autoComplete="tel" placeholder="(11) 90000-0000" />
            </div>
          </fieldset>
          <fieldset className="card space-y-4 p-5"><legend className="px-1 font-display text-lg font-extrabold">Entrega</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block"><span className="label">CEP</span><input className="input" inputMode="numeric" required autoComplete="postal-code" value={f.cep} onChange={set("cep")} onBlur={lookupCep} placeholder="00000-000" maxLength={9} /></label>
              <div className="sm:col-span-2"><Field k="street" label="Rua" required autoComplete="address-line1" /></div>
              <Field k="number" label="Número" required maxLength={15} />
              <div className="sm:col-span-2"><Field k="complement" label="Complemento (opcional)" maxLength={80} /></div>
              <Field k="district" label="Bairro" required />
              <Field k="city" label="Cidade" required />
              <Field k="state" label="UF" required maxLength={2} placeholder="SP" />
            </div>
            <label className="block"><span className="label">Observações (opcional)</span><textarea className="input" rows={2} maxLength={500} value={f.notes} onChange={set("notes")} /></label>
          </fieldset>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[rgb(var(--brand-primary))]" />
            <span>Li e aceito a <Link href="/privacidade" className="font-bold text-brand-deep underline" target="_blank">Política de Privacidade</Link> e autorizo o uso dos meus dados para processar este pedido.</span></label>
        </div>

        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24" aria-label="Resumo do pedido">
          <h2 className="text-xl">Resumo</h2>
          <ul className="space-y-1 text-sm">{data?.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span>{i.qty}× {i.name}</span><span className="font-bold">{brl(i.totalCents)}</span></li>)}</ul>
          <dl className="space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-fg-2">Subtotal</dt><dd>{data ? brl(data.subtotalCents) : "…"}</dd></div>
            {!!data?.discountCents && <div className="flex justify-between text-ok"><dt>Desconto</dt><dd>-{brl(data.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-fg-2">Frete</dt><dd>{data?.shipping ? (data.shipping.cents === 0 ? "Grátis" : brl(data.shipping.cents)) : data?.shippingError ?? "informe o CEP"}</dd></div>
          </dl>
          <div className="flex items-baseline justify-between border-t border-line pt-3"><span className="font-bold">Total</span><span className="font-display text-2xl font-extrabold text-brand-deep">{data?.shipping ? brl(data.totalCents) : data ? brl(data.subtotalCents - data.discountCents) : "…"}</span></div>
          {err && <p role="alert" className="text-sm font-bold text-danger">{err}</p>}
          <button className="btn btn-yellow w-full py-3.5 text-base" disabled={busy || !data?.ok || !data?.shipping}>{busy ? "Processando…" : "Ir para o pagamento"}</button>
          <p className="text-xs text-fg-2">PIX, cartão e outros meios no ambiente seguro do Mercado Pago. Não guardamos dados de cartão.</p>
        </aside>
      </form>
    </div>
  );
}

export default function Checkout() {
  return <Suspense fallback={<div className="container-x py-20 text-center"><span className="spinner" /></div>}><Inner /></Suspense>;
}
