import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HttpError } from "./security";

const MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Detecta o tipo REAL pelos bytes (não confia em extensão nem Content-Type). */
function sniff(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/**
 * Valida e RE-CODIFICA a imagem com sharp (remove metadados/EXIF e qualquer payload
 * embutido) e salva com nome aleatório. SVG é recusado de propósito (vetor de XSS).
 * Em produção com várias instâncias/serverless, troque o destino por S3/R2/Cloudflare Images.
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new HttpError(413, "Imagem maior que 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) throw new HttpError(415, "Formato não aceito. Envie JPG, PNG ou WebP.");
  let out: Buffer;
  try {
    out = await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
  } catch {
    throw new HttpError(415, "Não foi possível processar a imagem.");
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), out, { flag: "wx" });
  return `/uploads/${name}`;
}
