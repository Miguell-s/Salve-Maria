import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Configurações", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  const s = await getSettings();
  return (
    <SettingsForm
      mode="general"
      initial={{
        storeName: s.storeName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        contactAddress: s.contactAddress,
        whatsapp: s.whatsapp,
        socials: s.socials,
        instagramUser: s.instagramUser,
        shipping: s.shipping,
        reservationMinutes: s.reservationMinutes,
        abandonedCartEnabled: s.abandonedCartEnabled,
        abandonedCartMinutes: s.abandonedCartMinutes,
        lowStockDefault: s.lowStockDefault,
      }}
    />
  );
}
