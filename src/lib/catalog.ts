import type { Category, Product } from "@prisma/client";
import { prisma } from "./db";
import { available, parseImages } from "./format";
import type { CardProduct } from "@/components/ProductCard";

export type ProductWithCat = Product & { category: Category | null };

export const toCard = (p: ProductWithCat): CardProduct => ({
  id: p.id, slug: p.slug, name: p.name, image: parseImages(p.images)[0], priceCents: p.priceCents, salePriceCents: p.salePriceCents,
  available: available(p), isNew: p.isNew, isDemo: p.isDemo, category: p.category?.name,
});

const ACTIVE = { status: "ACTIVE" as const };

export const bestSellers = (take = 8) =>
  prisma.product.findMany({ where: ACTIVE, include: { category: true }, orderBy: [{ soldCount: "desc" }, { featured: "desc" }, { createdAt: "desc" }], take });

export const newest = (take = 4) =>
  prisma.product.findMany({ where: { ...ACTIVE, isNew: true }, include: { category: true }, orderBy: { createdAt: "desc" }, take });

export const activeCategories = () =>
  prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: ACTIVE } } } } });
