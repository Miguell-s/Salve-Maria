// Elementos gráficos inspirados na logo (nuvem, coração, estrela, faíscas).
// Todas as cores usam tokens do tema; animações respeitam prefers-reduced-motion (globals.css).
import clsx from "clsx";

type P = { className?: string };

export function Heart({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 2.9 4.5 6.4 4.5c2 0 3.7 1.1 4.6 2.8l1 1.7 1-1.7c.9-1.7 2.6-2.8 4.6-2.8 3.5 0 5.5 3.7 4 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export function Star({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 1.5l2.6 7.1 7.4.4-5.8 4.6 2 7.2L12 16.7 5.8 20.8l2-7.2L2 9l7.4-.4L12 1.5z" />
    </svg>
  );
}

export function Sparks({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
      <path d="M8 36l8-6M20 10l-2 10M38 14l-9 9" />
    </svg>
  );
}

export function Cloud({ className }: P) {
  return (
    <svg viewBox="0 0 200 110" className={className} aria-hidden fill="currentColor">
      <path d="M52 100c-22 0-40-14-40-33 0-15 11-27 27-31 3-18 19-30 39-30 15 0 28 7 35 18 5-3 11-4 17-4 21 0 38 15 38 34 0 1 0 3-.2 4 14 3 24 13 24 26 0 16-15 16-30 16H52z" />
    </svg>
  );
}

/** Pontilhado em curva, como o traço da logo. */
export function Dashes({ className }: P) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9">
      <path d="M10 6c-8 30 8 50 38 56 24 5 40 12 46 24" />
    </svg>
  );
}

/** Decoração discreta e flutuante para fundos de seção. */
export function FloatingDecor({ variant = "sky" }: { variant?: "sky" | "soft" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Cloud className={clsx("absolute -left-10 top-10 w-48 animate-drift text-card", variant === "sky" ? "opacity-90" : "opacity-60")} />
      <Cloud className="absolute -right-6 top-40 hidden w-40 animate-drift text-card opacity-80 [animation-delay:-6s] sm:block" />
      <Heart className="absolute left-[12%] top-[58%] w-6 animate-beat text-brand-deep opacity-70" />
      <Heart className="absolute right-[14%] top-[22%] w-5 animate-beat text-pink opacity-80 [animation-delay:-1.2s]" />
      <Star className="absolute left-[46%] top-[8%] w-4 animate-twinkle text-yellow" />
      <Star className="absolute right-[30%] bottom-[18%] w-5 animate-twinkle text-yellow [animation-delay:-1.5s]" />
      <Sparks className="absolute right-[6%] top-[6%] w-12 text-yellow" />
    </div>
  );
}
