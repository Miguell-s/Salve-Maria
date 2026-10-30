import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Aparência e textos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Aparencia() {
  const s = await getSettings();
  return (
    <SettingsForm
      mode="visual"
      initial={{
        heroTitle: s.heroTitle,
        heroChip: s.heroChip,
        heroSubtitle: s.heroSubtitle,
        heroImage: s.heroImage,
        heroCtaPrimary: s.heroCtaPrimary,
        heroCtaSecondary: s.heroCtaSecondary,
        bestSellersTitle: s.bestSellersTitle,
        bestSellersCta: s.bestSellersCta,
        collectionTitle: s.collectionTitle,
        newArrivalsTitle: s.newArrivalsTitle,
        newArrivalsCta: s.newArrivalsCta,
        testimonialsTitle: s.testimonialsTitle,
        customizeTitle: s.customizeTitle,
        customizeText: s.customizeText,
        customizeCta: s.customizeCta,
        customizeSteps: s.customizeSteps,
        historyTitle: s.historyTitle,
        historyText: s.historyText,
        materialsTitle: s.materialsTitle,
        materialsSubtitle: s.materialsSubtitle,
        howItWorksTitle: s.howItWorksTitle,
        howItWorks: s.howItWorks,
        instagramTitle: s.instagramTitle,
        instagramImages: s.instagramImages,
        newsletterTitle: s.newsletterTitle,
        newsletterSubtitle: s.newsletterSubtitle,
        theme: s.theme,
      }}
    />
  );
}
