import { z } from "zod";
import { cartSchema, priceCart } from "@/lib/cart";
import { quoteShipping } from "@/lib/shipping";
import { clientIp, handle, ok, rateLimit, readJson } from "@/lib/security";

const schema = z.object({
  items: cartSchema,
  coupon: z.string().max(40).optional(),
  cep: z.string().max(12).optional(),
});

// Preço do carrinho calculado no servidor (itens, cupom e frete). Nada vem pronto do navegador.
export const POST = handle(async (req) => {
  rateLimit(`cartprice:${clientIp(req)}`, 120, 60_000);
  const b = schema.parse(await readJson(req, 50_000));
  const cart = await priceCart(b.items, b.coupon);
  let shipping: { cents: number; label: string } | null = null;
  let shippingError: string | undefined;
  if (b.cep && cart.items.length) {
    const s = await quoteShipping(b.cep, cart.subtotalCents - cart.discountCents);
    if (s.ok) shipping = { cents: s.cents, label: s.label };
    else shippingError = s.error;
  }
  const totalCents = cart.subtotalCents - cart.discountCents + (shipping?.cents ?? 0);
  return ok({ ...cart, shipping, shippingError, totalCents });
});
