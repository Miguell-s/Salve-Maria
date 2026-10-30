import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { notifyAdmin, sendEmail, esc } from "@/lib/notify";
import { releaseExpiredReservations } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { brl } from "@/lib/format";
import { handle, HttpError, ok } from "@/lib/security";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || got.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

/**
 * Rotina de manutenção — agende a cada 5-10 min (cron do servidor, Vercel Cron, GitHub Actions...):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://seusite/api/cron/maintenance
 * Faz: libera reservas vencidas, e-mail de carrinho abandonado (se ativado) e, entre 8h-9h (Brasília),
 * envia o relatório diário com estoque baixo.
 */
export const POST = handle(
  async (req) => {
    if (!authorized(req)) throw new HttpError(401, "Não autorizado.");
    const settings = await getSettings();
    const result: Record<string, unknown> = {};

    result.released = await releaseExpiredReservations();

    if (settings.abandonedCartEnabled) {
      const before = new Date(Date.now() - settings.abandonedCartMinutes * 60_000);
      const carts = await prisma.cartSnapshot.findMany({ where: { reminderSentAt: null, updatedAt: { lt: before } }, take: 50 });
      for (const c of carts) {
        await sendEmail("abandoned-cart", c.email, "Seu terço está esperando por você 💙",
          `<p>Você deixou itens no carrinho da Salve Maria.</p><p><a href="${esc(process.env.APP_URL)}/carrinho">Voltar ao carrinho</a></p>`);
        await prisma.cartSnapshot.update({ where: { id: c.id }, data: { reminderSentAt: new Date() } });
      }
      result.abandonedReminders = carts.length;
    }

    const hourBr = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
    const today = new Date().toISOString().slice(0, 10);
    const already = await prisma.automationLog.findFirst({ where: { kind: "daily-report", target: today } });
    if (hourBr === 8 && !already) {
      const since = new Date(Date.now() - 24 * 3600_000);
      const [paid, lowMat, lowProd] = await Promise.all([
        prisma.order.aggregate({ where: { status: { in: ["PAID", "IN_PRODUCTION", "PREPARING", "SHIPPED", "DELIVERED"] }, updatedAt: { gte: since } }, _sum: { totalCents: true }, _count: true }),
        prisma.$queryRaw<{ name: string; stock: number }[]>`SELECT name, stock FROM "Material" WHERE active AND stock <= "lowStockAt" ORDER BY stock LIMIT 30`,
        prisma.$queryRaw<{ name: string; stock: number }[]>`SELECT name, stock FROM "Product" WHERE status = 'ACTIVE' AND stock <= "lowStockAt" ORDER BY stock LIMIT 30`,
      ]);
      const text = [
        `Vendas (24h): ${paid._count} pedido(s) — ${brl(paid._sum.totalCents ?? 0)}`, "",
        "Materiais com estoque baixo:", ...(lowMat.length ? lowMat.map((m) => `• ${m.name}: ${m.stock}`) : ["• nenhum"]), "",
        "Terços prontos com estoque baixo:", ...(lowProd.length ? lowProd.map((m) => `• ${m.name}: ${m.stock}`) : ["• nenhum"]),
      ].join("\n");
      await notifyAdmin("daily-report", "Relatório diário", text);
      await prisma.automationLog.create({ data: { kind: "daily-report", channel: "system", target: today, status: "SENT" } });
      result.dailyReport = true;
    }
    return ok(result);
  },
  { csrf: false },
);
