import { audit, requireAdmin } from "@/lib/auth";
import { movement } from "@/lib/stock";
import { clientIp, handle, HttpError, ok, readJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireAdmin();

  const [products, materials] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, stock: true, reserved: true, images: true, lowStockAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({
      select: { id: true, name: true, sku: true, stock: true, reserved: true, images: true, lowStockAt: true, kind: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return ok({ products, materials });
});

export const PATCH = handle(async (req) => {
  const admin = await requireAdmin();

  const { id, table, delta, reason } = (await readJson(req)) as any;
  if (!id || !table || delta === undefined) throw new HttpError(400, "Dados insuficientes");
  if (!["Product", "Material"].includes(table)) throw new HttpError(400, "Tabela inválida");

  const res = await prisma.$transaction(async (tx) => {
    const model = table === "Product" ? tx.product : tx.material;
    const item = await (model as any).update({
      where: { id },
      data: { stock: { increment: delta } },
    });

    await movement(tx, table as any, id, delta, reason || "Ajuste manual", undefined, admin.id);
    return item;
  });

  await audit(admin.id, "stock.adjust", table, id, { delta, reason }, clientIp(req));

  return ok({ stock: res.stock });
});
