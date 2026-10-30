import { z, ZodObject, type ZodRawShape } from "zod";
import { prisma } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { clientIp, handle, HttpError, ok, readJson } from "@/lib/security";
import { resourceByKey } from "@/lib/resources";
import { movement } from "@/lib/stock";
import { delegate, mapPrismaError } from "@/lib/adminApi";

function partialSchema(schema: z.ZodTypeAny) {
  // coupons usam refine() (ZodEffects); para PATCH validamos o objeto interno parcialmente
  const inner = (schema as unknown as { _def: { schema?: z.ZodTypeAny } })._def.schema ?? schema;
  return (inner as ZodObject<ZodRawShape>).partial();
}

export const PATCH = handle(async (req, ctx) => {
  const admin = await requireAdmin();
  const { resource, id } = await ctx.params;
  const res = resourceByKey(resource);
  if (!res) throw new HttpError(404, "Cadastro inexistente.");
  const data = partialSchema(res.schema).parse(await readJson(req)) as Record<string, unknown>;
  try {
    const row = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (tx as any)[res.model];
      const current = await d.findFirst({ where: { id, ...(res.fixed ?? {}) } });
      if (!current) throw new HttpError(404, "Registro não encontrado.");
      if (res.stockTable && typeof data.stock === "number") {
        if (data.stock < current.reserved)
          throw new HttpError(409, `Há ${current.reserved} unidade(s) reservada(s) em pedidos aguardando pagamento; o estoque não pode ficar abaixo disso.`);
        const delta = data.stock - current.stock;
        if (delta !== 0) await movement(tx, res.stockTable, id, delta, "AJUSTE_MANUAL", undefined, admin.id);
      }
      return d.update({ where: { id }, data });
    });
    await audit(admin.id, "update", res.model, id, { fields: Object.keys(data) }, clientIp(req));
    return ok({ row });
  } catch (e) {
    mapPrismaError(e);
  }
});

export const DELETE = handle(async (req, ctx) => {
  const admin = await requireAdmin();
  const { resource, id } = await ctx.params;
  const res = resourceByKey(resource);
  if (!res) throw new HttpError(404, "Cadastro inexistente.");
  if (res.stockTable) {
    const active = await prisma.stockReservation.count({ where: { targetId: id, status: "ACTIVE" } });
    if (active > 0) throw new HttpError(409, "Este item está reservado em pedidos aguardando pagamento. Desative-o em vez de excluir.");
  }
  try {
    await delegate(res.model).deleteMany({ where: { id, ...(res.fixed ?? {}) } });
  } catch (e) {
    mapPrismaError(e);
  }
  await audit(admin.id, "delete", res.model, id, undefined, clientIp(req));
  return ok();
});
