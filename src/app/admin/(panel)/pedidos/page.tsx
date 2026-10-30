import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { brl, STATUS_LABEL } from "@/lib/format";
import { OrderRow } from "@/components/admin/OrderRow";
import { orderDetailsText } from "@/lib/orders";

export const metadata: Metadata = { title: "Pedidos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ status?: string; atencao?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUS_LABEL ? sp.status : undefined;
  const orders = await prisma.order.findMany({
    where: { ...(status ? { status: status as never } : {}), ...(sp.atencao ? { needsAttention: true } : {}) },
    include: { items: true }, orderBy: { createdAt: "desc" }, take: 100,
  });
  return (
    <div>
      <h1 className="mb-4 text-3xl">Pedidos</h1>
      <div className="mb-4 flex flex-wrap gap-2 text-sm font-bold">
        <a href="/admin/pedidos" className={`rounded-full px-3 py-1.5 ${!status && !sp.atencao ? "bg-brand text-onaccent" : "bg-bg-2"}`}>Todos</a>
        <a href="/admin/pedidos?atencao=1" className={`rounded-full px-3 py-1.5 ${sp.atencao ? "bg-danger text-bg" : "bg-bg-2"}`}>Precisam de atenção</a>
        {Object.entries(STATUS_LABEL).map(([k, l]) => <a key={k} href={`/admin/pedidos?status=${k}`} className={`rounded-full px-3 py-1.5 ${status === k ? "bg-brand text-onaccent" : "bg-bg-2"}`}>{l}</a>)}
      </div>
      {orders.length === 0 ? <p className="card p-8 text-center text-fg-2">Nenhum pedido.</p> : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <OrderRow key={o.id} id={o.id} number={o.number} status={o.status} needsAttention={o.needsAttention} total={brl(o.totalCents)} date={o.createdAt.toLocaleString("pt-BR")} name={o.name} paymentStatus={o.paymentStatus} details={orderDetailsText(o)} />
          ))}
        </ul>
      )}
    </div>
  );
}
