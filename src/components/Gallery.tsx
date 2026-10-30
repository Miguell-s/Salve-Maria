"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { RosaryIllustration } from "./RosaryIllustration";

/** Galeria com deslizar por toque (scroll-snap), setas, miniaturas e zoom ao passar o mouse. */
export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const go = (n: number) => {
    const next = (n + images.length) % images.length;
    setI(next);
    track.current?.children[next]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setI(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (images.length === 0)
    return <div className="card grid aspect-square place-items-center bg-bg-2 p-12"><RosaryIllustration className="h-full w-full max-w-[60%]" /></div>;

  return (
    <div>
      <div className="card relative overflow-hidden">
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, k) => (
            <div key={src} className="relative aspect-square w-full shrink-0 snap-center"
              onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
              onMouseLeave={() => setZoom(null)}>
              <Image src={src} alt={`${name} — foto ${k + 1}`} fill priority={k === 0} sizes="(max-width:1024px) 100vw, 50vw"
                className="photo object-cover transition-transform duration-200"
                style={zoom && k === i ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button onClick={() => go(i - 1)} aria-label="Foto anterior" className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow-soft"><ChevronLeft /></button>
            <button onClick={() => go(i + 1)} aria-label="Próxima foto" className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow-soft"><ChevronRight /></button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, k) => (
            <button key={src} onClick={() => go(k)} aria-label={`Ver foto ${k + 1}`} aria-current={k === i}
              className={clsx("relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2", k === i ? "border-brand" : "border-line opacity-70 hover:opacity-100")}>
              <Image src={src} alt="" fill sizes="64px" className="photo object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
