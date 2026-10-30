import crypto from "node:crypto";

/**
 * Mercado Pago — Checkout Pro (PIX, cartão e demais meios ficam na página do Mercado Pago;
 * a loja NUNCA recebe nem armazena dados de cartão).
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
 */
const API = "https://api.mercadopago.com";

export const paymentsConfigured = () => !!process.env.MP_ACCESS_TOKEN;

export async function createPreference(order: {
  id: string;
  number: number;
  email: string;
  name: string;
  totalCents: number;
  accessToken: string;
}) {
  const base = process.env.APP_URL!;
  const r = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          id: order.id,
          title: `Pedido Salve Maria #${order.number}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number((order.totalCents / 100).toFixed(2)),
        },
      ],
      payer: { email: order.email, name: order.name },
      external_reference: order.id,
      notification_url: `${base}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${base}/pedido/${order.id}?t=${order.accessToken}`,
        pending: `${base}/pedido/${order.id}?t=${order.accessToken}`,
        failure: `${base}/pedido/${order.id}?t=${order.accessToken}`,
      },
      auto_return: "approved",
      statement_descriptor: "SALVE MARIA",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { init_point: string; id: string };
  return { url: j.init_point, preferenceId: j.id };
}

/** Consulta o pagamento direto na API (nunca confiamos no corpo do webhook). */
export async function fetchPayment(paymentId: string) {
  if (!/^\d{3,20}$/.test(paymentId)) throw new Error("ID de pagamento inválido");
  const r = await fetch(`${API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}`);
  return (await r.json()) as {
    id: number;
    status: string;
    external_reference: string | null;
    transaction_amount: number;
    currency_id: string;
  };
}

/**
 * Valida a assinatura do webhook (header x-signature = "ts=...,v1=...").
 * Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;  com HMAC-SHA256.
 */
export function verifyWebhookSignature(headers: Headers, dataId: string | null) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false; // sem segredo configurado, rejeitamos tudo
  const sig = headers.get("x-signature");
  const reqId = headers.get("x-request-id") ?? "";
  if (!sig || !dataId) return false;
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
