"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";
import { useCart } from "./CartProvider";
import { useFavorites } from "./FavoriteButton";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/personalizar", label: "Personalize seu terço" },
  { href: "/loja", label: "Terços prontos" },
  { href: "/historia", label: "Nossa história" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { count, bump } = useCart();
  const { ids } = useFavorites();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={clsx("sticky top-0 z-50 border-b border-line/70 bg-bg/90 backdrop-blur-md transition-shadow", scrolled && "shadow-soft")}>
      <div className="container-x flex h-[72px] items-center gap-3">
        <Link href="/" aria-label="Salve Maria — página inicial" className="shrink-0">
          <Image src="/brand/logo-header.png" alt="Salve Maria" width={140} height={88} priority className="photo h-[58px] w-auto" />
        </Link>

        <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
              className={clsx("rounded-full px-3.5 py-2 font-display text-[0.95rem] font-bold", isActive(n.href) ? "bg-brand/20 text-brand-deep" : "text-fg-2 hover:bg-bg-2 hover:text-fg")}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link href="/favoritos" aria-label={`Favoritos (${ids.length})`} className="relative hidden h-11 w-11 place-items-center rounded-full text-fg hover:bg-bg-2 sm:grid">
            <Heart className="h-5 w-5" />
            {ids.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-pink px-1 text-[10px] font-extrabold text-onaccent">{ids.length}</span>}
          </Link>
          <Link href="/conta" aria-label="Área do cliente" className="flex h-11 items-center gap-2 rounded-full px-3 text-fg hover:bg-bg-2">
            <User className="h-5 w-5" />
            <span className="hidden text-sm font-bold sm:inline">Entrar</span>
          </Link>
          <Link href="/carrinho" aria-label={`Carrinho (${count} itens)`} className="relative grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-bg-2">
            <motion.span key={bump} initial={reduce || bump === 0 ? false : { scale: 1.35, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14 }} className="grid place-items-center">
              <ShoppingBag className="h-5 w-5" />
            </motion.span>
            {count > 0 && <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-yellow px-1 text-[11px] font-extrabold text-onaccent">{count}</span>}
          </Link>
          <ThemeToggle />
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" className="grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-bg-2 lg:hidden"><Menu className="h-6 w-6" /></button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
            <motion.aside role="dialog" aria-modal="true" aria-label="Menu" initial={reduce ? false : { x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.28 }}
              className="fixed right-0 top-0 z-[70] flex h-dvh w-[86%] max-w-sm flex-col gap-2 overflow-y-auto bg-bg p-5 shadow-pop lg:hidden">
              <div className="flex items-center justify-between">
                <Image src="/brand/logo-header.png" alt="Salve Maria" width={110} height={70} className="photo h-12 w-auto" />
                <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="grid h-11 w-11 place-items-center rounded-full hover:bg-bg-2"><X className="h-6 w-6" /></button>
              </div>
              <nav aria-label="Menu móvel" className="mt-4 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className={clsx("rounded-2xl px-4 py-3.5 font-display text-lg font-bold", isActive(n.href) ? "bg-brand/20 text-brand-deep" : "hover:bg-bg-2")}>{n.label}</Link>
                ))}
                <hr className="my-2 border-line" />
                <Link href="/favoritos" className="rounded-2xl px-4 py-3 font-bold hover:bg-bg-2">Favoritos ({ids.length})</Link>
                <Link href="/conta" className="rounded-2xl px-4 py-3 font-bold hover:bg-bg-2">Área do cliente</Link>
              </nav>
              <div className="mt-auto flex items-center justify-between rounded-2xl bg-bg-2 p-3">
                <span className="font-bold">Aparência</span>
                <ThemeToggle />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
