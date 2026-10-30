import { z } from "zod";
import { prisma } from "@/lib/db";
import { cartSchema } from "@/lib/cart";
import { clientIp, handle, ok, rateLimit, readJson } from "@/lib/security";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  items: cartSchema,
  consent: z.literal(true),
});

// Guarda o carrinho SOMENTE após o cliente informar o e-mail e consentir (LGPD).
export const POST = handle(async (req) => {
  rateLimit(`snap:${clientIp(req)}`, 20, 60 * 60_000);
  const b = schema.parse(await readJson(req, 50_000));
  if (b.items.length === 0) return ok();
  await prisma.cartSnapshot.upsert({
    where: { email: b.email },
    create: { email: b.email, items: b.items as never },
    update: { items: b.items as never, reminderSentAt: null },
  });
  return ok();
});
