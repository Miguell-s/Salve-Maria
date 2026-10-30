import crypto from "node:crypto";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { brl, STATUS_LABEL } from "@/lib/format";
import { PayButton } from "@/components/PayButton";
import type { Address } from "@/lib/orders";

export const metadata: Metadata = { title: "Meu pedido", robots: { index: false } };
export const dynamic = "force-dynamic";

const FLOW = ["AWAITING_PAYMENT", "PAID", "IN_PRODUCTION", "PREPARING", "SHIPPED", "DELIVERED"] as const;

export default async function Pedido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = [await params, await searchParams];
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  // Acesso: token secreto do pedido (comparação em tempo constante) OU dono logado. Evita IDOR.
  const tokenOk = !!t && t.length === order.accessToken.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(order.accessToken));
  const s = await getSession();
  if (!tokenOk && !(s && order.userId === s.uid)) notFound();

  const a = order.address as unknown as Address;
  const idx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl">Pedido #{order.number}</h1>
      <p className="mt-1 font-bold text-brand-deep">{STATUS_LABEL[order.status]}</p>

      {order.status !== "CANCELED" ? (
        <ol className="my-6 grid grid-cols-3 gap-2 text-center text-xs font-bold sm:grid-cols-6">
          {FLOW.map((st, i) => (
            <li key={st} className={`rounded-xl px-1 py-2 ${i <= idx ? "bg-brand text-onaccent" : "bg-bg-2 text-fg-2"}`}>{STATUS_LABEL[st]}</li>
          ))}
        </ol>
      ) : <p className="my-6 rounded-2xl bg-danger/10 p-4 font-bold text-danger">Este pedido foi cancelado.</p>}

      {order.status === "AWAITING_PAYMENT" && <PayButton orderId={order.id} token={order.accessToken} />}

      <div className="card mt-6 divide-y divide-line">
        {order.items.map((i) => (
          <div key={i.id} className="p-4 text-sm">
            <div className="flex justify-between font-bold"><span>{i.qty}× {i.name}</span><span>{brl(i.unitPriceCents * i.qty)}</span></div>
            {i.type === "CUSTOM" && Array.isArray(i.materialLines) && (
              <ul className="mt-1 text-fg-2">{(i.materialLines as { name: string; qty: number }[]).map((m, k) => <li key={k}>{m.qty * i.qty} × {m.name}</li>)}</ul>
            )}
          </div>
        ))}
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between"><span className="text-fg-2">Frete</span><span>{brl(order.shippingCents)}</span></div>
          {order.discountCents > 0 && <div className="flex justify-between text-ok"><span>Desconto</span><span>-{brl(order.discountCents)}</span></div>}
          <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="text-brand-deep">{brl(order.totalCents)}</span></div>
        </div>
      </div>
      <p className="mt-4 text-sm text-fg-2">Entrega: {a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ""}, {a.district}, {a.city}/{a.state}</p>
    </div>
  );
}
