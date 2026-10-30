import crypto from "node:crypto";
import type { OrderStatus } from "@prisma/client";
import { prisma, type Tx } from "./db";
import { HttpError } from "./security";
import { type PricedCart } from "./cart";
import { aggregateNeeds, consume, consumeUnreserved, movement, release, reserve, restock, type StockTable } from "./stock";
import { esc, notifyAdmin, sendEmail, sendWhatsApp } from "./notify";
import { brl, STATUS_LABEL } from "./format";
import { getSettings } from "./settings";

export type Address = {
  cep: string; street: string; number: string; complement?: string; district: string; city: string; state: string;
};
export type Customer = { name: string; email: string; phone: string };

const EXPIRED_NOTE = "RESERVA_EXPIRADA";

/* ----------------------------- Criação ---------------------------------- */
export async function createOrder(p: {
  cart: PricedCart; customer: Customer; address: Address; shippingCents: number; userId?: string; notes?: string;
}) {
  const { cart } = p;
  if (!cart.ok) throw new HttpError(409, "Há itens indisponíveis no carrinho.");
  const settings = await getSettings();
  const expiresAt = new Date(Date.now() + settings.reservationMinutes * 60_000);

  const needs = aggregateNeeds(
    cart.items.flatMap((i) =>
      i.type === "READY"
        ? [{ table: "Product" as StockTable, id: i.productId!, qty: i.qty }]
        : (i.materialLines ?? []).map((l) => ({ table: "Material" as StockTable, id: l.materialId, qty: l.qty * i.qty })),
    ),
  );

  const totalCents = cart.subtotalCents - cart.discountCents + p.shippingCents;

  return prisma.$transaction(async (tx) => {
    for (const n of needs) {
      const okRes = await reserve(tx, n.table, n.id, n.qty);
      if (!okRes) throw new HttpError(409, "Um dos itens acabou de ficar indisponível. Revise o carrinho.");
    }
    const order = await tx.order.create({
      data: {
        accessToken: crypto.randomBytes(24).toString("hex"),
        userId: p.userId,
        email: p.customer.email, name: p.customer.name, phone: p.customer.phone,
        address: p.address,
        status: "AWAITING_PAYMENT",
        subtotalCents: cart.subtotalCents, shippingCents: p.shippingCents, discountCents: cart.discountCents,
        totalCents, couponCode: cart.couponCode, notes: p.notes,
        items: {
          create: cart.items.map((i) => ({
            type: i.type, productId: i.productId, name: i.name, image: i.image,
            unitPriceCents: i.unitCents, qty: i.qty,
            config: i.config as never, materialLines: i.materialLines as never,
          })),
        },
        reservations: { create: needs.map((n) => ({ targetTable: n.table, targetId: n.id, qty: n.qty, expiresAt })) },
      },
      include: { items: true },
    });
    return order;
  });
}

