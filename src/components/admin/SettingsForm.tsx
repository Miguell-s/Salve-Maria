"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "./ImageUploader";
import { BUTTON_TEXT, MIN_BUTTON_CONTRAST, contrastRatio } from "@/lib/contrast";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ACCENTS = [
  { k: "brand", label: "Azul principal", light: "#55B9F5", dark: "#55B9F5" },
  { k: "purple", label: "Roxo", light: "#9270E8", dark: "#AA91FF" },
  { k: "pink", label: "Rosa", light: "#FF70B6", dark: "#FF83C0" },
  { k: "yellow", label: "Amarelo", light: "#FFC943", dark: "#FFD166" },
] as const;

export function SettingsForm({ mode, initial }: { mode: "general" | "visual"; initial: any }) {
  const router = useRouter();
  const [s, setS] = useState<any>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const up = (path: string[], v: any) => setS((cur: any) => { const n = structuredClone(cur); let o = n; path.slice(0, -1).forEach((k) => (o = o[k] ??= {})); o[path[path.length - 1]] = v; return n; });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const body = structuredClone(s);
    if (body.shipping) { body.shipping.freeAboveCents = Math.round(Number(String(body.shipping.freeAboveCents).replace(",", ".")) || 0); }
    try {
      const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.issues ? "Dados inválidos: " + Object.keys(j.issues).join(", ") : j.error);
      setMsg({ ok: true, text: "Salvo! As alterações já aparecem no site." }); router.refresh();
    } catch (e2) { setMsg({ ok: false, text: e2 instanceof Error ? e2.message : "Erro" }); } finally { setBusy(false); }
  }

  const T = (label: string, path: string[], opts: { area?: boolean; max?: number } = {}) => {
    const v = path.reduce((o: any, k) => o?.[k], s) ?? "";
    return <label className="block"><span className="label">{label}</span>{opts.area ? <textarea className="input" rows={5} maxLength={opts.max} value={v} onChange={(e) => up(path, e.target.value)} /> : <input className="input" maxLength={opts.max} value={v} onChange={(e) => up(path, e.target.value)} />}</label>;
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <h1 className="text-3xl">{mode === "visual" ? "Aparência e textos" : "Configurações"}</h1>

      {mode === "visual" && (<>
        <section className="card space-y-4 p-5"><h2 className="text-lg">Banner principal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("Título do banner", ["heroTitle"], { max: 80 })}
            {T("Texto do pequeno chip (topo)", ["heroChip"], { max: 60 })}
          </div>
          {T("Subtítulo", ["heroSubtitle"], { max: 200 })}
          <div className="grid gap-4 sm:grid-cols-2">
            {T("Texto do botão primário", ["heroCtaPrimary"], { max: 30 })}
            {T("Texto do botão secundário", ["heroCtaSecondary"], { max: 30 })}
          </div>
          <div><span className="label">Fotografia do banner (terço)</span><ImageUploader single value={s.heroImage ? [s.heroImage] : []} onChange={(v) => up(["heroImage"], v[0] ?? "")} /></div>
        </section>

        <section className="card space-y-4 p-5"><h2 className="text-lg">Chamadas de seções</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("Título: Mais Vendidos", ["bestSellersTitle"])}
            {T("Botão: Mais Vendidos", ["bestSellersCta"])}
            {T("Título: Nossa Coleção", ["collectionTitle"])}
            {T("Título: Novidades", ["newArrivalsTitle"])}
            {T("Botão: Novidades", ["newArrivalsCta"])}
            {T("Título: Depoimentos", ["testimonialsTitle"])}
          </div>
        </section>

        <section className="card space-y-4 p-5"><h2 className="text-lg">Personalização e história</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("Título da chamada", ["customizeTitle"])}
            {T("Texto do botão", ["customizeCta"])}
          </div>
          {T("Texto descritivo", ["customizeText"], { area: true, max: 300 })}
          <div className="space-y-2">
            <span className="label">Etapas da personalização (separadas por vírgula)</span>
            <input className="input" value={s.customizeSteps.join(", ")} onChange={(e) => up(["customizeSteps"], e.target.value.split(",").map(v => v.trim()).filter(Boolean))} />
          </div>
          <hr className="border-line" />
          {T("Título da história", ["historyTitle"])}{T("Texto da história", ["historyText"], { area: true, max: 3000 })}
        </section>

        <section className="card space-y-4 p-5"><h2 className="text-lg">Materiais e Como Funciona</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("Título da seção de materiais", ["materialsTitle"])}
            {T("Subtítulo da seção de materiais", ["materialsSubtitle"])}
          </div>
          <hr className="border-line" />
          {T("Título da seção 'Como Funciona'", ["howItWorksTitle"])}
          <div className="space-y-3">
            {s.howItWorks.map((h: any, i: number) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[200px_1fr]">
                <input className="input" aria-label={`Título ${i + 1}`} value={h.title} maxLength={40} onChange={(e) => up(["howItWorks", String(i), "title"], e.target.value)} />
                <input className="input" aria-label={`Texto ${i + 1}`} value={h.text} maxLength={160} onChange={(e) => up(["howItWorks", String(i), "text"], e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5"><h2 className="text-lg">Instagram e Newsletter</h2>
          {T("Título do Instagram", ["instagramTitle"])}
          <div><span className="label">Fotos do Instagram (até 6)</span><ImageUploader value={s.instagramImages} onChange={(v) => up(["instagramImages"], v.slice(0, 6))} /></div>
          <hr className="border-line" />
          <div className="grid gap-4 sm:grid-cols-2">
            {T("Título da Newsletter", ["newsletterTitle"])}
            {T("Subtítulo da Newsletter", ["newsletterSubtitle"])}
          </div>
        </section>

        <section className="card space-y-4 p-5"><h2 className="text-lg">Cores de destaque</h2>
          <p className="text-sm text-fg-2">Só as cores de destaque podem mudar. O sistema recusa cores cujo contraste com o texto dos botões fique abaixo de {MIN_BUTTON_CONTRAST}:1, para manter a acessibilidade. Fundos e textos seguem a identidade oficial.</p>
          {(["light", "dark"] as const).map((mode2) => (
            <div key={mode2}><h3 className="mb-2 text-base">{mode2 === "light" ? "Modo claro" : "Modo escuro"}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ACCENTS.map((a) => {
                  const cur = s.theme?.[mode2]?.[a.k] ?? a[mode2];
                  const isPurple = a.k === "purple";
                  const need = isPurple ? 3 : MIN_BUTTON_CONTRAST;
                  const ratio = isPurple ? contrastRatio(cur, mode2 === "light" ? "#FFFFFF" : "#101827") : contrastRatio(BUTTON_TEXT[mode2], cur);
                  return (
                    <div key={a.k} className="rounded-2xl border border-line p-3">
                      <label className="text-sm font-bold">{a.label}<span className="mt-1 flex gap-2"><input type="color" className="h-10 w-12 rounded-lg border-2 border-line bg-bg p-0.5" value={cur} onChange={(e) => up(["theme", mode2, a.k], e.target.value.toUpperCase())} /><span className="self-center font-mono text-xs">{cur}</span></span></label>
                      <span className="mt-2 block rounded-full px-3 py-1.5 text-center text-xs font-extrabold" style={{ background: cur, color: BUTTON_TEXT[mode2] }}>Botão</span>
                      <span className={`mt-1 block text-xs font-bold ${ratio >= need ? "text-ok" : "text-danger"}`}>Contraste {ratio.toFixed(1)}:1 (mín. {need}:1) {ratio >= need ? "✓" : "✗ insuficiente"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => up(["theme"], {})}>Restaurar paleta original</button>
        </section>
      </>)}

      {mode === "general" && (<>
        <section className="card grid gap-4 p-5 sm:grid-cols-2"><h2 className="text-lg sm:col-span-2">Informações da loja</h2>
          {T("Nome da loja", ["storeName"])}
          {T("E-mail de contato", ["contactEmail"])}
          {T("Telefone", ["contactPhone"])}
          {T("Endereço (opcional)", ["contactAddress"])}
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2"><h2 className="text-lg sm:col-span-2">Redes sociais</h2>
          {T("WhatsApp do botão (só números, com DDI. Ex.: 5511999999999)", ["whatsapp"])}
          {T("Instagram (usuário)", ["instagramUser"])}
          {T("Instagram (link ou @)", ["socials", "instagram"])}
          {T("Facebook", ["socials", "facebook"])}
          {T("TikTok", ["socials", "tiktok"])}
          {T("YouTube", ["socials", "youtube"])}
        </section>
        <section className="card space-y-3 p-5"><h2 className="text-lg">Frete (tabela por região do CEP)</h2>
          <p className="text-sm text-fg-2">Valores em reais. Pendente: cotação automática dos Correios (ver README).</p>
          <label className="block max-w-xs"><span className="label">Frete grátis a partir de (R$) — 0 desativa</span>
            <input className="input" inputMode="decimal" value={(Number(s.shipping.freeAboveCents) / 100).toString().replace(".", ",")} onChange={(e) => up(["shipping", "freeAboveCents"], Math.round((parseFloat(e.target.value.replace(",", ".")) || 0) * 100))} /></label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.keys(s.shipping.byRegion).sort().map((d) => (
              <label key={d} className="block"><span className="label">CEP {d}xxxxxxx</span><input className="input" inputMode="decimal" value={(s.shipping.byRegion[d] / 100).toString().replace(".", ",")} onChange={(e) => up(["shipping", "byRegion", d], Math.round((parseFloat(e.target.value.replace(",", ".")) || 0) * 100))} /></label>
            ))}
          </div>
        </section>
        <section className="card space-y-3 p-5"><h2 className="text-lg">Estoque e automações</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">Reservar estoque por (minutos)</span><input className="input" type="number" min={10} max={1440} value={s.reservationMinutes} onChange={(e) => up(["reservationMinutes"], Number(e.target.value))} /></label>
            <label className="flex items-center gap-2 pt-6 font-bold"><input type="checkbox" className="h-5 w-5" checked={s.lowStockDefault} onChange={(e) => up(["lowStockDefault"], e.target.checked)} />Avisar estoque baixo por padrão</label>
          </div>
          <hr className="border-line" />
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5" checked={s.abandonedCartEnabled} onChange={(e) => up(["abandonedCartEnabled"], e.target.checked)} />Recuperar carrinhos abandonados por e-mail</label>
          <label className="block max-w-xs"><span className="label">Aguardar (minutos) antes de lembrar</span><input className="input" type="number" min={30} max={10080} value={s.abandonedCartMinutes} onChange={(e) => up(["abandonedCartMinutes"], Number(e.target.value))} /></label>
        </section>
      </>)}

      {msg && <p role={msg.ok ? "status" : "alert"} className={`font-bold ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</button>
    </form>
  );
}
