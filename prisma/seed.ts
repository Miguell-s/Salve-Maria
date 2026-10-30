/**
 * Dados de DEMONSTRAÇÃO (todos marcados com isDemo = true e SKU "DEMO-...").
 * Servem para ver a loja funcionando antes de cadastrar os itens reais.
 * Para apagar tudo que é demonstração:  npm run db:clear-demo
 *
 * Preços e quantidades abaixo são FICTÍCIOS — ajuste pelo painel.
 */
import { PrismaClient, type MaterialKind } from "@prisma/client";

const prisma = new PrismaClient();

type M = { kind: MaterialKind; sku: string; name: string; color: string; hex: string; size?: number; type: string; price: number; stock: number; low?: number };

const materials: M[] = [
  { kind: "BEAD", sku: "DEMO-B-PER-BR", name: "Pérola branca 6mm", color: "Branco", hex: "#F7F4EE", size: 6, type: "Pérola", price: 80, stock: 800 },
  { kind: "BEAD", sku: "DEMO-B-PER-RS", name: "Pérola rosa 6mm", color: "Rosa", hex: "#F6C1D6", size: 6, type: "Pérola", price: 80, stock: 400 },
  { kind: "BEAD", sku: "DEMO-B-CRI-TR", name: "Cristal transparente 6mm", color: "Transparente", hex: "#E6F4FF", size: 6, type: "Cristal", price: 90, stock: 500 },
  { kind: "BEAD", sku: "DEMO-B-CRI-AZ", name: "Cristal azul 6mm", color: "Azul", hex: "#4FA8E8", size: 6, type: "Cristal", price: 95, stock: 300 },
  { kind: "BEAD", sku: "DEMO-B-CRI-VM", name: "Cristal vermelho 6mm", color: "Vermelho", hex: "#D8344E", size: 6, type: "Cristal", price: 95, stock: 30 },
  { kind: "BEAD", sku: "DEMO-B-PED-OL", name: "Olho de tigre 6mm", color: "Dourado/marrom", hex: "#A9742B", size: 6, type: "Pedra natural", price: 160, stock: 250 },
  { kind: "BEAD", sku: "DEMO-B-MAD", name: "Madeira clara 8mm", color: "Madeira", hex: "#C9A06B", size: 8, type: "Madeira", price: 60, stock: 600 },
  { kind: "BEAD", sku: "DEMO-B-MAR", name: "Marmorizada lilás 6mm", color: "Lilás", hex: "#B9A4F0", size: 6, type: "Marmorizada", price: 110, stock: 300 },
  { kind: "SPACER", sku: "DEMO-S-DOU", name: "Entremeio dourado", color: "Dourado", hex: "#E5B93C", size: 8, type: "Metal", price: 150, stock: 80 },
  { kind: "SPACER", sku: "DEMO-S-PRA", name: "Entremeio prateado", color: "Prateado", hex: "#C7CEDA", size: 8, type: "Metal", price: 150, stock: 80 },
  { kind: "SPACER", sku: "DEMO-S-CRO", name: "Entremeio coração", color: "Dourado", hex: "#E5B93C", size: 10, type: "Metal", price: 220, stock: 60 },
  { kind: "CROSS", sku: "DEMO-C-TRA", name: "Crucifixo tradicional", color: "Prateado", hex: "#C7CEDA", type: "Metal", price: 450, stock: 60 },
  { kind: "CROSS", sku: "DEMO-C-DOU", name: "Crucifixo dourado", color: "Dourado", hex: "#E5B93C", type: "Metal", price: 520, stock: 50 },
  { kind: "CROSS", sku: "DEMO-C-MAD", name: "Crucifixo de madeira", color: "Madeira", hex: "#8B5E34", type: "Madeira", price: 380, stock: 40 },
  { kind: "CROSS", sku: "DEMO-C-TRB", name: "Crucifixo trabalhado", color: "Dourado envelhecido", hex: "#B8902F", type: "Metal", price: 780, stock: 25 },
  { kind: "MEDAL", sku: "DEMO-M-APA", name: "Nossa Senhora Aparecida", color: "Prateado", hex: "#C7CEDA", type: "Metal", price: 380, stock: 60 },
  { kind: "MEDAL", sku: "DEMO-M-GRA", name: "Nossa Senhora das Graças", color: "Prateado", hex: "#C7CEDA", type: "Metal", price: 380, stock: 60 },
  { kind: "MEDAL", sku: "DEMO-M-FAT", name: "Nossa Senhora de Fátima", color: "Dourado", hex: "#E5B93C", type: "Metal", price: 420, stock: 50 },
  { kind: "MEDAL", sku: "DEMO-M-BEN", name: "São Bento", color: "Prateado", hex: "#C7CEDA", type: "Metal", price: 400, stock: 50 },
  { kind: "MEDAL", sku: "DEMO-M-SCJ", name: "Sagrado Coração de Jesus", color: "Dourado", hex: "#E5B93C", type: "Metal", price: 420, stock: 40 },
  { kind: "MEDAL", sku: "DEMO-M-ESP", name: "Divino Espírito Santo", color: "Prateado", hex: "#C7CEDA", type: "Metal", price: 420, stock: 40 },
  { kind: "CHARM", sku: "DEMO-P-COR", name: "Pingente coração", color: "Dourado", hex: "#E5B93C", type: "Metal", price: 300, stock: 40 },
  { kind: "CHARM", sku: "DEMO-P-EST", name: "Pingente estrela", color: "Prateado", hex: "#C7CEDA", type: "Metal", price: 300, stock: 40 },
  { kind: "FINISH", sku: "DEMO-A-NOM", name: "Acabamento com fio encerado", color: "Branco", hex: "#FFFFFF", type: "Fio", price: 400, stock: 100 },
  { kind: "PACKAGING", sku: "DEMO-E-SAC", name: "Saquinho de tecido", color: "Azul", hex: "#80CEFF", type: "Tecido", price: 600, stock: 200 },
  { kind: "PACKAGING", sku: "DEMO-E-PRE", name: "Caixa de presente", color: "Branco", hex: "#FFFFFF", type: "Papel", price: 1200, stock: 100 },
];

