import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { available, brl, parseImages } from "@/lib/format";
import { toCard } from "@/lib/catalog";
import { Gallery } from "@/components/Gallery";
import { BuyBox } from "@/components/BuyBox";
import { ProductCard } from "@/components/ProductCard";
import { PageIn } from "@/components/Reveal";

type Props = { params: Promise<{ slug: string }> };

const get = (slug: string) => prisma.product.findFirst({ where: { slug, status: "ACTIVE" }, include: { category: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await get((await params).slug);
  if (!p) return {};
  const images = parseImages(p.images);
  return { title: p.name, description: p.description.slice(0, 160), openGraph: { images: images[0] ? [images[0]] : ["/brand/og.png"] } };
}

export default async function ProductPage({ params }: Props) {
  const p = await get((await params).slug);
  if (!p) notFound();
  const av = available(p);
  const images = parseImages(p.images);
  const price = p.salePriceCents ?? p.priceCents;
  const related = await prisma.product.findMany({
    where: { status: "ACTIVE", id: { not: p.id }, ...(p.categoryId ? { categoryId: p.categoryId } : {}) },
    include: { category: true }, take: 4, orderBy: { soldCount: "desc" },
  });

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, sku: p.sku,
    image: images.map((i) => `${process.env.APP_URL ?? ""}${i}`),
    offers: { "@type": "Offer", priceCurrency: "BRL", price: (price / 100).toFixed(2), availability: av > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <PageIn>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x py-8">
        <nav aria-label="Você está em" className="mb-6 text-sm text-fg-2">
          <Link href="/" className="hover:text-fg">Início</Link> / <Link href="/loja" className="hover:text-fg">Terços prontos</Link>
          {p.category && <> / <Link href={`/loja?cat=${p.category.slug}`} className="hover:text-fg">{p.category.name}</Link></>}
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <Gallery images={images} name={p.name} />
          <div>
            {p.isDemo && <span className="chip mb-2 bg-purple2 text-onpurple">Produto de demonstração</span>}
            <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
            <p className="mt-1 text-sm text-fg-2">Código: {p.sku}</p>
            <div className="mt-5 flex items-end gap-3">
              <span className="font-display text-4xl font-extrabold text-brand-deep">{brl(price)}</span>
              {p.salePriceCents != null && <span className="pb-1 text-fg-2 line-through">{brl(p.priceCents)}</span>}
            </div>
            <p className="mt-1 text-sm font-bold">
              {av <= 0 ? <span className="text-danger">Esgotado</span> : av <= p.lowStockAt ? <span className="text-pink">Últimas {av} unidades!</span> : <span className="text-ok">Em estoque</span>}
            </p>
            <p className="mt-5 whitespace-pre-line text-fg-2">{p.description}</p>
            <BuyBox productId={p.id} available={av} />
            <dl className="card mt-8 grid grid-cols-2 gap-4 p-5 text-sm">
              {p.materials && <div><dt className="font-bold text-fg-2">Materiais</dt><dd>{p.materials}</dd></div>}
              {p.dimensions && <div><dt className="font-bold text-fg-2">Dimensões</dt><dd>{p.dimensions}</dd></div>}
              {p.weightGrams != null && <div><dt className="font-bold text-fg-2">Peso</dt><dd>{p.weightGrams} g</dd></div>}
              {p.category && <div><dt className="font-bold text-fg-2">Categoria</dt><dd>{p.category.name}</dd></div>}
            </dl>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl">Você também vai gostar</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{related.map((r, i) => <ProductCard key={r.id} p={toCard(r)} index={i} />)}</div>
          </section>
        )}
      </div>
    </PageIn>
  );
}
