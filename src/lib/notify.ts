import nodemailer from "nodemailer";
import { prisma } from "./db";

/**
 * Notificações por e-mail (SMTP) e WhatsApp (Cloud API da Meta).
 * - Toda tentativa é registrada em AutomationLog (SENT / FAILED / SKIPPED).
 * - Falhas NUNCA derrubam o pedido: são capturadas e ficam visíveis em Admin > Registros.
 * - Sem credenciais no .env, o canal fica como SKIPPED (nada é "simulado como enviado").
 *
 * Atenção (WhatsApp): mensagens iniciadas pela loja fora da janela de 24h exigem
 * *templates aprovados* pela Meta. Aqui enviamos texto livre (funciona dentro da janela
 * de conversa). Para produção, cadastre templates e troque `type: "text"` por `type: "template"`.
 */

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function log(kind: string, channel: string, target: string, status: string, error?: string) {
  try {
    await prisma.automationLog.create({ data: { kind, channel, target, status, error: error?.slice(0, 500) } });
  } catch (e) {
    console.error("[automation-log]", e);
  }
}

let transport: nodemailer.Transporter | null = null;
function mailer() {
  if (!process.env.SMTP_HOST) return null;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

export async function sendEmail(kind: string, to: string | undefined, subject: string, html: string) {
  if (!to) return;
  const t = mailer();
  if (!t) return log(kind, "email", to, "SKIPPED", "SMTP não configurado");
  try {
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, html });
    await log(kind, "email", to, "SENT");
  } catch (e) {
    await log(kind, "email", to, "FAILED", e instanceof Error ? e.message : String(e));
  }
}

export function normalizeBrPhone(raw: string) {
  const d = raw.replace(/\D+/g, "");
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

export async function sendWhatsApp(kind: string, to: string | undefined, text: string) {
  if (!to) return;
  const phone = normalizeBrPhone(to);
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !id) return log(kind, "whatsapp", phone, "SKIPPED", "WhatsApp Cloud API não configurada");
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text.slice(0, 3800) } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    await log(kind, "whatsapp", phone, "SENT");
  } catch (e) {
    await log(kind, "whatsapp", phone, "FAILED", e instanceof Error ? e.message : String(e));
  }
}

export async function notifyAdmin(kind: string, subject: string, text: string) {
  await Promise.all([
    sendEmail(kind, process.env.ADMIN_NOTIFY_EMAIL, `[Salve Maria] ${subject}`, `<pre style="font-family:inherit;white-space:pre-wrap">${esc(text)}</pre>`),
    sendWhatsApp(kind, process.env.ADMIN_WHATSAPP, `*${subject}*\n\n${text}`),
  ]);
}
