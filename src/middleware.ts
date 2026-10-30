import { NextResponse, type NextRequest } from "next/server";

/**
 * CSP com nonce por requisição + 'strict-dynamic': scripts inline/externos sem o nonce
 * (ex.: injetados por XSS) não executam. O Next aplica o nonce automaticamente aos
 * scripts dele quando lê o header `Content-Security-Policy` da requisição.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' blob: data: https://viacep.com.br",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  // Páginas do painel e da conta nunca devem ser guardadas em cache compartilhado.
  if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/conta")) {
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: [{ source: "/((?!api|_next/static|_next/image|brand|uploads|models|favicon.ico|icon.png|apple-icon.png).*)" }],
};
