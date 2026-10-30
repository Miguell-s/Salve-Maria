import { prisma } from "@/lib/db";
import { toCard } from "@/lib/catalog";
import { clientIp, handle, ok, rateLimit } from "@/lib/security";

// Dados públicos de produtos por id (usado em Favoritos). Apenas produtos ATIVOS.
export const GET = handle(async (req) => {
  rateLimit(`products:${clientIp(req)}`, 60, 60_000);
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[\w-]{5,40}$/.test(s)).slice(0, 50);
  const rows = await prisma.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: { category: true } });
  return ok({ products: rows.map(toCard) });
}, { csrf: false });
