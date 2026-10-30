import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RESOURCES } from "@/lib/resources";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u || u.role !== "ADMIN" || !u.totpEnabled) redirect("/admin/login");
  const groups = [
    { title: "Visão geral", links: [{ href: "/admin", label: "Dashboard" }, { href: "/admin/pedidos", label: "Pedidos" }, { href: "/admin/estoque", label: "Estoque" }] },
    { title: "Loja", links: RESOURCES.filter((r) => ["produtos", "categorias", "cupons"].includes(r.key)).map((r) => ({ href: `/admin/${r.key}`, label: r.label })) },
    { title: "Personalizador", links: RESOURCES.filter((r) => r.model === "material" || r.key === "composicoes").map((r) => ({ href: `/admin/${r.key}`, label: r.label })) },
    { title: "Site", links: [...RESOURCES.filter((r) => ["banners", "depoimentos"].includes(r.key)).map((r) => ({ href: `/admin/${r.key}`, label: r.label })), { href: "/admin/aparencia", label: "Aparência e textos" }, { href: "/admin/configuracoes", label: "Configurações" }] },
    { title: "Sistema", links: [{ href: "/admin/registros", label: "Automações e auditoria" }] },
  ];
  return (
    <div className="container-x grid gap-6 py-6 lg:grid-cols-[230px_1fr]">
      <AdminNav groups={groups} />
      <div className="min-w-0">
        <p className="mb-4 text-sm text-fg-2">Logado como <b>{u.email}</b> · <Link href="/" className="underline">ver loja</Link></p>
        {children}
      </div>
    </div>
  );
}
