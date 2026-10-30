import { audit, requireAdmin } from "@/lib/auth";
import { clientIp, handle, HttpError, ok, rateLimit } from "@/lib/security";
import { saveImage } from "@/lib/uploads";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const admin = await requireAdmin();
  rateLimit(`upload:${admin.id}`, 60, 10 * 60_000);
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 12);
  if (files.length === 0) throw new HttpError(400, "Nenhum arquivo enviado.");
  const urls: string[] = [];
  for (const f of files) urls.push(await saveImage(f));
  await audit(admin.id, "upload", "Image", null, { count: urls.length }, clientIp(req));
  return ok({ urls });
});