/* --------------------------- Confirmação -------------------------------- */
export async function confirmPayment(orderId: string, info: { paymentId: string; paidCents: number; paymentStatus: string }) {
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (rows.length === 0) return { kind: "missing" as const };
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { reservations: true, items: true } });

    if (order.status === "PAID" || ["IN_PRODUCTION", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status))
      return { kind: "already" as const, order };

    const lateAfterExpiry = order.status === "CANCELED" && order.notes === EXPIRED_NOTE;
    if (order.status === "CANCELED" && !lateAfterExpiry) {
      await tx.order.update({ where: { id: orderId }, data: { needsAttention: true, paymentId: info.paymentId, paymentStatus: info.paymentStatus } });
      return { kind: "paid_after_cancel" as const, order };
    }
    if (info.paidCents < order.totalCents) {
      await tx.order.update({ where: { id: orderId }, data: { needsAttention: true, paymentId: info.paymentId, paymentStatus: "VALOR_DIVERGENTE" } });
      return { kind: "amount_mismatch" as const, order };
    }

    let attention = false;
    const consumed: { table: StockTable; id: string; qty: number }[] = [];
    for (const r of order.reservations) {
      const table = r.targetTable as StockTable;
      let done = false;
      if (r.status === "ACTIVE") done = await consume(tx, table, r.targetId, r.qty);
      else if (r.status === "RELEASED") done = await consumeUnreserved(tx, table, r.targetId, r.qty);
      else done = true;
      if (!done) attention = true;
      else if (r.status !== "CONSUMED") {
        await movement(tx, table, r.targetId, -r.qty, "VENDA", order.id);
        await tx.stockReservation.update({ where: { id: r.id }, data: { status: "CONSUMED" } });
        consumed.push({ table, id: r.targetId, qty: r.qty });
      }
    }
    for (const it of order.items) {
      if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.qty } } });
    }
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paymentId: info.paymentId, paymentStatus: info.paymentStatus, needsAttention: attention, notes: attention ? "ESTOQUE_INSUFICIENTE_APOS_PAGAMENTO" : null },
      include: { items: true },
    });
    return { kind: "paid" as const, order: updated, consumed, attention };
  });

  if (result.kind === "paid") {
    await announce(result.order.id, "PAID");
    await stockAlerts(result.consumed);
    if (result.attention)
      await notifyAdmin("order-attention", `Pedido #${result.order.number} precisa de atenção`, "Pagamento confirmado, mas faltou estoque de algum material. Verifique e contate o cliente/estorne.");
  } else if (result.kind === "paid_after_cancel" || result.kind === "amount_mismatch") {
    await notifyAdmin("order-attention", `Pedido #${result.order.number} precisa de atenção`,
      result.kind === "paid_after_cancel" ? "Pagamento recebido para pedido CANCELADO. Providencie estorno ou reative manualmente." : "Valor pago diferente do total do pedido. Verifique no Mercado Pago.");
  }
  return result;
}

/* ------------------------- Cancelamento / expiração ---------------------- */
async function cancelInTx(tx: Tx, orderId: string, note: string | null, userId?: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  if (rows.length === 0) return false;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { reservations: true, items: true } });
  if (order.status === "CANCELED") return false;
  for (const r of order.reservations) {
    const table = r.targetTable as StockTable;
    if (r.status === "ACTIVE") await release(tx, table, r.targetId, r.qty);
    else if (r.status === "CONSUMED") {
      await restock(tx, table, r.targetId, r.qty);
      await movement(tx, table, r.targetId, r.qty, "CANCELAMENTO", order.id, userId);
    }
    if (r.status !== "RELEASED") await tx.stockReservation.update({ where: { id: r.id }, data: { status: "RELEASED" } });
  }
  if (order.status !== "AWAITING_PAYMENT" && order.status !== "NEW") {
    for (const it of order.items) if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { decrement: it.qty } } });
  }
  await tx.order.update({ where: { id: orderId }, data: { status: "CANCELED", notes: note } });
  return true;
}

export async function cancelOrder(orderId: string, userId?: string) {
  const changed = await prisma.$transaction((tx) => cancelInTx(tx, orderId, null, userId));
  if (changed) await announce(orderId, "CANCELED");
  return changed;
}

/** Libera reservas vencidas e cancela pedidos que não foram pagos a tempo. */
export async function releaseExpiredReservations() {
  const expired = await prisma.stockReservation.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: new Date() }, order: { status: "AWAITING_PAYMENT" } },
    select: { orderId: true },
    distinct: ["orderId"],
  });
  let count = 0;
  for (const { orderId } of expired) {
    try {
      if (await prisma.$transaction((tx) => cancelInTx(tx, orderId, EXPIRED_NOTE))) count++;
    } catch (e) {
      console.error("[release]", orderId, e);
    }
  }
  return count;
}

/* ----------------------- Mudança manual de status ------------------------ */
export async function setOrderStatus(orderId: string, status: OrderStatus, userId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  if (order.status === status) return order;
  if (status === "CANCELED") {
    await cancelOrder(orderId, userId);
    return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }
  if (status === "PAID" && (order.status === "AWAITING_PAYMENT" || order.status === "NEW")) {
    await confirmPayment(orderId, { paymentId: `manual-${userId}`, paidCents: order.totalCents, paymentStatus: "manual" });
    return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }
  if (order.status === "CANCELED") throw new HttpError(409, "Pedido cancelado não pode ser reativado por aqui.");
  const updated = await prisma.order.update({ where: { id: orderId }, data: { status } });
  await announce(orderId, status);
  return updated;
}

