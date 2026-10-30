import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } });
  return [
    ...["", "/personalizar", "/loja", "/historia", "/contato"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const })),
    ...products.map((p) => ({ url: `${base}/loja/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
