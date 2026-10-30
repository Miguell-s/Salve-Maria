import { prisma } from "@/lib/db";
import { brl } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const PAID = ["PAID", "IN_PRODUCTION", "PREPARING", "SHIPPED", "DELIVERED"] as const;

function Bars({ data, fmt = (n: number) => String(n) }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) return <p className="text-sm text-fg-2">Sem dados ainda.</p>;
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate text-fg-2" title={d.label}>{d.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-bg-2"><span className="block h-full rounded-full gradient-bg" style={{ width: `${(d.value / max) * 100}%` }} /></span>
          <span className="font-bold tabular-nums">{fmt(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function Dashboard() {
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const [paidAgg, pending, done, products, soldOut, matsTotal, matsLow, prodLow, customers, customSold, recent, top, used] = await Promise.all([
    prisma.order.aggregate({ where: { status: { in: [...PAID] } }, _sum: { totalCents: true }, _count: true }),
    prisma.order.count({ where: { status: { in: ["NEW", "AWAITING_PAYMENT"] } } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "ACTIVE", stock: { lte: 0 } } }),
    prisma.material.count({ where: { active: true } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM "Material" WHERE active AND stock <= "lowStockAt"`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM "Product" WHERE status = 'ACTIVE' AND stock <= "lowStockAt" AND stock > 0`,
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.orderItem.aggregate({ where: { type: "CUSTOM", order: { status: { in: [...PAID] } } }, _sum: { qty: true } }),
    prisma.order.findMany({ where: { status: { in: [...PAID] }, createdAt: { gte: since30 } }, select: { createdAt: true, totalCents: true } }),
    prisma.product.findMany({ where: { soldCount: { gt: 0 } }, orderBy: { soldCount: "desc" }, take: 5, select: { name: true, soldCount: true } }),
    prisma.stockMovement.findMany({ where: { targetTable: "Material", reason: "VENDA", createdAt: { gte: since30 } }, select: { targetId: true, delta: true } }),
  ]);

  // vendas/faturamento por semana (últimas 4)
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = Date.now() - i * 7 * 86400_000, start = end - 7 * 86400_000;
    const rows = recent.filter((o) => o.createdAt.getTime() > start && o.createdAt.getTime() <= end);
    return { label: i === 0 ? "Esta semana" : `${i} sem. atrás`, count: rows.length, cents: rows.reduce((a, o) => a + o.totalCents, 0) };
  }).reverse();

  const usedBy = new Map<string, number>();
  for (const m of used) usedBy.set(m.targetId, (usedBy.get(m.targetId) ?? 0) + Math.abs(m.delta));
  const topIds = [...usedBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const names = await prisma.material.findMany({ where: { id: { in: topIds.map(([id]) => id) } }, select: { id: true, name: true } });
  const nameOf = new Map(names.map((n) => [n.id, n.name]));

  const attention = await prisma.order.count({ where: { needsAttention: true } });
  const stats = [
    ["Faturamento", brl(paidAgg._sum.totalCents ?? 0)], ["Vendas", paidAgg._count], ["Pedidos pendentes", pending], ["Pedidos concluídos", done],
    ["Produtos cadastrados", products], ["Produtos esgotados", soldOut], ["Materiais ativos", matsTotal], ["Estoque baixo", Number(matsLow[0].n) + Number(prodLow[0].n)],
    ["Clientes", customers], ["Terços personalizados vendidos", customSold._sum.qty ?? 0],
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard</h1>
      {attention > 0 && <a href="/admin/pedidos?atencao=1" className="block rounded-2xl border-2 border-danger/50 bg-danger/10 p-4 font-bold text-danger">⚠ {attention} pedido(s) precisam de atenção (pagamento/estoque). Ver pedidos →</a>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([l, v]) => (<div key={l as string} className="card p-4"><div className="text-xs font-bold text-fg-2">{l}</div><div className="mt-1 font-display text-2xl font-extrabold text-brand-deep">{v}</div></div>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 text-lg">Vendas (4 semanas)</h2><Bars data={weeks.map((w) => ({ label: w.label, value: w.count }))} /></section>
        <section className="card p-5"><h2 className="mb-3 text-lg">Faturamento (4 semanas)</h2><Bars data={weeks.map((w) => ({ label: w.label, value: w.cents }))} fmt={brl} /></section>
        <section className="card p-5"><h2 className="mb-3 text-lg">Terços mais vendidos</h2><Bars data={top.map((t) => ({ label: t.name, value: t.soldCount }))} /></section>
        <section className="card p-5"><h2 className="mb-3 text-lg">Materiais mais usados (30 dias)</h2><Bars data={topIds.map(([id, v]) => ({ label: nameOf.get(id) ?? "—", value: v }))} /></section>
      </div>
    </div>
  );
}