/* ------------------------------ Mensagens -------------------------------- */
export function orderDetailsText(o: {
  number: number; name: string; email: string; phone: string; address: unknown; totalCents: number; shippingCents: number; discountCents: number;
  items: { name: string; qty: number; unitPriceCents: number; type: string; materialLines: unknown }[];
}) {
  const a = o.address as Address;
  const lines = o.items.map((i) => {
    let s = `• ${i.qty}x ${i.name} — ${brl(i.unitPriceCents)}`;
    if (i.type === "CUSTOM" && Array.isArray(i.materialLines))
      s += "\n" + (i.materialLines as { name: string; qty: number; unitCents: number; totalCents: number }[])
        .map((m) => `    - ${m.qty * i.qty} × ${m.name} (${brl(m.unitCents)}) = ${brl(m.totalCents * i.qty)}`).join("\n");
    return s;
  });
  return [
    `Pedido #${o.number}`, `Cliente: ${o.name} (${o.email}, ${o.phone})`, "", ...lines, "",
    `Frete: ${brl(o.shippingCents)}`, o.discountCents ? `Desconto: -${brl(o.discountCents)}` : "", `TOTAL: ${brl(o.totalCents)}`, "",
    `Entrega: ${a.street}, ${a.number}${a.complement ? " - " + a.complement : ""}, ${a.district}, ${a.city}/${a.state}, CEP ${a.cep}`,
  ].filter((l) => l !== "").join("\n");
}

const CUSTOMER_MSG: Partial<Record<OrderStatus | "CREATED", (n: number) => string>> = {
  CREATED: (n) => `Recebemos o seu pedido #${n}! Assim que o pagamento for confirmado, avisaremos por aqui. 💙`,
  PAID: (n) => `Pagamento do pedido #${n} confirmado! Obrigada pela confiança. Já vamos começar a preparar o seu terço. 🙏`,
  IN_PRODUCTION: (n) => `O seu terço do pedido #${n} está em produção, feito à mão com muito carinho. ✨`,
  SHIPPED: (n) => `O pedido #${n} foi enviado! Em breve chega até você. 📦`,
  DELIVERED: (n) => `O pedido #${n} foi entregue. Que este terço acompanhe a sua fé! 💛`,
  CANCELED: (n) => `O pedido #${n} foi cancelado. Se tiver dúvidas, é só responder esta mensagem.`,
};

export async function announce(orderId: string, event: OrderStatus | "CREATED") {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) return;
    const base = process.env.APP_URL ?? "";
    const link = `${base}/pedido/${o.id}?t=${o.accessToken}`;
    const msg = CUSTOMER_MSG[event]?.(o.number);
    if (msg) {
      await Promise.all([
        sendEmail(`customer-${event}`, o.email, `Salve Maria — Pedido #${o.number}: ${STATUS_LABEL[event] ?? "Recebido"}`,
          `<p>Olá, ${esc(o.name)}!</p><p>${esc(msg)}</p><p><a href="${esc(link)}">Acompanhar pedido</a></p>`),
        sendWhatsApp(`customer-${event}`, o.phone, `${msg}\n${link}`),
      ]);
    }
    if (event === "CREATED" || event === "PAID")
      await notifyAdmin(`admin-${event}`, event === "PAID" ? `Pagamento confirmado — Pedido #${o.number}` : `Novo pedido #${o.number}`, orderDetailsText(o));
  } catch (e) {
    console.error("[announce]", e);
  }
}

async function stockAlerts(consumed: { table: StockTable; id: string; qty: number }[]) {
  try {
    for (const c of consumed) {
      const row = c.table === "Product"
        ? await prisma.product.findUnique({ where: { id: c.id }, select: { name: true, stock: true, lowStockAt: true } })
        : await prisma.material.findUnique({ where: { id: c.id }, select: { name: true, stock: true, lowStockAt: true } });
      if (!row) continue;
      if (row.stock === 0) await notifyAdmin("stock-out", `ESGOTADO: ${row.name}`, `${row.name} chegou a 0 unidades.`);
      else if (row.stock <= row.lowStockAt && row.stock + c.qty > row.lowStockAt)
        await notifyAdmin("stock-low", `Estoque baixo: ${row.name}`, `Restam ${row.stock} unidade(s) de ${row.name} (alerta em ${row.lowStockAt}).`);
    }
  } catch (e) {
    console.error("[stock-alerts]", e);
  }
}
