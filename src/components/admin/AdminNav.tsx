"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function AdminNav({ groups }: { groups: { title: string; links: { href: string; label: string }[] }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Painel" className="card h-fit space-y-4 p-3 lg:sticky lg:top-24">
      {groups.map((g) => (
        <div key={g.title}>
          <h2 className="px-2 pb-1 font-sans text-xs font-extrabold uppercase tracking-wider text-fg-2">{g.title}</h2>
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {g.links.map((l) => (
              <li key={l.href}><Link href={l.href} aria-current={path === l.href ? "page" : undefined}
                className={clsx("block rounded-xl px-3 py-2 text-sm font-bold", path === l.href ? "bg-brand text-onaccent" : "hover:bg-bg-2")}>{l.label}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
