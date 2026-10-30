import Image from "next/image";
import Link from "next/link";
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";
import { Heart } from "./Decor";

type Props = { settings: { socials: { instagram: string; facebook: string; tiktok: string; youtube: string }; contactEmail: string; contactPhone: string; contactAddress: string } };

const social = (kind: string, v: string) =>
  v ? (v.startsWith("http") ? v : kind === "instagram" ? `https://instagram.com/${v.replace(/^@/, "")}` : kind === "facebook" ? `https://facebook.com/${v}` : kind === "youtube" ? `https://youtube.com/${v}` : `https://tiktok.com/@${v.replace(/^@/, "")}`) : "";

export function Footer({ settings: s }: Props) {
  const links = [
    { k: "instagram", href: social("instagram", s.socials.instagram), Icon: Instagram, label: "Instagram" },
    { k: "facebook", href: social("facebook", s.socials.facebook), Icon: Facebook, label: "Facebook" },
    { k: "youtube", href: social("youtube", s.socials.youtube), Icon: Youtube, label: "YouTube" },
  ].filter((l) => l.href);
  return (
    <footer className="mt-24 border-t border-line bg-bg-2">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Image src="/brand/logo-header.png" alt="Salve Maria" width={160} height={100} className="photo h-20 w-auto" />
          <p className="mt-3 text-sm text-fg-2">Terços católicos feitos com carinho, do seu jeitinho.</p>
          <div className="mt-4 flex gap-2">
            {links.map(({ k, href, Icon, label }) => (
              <a key={k} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-card text-fg shadow-soft hover:text-pink"><Icon className="h-5 w-5" /></a>
            ))}
          </div>
        </div>
        <nav aria-label="Loja" className="text-sm">
          <h2 className="mb-3 text-base">Loja</h2>
          <ul className="space-y-2 text-fg-2">
            <li><Link href="/personalizar" className="hover:text-fg">Personalize seu terço</Link></li>
            <li><Link href="/loja" className="hover:text-fg">Terços prontos</Link></li>
            <li><Link href="/favoritos" className="hover:text-fg">Favoritos</Link></li>
            <li><Link href="/carrinho" className="hover:text-fg">Carrinho</Link></li>
          </ul>
        </nav>
        <nav aria-label="Institucional" className="text-sm">
          <h2 className="mb-3 text-base">Institucional</h2>
          <ul className="space-y-2 text-fg-2">
            <li><Link href="/historia" className="hover:text-fg">Nossa história</Link></li>
            <li><Link href="/contato" className="hover:text-fg">Contato</Link></li>
            <li><Link href="/privacidade" className="hover:text-fg">Política de Privacidade</Link></li>
            <li><Link href="/conta" className="hover:text-fg">Área do cliente</Link></li>
          </ul>
          <ul className="mt-4 space-y-2 text-fg-2">
            {s.contactEmail && <li className="flex items-center gap-2"><Mail className="h-4 w-4" />{s.contactEmail}</li>}
            {s.contactPhone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" />{s.contactPhone}</li>}
            {s.contactAddress && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />{s.contactAddress}</li>}
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 text-base">Novidades</h2>
          <NewsletterForm compact />
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-sm text-fg-2">
        © {new Date().getFullYear()} Salve Maria · Feito com <Heart className="inline h-3.5 w-3.5 text-pink" /> e fé.
      </div>
    </footer>
  );
}
