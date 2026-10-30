import { prisma } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { clientIp, handle, HttpError, ok, readJson } from "@/lib/security";
import { resourceByKey } from "@/lib/resources";
import { slugify } from "@/lib/format";
import { movement } from "@/lib/stock";

import { delegate, mapPrismaError } from "@/lib/adminApi";

export const GET = handle(async (req, ctx) => {
  await requireAdmin();
  const { resource } = await ctx.params;
  const res = resourceByKey(resource);
  if (!res) throw new HttpError(404, "Cadastro inexistente.");
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 60);
  const nameField = res.fields.find((f) => ["name", "title", "code", "author"].includes(f.name))?.name ?? "id";
  const rows = await delegate(res.model).findMany({
    where: { ...(res.fixed ?? {}), ...(q ? { [nameField]: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: res.orderBy,
    take: 300,
  });
  return ok({ rows });
}, { csrf: false });

export const POST = handle(async (req, ctx) => {
  const admin = await requireAdmin();
  const { resource } = await ctx.params;
  const res = resourceByKey(resource);
  if (!res) throw new HttpError(404, "Cadastro inexistente.");
  const data = res.schema.parse(await readJson(req)) as Record<string, unknown>;
  if (res.model === "product") {
    const base = slugify(String(data.name)) || "terco";
    data.slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (res.model === "category") data.slug = `${slugify(String(data.name))}-${Math.random().toString(36).slice(2, 5)}`;
  try {
    const row = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await (tx as any)[res.model].create({ data: { ...data, ...(res.fixed ?? {}) } });
      if (res.stockTable && typeof data.stock === "number" && data.stock > 0)
        await movement(tx, res.stockTable, created.id, data.stock, "ESTOQUE_INICIAL", undefined, admin.id);
      return created;
    });
    await audit(admin.id, "create", res.model, row.id, { name: data.name ?? data.code ?? data.title }, clientIp(req));
    return ok({ row }, { status: 201 });
  } catch (e) {
    mapPrismaError(e);
  }
});
