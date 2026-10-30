import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit, createSession, hashPassword, passwordPolicy } from "@/lib/auth";
import { clientIp, handle, HttpError, ok, rateLimit, readJson } from "@/lib/security";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(10).max(200),
  consent: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar a Política de Privacidade." }) }),
});

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`register:${ip}`, 8, 60 * 60_000);
  const b = schema.parse(await readJson(req, 5_000));
  if (!passwordPolicy(b.password)) throw new HttpError(400, "A senha precisa ter 10+ caracteres, com letras e números.");
  const exists = await prisma.user.findUnique({ where: { email: b.email } });
  // Resposta genérica: não revela se o e-mail já está cadastrado.
  if (exists) throw new HttpError(400, "Não foi possível criar a conta com estes dados. Tente entrar ou recuperar o acesso.");
  const user = await prisma.user.create({
    data: { name: b.name, email: b.email, phone: b.phone, passwordHash: await hashPassword(b.password), lgpdConsentAt: new Date() },
  });
  await createSession({ uid: user.id, role: "CUSTOMER" });
  await audit(user.id, "register", "User", user.id, undefined, ip);
  return ok();
});
