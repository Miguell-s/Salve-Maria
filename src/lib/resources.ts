// Definição única dos cadastros do painel: o MESMO arquivo alimenta o formulário (cliente)
// e a validação (servidor). Sem imports de banco para poder ir ao navegador.
import { z } from "zod";

export type FieldType = "text" | "textarea" | "number" | "money" | "bool" | "select" | "images" | "color" | "datetime";
export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  help?: string;
  half?: boolean;
  single?: boolean; // campo de imagem única (valor string, não lista)
};

export type ResourceDef = {
  key: string;
  label: string;
  singular: string;
  model: "material" | "product" | "category" | "rosaryTemplate" | "coupon" | "testimonial" | "banner";
  fixed?: Record<string, unknown>; // ex.: { kind: "BEAD" }
  fields: Field[];
  columns: { name: string; label: string; type?: "money" | "bool" | "image" | "stock" | "text" }[];
  schema: z.ZodTypeAny;
  stockTable?: "Product" | "Material";
  orderBy: Record<string, "asc" | "desc">;
  help?: string;
};

const imgPath = z.string().regex(/^\/(uploads|brand)\/[\w.\-]+$/, "Imagem inválida");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use o formato #RRGGBB");
const cents = z.number().int().min(0).max(100_000_000);
const count = z.number().int().min(0).max(1_000_000);
const modelPath = z.string().regex(/^\/models\/[\w.\-]+\.(glb|gltf)$/, "Use /models/arquivo.glb").nullable().optional();

const materialFields: Field[] = [
  { name: "name", label: "Nome", type: "text" },
  { name: "sku", label: "Código (SKU)", type: "text", half: true },
  { name: "materialType", label: "Material", type: "text", half: true, help: "Ex.: pérola, cristal, madeira, metal" },
  { name: "color", label: "Cor (nome)", type: "text", half: true },
  { name: "colorHex", label: "Cor (visualização 3D)", type: "color", half: true },
  { name: "sizeMm", label: "Dimensão (mm)", type: "number", half: true },
  { name: "unitPriceCents", label: "Preço unitário", type: "money", half: true },
  { name: "stock", label: "Quantidade em estoque", type: "number", half: true },
  { name: "lowStockAt", label: "Avisar estoque baixo em", type: "number", half: true },
  { name: "images", label: "Fotografias", type: "images" },
  { name: "modelUrl", label: "Modelo 3D (opcional)", type: "text", help: "Caminho de um .glb em /public/models, ex.: /models/crucifixo.glb. Sem modelo, o 3D usa a forma padrão." },
  { name: "sortOrder", label: "Ordem", type: "number", half: true },
  { name: "active", label: "Ativo (aparece no personalizador)", type: "bool", half: true },
];

const materialSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sku: z.string().trim().min(2).max(40),
  color: z.string().max(40).default(""),
  colorHex: hex.default("#FFFFFF"),
  sizeMm: z.number().min(0).max(200).nullable().optional(),
  materialType: z.string().max(60).default(""),
  unitPriceCents: cents,
  stock: count,
  lowStockAt: count.default(30),
  images: z.array(imgPath).max(12).default([]),
  modelUrl: modelPath,
  sortOrder: z.number().int().min(-1000).max(1000).default(0),
  active: z.boolean().default(true),
});

const materialColumns: ResourceDef["columns"] = [
  { name: "images", label: "Foto", type: "image" },
  { name: "name", label: "Nome" },
  { name: "materialType", label: "Material" },
  { name: "unitPriceCents", label: "Preço un.", type: "money" },
  { name: "stock", label: "Estoque", type: "stock" },
  { name: "active", label: "Ativo", type: "bool" },
];

const mat = (key: string, label: string, singular: string, kind: string, help?: string): ResourceDef => ({
  key, label, singular, model: "material", fixed: { kind }, fields: materialFields, columns: materialColumns,
  schema: materialSchema, stockTable: "Material", orderBy: { sortOrder: "asc" }, help,
});

