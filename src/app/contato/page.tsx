import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Contato" };
export const revalidate = 60;

export default async function Contato() {
  const s = await getSettings();
  const wa = s.whatsapp.replace(/\D/g, "");
  const rows = [
    wa && { Icon: MessageCircle, label: "WhatsApp", value: "Falar agora", href: `https://wa.me/${wa}` },
    s.contactEmail && { Icon: Mail, label: "E-mail", value: s.contactEmail, href: `mailto:${s.contactEmail}` },
    s.contactPhone && { Icon: Phone, label: "Telefone", value: s.contactPhone, href: `tel:${s.contactPhone.replace(/\D/g, "")}` },
    s.contactAddress && { Icon: MapPin, label: "Endereço", value: s.contactAddress, href: "" },
  ].filter(Boolean) as { Icon: typeof Mail; label: string; value: string; href: string }[];
  return (
    <div className="container-x max-w-2xl py-12">
      <h1 className="text-4xl">Fale com a gente</h1>
      <p className="mt-2 text-fg-2">Dúvidas sobre um terço ou sobre o seu pedido? Estamos aqui.</p>
      <div className="mt-8 space-y-3">
        {rows.length === 0 && <p className="card p-6 text-fg-2">Os canais de contato serão exibidos aqui assim que forem cadastrados em Admin › Configurações.</p>}
        {rows.map(({ Icon, label, value, href }) => {
          const inner = <><span className="grid h-12 w-12 place-items-center rounded-full bg-brand/25"><Icon className="h-6 w-6" /></span><span><span className="block text-sm font-bold text-fg-2">{label}</span><span className="font-extrabold">{value}</span></span></>;
          return href ? <a key={label} href={href} className="card card-hover flex items-center gap-4 p-4" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{inner}</a> : <div key={label} className="card flex items-center gap-4 p-4">{inner}</div>;
        })}
      </div>
    </div>
  );
}
