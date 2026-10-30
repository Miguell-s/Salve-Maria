export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Novo",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento confirmado",
  IN_PRODUCTION: "Em produção",
  PREPARING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

export const KIND_LABEL: Record<string, string> = {
  BEAD: "Bolinha",
  SPACER: "Entremeio",
  CROSS: "Crucifixo",
  MEDAL: "Medalha",
  CHARM: "Pingente",
  PACKAGING: "Embalagem",
  FINISH: "Acabamento",
};

export function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

/** Disponível = em estoque − reservado por pedidos aguardando pagamento. */
export const available = (x: { stock: number; reserved: number }) => Math.max(0, x.stock - x.reserved);

export function parseImages(imagesStr: string | string[]): string[] {
  if (Array.isArray(imagesStr)) return imagesStr;
  try {
    return JSON.parse(imagesStr);
  } catch {
    return [];
  }
}