export const RESOURCES: ResourceDef[] = [
  mat("bolinhas", "Bolinhas", "bolinha", "BEAD", "Cada terço usa as quantidades definidas em Composições (ex.: 53 + 6)."),
  mat("entremeios", "Entremeios", "entremeio", "SPACER"),
  mat("crucifixos", "Crucifixos", "crucifixo", "CROSS"),
  mat("medalhas", "Medalhas", "medalha", "MEDAL", "Nossa Senhora Aparecida, São Bento, Sagrado Coração..."),
  mat("pingentes", "Pingentes", "pingente", "CHARM"),
  mat("acabamentos", "Acabamentos", "acabamento", "FINISH"),
  mat("embalagens", "Embalagens", "embalagem", "PACKAGING"),
  {
    key: "produtos", label: "Terços prontos", singular: "terço pronto", model: "product", stockTable: "Product", orderBy: { createdAt: "desc" },
    fields: [
      { name: "name", label: "Nome", type: "text" },
      { name: "sku", label: "Código (SKU)", type: "text", half: true },
      { name: "categoryId", label: "Categoria", type: "select", half: true },
      { name: "priceCents", label: "Preço", type: "money", half: true },
      { name: "salePriceCents", label: "Preço promocional (opcional)", type: "money", half: true },
      { name: "description", label: "Descrição", type: "textarea" },
      { name: "images", label: "Fotografias (quantas quiser)", type: "images" },
      { name: "materials", label: "Materiais", type: "text", half: true },
      { name: "dimensions", label: "Dimensões", type: "text", half: true },
      { name: "weightGrams", label: "Peso (g)", type: "number", half: true },
      { name: "stock", label: "Quantidade disponível", type: "number", half: true },
      { name: "lowStockAt", label: "Avisar estoque baixo em", type: "number", half: true },
      { name: "status", label: "Status", type: "select", half: true, options: [
        { value: "ACTIVE", label: "Ativo" }, { value: "DRAFT", label: "Rascunho" }, { value: "ARCHIVED", label: "Arquivado" } ] },
      { name: "featured", label: "Destaque / mais vendidos", type: "bool", half: true },
      { name: "isNew", label: "Novidade", type: "bool", half: true },
    ],
    columns: [
      { name: "images", label: "Foto", type: "image" }, { name: "name", label: "Nome" },
      { name: "priceCents", label: "Preço", type: "money" }, { name: "stock", label: "Estoque", type: "stock" },
      { name: "status", label: "Status" },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(120),
      sku: z.string().trim().min(2).max(40),
      description: z.string().max(5000).default(""),
      priceCents: cents,
      salePriceCents: cents.nullable().optional(),
      images: z.array(imgPath).max(30).default([]),
      categoryId: z.string().max(40).nullable().optional(),
      materials: z.string().max(200).nullable().optional(),
      dimensions: z.string().max(100).nullable().optional(),
      weightGrams: z.number().int().min(0).max(100000).nullable().optional(),
      stock: count,
      lowStockAt: count.default(3),
      status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
      featured: z.boolean().default(false),
      isNew: z.boolean().default(false),
    }),
  },
  {
    key: "categorias", label: "Categorias", singular: "categoria", model: "category", orderBy: { sortOrder: "asc" },
    fields: [
      { name: "name", label: "Nome", type: "text" }, { name: "description", label: "Descrição", type: "textarea" },
      { name: "sortOrder", label: "Ordem", type: "number", half: true }, { name: "active", label: "Ativa", type: "bool", half: true },
    ],
    columns: [{ name: "name", label: "Nome" }, { name: "sortOrder", label: "Ordem" }, { name: "active", label: "Ativa", type: "bool" }],
    schema: z.object({ name: z.string().trim().min(2).max(80), description: z.string().max(500).nullable().optional(), sortOrder: z.number().int().default(0), active: z.boolean().default(true) }),
  },
  {
    key: "composicoes", label: "Composições", singular: "composição", model: "rosaryTemplate", orderBy: { sortOrder: "asc" },
    help: "Define quantas peças cada terço usa. O cálculo de materiais e a baixa de estoque seguem estes números.",
    fields: [
      { name: "name", label: "Nome", type: "text" }, { name: "description", label: "Descrição", type: "textarea" },
      { name: "beadsMain", label: "Bolinhas principais", type: "number", half: true },
      { name: "beadsExtra", label: "Bolinhas adicionais", type: "number", half: true },
      { name: "spacers", label: "Entremeios", type: "number", half: true },
      { name: "crosses", label: "Crucifixos", type: "number", half: true },
      { name: "medals", label: "Medalhas", type: "number", half: true },
      { name: "assemblyCents", label: "Custo de montagem", type: "money", half: true },
      { name: "sortOrder", label: "Ordem", type: "number", half: true },
      { name: "isDefault", label: "Padrão", type: "bool", half: true },
      { name: "active", label: "Ativa", type: "bool", half: true },
    ],
    columns: [{ name: "name", label: "Nome" }, { name: "beadsMain", label: "Bolinhas" }, { name: "assemblyCents", label: "Montagem", type: "money" }, { name: "active", label: "Ativa", type: "bool" }],
    schema: z.object({
      name: z.string().trim().min(2).max(80), description: z.string().max(500).default(""),
      beadsMain: z.number().int().min(0).max(500), beadsExtra: z.number().int().min(0).max(100),
      spacers: z.number().int().min(0).max(100), crosses: z.number().int().min(0).max(5), medals: z.number().int().min(0).max(5),
      assemblyCents: cents, sortOrder: z.number().int().default(0), isDefault: z.boolean().default(false), active: z.boolean().default(true),
    }),
  },
  {
    key: "cupons", label: "Cupons", singular: "cupom", model: "coupon", orderBy: { code: "asc" },
    fields: [
      { name: "code", label: "Código", type: "text", half: true },
      { name: "percentOff", label: "Desconto (%)", type: "number", half: true },
      { name: "centsOff", label: "Desconto fixo", type: "money", half: true },
      { name: "minCents", label: "Pedido mínimo", type: "money", half: true },
      { name: "expiresAt", label: "Expira em", type: "datetime", half: true },
      { name: "active", label: "Ativo", type: "bool", half: true },
    ],
    columns: [{ name: "code", label: "Código" }, { name: "percentOff", label: "%" }, { name: "centsOff", label: "Fixo", type: "money" }, { name: "active", label: "Ativo", type: "bool" }],
    schema: z.object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "3-30 letras/números"),
      percentOff: z.number().int().min(1).max(90).nullable().optional(), centsOff: cents.nullable().optional(),
      minCents: cents.default(0), expiresAt: z.coerce.date().nullable().optional(), active: z.boolean().default(true),
    }).refine((v) => !!v.percentOff !== !!v.centsOff, "Informe % OU valor fixo (apenas um)."),
  },
  {
    key: "depoimentos", label: "Depoimentos", singular: "depoimento", model: "testimonial", orderBy: { sortOrder: "asc" },
    fields: [
      { name: "author", label: "Autor(a)", type: "text", half: true }, { name: "city", label: "Cidade", type: "text", half: true },
      { name: "text", label: "Texto", type: "textarea" }, { name: "rating", label: "Estrelas (1-5)", type: "number", half: true },
      { name: "sortOrder", label: "Ordem", type: "number", half: true }, { name: "active", label: "Visível", type: "bool", half: true },
    ],
    columns: [{ name: "author", label: "Autor(a)" }, { name: "text", label: "Texto" }, { name: "active", label: "Visível", type: "bool" }],
    schema: z.object({ author: z.string().trim().min(2).max(80), city: z.string().max(80).default(""), text: z.string().trim().min(5).max(600), rating: z.number().int().min(1).max(5).default(5), sortOrder: z.number().int().default(0), active: z.boolean().default(true) }),
  },
  {
    key: "banners", label: "Banners", singular: "banner", model: "banner", orderBy: { sortOrder: "asc" },
    fields: [
      { name: "title", label: "Título", type: "text" }, { name: "subtitle", label: "Subtítulo", type: "text" },
      { name: "imageUrl", label: "Imagem", type: "images", single: true, help: "Envie 1 imagem." }, { name: "linkUrl", label: "Link (ex.: /loja)", type: "text", half: true },
      { name: "sortOrder", label: "Ordem", type: "number", half: true }, { name: "active", label: "Ativo", type: "bool", half: true },
    ],
    columns: [{ name: "title", label: "Título" }, { name: "linkUrl", label: "Link" }, { name: "active", label: "Ativo", type: "bool" }],
    schema: z.object({
      title: z.string().trim().min(2).max(120), subtitle: z.string().max(200).default(""),
      imageUrl: imgPath, linkUrl: z.string().regex(/^\/[\w\-\/]*$/, "Use um caminho interno, ex.: /loja").default(""),
      sortOrder: z.number().int().default(0), active: z.boolean().default(true),
    }),
  },
];

export const resourceByKey = (k: string) => RESOURCES.find((r) => r.key === k);
