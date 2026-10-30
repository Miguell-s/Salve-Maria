import type { Tx } from "./db";

// Nomes de tabela vêm de uma lista fixa (nunca de entrada do usuário) e todos os
// valores usam parâmetros posicionais ($1, $2) — sem risco de SQL injection.
const TABLE = { Product: '"Product"', Material: '"Material"' } as const;
export type StockTable = keyof typeof TABLE;

/**
 * Reserva `qty` unidades de forma ATÔMICA: a condição `stock - reserved >= qty`
 * é avaliada pelo próprio UPDATE, então duas compras simultâneas nunca
 * reservam além do estoque (o Postgres serializa as linhas).
 */
export async function reserve(tx: Tx, table: StockTable, id: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRawUnsafe(
    `UPDATE ${TABLE[table]} SET reserved = reserved + $1 WHERE id = $2 AND stock - reserved >= $1`,
    qty,
    id,
  );
  return n === 1;
}

export async function release(tx: Tx, table: StockTable, id: string, qty: number) {
  await tx.$executeRawUnsafe(
    `UPDATE ${TABLE[table]} SET reserved = GREATEST(reserved - $1, 0) WHERE id = $2`,
    qty,
    id,
  );
}

/** Venda confirmada: tira do estoque físico e da reserva ao mesmo tempo. */
export async function consume(tx: Tx, table: StockTable, id: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRawUnsafe(
    `UPDATE ${TABLE[table]} SET stock = stock - $1, reserved = reserved - $1
       WHERE id = $2 AND stock >= $1 AND reserved >= $1`,
    qty,
    id,
  );
  return n === 1;
}

/** Pagamento chegou depois da reserva expirar: tenta baixar direto do estoque livre. */
export async function consumeUnreserved(tx: Tx, table: StockTable, id: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRawUnsafe(
    `UPDATE ${TABLE[table]} SET stock = stock - $1 WHERE id = $2 AND stock - reserved >= $1`,
    qty,
    id,
  );
  return n === 1;
}

export async function restock(tx: Tx, table: StockTable, id: string, qty: number) {
  await tx.$executeRawUnsafe(`UPDATE ${TABLE[table]} SET stock = stock + $1 WHERE id = $2`, qty, id);
}

export async function movement(
  tx: Tx,
  table: StockTable,
  id: string,
  delta: number,
  reason: string,
  orderId?: string,
  userId?: string,
) {
  await tx.stockMovement.create({ data: { targetTable: table, targetId: id, delta, reason, orderId, userId } });
}

/** Junta pedidos do mesmo item e ordena por id (evita deadlock entre transações). */
export function aggregateNeeds(needs: { table: StockTable; id: string; qty: number }[]) {
  const map = new Map<string, { table: StockTable; id: string; qty: number }>();
  for (const n of needs) {
    const k = `${n.table}:${n.id}`;
    const cur = map.get(k);
    if (cur) cur.qty += n.qty;
    else map.set(k, { ...n });
  }
  return [...map.values()].sort((a, b) => (a.table + a.id).localeCompare(b.table + b.id));
}
