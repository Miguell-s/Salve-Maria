import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { resourceByKey } from "@/lib/resources";
import { ResourceManager } from "@/components/admin/ResourceManager";

export const dynamic = "force-dynamic";

export default async function ResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const res = resourceByKey(resource);
  if (!res) notFound();
  const categories = res.key === "produtos" ? await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }) : [];
  // Só campos serializáveis vão ao cliente (o schema Zod fica no servidor).
  const { schema: _schema, ...def } = res; // eslint-disable-line @typescript-eslint/no-unused-vars
  return <ResourceManager def={def} categories={categories} />;
}
