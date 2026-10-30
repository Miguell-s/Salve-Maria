import { prisma } from "./db";
import { HttpError } from "./security";

// Acesso dinâmico ao delegate do Prisma. A chave vem de uma lista FIXA (RESOURCES),
// nunca diretamente do usuário.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const delegate = (model: string) => (prisma as any)[model];

export function mapPrismaError(e: unknown): never {
  const code = (e as { code?: string })?.code;
  if (code === "P2002") throw new HttpError(409, "Já existe um registro com este código/nome (SKU, slug ou código repetido).");
  if (code === "P2025") throw new HttpError(404, "Registro não encontrado.");
  throw e;
}
