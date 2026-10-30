import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createPreference, paymentsConfigured } from "@/lib/payments";
import { clientIp, handle, HttpError, ok, rateLimit, readJson } from "@/lib/security";

const schema = z.object({ orderId: z.string().min(1).max(40), token: z.string().min(10).max(100) });

// Reabre o pagamento de um pedido pendente. O token do pedido protege contra IDOR.
export const POST = handle(async (req) => {
  rateLimit(`pay:${clientIp(req)}`, 20, 10 * 60_000);
  const b = schema.parse(await readJson(req, 2_000));
  const order = await prisma.order.findUnique({ where: { id: b.orderId } });
  const same = order && order.accessToken.length === b.token.length && crypto.timingSafeEqual(Buffer.from(order.accessToken), Buffer.from(b.token));
  if (!order || !same) throw new HttpError(404, "Pedido não encontrado.");
  if (order.status !== "AWAITING_PAYMENT") throw new HttpError(409, "Este pedido não está aguardando pagamento.");
  if (!paymentsConfigured()) throw new HttpError(503, "Pagamento online ainda não configurado.");
  const pref = await createPreference(order);
  return ok({ paymentUrl: pref.url });
});
