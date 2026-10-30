import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------------------------- Rate limiting ----------------------------- */
// Em memória: suficiente para 1 instância. Com várias instâncias/serverless,
// troque por Redis/Upstash (a assinatura da função permanece a mesma).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) throw new HttpError(429, "Muitas tentativas. Aguarde um pouco e tente novamente.");
}

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  // Atrás do Cloudflare use cf-connecting-ip; senão o primeiro IP do x-forwarded-for.
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/* ------------------------------- CSRF ----------------------------------- */
// Defesa em camadas: cookie SameSite=Lax + verificação de Origin em toda
// requisição que altera estado (exceto webhooks/cron, que usam assinatura/segredo).
export function assertSameOrigin(req: NextRequest | Request) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin) throw new HttpError(403, "Origem não permitida.");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origem inválida.");
  }
  const appHost = process.env.APP_URL ? new URL(process.env.APP_URL).host : host;
  if (originHost !== host && originHost !== appHost) throw new HttpError(403, "Origem não permitida.");
}

/* --------------------------- Handler wrapper ----------------------------- */
type Ctx = { params: Promise<Record<string, string>> };
type Fn = (req: NextRequest, ctx: Ctx) => Promise<Response>;

export function handle(fn: Fn, opts: { csrf?: boolean } = {}): Fn {
  const csrf = opts.csrf ?? true;
  return async (req, ctx) => {
    try {
      if (csrf) assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: "Dados inválidos.", issues: e.flatten().fieldErrors }, { status: 400 });
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }
  };
}

export const ok = (data: unknown = { ok: true }, init?: ResponseInit) => NextResponse.json(data, init);

/** Lê JSON com limite de tamanho (evita corpos gigantes). */
export async function readJson(req: Request, maxBytes = 200_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Requisição muito grande.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}

/** Impede que URLs de redirecionamento/imagem apontem para hosts internos (SSRF/open redirect). */
export function safeInternalPath(p: string | null | undefined, fallback = "/") {
  if (!p || !p.startsWith("/") || p.startsWith("//") || p.includes("\\")) return fallback;
  return p;
}
