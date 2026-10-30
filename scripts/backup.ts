/**
 * Backup do PostgreSQL (pg_dump comprimido). Agende no servidor, ex. todo dia às 03h:
 *   0 3 * * * cd /app && npm run backup
 * Mantém os 14 backups mais recentes. COPIE os arquivos para fora do servidor
 * (S3/Backblaze/Google Drive) — backup no mesmo disco não protege contra perda do servidor.
 * Teste a restauração com scripts/restore-test.sh pelo menos uma vez por mês.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");
const dir = path.resolve(process.env.BACKUP_DIR ?? "./backups");
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const file = path.join(dir, `salvemaria-${new Date().toISOString().replace(/[:.]/g, "-")}.sql.gz`);

async function main() {
  const dump = spawn("pg_dump", ["--no-owner", "--no-privileges", url!], { stdio: ["ignore", "pipe", "inherit"] });
  const done = new Promise<void>((res, rej) => dump.on("close", (c) => (c === 0 ? res() : rej(new Error(`pg_dump saiu com código ${c}`)))));
  await Promise.all([pipeline(dump.stdout, zlib.createGzip(), fs.createWriteStream(file, { mode: 0o600 })), done]);
  const keep = fs.readdirSync(dir).filter((f) => f.endsWith(".sql.gz")).sort().reverse();
  for (const old of keep.slice(14)) fs.unlinkSync(path.join(dir, old));
  console.log("Backup criado:", file, `(${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
main().catch((e) => { console.error("FALHA NO BACKUP:", e.message); process.exit(1); });
