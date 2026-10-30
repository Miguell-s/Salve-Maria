import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { activeCategories, toCard } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { PageIn } from "@/components/Reveal";
import clsx from "clsx";

export const metadata: Metadata = { title: "Terços prontos", description: "Terços católicos prontos para presentear ou rezar: pérolas, cristais, madeira e muito mais." };

const PER_PAGE = 12;
const ORDERS: Record<string, { label: string; by: Prisma.ProductOrderByWithRelationInput[] }> = {
  relevancia: { label: "Destaques", by: [{ featured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }] },
  novos: { label: "Mais novos", by: [{ createdAt: "desc" }] },
  vendidos: { label: "Mais vendidos", by: [{ soldCount: "desc" }] },
  "preco-asc": { label: "Menor preço", by: [{ priceCents: "asc" }] },
  "preco-desc": { label: "Maior preço", by: [{ priceCents: "desc" }] },
};

type SP = { cat?: string; q?: string; ordem?: string; pagina?: string };

export default async function Loja({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1);
  const ordem = ORDERS[sp.ordem ?? ""] ? sp.ordem! : "relevancia";

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(sp.cat ? { category: { slug: sp.cat } } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { materials: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [cats, total, products] = await Promise.all([
    activeCategories(),
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: { category: true }, orderBy: ORDERS[ordem].by, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { cat: sp.cat, q, ordem: sp.ordem, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/loja${s ? `?${s}` : ""}`;
  };

  return (
    <PageIn>
      <div className="sky-bg border-b border-line py-10">
        <div className="container-x">
          <h1 className="text-4xl sm:text-5xl">{q ? <>Resultados para “{q}”</> : "Terços prontos"}</h1>
          <p className="mt-2 text-fg-2">{total} {total === 1 ? "modelo encontrado" : "modelos encontrados"}</p>
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filtros" className="space-y-6">
          <div>
            <h2 className="mb-3 text-base">Categorias</h2>
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              <li><Link href={href({ cat: undefined, pagina: undefined })} className={clsx("block rounded-full px-4 py-2 text-sm font-bold lg:rounded-xl", !sp.cat ? "bg-brand text-onaccent" : "bg-bg-2 text-fg hover:bg-brand/20")}>Todos</Link></li>
              {cats.map((c) => (
                <li key={c.id}><Link href={href({ cat: c.slug, pagina: undefined })} className={clsx("block rounded-full px-4 py-2 text-sm font-bold lg:rounded-xl", sp.cat === c.slug ? "bg-brand text-onaccent" : "bg-bg-2 text-fg hover:bg-brand/20")}>{c.name} <span className="opacity-70">({c._count.products})</span></Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-base">Ordenar</h2>
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {Object.entries(ORDERS).map(([k, o]) => (
                <li key={k}><Link href={href({ ordem: k === "relevancia" ? undefined : k, pagina: undefined })} className={clsx("block rounded-full px-4 py-2 text-sm font-bold lg:rounded-xl", ordem === k ? "bg-purple2 text-onpurple" : "bg-bg-2 text-fg hover:bg-purple/20")}>{o.label}</Link></li>
              ))}
            </ul>
          </div>
        </aside>

        <section>
          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-lg font-bold">Nenhum terço encontrado.</p>
              <p className="mt-1 text-fg-2">Tente outra busca ou <Link href="/personalizar" className="font-bold text-brand-deep underline">crie o seu do seu jeitinho</Link>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
              {products.map((p, i) => <ProductCard key={p.id} p={toCard(p)} index={i} />)}
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="Paginação" className="mt-10 flex flex-wrap justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={href({ pagina: String(n) })} aria-current={n === page ? "page" : undefined} className={clsx("grid h-11 min-w-11 place-items-center rounded-full px-3 font-bold", n === page ? "bg-brand text-onaccent" : "bg-bg-2 hover:bg-brand/20")}>{n}</Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </PageIn>
  );
}
