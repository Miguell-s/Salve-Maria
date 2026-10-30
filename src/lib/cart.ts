import { z } from "zod";
import { prisma } from "./db";
import { available, parseImages } from "./format";
import { customConfigSchema, quoteCustom, type QuoteLine } from "./pricing";
import { getSettings } from "./settings";

export const cartItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("READY"), productId: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) }),
  z.object({ type: z.literal("CUSTOM"), config: customConfigSchema, qty: z.number().int().min(1).max(10) }),
]);
export const cartSchema = z.array(cartItemSchema).max(30);
export type CartItem = z.infer<typeof cartItemSchema>;

export type PricedItem = {
  index: number;
  type: "READY" | "CUSTOM";
  productId?: string;
  name: string;
  image?: string;
  unitCents: number;
  qty: number;
  totalCents: number;
  ok: boolean;
  problems: string[];
  config?: z.infer<typeof customConfigSchema>;
  materialLines?: QuoteLine[];
  slug?: string;
};

export type PricedCart = {
  items: PricedItem[];
  subtotalCents: number;
  discountCents: number;
  couponCode?: string;
  couponError?: string;
  ok: boolean;
};

export async function priceCart(items: CartItem[], couponCode?: string): Promise<PricedCart> {
  const out: PricedItem[] = [];
  const productIds = items.flatMap((i) => (i.type === "READY" ? [i.productId] : []));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const pById = new Map(products.map((p) => [p.id, p]));

  // quantidade total de cada produto no carrinho (mesmo produto em linhas diferentes)
  const wantedByProduct = new Map<string, number>();
  for (const i of items) if (i.type === "READY") wantedByProduct.set(i.productId, (wantedByProduct.get(i.productId) ?? 0) + i.qty);

  for (const [index, it] of items.entries()) {
    if (it.type === "READY") {
      const p = pById.get(it.productId);
      if (!p || p.status !== "ACTIVE") {
        out.push({ index, type: "READY", name: "Produto indisponível", unitCents: 0, qty: it.qty, totalCents: 0, ok: false, problems: ["Produto indisponível."] });
        continue;
      }
      const unit = p.salePriceCents ?? p.priceCents;
      const av = available(p);
      const want = wantedByProduct.get(p.id) ?? it.qty;
      const ok = av >= want;
      out.push({
        index, type: "READY", productId: p.id, slug: p.slug, name: p.name, image: parseImages(p.images)[0],
        unitCents: unit, qty: it.qty, totalCents: unit * it.qty, ok,
        problems: ok ? [] : [av === 0 ? "Esgotado." : `Só há ${av} unidade(s) disponível(is).`],
      });
    } else {
      const q = await quoteCustom(it.config);
      // N unidades de um terço personalizado exigem N× os materiais
      const scaled = q.lines.map((l) => ({ ...l, ok: l.available >= l.qty * it.qty }));
      const stockOk = scaled.every((l) => l.ok);
      const problems = [...q.problems];
      if (q.ok && !stockOk) problems.push("Materiais insuficientes para a quantidade pedida.");
      out.push({
        index, type: "CUSTOM", name: "Terço personalizado", unitCents: q.totalCents, qty: it.qty,
        totalCents: q.totalCents * it.qty, ok: q.ok && stockOk, problems, config: it.config, materialLines: q.lines,
      });
    }
  }

  const subtotalCents = out.reduce((a, i) => a + i.totalCents, 0);
  let discountCents = 0;
  let couponError: string | undefined;
  let applied: string | undefined;
  if (couponCode) {
    const code = couponCode.trim().toUpperCase().slice(0, 40);
    const c = await prisma.coupon.findUnique({ where: { code } });
    if (!c || !c.active || (c.expiresAt && c.expiresAt < new Date())) couponError = "Cupom inválido ou expirado.";
    else if (subtotalCents < c.minCents) couponError = "Pedido abaixo do valor mínimo do cupom.";
    else {
      discountCents = c.percentOff ? Math.floor((subtotalCents * c.percentOff) / 100) : Math.min(c.centsOff ?? 0, subtotalCents);
      applied = c.code;
    }
  }
  await getSettings(); // mantém cache aquecido
  return {
    items: out, subtotalCents, discountCents, couponCode: applied, couponError,
    ok: out.length > 0 && out.every((i) => i.ok),
  };
}