async function main() {
  const cats = ["Terços tradicionais", "Terços de Nossa Senhora", "Terços de São Bento", "Terços de pérolas", "Terços de madeira", "Terços especiais", "Terços personalizados", "Presentes religiosos"];
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const [i, name] of cats.entries()) {
    await prisma.category.upsert({ where: { slug: slug(name) }, update: {}, create: { slug: slug(name), name, sortOrder: i } });
  }

  for (const [i, m] of materials.entries()) {
    await prisma.material.upsert({
      where: { sku: m.sku }, update: {},
      create: { kind: m.kind, sku: m.sku, name: m.name, color: m.color, colorHex: m.hex, sizeMm: m.size, materialType: m.type, unitPriceCents: m.price, stock: m.stock, lowStockAt: m.kind === "BEAD" ? 60 : 10, sortOrder: i, isDemo: true },
    });
  }

  if ((await prisma.rosaryTemplate.count()) === 0) {
    await prisma.rosaryTemplate.create({
      data: { name: "Terço tradicional (5 mistérios)", description: "53 bolinhas + 6 adicionais, 5 entremeios, crucifixo e medalha.", beadsMain: 53, beadsExtra: 6, spacers: 5, crosses: 1, medals: 1, assemblyCents: 1500, isDefault: true },
    });
  }

  const cat = async (n: string) => (await prisma.category.findUnique({ where: { slug: slug(n) } }))!.id;
  const products = [
    { sku: "DEMO-T-001", name: "Terço de Pérolas Brancas", cat: "Terços de pérolas", price: 8900, sale: 7900, stock: 10, featured: true, isNew: false, mat: "Pérola e metal", dim: "50 cm" },
    { sku: "DEMO-T-002", name: "Terço Nossa Senhora Aparecida", cat: "Terços de Nossa Senhora", price: 9900, stock: 8, featured: true, isNew: true, mat: "Cristal azul e metal", dim: "50 cm" },
    { sku: "DEMO-T-003", name: "Terço de São Bento em Madeira", cat: "Terços de São Bento", price: 7500, stock: 12, featured: true, isNew: false, mat: "Madeira", dim: "55 cm" },
    { sku: "DEMO-T-004", name: "Terço Cristal Rosa", cat: "Terços especiais", price: 10900, stock: 5, featured: false, isNew: true, mat: "Cristal e metal dourado", dim: "50 cm" },
    { sku: "DEMO-T-005", name: "Terço Tradicional Prateado", cat: "Terços tradicionais", price: 6900, stock: 15, featured: true, isNew: false, mat: "Metal e pérola", dim: "50 cm" },
    { sku: "DEMO-T-006", name: "Kit Presente Religioso", cat: "Presentes religiosos", price: 14900, stock: 0, featured: false, isNew: true, mat: "Terço + caixa", dim: "—" },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku }, update: {},
      create: {
        sku: p.sku, slug: slug(p.name), name: p.name, description: "Produto de demonstração. Substitua pelas informações reais no painel.",
        priceCents: p.price, salePriceCents: p.sale ?? null, stock: p.stock, categoryId: await cat(p.cat),
        featured: p.featured, isNew: p.isNew, materials: p.mat, dimensions: p.dim, weightGrams: 40, isDemo: true,
      },
    });
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({
      data: [
        { author: "Cliente exemplo 1", city: "Cidade", text: "Depoimento de demonstração — substitua por depoimentos reais pelo painel.", sortOrder: 0 },
        { author: "Cliente exemplo 2", city: "Cidade", text: "Depoimento de demonstração — substitua por depoimentos reais pelo painel.", sortOrder: 1 },
      ],
    });
  }
  console.log("Seed de demonstração concluído.");
}

main().finally(() => prisma.$disconnect());
