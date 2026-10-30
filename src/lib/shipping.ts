import { getSettings } from "./settings";
import { onlyDigits } from "./format";

/**
 * Frete por tabela de regiões (1º dígito do CEP) com frete grátis acima de um valor,
 * ambos editáveis em Admin > Configurações.
 *
 * PENDENTE: cotação em tempo real dos Correios/Melhor Envio. Para ativar, substitua o
 * corpo de `quoteShipping` por uma chamada à API escolhida (credenciais no .env) e
 * mantenha a mesma assinatura de retorno — o checkout já valida o valor no servidor.
 */
export async function quoteShipping(cep: string, subtotalCents: number) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return { ok: false as const, error: "CEP inválido." };
  const s = (await getSettings()).shipping;
  if (s.freeAboveCents > 0 && subtotalCents >= s.freeAboveCents) return { ok: true as const, cents: 0, label: "Frete grátis" };
  const cents = s.byRegion[digits[0]];
  if (cents == null) return { ok: false as const, error: "Não entregamos neste CEP." };
  return { ok: true as const, cents, label: "Envio padrão" };
}
