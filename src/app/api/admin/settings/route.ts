import { z } from "zod";
import { audit, requireAdmin } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { BUTTON_TEXT, MIN_BUTTON_CONTRAST, contrastRatio } from "@/lib/contrast";
import { clientIp, handle, HttpError, ok, readJson } from "@/lib/security";

const img = z.string().regex(/^\/(uploads|brand)\/[\w.\-]+$/).or(z.literal(""));
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const accent = z.object({ brand: hex.optional(), pink: hex.optional(), purple: hex.optional(), yellow: hex.optional() });
const handleUrl = z.string().max(120).regex(/^[\w.\-@/:]*$/).or(z.literal(""));

const schema = z.object({
  heroTitle: z.string().max(100), heroChip: z.string().max(60), heroSubtitle: z.string().max(300), heroImage: img,
  heroCtaPrimary: z.string().max(40), heroCtaSecondary: z.string().max(40),
  bestSellersTitle: z.string().max(100), bestSellersCta: z.string().max(40),
  collectionTitle: z.string().max(100),
  newArrivalsTitle: z.string().max(100), newArrivalsCta: z.string().max(40),
  testimonialsTitle: z.string().max(100),
  customizeTitle: z.string().max(100), customizeText: z.string().max(500), customizeCta: z.string().max(40),
  customizeSteps: z.array(z.string().max(40)).max(12),
  historyTitle: z.string().max(100), historyText: z.string().max(5000),
  materialsTitle: z.string().max(100), materialsSubtitle: z.string().max(300),
  howItWorksTitle: z.string().max(100),
  howItWorks: z.array(z.object({ title: z.string().max(60), text: z.string().max(250) })).max(10),
  instagramTitle: z.string().max(100), instagramUser: z.string().max(60).regex(/^[\w.]*$/), instagramImages: z.array(img).max(12),
  newsletterTitle: z.string().max(100), newsletterSubtitle: z.string().max(300),
  storeName: z.string().max(100),
  socials: z.object({ instagram: handleUrl, facebook: handleUrl, tiktok: handleUrl, youtube: handleUrl }),
  contactEmail: z.string().max(120), contactPhone: z.string().max(40), contactAddress: z.string().max(300),
  whatsapp: z.string().regex(/^\d{0,20}$/),
  shipping: z.object({
    freeAboveCents: z.number().int().min(0).max(10_000_000),
    byRegion: z.record(z.string().regex(/^\d$/), z.number().int().min(0).max(1_000_000)),
    pickupNote: z.string().max(300),
  }),
  reservationMinutes: z.number().int().min(10).max(1440),
  lowStockDefault: z.boolean(),
  abandonedCartEnabled: z.boolean(), abandonedCartMinutes: z.number().int().min(30).max(10080),
  theme: z.object({ light: accent.optional(), dark: accent.optional() }),
}).partial();

export const PUT = handle(async (req) => {
  const admin = await requireAdmin();
  const b = schema.parse(await readJson(req, 100_000));
  // Acessibilidade: o texto dos botões precisa manter contraste mínimo sobre a cor escolhida.
  for (const mode of ["light", "dark"] as const) {
    for (const [name, color] of Object.entries(b.theme?.[mode] ?? {})) {
      if (!color) continue;
      // Roxo é usado em títulos grandes/decoração (mín. 3:1 sobre o fundo); as demais cores levam texto de botão (mín. 4,5:1).
      if (name === "purple") {
        const bg = mode === "light" ? "#FFFFFF" : "#101827";
        const rp = contrastRatio(color, bg);
        if (rp < 3) throw new HttpError(400, `O roxo ${color} (modo ${mode === "light" ? "claro" : "escuro"}) tem contraste ${rp.toFixed(1)}:1 com o fundo. O mínimo é 3:1.`);
        continue;
      }
      const r = contrastRatio(BUTTON_TEXT[mode], color);
      if (r < MIN_BUTTON_CONTRAST)
        throw new HttpError(400, `A cor ${color} (${name}, modo ${mode === "light" ? "claro" : "escuro"}) tem contraste ${r.toFixed(1)}:1 com o texto dos botões. O mínimo é ${MIN_BUTTON_CONTRAST}:1.`);
    }
  }
  await saveSettings(b as never);
  await audit(admin.id, "settings.update", "SiteSetting", null, { keys: Object.keys(b) }, clientIp(req));
  return ok();
});
