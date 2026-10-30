import { customConfigSchema, quoteCustom } from "@/lib/pricing";
import { clientIp, handle, ok, rateLimit, readJson } from "@/lib/security";

// Orçamento do personalizador: preços e estoque vêm SEMPRE do banco; o navegador só envia IDs.
export const POST = handle(async (req) => {
  rateLimit(`quote:${clientIp(req)}`, 120, 60_000);
  const cfg = customConfigSchema.parse(await readJson(req, 5_000));
  return ok(await quoteCustom(cfg));
});
