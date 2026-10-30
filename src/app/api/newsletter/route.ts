import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, handle, ok, rateLimit, readJson } from "@/lib/security";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  consent: z.literal(true, { errorMap: () => ({ message: "Aceite receber novidades para continuar." }) }),
});

export const POST = handle(async (req) => {
  rateLimit(`news:${clientIp(req)}`, 6, 60 * 60_000);
  const b = schema.parse(await readJson(req, 2_000));
  await prisma.subscriber.upsert({ where: { email: b.email }, create: { email: b.email }, update: {} });
  return ok();
});
