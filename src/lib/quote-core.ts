// Lógica PURA do orçamento (sem banco, sem rede): testável isoladamente.
import type { Material, MaterialKind, RosaryTemplate } from "@prisma/client";
import { parseImages } from "./format";

export const availableOf = (x: { stock: number; reserved: number }) => Math.max(0, x.stock - x.reserved);

export type QuoteLine = {
  materialId: string;
  kind: MaterialKind;
  name: string;
  image?: string;
  qty: number;
  unitCents: number;
  totalCents: number;
  available: number;
  ok: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  materialsCents: number;
  extrasCents: number;
  packagingCents: number;
  assemblyCents: number;
  totalCents: number;
  ok: boolean;
  problems: string[];
};

type Parts = {
  bead?: Material;
  extraBead?: Material;
  spacer?: Material;
  cross?: Material;
  medal?: Material;
  charms: Material[];
  finish?: Material;
  packaging?: Material;
};

const line = (m: Material, qty: number): QuoteLine => ({
  materialId: m.id,
  kind: m.kind,
  name: m.name,
  image: parseImages(m.images)[0],
  qty,
  unitCents: m.unitPriceCents,
  totalCents: m.unitPriceCents * qty,
  available: availableOf(m),
  ok: true,
});

/**
 * Função PURA (sem banco): quantidade × preço unitário, conferência de estoque e totais.
 * Exemplo: 53 pérolas × R$ 0,80 = R$ 42,40.
 */
export function buildQuote(t: Pick<RosaryTemplate, "beadsMain" | "beadsExtra" | "spacers" | "crosses" | "medals" | "assemblyCents">, p: Parts): Quote {
  const problems: string[] = [];
  const lines: QuoteLine[] = [];

  if (!p.bead) problems.push("Escolha as bolinhas.");
  else lines.push(line(p.bead, t.beadsMain));

  if (t.beadsExtra > 0 && p.bead) lines.push(line(p.extraBead ?? p.bead, t.beadsExtra));
  if (t.spacers > 0) {
    if (!p.spacer) problems.push("Escolha o entremeio.");
    else lines.push(line(p.spacer, t.spacers));
  }
  if (t.crosses > 0) {
    if (!p.cross) problems.push("Escolha o crucifixo.");
    else lines.push(line(p.cross, t.crosses));
  }
  if (t.medals > 0) {
    if (!p.medal) problems.push("Escolha a medalha.");
    else lines.push(line(p.medal, t.medals));
  }
  for (const c of p.charms) lines.push(line(c, 1));
  if (p.finish) lines.push(line(p.finish, 1));
  if (p.packaging) lines.push(line(p.packaging, 1));

  // Estoque: soma a necessidade por material (mesma bolinha usada nas duas posições).
  const need = new Map<string, number>();
  for (const l of lines) need.set(l.materialId, (need.get(l.materialId) ?? 0) + l.qty);
  for (const l of lines) {
    const total = need.get(l.materialId)!;
    l.ok = l.available >= total;
    if (!l.ok)
      problems.push(
        `"${l.name}" indisponível para esta composição: precisa de ${total} unidade(s) e há ${l.available}. Escolha outra opção.`,
      );
  }

  const sum = (kinds: MaterialKind[]) =>
    lines.filter((l) => kinds.includes(l.kind)).reduce((a, l) => a + l.totalCents, 0);
  const materialsCents = sum(["BEAD", "SPACER", "CROSS", "MEDAL"]);
  const extrasCents = sum(["CHARM", "FINISH"]);
  const packagingCents = sum(["PACKAGING"]);
  const assemblyCents = t.assemblyCents;

  return {
    lines,
    materialsCents,
    extrasCents,
    packagingCents,
    assemblyCents,
    totalCents: materialsCents + extrasCents + packagingCents + assemblyCents,
    ok: problems.length === 0,
    problems: [...new Set(problems)],
  };
}

