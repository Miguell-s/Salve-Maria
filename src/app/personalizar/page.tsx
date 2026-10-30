import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { available, parseImages } from "@/lib/format";
import { Customizer, type Mat } from "@/components/customizer/Customizer";
import { PageIn } from "@/components/Reveal";

export const metadata: Metadata = { title: "Personalize seu terço", description: "Monte seu terço escolhendo bolinhas, entremeios, crucifixo, medalha e detalhes, com visualização em 3D." };
export const dynamic = "force-dynamic"; // estoque sempre atual

export default async function Personalizar() {
  const [mats, templates] = await Promise.all([
    prisma.material.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.rosaryTemplate.findMany({ where: { active: true }, orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }] }),
  ]);
  const materials: Mat[] = mats.map((m) => ({
    id: m.id, kind: m.kind, name: m.name, color: m.color, colorHex: m.colorHex, sizeMm: m.sizeMm, materialType: m.materialType,
    unitPriceCents: m.unitPriceCents, available: available(m), images: parseImages(m.images), modelUrl: m.modelUrl,
  }));
  return (
    <PageIn>
      <div className="sky-bg border-b border-line py-8">
        <div className="container-x">
          <h1 className="text-4xl sm:text-5xl">Personalize seu <span className="text-purple">terço</span></h1>
          <p className="mt-2 max-w-2xl text-fg-2">Escolha cada detalhe e veja o resultado em 3D. O preço e o estoque são conferidos em tempo real.</p>
        </div>
      </div>
      <div className="container-x py-8">
        <Customizer materials={materials} templates={templates.map((t) => ({ id: t.id, name: t.name, beadsMain: t.beadsMain, beadsExtra: t.beadsExtra, spacers: t.spacers, crosses: t.crosses, medals: t.medals, assemblyCents: t.assemblyCents }))} />
      </div>
    </PageIn>
  );
}
