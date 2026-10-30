import Image from "next/image";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageIn } from "@/components/Reveal";

export const metadata: Metadata = { title: "Nossa história" };
export const revalidate = 60;

export default async function Historia() {
  const s = await getSettings();
  return (
    <PageIn>
      <div className="sky-bg py-14"><div className="container-x grid items-center gap-8 md:grid-cols-2">
        <div><h1 className="text-4xl sm:text-5xl">{s.historyTitle}</h1><p className="mt-5 whitespace-pre-line text-lg text-fg-2">{s.historyText}</p></div>
        <Image src="/brand/logo-compact.png" alt="Salve Maria" width={900} height={540} className="photo mx-auto h-auto w-full max-w-sm animate-floaty" />
      </div></div>
    </PageIn>
  );
}
