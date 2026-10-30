"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { brl } from "@/lib/format";
import { useCart, type CartConfig } from "../CartProvider";
import type { Quote } from "@/lib/pricing";
import type { Part } from "./RosaryViewer";

const RosaryViewer = dynamic(() => import("./RosaryViewer"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center"><span className="spinner" aria-label="Carregando 3D" /></div>,
});

export type Mat = {
  id: string; kind: "BEAD" | "SPACER" | "CROSS" | "MEDAL" | "CHARM" | "PACKAGING" | "FINISH";
  name: string; color: string; colorHex: string; sizeMm: number | null; materialType: string;
  unitPriceCents: number; available: number; images: string[]; modelUrl: string | null;
};
export type Template = { id: string; name: string; beadsMain: number; beadsExtra: number; spacers: number; crosses: number; medals: number; assemblyCents: number };

const STEPS = [
  { id: "bolinhas", label: "Bolinhas", kinds: ["BEAD"] },
  { id: "entremeios", label: "Entremeios", kinds: ["SPACER"] },
  { id: "crucifixos", label: "Crucifixos", kinds: ["CROSS"] },
  { id: "medalhas", label: "Medalhas", kinds: ["MEDAL"] },
  { id: "detalhes", label: "Detalhes", kinds: ["CHARM", "FINISH", "PACKAGING"] },
  { id: "revisao", label: "Revisão", kinds: [] },
] as const;

type Sel = { bead?: string; spacer?: string; cross?: string; medal?: string; charms: string[]; finish?: string; packaging?: string };

