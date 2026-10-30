import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { cartSchema, priceCart } from "@/lib/cart";
import { announce, createOrder } from "@/lib/orders";
import { createPreference, paymentsConfigured } from "@/lib/payments";
import { quoteShipping } from "@/lib/shipping";
import { onlyDigits } from "@/lib/format";
import { clientIp, handle, HttpError, ok, rateLimit, readJson } from "@/lib/security";

const schema = z.object({
  items: cartSchema.min(1),
  coupon: z.string().max(40).optional(),
  customer: z.object({
    name: z.string().trim().min(3).max(120),
    email: z.string().trim().toLowerCase().email().max(200),
    phone: z.string().trim().min(10).max(20),
  }),
  address: z.object({
    cep: z.string().trim().max(12),
    street: z.string().trim().min(2).max(150),
    number: z.string().trim().min(1).max(15),
    complement: z.string().trim().max(80).optional(),
    district: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().length(2).toUpperCase(),
  }),
  notes: z.string().trim().max(500).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Aceite a Política de Privacidade para continuar." }) }),
});

async function startPayment(order: { id: string; number: number; email: string; name: string; totalCents: number; accessToken: string }) {
  if (!paymentsConfigured()) return { paymentUrl: null as string | null, message: "Pedido registrado. O pagamento online ainda não foi ativado nesta loja; entraremos em contato para combinar o pagamento." };
  try {
    const pref = await createPreference(order);
    return { paymentUrl: pref.url, message: null as string | null };
  } catch (e) {
    console.error("[payment] falha ao criar preferência", e);
    return { paymentUrl: null, message: "Pedido registrado, mas não conseguimos abrir o pagamento agora. Abra o pedido e tente novamente." };
  }
}

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`checkout:${ip}`, 12, 10 * 60_000);
  const b = schema.parse(await readJson(req, 80_000));

  const cart = await priceCart(b.items, b.coupon);
  if (!cart.ok) throw new HttpError(409, cart.items.flatMap((i) => i.problems)[0] ?? "Revise os itens do carrinho.");
  if (b.coupon && cart.couponError) throw new HttpError(400, cart.couponError);

  const ship = await quoteShipping(b.address.cep, cart.subtotalCents - cart.discountCents);
  if (!ship.ok) throw new HttpError(400, ship.error);

  const session = await getSession();
  const order = await createOrder({
    cart, customer: b.customer,
    address: { ...b.address, cep: onlyDigits(b.address.cep) },
    shippingCents: ship.cents, userId: session?.role === "CUSTOMER" ? session.uid : undefined, notes: b.notes,
  });

  await prisma.cartSnapshot.deleteMany({ where: { email: b.customer.email } });
  await announce(order.id, "CREATED");
  const pay = await startPayment(order);
  return ok({ orderId: order.id, token: order.accessToken, number: order.number, ...pay });
});
