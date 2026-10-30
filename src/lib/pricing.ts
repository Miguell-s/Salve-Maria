import { z } from "zod";
import type { Material, MaterialKind } from "@prisma/client";
import { prisma } from "./db";
import { buildQuote, type Quote } from "./quote-core";

export { buildQuote } from "./quote-core";
export type { Quote, QuoteLine } from "./quote-core";

const id = z.string().min(1).max(40);

export const customConfigSchema = z.object({
  templateId: id,
  // Opcionais no esquema: o orçamento parcial devolve "Escolha ..." em `problems`,
  // e o checkout só aceita configurações completas (quote.ok).
  beadId: id.optional(),
  extraBeadId: id.optional(),
  spacerId: id.optional(),
  crossId: id.optional(),
  medalId: id.optional(),
  charmIds: z.array(id).max(6).default([]),
  finishId: id.optional(),
  packagingId: id.optional(),
});
export type CustomConfig = z.infer<typeof customConfigSchema>;

/** Carrega tudo do banco (preços e estoque SEMPRE do servidor) e monta o orçamento. */
export async function quoteCustom(raw: CustomConfig): Promise<Quote> {
  const cfg = customConfigSchema.parse(raw);
  const template = await prisma.rosaryTemplate.findFirst({ where: { id: cfg.templateId, active: true } });
  if (!template) return { lines: [], materialsCents: 0, extrasCents: 0, packagingCents: 0, assemblyCents: 0, totalCents: 0, ok: false, problems: ["Modelo de terço inválido."] };

  const ids = [cfg.beadId, cfg.extraBeadId, cfg.spacerId, cfg.crossId, cfg.medalId, cfg.finishId, cfg.packagingId, ...cfg.charmIds].filter(
    (x): x is string => !!x,
  );
  const mats = await prisma.material.findMany({ where: { id: { in: ids }, active: true } });
  const by = new Map(mats.map((m) => [m.id, m]));
  const pick = (mid: string | undefined, kind: MaterialKind) => {
    const m = mid ? by.get(mid) : undefined;
    return m && m.kind === kind ? m : undefined; // impede usar, p.ex., uma medalha como bolinha
  };

  const parts: Parts = {
    bead: pick(cfg.beadId, "BEAD"),
    extraBead: pick(cfg.extraBeadId, "BEAD"),
    spacer: pick(cfg.spacerId, "SPACER"),
    cross: pick(cfg.crossId, "CROSS"),
    medal: pick(cfg.medalId, "MEDAL"),
    charms: [...new Set(cfg.charmIds)].map((c) => pick(c, "CHARM")).filter((m): m is Material => !!m),
    finish: pick(cfg.finishId, "FINISH"),
    packaging: pick(cfg.packagingId, "PACKAGING"),
  };
  // Se o extraBeadId foi enviado mas está inválido, não cai silenciosamente na bolinha principal.
  if (cfg.extraBeadId && !parts.extraBead) parts.extraBead = undefined;
  const q = buildQuote(template, parts);
  if (cfg.extraBeadId && !parts.extraBead) q.problems.push("Bolinha adicional indisponível.");
  if (cfg.finishId && !parts.finish) q.problems.push("Acabamento indisponível.");
  if (cfg.packagingId && !parts.packaging) q.problems.push("Embalagem indisponível.");
  if (cfg.beadId && !parts.bead) q.problems.push("Bolinha indisponível.");
  if (cfg.spacerId && !parts.spacer) q.problems.push("Entremeio indisponível.");
  if (cfg.crossId && !parts.cross) q.problems.push("Crucifixo indisponível.");
  if (cfg.medalId && !parts.medal) q.problems.push("Medalha indisponível.");
  q.ok = q.problems.length === 0;
  return q;
}
