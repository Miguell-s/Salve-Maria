import { z } from "zod";
import { authenticator } from "otplib";
import { prisma } from "@/lib/db";
import { audit, createSession, dummyHash, verifyPassword } from "@/lib/auth";
import { clientIp, handle, HttpError, ok, rateLimit, readJson } from "@/lib/security";

authenticator.options = { window: 1 };

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  code: z.string().regex(/^\d{6}$/).optional(),
});

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`login:ip:${ip}`, 25, 15 * 60_000);
  const body = schema.parse(await readJson(req, 5_000));
  rateLimit(`login:email:${body.email}`, 8, 15 * 60_000);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (user?.lockedUntil && user.lockedUntil > new Date())
    throw new HttpError(423, "Conta temporariamente bloqueada por tentativas incorretas. Tente em alguns minutos.");

  // Sempre compara um hash (mesmo sem usuário) para o tempo de resposta não revelar se o e-mail existe.
  const valid = await verifyPassword(body.password, user?.passwordHash ?? dummyHash());

  const fail = async (why: string) => {
    if (user) {
      const fails = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: fails >= 5 ? { failedLogins: 0, lockedUntil: new Date(Date.now() + 15 * 60_000) } : { failedLogins: fails },
      });
    }
    await audit(user?.id ?? null, "login.failed", "User", user?.id, { why }, ip);
    throw new HttpError(401, "E-mail, senha ou código incorretos.");
  };

  if (!user || !valid) return fail("senha");

  if (user.role === "ADMIN") {
    if (!user.totpEnabled || !user.totpSecret)
      throw new HttpError(403, "Autenticação em duas etapas não configurada. Rode `npm run admin:create`.");
    if (!body.code) return ok({ mfa: true });
    if (!authenticator.check(body.code, user.totpSecret)) return fail("totp");
  } else if (!user.passwordHash) {
    // Usuário Google/OTP tentando entrar por senha
    throw new HttpError(403, "Esta conta utiliza acesso rápido por e-mail. Use a opção 'Entrar sem senha'.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession({ uid: user.id, role: user.role });
  await audit(user.id, "login.ok", "User", user.id, undefined, ip);
  return ok({ ok: true, role: user.role });
});
