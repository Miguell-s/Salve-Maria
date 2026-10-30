import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit, createSession } from "@/lib/auth";
import { sendEmail, esc } from "@/lib/notify";
import { clientIp, handle, HttpError, ok, rateLimit, readJson } from "@/lib/security";
import crypto from "node:crypto";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().regex(/^\d{6}$/).optional(),
});

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`otp:${ip}`, 10, 60 * 60_000);
  const body = schema.parse(await readJson(req, 5_000));

  let user = await prisma.user.findUnique({ where: { email: body.email } });

  // Se já temos o código, verifica
  if (body.code) {
    if (!user || !user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new HttpError(400, "Código inválido ou expirado.");
    }
    if (user.otpCode !== body.code) {
      await audit(user.id, "otp.failed", "User", user.id, { why: "wrong code" }, ip);
      throw new HttpError(400, "Código incorreto.");
    }

    // Código correto, limpa e loga
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null, failedLogins: 0, lockedUntil: null }
    });

    await createSession({ uid: user.id, role: user.role });
    await audit(user.id, "login.otp.ok", "User", user.id, undefined, ip);
    return ok({ ok: true, role: user.role });
  }

  // Se não temos código, gera um e envia
  const otp = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + 15 * 60_000); // 15 minutos

  if (!user) {
    // Primeiro acesso via Google/E-mail (sem senha)
    if (!body.name) throw new HttpError(400, "Nome é obrigatório para o primeiro acesso.");
    user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        otpCode: otp,
        otpExpiresAt: expires,
        lgpdConsentAt: new Date(),
      }
    });
    await audit(user.id, "register.otp", "User", user.id, undefined, ip);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt: expires }
    });
    await audit(user.id, "otp.sent", "User", user.id, undefined, ip);
  }

  // Envia o e-mail (em produção o SMTP deve estar configurado)
  await sendEmail(
    "login-otp",
    body.email,
    "Seu código de acesso - Salve Maria",
    `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:20px;border:1px solid #eee;border-radius:20px">
      <h2 style="color:#55B9F5">Olá, ${esc(user.name)}!</h2>
      <p>Use o código abaixo para entrar na sua conta:</p>
      <div style="background:#f8f9fa;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:5px;border-radius:12px;color:#9270E8">
        ${otp}
      </div>
      <p style="font-size:12px;color:#666;margin-top:20px">O código expira em 15 minutos. Se não foi você quem solicitou, apenas ignore este e-mail.</p>
    </div>`
  );

  return ok({ sent: true });
});
