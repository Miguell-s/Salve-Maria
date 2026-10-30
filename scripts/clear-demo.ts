// Remove os dados de demonstração (isDemo = true) e depoimentos de exemplo.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.deleteMany({ where: { isDemo: true } });
  const m = await prisma.material.deleteMany({ where: { isDemo: true } });
  const t = await prisma.testimonial.deleteMany({ where: { author: { startsWith: "Cliente exemplo" } } });
  console.log(`Removidos: ${p.count} produtos, ${m.count} materiais, ${t.count} depoimentos de exemplo.`);
}
main().finally(() => prisma.$disconnect());
