/**
 * Cria (ou redefine) o usuário ADMIN com autenticação em duas etapas (TOTP).
 *   ADMIN_EMAIL=dono@loja.com ADMIN_NAME="Dono" npm run admin:create
 * A senha é gerada aleatoriamente e mostrada UMA vez. O QR code deve ser lido no
 * Google Authenticator / Authy / 1Password. Guarde também os códigos de segurança do app.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email) throw new Error("Defina ADMIN_EMAIL. Ex.: ADMIN_EMAIL=dono@loja.com npm run admin:create");
  const name = process.env.ADMIN_NAME ?? "Administrador";
  const password = process.env.ADMIN_PASSWORD ?? crypto.randomBytes(15).toString("base64url");
  const secret = authenticator.generateSecret();
  const data = { name, role: "ADMIN" as const, passwordHash: await bcrypt.hash(password, 12), totpSecret: secret, totpEnabled: true, failedLogins: 0, lockedUntil: null };
  await prisma.user.upsert({ where: { email }, update: data, create: { email, ...data } });
  const uri = authenticator.keyuri(email, "Salve Maria", secret);
  console.log("\n=== ADMIN CRIADO ===");
  console.log("E-mail:", email);
  console.log("Senha :", password, process.env.ADMIN_PASSWORD ? "(a que você informou)" : "(gerada — anote agora, não será mostrada de novo)");
  console.log("\nEscaneie o QR code no app autenticador:\n");
  console.log(await QRCode.toString(uri, { type: "terminal", small: true }));
  console.log("Se não conseguir escanear, use a chave manual:", secret, "\n");
}

main().finally(() => prisma.$disconnect());
