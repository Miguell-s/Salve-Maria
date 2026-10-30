import { prisma } from "@/lib/db";
import { confirmPayment } from "@/lib/orders";
import { fetchPayment, verifyWebhookSignature } from "@/lib/payments";
import { clientIp, handle, HttpError, ok, rateLimit } from "@/lib/security";

/**
 * Webhook autenticado do Mercado Pago:
 * 1) valida a assinatura HMAC (x-signature);
 * 2) NÃO confia no corpo: consulta o pagamento na API do Mercado Pago;
 * 3) confere a referência do pedido e o VALOR pago antes de dar baixa no estoque.
 * Idempotente: notificações repetidas não baixam estoque duas vezes.
 */
export const POST = handle(
  async (req) => {
    rateLimit(`mpwebhook:${clientIp(req)}`, 300, 60_000);
    const url = new URL(req.url);
    let body: { type?: string; data?: { id?: string | number } } = {};
    try { body = JSON.parse((await req.text()).slice(0, 20_000)); } catch { /* corpo opcional */ }
    const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
    const type = url.searchParams.get("type") ?? body.type;

    if (!verifyWebhookSignature(req.headers, dataId)) throw new HttpError(401, "Assinatura inválida.");
    if (type !== "payment" || !dataId) return ok();

    const p = await fetchPayment(dataId);
    if (!p.external_reference) return ok();
    if (p.status === "approved" && p.currency_id === "BRL") {
      await confirmPayment(p.external_reference, {
        paymentId: String(p.id), paidCents: Math.round(p.transaction_amount * 100), paymentStatus: p.status,
      });
    } else {
      await prisma.order.updateMany({ where: { id: p.external_reference, status: "AWAITING_PAYMENT" }, data: { paymentId: String(p.id), paymentStatus: p.status } });
    }
    return ok();
  },
  { csrf: false },
);