export function Customizer({ materials, templates }: { materials: Mat[]; templates: Template[] }) {
  const reduce = useReducedMotion();
  const { addCustom } = useCart();
  const [tplId, setTplId] = useState(templates[0]?.id ?? "");
  const tpl = templates.find((t) => t.id === tplId) ?? templates[0];
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Sel>({ charms: [] });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [added, setAdded] = useState(false);
  const byId = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const config: CartConfig | null = tpl ? {
    templateId: tpl.id, beadId: sel.bead ?? "", spacerId: sel.spacer ?? "", crossId: sel.cross ?? "",
    medalId: sel.medal, charmIds: sel.charms, finishId: sel.finish, packagingId: sel.packaging,
  } : null;

  // Orçamento SEMPRE vindo do servidor (preço, quantidades e estoque reais).
  const seq = useRef(0);
  useEffect(() => {
    if (!config) return;
    const mine = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const body = { ...config, beadId: config.beadId || undefined, spacerId: config.spacerId || undefined, crossId: config.crossId || undefined };
        const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json();
        if (mine === seq.current && r.ok) setQuote(j);
      } finally { if (mine === seq.current) setQuoting(false); }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplId, sel]);

  if (!tpl) return <p className="card p-8 text-center">O personalizador ainda não foi configurado (cadastre uma Composição no painel).</p>;

  const part = (id?: string): Part | undefined => {
    const m = id ? byId.get(id) : undefined;
    return m ? { hex: m.colorHex, type: m.materialType, image: m.images[0], modelUrl: m.modelUrl } : undefined;
  };

  const need = (m: Mat) => {
    if (m.kind === "BEAD") return tpl.beadsMain + tpl.beadsExtra;
    if (m.kind === "SPACER") return tpl.spacers;
    if (m.kind === "CROSS") return tpl.crosses;
    if (m.kind === "MEDAL") return tpl.medals;
    return 1;
  };

  function choose(m: Mat) {
    setSel((s) => {
      switch (m.kind) {
        case "BEAD": return { ...s, bead: m.id };
        case "SPACER": return { ...s, spacer: m.id };
        case "CROSS": return { ...s, cross: m.id };
        case "MEDAL": return { ...s, medal: m.id };
        case "CHARM": return { ...s, charms: s.charms.includes(m.id) ? s.charms.filter((x) => x !== m.id) : [...s.charms, m.id].slice(0, 6) };
        case "FINISH": return { ...s, finish: s.finish === m.id ? undefined : m.id };
        case "PACKAGING": return { ...s, packaging: s.packaging === m.id ? undefined : m.id };
      }
    });
  }
  const isSel = (m: Mat) => sel.bead === m.id || sel.spacer === m.id || sel.cross === m.id || sel.medal === m.id || sel.charms.includes(m.id) || sel.finish === m.id || sel.packaging === m.id;

  const cur = STEPS[step];
  const missing = (() => {
    if (cur.id === "bolinhas" && !sel.bead) return "Escolha as bolinhas para continuar.";
    if (cur.id === "entremeios" && tpl.spacers > 0 && !sel.spacer) return "Escolha um entremeio para continuar.";
    if (cur.id === "crucifixos" && tpl.crosses > 0 && !sel.cross) return "Escolha um crucifixo para continuar.";
    if (cur.id === "medalhas" && tpl.medals > 0 && !sel.medal) return "Escolha uma medalha para continuar.";
    return "";
  })();

  const canAdd = !!quote?.ok && !quoting;
  function add() {
    if (!config || !canAdd) return;
    addCustom(config);
    setAdded(true);
  }

  const viewer = (
    <RosaryViewer
      counts={{ beadsMain: tpl.beadsMain, beadsExtra: tpl.beadsExtra, spacers: tpl.spacers }}
      bead={part(sel.bead)} extraBead={undefined} spacer={part(sel.spacer)} cross={part(sel.cross)} medal={part(sel.medal)}
      charms={sel.charms.map(part).filter((p): p is Part => !!p)}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* 3D — fixo no topo em celulares, lateral no desktop */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="card sky-bg relative h-[300px] overflow-hidden sm:h-[380px] lg:h-[520px]">{viewer}</div>
        <Totals quote={quote} quoting={quoting} />
      </div>

      <div className="min-w-0">
        {/* Etapas */}
        <ol className="mb-5 flex gap-1.5 overflow-x-auto pb-1" aria-label="Etapas">
          {STEPS.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}
                className={clsx("flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-extrabold", i === step ? "bg-brand text-onaccent shadow-soft" : i < step ? "bg-purple/25 text-fg" : "bg-bg-2 text-fg-2")}>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-card/70 text-[11px]">{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>{s.label}
              </button>
            </li>
          ))}
        </ol>

        {templates.length > 1 && step === 0 && (
          <label className="mb-4 block"><span className="label">Modelo de terço</span>
            <select className="input" value={tplId} onChange={(e) => setTplId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </label>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={cur.id} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
            {cur.id === "revisao" ? (
              <Review quote={quote} sel={sel} byId={byId} tpl={tpl} goTo={setStep} />
            ) : (
              <>
                <p className="mb-3 text-sm text-fg-2">
                  {cur.id === "bolinhas" && `Seu terço usa ${tpl.beadsMain} bolinhas principais${tpl.beadsExtra ? ` + ${tpl.beadsExtra} adicionais` : ""}.`}
                  {cur.id === "entremeios" && `Seu terço usa ${tpl.spacers} entremeio(s).`}
                  {cur.id === "crucifixos" && "Escolha o crucifixo do seu terço."}
                  {cur.id === "medalhas" && "Escolha a medalha de devoção."}
                  {cur.id === "detalhes" && "Opcional: pingentes (até 6), acabamento e embalagem para presente."}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {materials.filter((m) => (cur.kinds as readonly string[]).includes(m.kind)).map((m) => (
                    <MatCard key={m.id} m={m} selected={isSel(m)} need={need(m)} onPick={() => choose(m)} />
                  ))}
                </div>
                {materials.filter((m) => (cur.kinds as readonly string[]).includes(m.kind)).length === 0 && <p className="card p-6 text-center text-fg-2">Ainda não há opções cadastradas nesta etapa.</p>}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {quote && quote.problems.length > 0 && quote.lines.some((l) => !l.ok) && (
          <div role="alert" className="mt-4 rounded-2xl border-2 border-danger/50 bg-danger/10 p-4 text-sm font-bold text-danger">
            {quote.problems.filter((p) => p.includes("indisponível")).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
        {missing && cur.id !== "revisao" && <p className="mt-3 text-sm font-bold text-fg-2" aria-live="polite">{missing}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ChevronLeft className="h-4 w-4" /> Voltar</button>
          {cur.id === "revisao" ? (
            added ? (
              <Link href="/carrinho" className="btn btn-yellow"><Check className="h-5 w-5" /> Adicionado! Ver carrinho</Link>
            ) : (
              <button type="button" className="btn btn-yellow px-8" disabled={!canAdd} onClick={add}><ShoppingBag className="h-5 w-5" /> Adicionar ao carrinho</button>
            )
          ) : (
            <button type="button" className="btn btn-primary" disabled={!!missing} onClick={() => setStep((s) => s + 1)}>Continuar <ChevronRight className="h-4 w-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

function MatCard({ m, selected, need, onPick }: { m: Mat; selected: boolean; need: number; onPick: () => void }) {
  const short = m.available < need;
  const out = m.available <= 0;
  return (
    <button type="button" onClick={onPick} disabled={out} aria-pressed={selected}
      className={clsx("card relative flex flex-col overflow-hidden text-left transition", selected ? "!border-brand ring-4 ring-brand/30" : "hover:-translate-y-0.5", out && "opacity-50")}>
      <div className="relative aspect-square bg-bg-2">
        {m.images[0] ? <Image src={m.images[0]} alt="" fill sizes="(max-width:640px) 45vw, 200px" className="photo object-cover" />
          : <span className="absolute inset-0 grid place-items-center"><span className="h-1/2 w-1/2 rounded-full border-4 border-card shadow-soft" style={{ background: m.colorHex }} /></span>}
        {selected && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-brand text-onaccent"><Check className="h-4 w-4" /></span>}
        {out ? <span className="absolute left-2 top-2 rounded-full bg-fg px-2 py-0.5 text-[11px] font-extrabold text-bg">Esgotado</span>
          : short && <span className="absolute left-2 top-2 rounded-full bg-danger px-2 py-0.5 text-[11px] font-extrabold text-bg">Insuficiente</span>}
      </div>
      <div className="space-y-0.5 p-3">
        <div className="text-sm font-extrabold leading-tight">{m.name}</div>
        <div className="text-xs text-fg-2">{[m.materialType, m.color, m.sizeMm ? `${m.sizeMm} mm` : ""].filter(Boolean).join(" · ")}</div>
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="font-extrabold text-brand-deep">{brl(m.unitPriceCents)} /un</span>
          <span className="text-fg-2">{m.available} em estoque</span>
        </div>
      </div>
    </button>
  );
}

function Totals({ quote, quoting }: { quote: Quote | null; quoting: boolean }) {
  return (
    <div className="card mt-3 p-4" aria-live="polite">
      <div className="flex items-baseline justify-between">
        <span className="font-bold text-fg-2">Total do seu terço</span>
        <span className={clsx("font-display text-3xl font-extrabold text-brand-deep", quoting && "opacity-50")}>{quote ? brl(quote.totalCents) : "—"}</span>
      </div>
    </div>
  );
}

function Review({ quote, sel, byId, tpl, goTo }: { quote: Quote | null; sel: Sel; byId: Map<string, Mat>; tpl: Template; goTo: (n: number) => void }) {
  const rows: { label: string; value?: string; step: number }[] = [
    { label: "Bolinhas", value: sel.bead ? byId.get(sel.bead)?.name : undefined, step: 0 },
    { label: "Entremeio", value: sel.spacer ? byId.get(sel.spacer)?.name : undefined, step: 1 },
    { label: "Crucifixo", value: sel.cross ? byId.get(sel.cross)?.name : undefined, step: 2 },
    { label: "Medalha", value: sel.medal ? byId.get(sel.medal)?.name : undefined, step: 3 },
    { label: "Pingentes", value: sel.charms.map((c) => byId.get(c)?.name).filter(Boolean).join(", ") || undefined, step: 4 },
    { label: "Acabamento", value: sel.finish ? byId.get(sel.finish)?.name : undefined, step: 4 },
    { label: "Embalagem", value: sel.packaging ? byId.get(sel.packaging)?.name : undefined, step: 4 },
  ];
  return (
    <div className="space-y-4">
      <div className="card divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div><div className="font-bold text-fg-2">{r.label}</div><div className={r.value ? "font-extrabold" : "text-fg-2"}>{r.value ?? "—"}</div></div>
            <button type="button" onClick={() => goTo(r.step)} className="font-bold text-brand-deep underline">Alterar</button>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-x">
          <caption className="px-3 pt-3 text-left font-extrabold">Materiais necessários — {tpl.name}</caption>
          <thead><tr><th>Item</th><th className="text-right">Qtd.</th><th className="text-right">Preço un.</th><th className="text-right">Subtotal</th></tr></thead>
          <tbody>
            {quote?.lines.map((l, i) => (
              <tr key={i} className={l.ok ? "" : "text-danger"}>
                <td>{l.name}</td><td className="text-right">{l.qty}</td><td className="text-right">{brl(l.unitCents)}</td><td className="text-right font-bold">{brl(l.totalCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr><td colSpan={3} className="px-3 py-1 text-right text-fg-2">Subtotal de materiais</td><td className="px-3 py-1 text-right font-bold">{brl((quote?.materialsCents ?? 0))}</td></tr>
            <tr><td colSpan={3} className="px-3 py-1 text-right text-fg-2">Personalizações adicionais</td><td className="px-3 py-1 text-right font-bold">{brl(quote?.extrasCents ?? 0)}</td></tr>
            <tr><td colSpan={3} className="px-3 py-1 text-right text-fg-2">Embalagem</td><td className="px-3 py-1 text-right font-bold">{brl(quote?.packagingCents ?? 0)}</td></tr>
            <tr><td colSpan={3} className="px-3 py-1 text-right text-fg-2">Custo de montagem</td><td className="px-3 py-1 text-right font-bold">{brl(quote?.assemblyCents ?? 0)}</td></tr>
            <tr><td colSpan={3} className="px-3 py-2 text-right font-extrabold">Preço final</td><td className="px-3 py-2 text-right font-display text-xl font-extrabold text-brand-deep">{brl(quote?.totalCents ?? 0)}</td></tr>
          </tfoot>
        </table>
      </div>
      {quote && !quote.ok && quote.problems.length > 0 && <ul className="list-disc pl-5 text-sm font-bold text-danger" role="alert">{quote.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
    </div>
  );
}
