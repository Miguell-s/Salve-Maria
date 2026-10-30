"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function WhatsAppButton({ number }: { number: string }) {
  const path = usePathname();
  const digits = number.replace(/\D+/g, "");
  if (!digits || path.startsWith("/admin")) return null;
  const text = encodeURIComponent("Olá! Vim pelo site da Salve Maria e gostaria de ajuda. 🙏");
  return (
    <a href={`https://wa.me/${digits}?text=${text}`} target="_blank" rel="noopener noreferrer" aria-label="Falar pelo WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-pop transition hover:scale-110 active:scale-95">
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
