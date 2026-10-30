import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl, STATUS_LABEL } from "@/lib/format";
import { AuthForm } from "@/components/AuthForm";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = { title: "Área do cliente", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Conta() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <div className="container-x max-w-md py-14">
        <h1 className="text-3xl">Área do cliente</h1>
        <p className="mb-6 mt-1 text-fg-2">Entre ou crie sua conta para acompanhar seus pedidos.</p>
        <AuthForm />
      </div>
    );
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="container-x max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">Olá, {user.name.split(" ")[0]}!</h1><p className="text-fg-2">{user.email}</p></div>
        <div className="flex gap-2">{user.role === "ADMIN" && <Link href="/admin" className="btn btn-purple btn-sm">Painel</Link>}<LogoutButton /></div>
      </div>
      <h2 className="mb-3 mt-8 text-xl">Meus pedidos</h2>
      {orders.length === 0 ? <p className="card p-6 text-fg-2">Você ainda não fez pedidos.</p> : (
        <ul className="space-y-2">{orders.map((o) => (
          <li key={o.id}><Link href={`/pedido/${o.id}?t=${o.accessToken}`} className="card card-hover flex items-center justify-between p-4">
            <span className="font-bold">#{o.number} · {o.createdAt.toLocaleDateString("pt-BR")}</span>
            <span className="text-sm"><span className="chip mr-2">{STATUS_LABEL[o.status]}</span><b>{brl(o.totalCents)}</b></span>
          </Link></li>
        ))}</ul>
      )}
    </div>
  );
}
