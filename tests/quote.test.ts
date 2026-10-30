import test from "node:test";
import assert from "node:assert/strict";
import { buildQuote } from "../src/lib/quote-core";
import { contrastRatio, BUTTON_TEXT, MIN_BUTTON_CONTRAST } from "../src/lib/contrast";
import { aggregateNeeds } from "../src/lib/stock";

const tpl = { beadsMain: 53, beadsExtra: 6, spacers: 5, crosses: 1, medals: 1, assemblyCents: 1500 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mat = (id: string, kind: string, price: number, stock: number, reserved = 0): any => ({
  id, kind, name: id, unitPriceCents: price, stock, reserved, images: [], colorHex: "#fff",
});

const full = () => ({
  bead: mat("perola", "BEAD", 80, 500),
  spacer: mat("entre", "SPACER", 150, 50),
  cross: mat("cruz", "CROSS", 450, 10),
  medal: mat("medalha", "MEDAL", 380, 10),
  charms: [],
});

test("53 pérolas × R$ 0,80 = R$ 42,40", () => {
  const q = buildQuote(tpl, full());
  const main = q.lines.find((l) => l.materialId === "perola" && l.qty === 53)!;
  assert.equal(main.totalCents, 4240);
});

test("total = materiais + extras + embalagem + montagem", () => {
  const p = { ...full(), charms: [mat("ping", "CHARM", 300, 5)], packaging: mat("caixa", "PACKAGING", 1200, 5) };
  const q = buildQuote(tpl, p);
  // (53+6)*80 + 5*150 + 450 + 380 = 4720+750+830 = 6300 ; extras 300 ; emb 1200 ; montagem 1500
  assert.equal(q.materialsCents, 6300);
  assert.equal(q.extrasCents, 300);
  assert.equal(q.packagingCents, 1200);
  assert.equal(q.totalCents, 6300 + 300 + 1200 + 1500);
  assert.equal(q.ok, true);
});

test("estoque insuficiente: 53+6 bolinhas com só 30 disponíveis → indisponível", () => {
  const p = { ...full(), bead: mat("perola", "BEAD", 80, 30) };
  const q = buildQuote(tpl, p);
  assert.equal(q.ok, false);
  assert.match(q.problems.join(" "), /indisponível/);
});

test("reservas reduzem o disponível", () => {
  const p = { ...full(), cross: mat("cruz", "CROSS", 450, 1, 1) };
  assert.equal(buildQuote(tpl, p).ok, false);
});

test("a mesma bolinha nas duas posições soma a necessidade (53+6 = 59)", () => {
  assert.equal(buildQuote(tpl, { ...full(), bead: mat("perola", "BEAD", 80, 58) }).ok, false);
  assert.equal(buildQuote(tpl, { ...full(), bead: mat("perola", "BEAD", 80, 59) }).ok, true);
});

test("campos obrigatórios ausentes geram avisos", () => {
  const q = buildQuote(tpl, { charms: [] });
  assert.equal(q.ok, false);
  assert.ok(q.problems.length >= 4);
});

test("composição configurável muda quantidades", () => {
  const q = buildQuote({ ...tpl, beadsMain: 10, beadsExtra: 0, spacers: 0 }, full());
  assert.equal(q.lines.find((l) => l.kind === "BEAD")!.qty, 10);
  assert.ok(!q.lines.some((l) => l.kind === "SPACER"));
});

test("contraste: cores oficiais passam com o texto dos botões", () => {
  for (const c of ["#55B9F5", "#FF70B6", "#FFC943"]) assert.ok(contrastRatio(BUTTON_TEXT.light, c) >= MIN_BUTTON_CONTRAST, c);
  // roxo oficial #9270E8 NÃO atinge 4,5:1 com texto: botões/rótulos usam o roxo profundo
  assert.ok(contrastRatio(BUTTON_TEXT.light, "#9270E8") < MIN_BUTTON_CONTRAST);
  assert.ok(contrastRatio("#FFFFFF", "#6B4BD0") >= MIN_BUTTON_CONTRAST, "roxo profundo + branco (claro)");
  assert.ok(contrastRatio("#FFFFFF", "#1769C2") >= MIN_BUTTON_CONTRAST, "branco no início do gradiente do banner (claro)");
  assert.ok(contrastRatio("#FFFFFF", "#244E8C") >= MIN_BUTTON_CONTRAST && contrastRatio("#FFFFFF", "#5B3FAA") >= MIN_BUTTON_CONTRAST, "branco no gradiente do banner (escuro)");
  assert.ok(contrastRatio("#9270E8", "#FFFFFF") >= 3, "roxo oficial em títulos grandes (3:1)");
  for (const c of ["#55B9F5", "#AA91FF", "#FF83C0", "#FFD166"]) assert.ok(contrastRatio(BUTTON_TEXT.dark, c) >= MIN_BUTTON_CONTRAST, c);
});

test("contraste: cor escura é recusada", () => {
  assert.ok(contrastRatio(BUTTON_TEXT.light, "#222222") < MIN_BUTTON_CONTRAST);
});

test("aggregateNeeds junta itens iguais e ordena (evita deadlock)", () => {
  const r = aggregateNeeds([{ table: "Material", id: "b", qty: 2 }, { table: "Material", id: "a", qty: 1 }, { table: "Material", id: "b", qty: 3 }]);
  assert.deepEqual(r.map((x) => [x.id, x.qty]), [["a", 1], ["b", 5]]);
});
