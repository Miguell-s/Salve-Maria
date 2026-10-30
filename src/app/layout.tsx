import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { getSettings, type ThemeOverrides } from "@/lib/settings";
import { rgbTriplet } from "@/lib/contrast";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const display = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Salve Maria — Terços católicos personalizados", template: "%s | Salve Maria" },
  description: "Crie o seu terço do seu jeitinho: escolha bolinhas, crucifixo e medalha, veja em 3D e receba em casa. Terços prontos e personalizados.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Salve Maria", images: ["/brand/og.png"] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#55B9F5" }, { media: "(prefers-color-scheme: dark)", color: "#101827" }],
  width: "device-width",
  initialScale: 1,
};

// Aplica o tema ANTES da primeira pintura (sem "piscar"): preferência salva > sistema > claro.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('sm-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAP = { brand: "--brand-primary", pink: "--accent-pink", purple: "--accent-purple", yellow: "--accent-yellow" } as const;

/** Overrides de cor salvos no painel (já validados por contraste ao salvar; revalidados aqui). */
function themeCss(t: ThemeOverrides) {
  let css = "";
  for (const mode of ["light", "dark"] as const) {
    const vars = Object.entries(t[mode] ?? {})
      .filter(([k, v]) => k in MAP && typeof v === "string" && HEX.test(v))
      .map(([k, v]) => `${MAP[k as keyof typeof MAP]}:${rgbTriplet(v as string)};`)
      .join("");
    if (vars) css += `:root[data-theme="${mode}"]{${vars}}`;
  }
  return css;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const settings = await getSettings();
  const overrides = themeCss(settings.theme ?? {});
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT }} suppressHydrationWarning />
        {overrides && <style nonce={nonce} dangerouslySetInnerHTML={{ __html: overrides }} suppressHydrationWarning />}
      </head>
      <body>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-yellow focus:px-4 focus:py-2 focus:text-onaccent">
          Pular para o conteúdo
        </a>
        <CartProvider>
          <Header />
          <main id="conteudo" className="min-h-[60vh]">{children}</main>
          <Footer settings={{ socials: settings.socials, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone, contactAddress: settings.contactAddress }} />
          <WhatsAppButton number={settings.whatsapp} />
        </CartProvider>
      </body>
    </html>
  );
}
