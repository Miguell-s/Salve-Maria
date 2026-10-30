import { z } from "zod";
import { audit, requireAdmin } from "@/lib/auth";
import { setOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { clientIp, handle, ok, readJson } from "@/lib/security";

const schema = z.object({
  status: z.enum(["NEW", "AWAITING_PAYMENT", "PAID", "IN_PRODUCTION", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"]).optional(),
  needsAttention: z.boolean().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const b = schema.parse(await readJson(req, 2_000));
  if (b.status) await setOrderStatus(id, b.status, admin.id);
  if (b.needsAttention !== undefined) await prisma.order.update({ where: { id }, data: { needsAttention: b.needsAttention } });
  await audit(admin.id, "order.update", "Order", id, b, clientIp(req));
  return ok();
});
