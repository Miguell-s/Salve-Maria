import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Gem, Cross, Gift, Star as StarIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { activeCategories, bestSellers, newest, toCard } from "@/lib/catalog";
import { Cloud, Dashes, FloatingDecor, Heart, Star } from "@/components/Decor";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { RosaryIllustration } from "@/components/RosaryIllustration";
import { NewsletterForm } from "@/components/NewsletterForm";

export const revalidate = 60;

const KIND_CARDS = [
  { kind: "BEAD", label: "Bolinhas", Icon: Gem, tint: "bg-purple/25" },
  { kind: "CROSS", label: "Crucifixos", Icon: Cross, tint: "bg-yellow/30" },
  { kind: "MEDAL", label: "Medalhas", Icon: StarIcon, tint: "bg-pink/25" },
  { kind: "PACKAGING", label: "Embalagens", Icon: Gift, tint: "bg-brand/25" },
] as const;

export default async function Home() {
  const [s, best, news, cats, testimonials, banners, kindCounts] = await Promise.all([
    getSettings(), bestSellers(8), newest(4), activeCategories(),
    prisma.testimonial.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
    prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 1 }),
    prisma.material.groupBy({ by: ["kind"], where: { active: true }, _count: true }),
  ]);
  const counts = Object.fromEntries(kindCounts.map((k) => [k.kind, k._count]));
  const banner = banners[0];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="sky-bg relative isolate overflow-hidden">
        <FloatingDecor />
        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20 lg:py-24">
          <Reveal>
            <span className="chip mb-4 bg-card shadow-soft"><Heart className="mr-1.5 h-3.5 w-3.5 text-pink" /> {s.heroChip}</span>
            <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl">
              {s.heroTitle.split(",").length > 1 ? (
                <>
                  <span className="text-purple">{s.heroTitle.split(",")[0]},</span>{" "}
                  <span className="title-outline text-yellow">{s.heroTitle.split(",").slice(1).join(",").trim()}</span>
                </>
              ) : (
                <span className="gradient-text">{s.heroTitle}</span>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-fg-2">{s.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/personalizar" className="btn btn-yellow px-8 py-3.5 text-base">{s.heroCtaPrimary} <ArrowRight className="h-5 w-5" /></Link>
              <Link href="/loja" className="btn btn-ghost px-8 py-3.5 text-base">{s.heroCtaSecondary}</Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border-4 border-card bg-card shadow-pop">
              {s.heroImage ? (
                <Image src={s.heroImage} alt="Terço católico" fill priority sizes="(max-width:768px) 90vw, 450px" className="photo object-cover" />
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-brand/30 via-card to-pink/25 p-8">
                  <RosaryIllustration className="h-full w-full animate-floaty" />
                </div>
              )}
            </div>
            <Star className="absolute -left-4 top-10 w-8 animate-twinkle text-yellow" />
            <Heart className="absolute -right-3 bottom-16 w-9 animate-beat text-pink" />
            <Dashes className="absolute -bottom-6 -left-8 w-24 text-brand-deep" />
          </Reveal>
        </div>
        <Cloud className="absolute inset-x-0 -bottom-6 mx-auto w-[120%] max-w-none -translate-x-[10%] text-bg" />
      </section>

      {/* ================= PERSONALIZE ================= */}
      <section className="container-x relative -mt-4 py-16 md:py-20">
        <Reveal>
          <div className="gradient-hero relative overflow-hidden rounded-[2rem] p-8 shadow-pop md:p-12">
            <Cloud className="absolute -right-8 -top-6 w-56 text-white/20" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
              <div>
                <h2 className="section-title !text-white">{s.customizeTitle}</h2>
                <p className="mt-3 max-w-xl text-lg font-semibold text-white">{s.customizeText}</p>
                <Link href="/personalizar" className="btn btn-yellow mt-6 px-8 py-3.5 text-base"><Sparkles className="h-5 w-5" /> {s.customizeCta}</Link>
              </div>
              <ol className="grid grid-cols-3 gap-3 text-center text-sm font-extrabold md:grid-cols-2">
                {s.customizeSteps.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-card/95 px-2 py-3 text-fg shadow-soft"><span className="mb-1 block font-display text-xl text-purple">{i + 1}</span>{t}</li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>
      </section>

      {banner && (
        <section className="container-x pb-8">
          <Link href={banner.linkUrl || "/loja"} className="card relative block overflow-hidden">
            <div className="relative aspect-[3/1] min-h-[140px]">
              <Image src={banner.imageUrl} alt={banner.title} fill sizes="100vw" className="photo object-cover" />
              <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/55 to-transparent p-6 text-white md:p-10">
                <h2 className="!text-white text-2xl md:text-4xl">{banner.title}</h2>
                {banner.subtitle && <p className="mt-1 font-semibold">{banner.subtitle}</p>}
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ================= MAIS VENDIDOS ================= */}
      <Section title={s.bestSellersTitle} href="/loja" cta={s.bestSellersCta}>
        {best.length ? <Grid>{best.map((p, i) => <ProductCard key={p.id} p={toCard(p)} index={i} />)}</Grid> : <Empty />}
      </Section>

      {/* ================= COLEÇÃO ================= */}
      {cats.length > 0 && (
        <section className="bg-bg-2 py-16">
          <div className="container-x">
            <Reveal><h2 className="section-title mb-8 text-center">{s.collectionTitle}</h2></Reveal>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {cats.map((c, i) => (
                <Reveal key={c.id} delay={(i % 4) * 0.05}>
                  <Link href={`/loja?cat=${c.slug}`} className="card card-hover flex h-full flex-col items-center gap-2 p-5 text-center">
                    <span className={`grid h-14 w-14 place-items-center rounded-full ${["bg-brand/25", "bg-pink/25", "bg-purple/25", "bg-yellow/30"][i % 4]}`}><Heart className="h-6 w-6 text-fg" /></span>
                    <span className="font-display text-base font-extrabold leading-tight">{c.name}</span>
                    <span className="text-xs text-fg-2">{c._count.products} {c._count.products === 1 ? "modelo" : "modelos"}</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= NOVIDADES ================= */}
      {news.length > 0 && (
        <Section title={s.newArrivalsTitle} href="/loja?ordem=novos" cta={s.newArrivalsCta}>
          <Grid>{news.map((p, i) => <ProductCard key={p.id} p={toCard(p)} index={i} />)}</Grid>
        </Section>
      )}

      {/* ================= MATERIAIS ================= */}
      <section className="bg-bg-2 py-16">
        <div className="container-x">
          <Reveal><h2 className="section-title mb-2 text-center">{s.materialsTitle}</h2>
            <p className="mx-auto mb-8 max-w-xl text-center text-fg-2">{s.materialsSubtitle}</p></Reveal>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {KIND_CARDS.map(({ kind, label, Icon, tint }, i) => (
              <Reveal key={kind} delay={i * 0.05}>
                <Link href="/personalizar" className="card card-hover flex flex-col items-center gap-3 p-6 text-center">
                  <span className={`grid h-16 w-16 place-items-center rounded-full ${tint}`}><Icon className="h-8 w-8" /></span>
                  <span className="font-display text-lg font-extrabold">{label}</span>
                  <span className="text-sm text-fg-2">{counts[kind] ?? 0} opções</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMO FUNCIONA ================= */}
      <section className="container-x py-16 md:py-20">
        <Reveal><h2 className="section-title mb-10 text-center">{s.howItWorksTitle}</h2></Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {s.howItWorks.map((h, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="card relative h-full p-7 text-center">
                <span className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full font-display text-2xl font-extrabold ${["bg-brand text-onaccent", "bg-purple2 text-onpurple", "bg-pink text-onaccent"][i % 3]}`}>{i + 1}</span>
                <h3 className="text-xl">{h.title}</h3>
                <p className="mt-2 text-fg-2">{h.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= HISTÓRIA ================= */}
      <section className="sky-bg py-16">
        <div className="container-x grid items-center gap-8 md:grid-cols-2">
          <Reveal>
            <h2 className="section-title">{s.historyTitle}</h2>
            <p className="mt-4 line-clamp-6 whitespace-pre-line text-lg text-fg-2">{s.historyText}</p>
            <Link href="/historia" className="btn btn-purple mt-6">Conheça a Salve Maria <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <Reveal delay={0.1} className="relative mx-auto w-full max-w-sm">
            <Image src="/brand/logo-compact.png" alt="Logo Salve Maria" width={900} height={540} className="photo h-auto w-full animate-floaty" />
          </Reveal>
        </div>
      </section>

      {/* ================= DEPOIMENTOS ================= */}
      {testimonials.length > 0 && (
        <section className="container-x py-16 md:py-20">
          <Reveal><h2 className="section-title mb-10 text-center">Quem recebeu, amou</h2></Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} delay={(i % 3) * 0.07}>
                <figure className="card h-full p-6">
                  <div className="mb-3 flex gap-0.5 text-yellow" aria-label={`${t.rating} de 5 estrelas`}>
                    {Array.from({ length: t.rating }).map((_, k) => <Star key={k} className="h-5 w-5" />)}
                  </div>
                  <blockquote className="text-fg">“{t.text}”</blockquote>
                  <figcaption className="mt-4 text-sm font-bold text-fg-2">{t.author}{t.city ? ` · ${t.city}` : ""}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ================= INSTAGRAM ================= */}
      {(s.instagramUser || s.instagramImages.length > 0) && (
        <section className="bg-bg-2 py-16">
          <div className="container-x text-center">
            <h2 className="section-title">Siga no Instagram</h2>
            {s.instagramUser && (
              <a href={`https://instagram.com/${s.instagramUser}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-bold text-brand-deep hover:underline">@{s.instagramUser}</a>
            )}
            {s.instagramImages.length > 0 && (
              <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
                {s.instagramImages.map((src, i) => (
                  <a key={i} href={s.instagramUser ? `https://instagram.com/${s.instagramUser}` : "#"} target="_blank" rel="noopener noreferrer" className="relative block aspect-square overflow-hidden rounded-2xl">
                    <Image src={src} alt={`Foto do Instagram ${i + 1}`} fill sizes="(max-width:768px) 33vw, 16vw" className="photo object-cover transition hover:scale-105" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= NEWSLETTER ================= */}
      <section className="container-x py-16 md:py-20">
        <Reveal>
          <div className="card mx-auto max-w-3xl p-8 text-center md:p-12">
            <Heart className="mx-auto mb-3 h-9 w-9 animate-beat text-pink" />
            <h2 className="text-3xl">Receba novidades e ofertas</h2>
            <p className="mx-auto mb-6 mt-2 max-w-md text-fg-2">Lançamentos, promoções e dicas para cuidar do seu terço.</p>
            <div className="mx-auto max-w-lg text-left"><NewsletterForm /></div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Section({ title, href, cta, children }: { title: string; href: string; cta: string; children: React.ReactNode }) {
  return (
    <section className="container-x py-14 md:py-16">
      <Reveal>
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="section-title">{title}</h2>
          <Link href={href} className="hidden items-center gap-1 font-display font-extrabold text-brand-deep hover:underline sm:flex">{cta} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </Reveal>
      {children}
    </section>
  );
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{children}</div>;
const Empty = () => <p className="card p-8 text-center text-fg-2">Em breve novos terços por aqui. 💙</p>;
