import { cache } from "react";
import { prisma } from "./db";

export type ThemeOverrides = {
  light?: Partial<Record<"brand" | "pink" | "purple" | "yellow", string>>;
  dark?: Partial<Record<"brand" | "pink" | "purple" | "yellow", string>>;
};

export const DEFAULT_SETTINGS = {
  storeName: "Salve Maria",
  heroChip: "Feito à mão, com fé e carinho",
  heroTitle: "SEU TERÇO, DO SEU JEITINHO!",
  heroSubtitle: "Escolha cada detalhe e crie um terço especial, feito para acompanhar sua fé.",
  heroImage: "",
  heroCtaPrimary: "Criar meu terço",
  heroCtaSecondary: "Ver terços prontos",
  customizeTitle: "Personalize seu terço",
  customizeText:
    "Escolha as bolinhas, o crucifixo, a medalha e os detalhes. Veja tudo em 3D antes de comprar.",
  customizeCta: "Começar agora",
  customizeSteps: ["Bolinhas", "Entremeios", "Crucifixo", "Medalha", "Detalhes", "Revisão"],
  bestSellersTitle: "Terços mais vendidos",
  bestSellersCta: "Ver todos",
  collectionTitle: "Nossa coleção",
  newArrivalsTitle: "Novidades",
  newArrivalsCta: "Ver novidades",
  materialsTitle: "Materiais e acessórios",
  materialsSubtitle: "Pérolas, cristais, pedras naturais, madeira, crucifixos e medalhas de vários santos — escolha cada detalhe.",
  howItWorksTitle: "Como funciona a personalização",
  howItWorks: [
    { title: "Escolha", text: "Selecione bolinhas, entremeios, crucifixo e medalha." },
    { title: "Veja em 3D", text: "Gire e aproxime o terço enquanto monta." },
    { title: "Receba em casa", text: "Montamos à mão e enviamos com carinho." },
  ],
  testimonialsTitle: "Quem recebeu, amou",
  instagramTitle: "Siga no Instagram",
  instagramUser: "",
  instagramImages: [] as string[],
  newsletterTitle: "Receba novidades e ofertas",
  newsletterSubtitle: "Lançamentos, promoções e dicas para cuidar do seu terço.",
  historyTitle: "Nossa história",
  historyText:
    "A Salve Maria nasceu do desejo de transformar a fé em um presente feito à mão, com carinho em cada detalhe. (Edite este texto em Admin > Configurações.)",
  socials: { instagram: "", facebook: "", tiktok: "", youtube: "" },
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  shipping: {
    freeAboveCents: 25000,
    // preço por região (1º dígito do CEP), em centavos — ajuste no painel
    byRegion: { "0": 2200, "1": 2200, "2": 2600, "3": 2600, "4": 3000, "5": 3000, "6": 3600, "7": 3200, "8": 2800, "9": 3000 } as Record<string, number>,
    pickupNote: "",
  },
  lowStockDefault: true,
  abandonedCartMinutes: 120,
  abandonedCartEnabled: false,
  reservationMinutes: 30,
  theme: {} as ThemeOverrides,
};

export type Settings = typeof DEFAULT_SETTINGS;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.siteSetting.findMany();
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
});

export async function saveSettings(patch: Partial<Settings>) {
  await prisma.$transaction(
    Object.entries(patch).map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } }),
    ),
  );
}
