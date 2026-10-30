import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Registros", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Registros() {
  const [auto, audit, moves] = await Promise.all([
    prisma.automationLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const color = (s: string) => (s === "SENT" ? "text-ok" : s === "FAILED" ? "text-danger" : "text-fg-2");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Automações e auditoria</h1>
      <section className="card overflow-x-auto"><h2 className="p-4 pb-0 text-lg">Notificações (e-mail / WhatsApp)</h2>
        <table className="table-x"><thead><tr><th>Quando</th><th>Tipo</th><th>Canal</th><th>Destino</th><th>Status</th><th>Erro</th></tr></thead>
          <tbody>{auto.map((a) => <tr key={a.id}><td>{a.createdAt.toLocaleString("pt-BR")}</td><td>{a.kind}</td><td>{a.channel}</td><td>{a.target}</td><td className={`font-bold ${color(a.status)}`}>{a.status}</td><td className="max-w-xs truncate">{a.error}</td></tr>)}
            {auto.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-fg-2">Nada ainda.</td></tr>}</tbody></table>
        <p className="p-3 text-xs text-fg-2">SKIPPED = canal ainda sem credenciais no .env. FAILED = tentativa feita e recusada; veja o erro.</p>
      </section>
      <section className="card overflow-x-auto"><h2 className="p-4 pb-0 text-lg">Movimentação de estoque</h2>
        <table className="table-x"><thead><tr><th>Quando</th><th>Tabela</th><th>Item</th><th>Variação</th><th>Motivo</th></tr></thead>
          <tbody>{moves.map((m) => <tr key={m.id}><td>{m.createdAt.toLocaleString("pt-BR")}</td><td>{m.targetTable}</td><td className="font-mono text-xs">{m.targetId.slice(-8)}</td><td className={`font-bold ${m.delta < 0 ? "text-pink" : "text-ok"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</td><td>{m.reason}</td></tr>)}</tbody></table>
      </section>
      <section className="card overflow-x-auto"><h2 className="p-4 pb-0 text-lg">Auditoria (ações administrativas e logins)</h2>
        <table className="table-x"><thead><tr><th>Quando</th><th>Ação</th><th>Entidade</th><th>IP</th></tr></thead>
          <tbody>{audit.map((a) => <tr key={a.id}><td>{a.createdAt.toLocaleString("pt-BR")}</td><td>{a.action}</td><td>{a.entity}</td><td>{a.ip}</td></tr>)}</tbody></table>
      </section>
    </div>
  );
}
