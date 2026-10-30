import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { HttpError } from "./security";

const isProd = process.env.NODE_ENV === "production";
// Prefixo __Host- exige Secure + Path=/ + sem Domain: impede cookie injetado por subdomínio.
export const COOKIE = isProd ? "__Host-sm_session" : "sm_session";

export type Session = { uid: string; role: "CUSTOMER" | "ADMIN" };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Defina SESSION_SECRET com pelo menos 32 caracteres no .env");
  return new TextEncoder().encode(s);
}

export async function createSession(s: Session) {
  const ttl = s.role === "ADMIN" ? 60 * 60 * 8 : 60 * 60 * 24 * 14;
  const token = await new SignJWT({ role: s.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: ttl });
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { uid: payload.sub, role: payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER" };
  } catch {
    return null;
  }
}

/** Usuário atual conferido no banco (o papel do token nunca é confiado sozinho). */
export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.uid } });
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "Faça login para continuar.");
  return u;
}

export async function requireAdmin() {
  const u = await getCurrentUser();
  if (!u || u.role !== "ADMIN" || !u.totpEnabled) throw new HttpError(403, "Acesso negado.");
  return u;
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, hash: string) => bcrypt.compare(p, hash);
// Hash fixo para igualar o tempo de resposta quando o e-mail não existe.
let dummy: string | null = null;
export function dummyHash() {
  return (dummy ??= bcrypt.hashSync("salve-maria-dummy", 12));
}

export function passwordPolicy(p: string) {
  return p.length >= 10 && /[a-z]/i.test(p) && /\d/.test(p);
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: unknown,
  ip?: string,
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, data: (data ?? undefined) as never, ip },
    });
  } catch (e) {
    console.error("[audit] falha ao registrar", e);
  }
}
