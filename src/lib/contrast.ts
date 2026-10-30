// Validação de contraste WCAG usada no painel de aparência.
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lum([r, g, b]: [number, number, number]) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return 0;
  const [l1, l2] = [lum(A), lum(B)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export const rgbTriplet = (hex: string) => (hexToRgb(hex) ?? [0, 0, 0]).join(" ");

/** Texto de botão (navy) sobre a cor de destaque precisa de pelo menos 4.5:1. */
export const MIN_BUTTON_CONTRAST = 4.5;
export const BUTTON_TEXT = { light: "#0F2A52", dark: "#0F1C34" };
