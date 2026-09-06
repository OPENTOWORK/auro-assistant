import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "./lib/env.mjs";

const ENV_FILE = join(PROJECT_ROOT, ".env.local");
const SECRET_KEY = "AURO_CRON_SECRET";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isValidSecret(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.trim() !== "" &&
    !/\s/.test(value)
  );
}

function parseSecretFromLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return null;
  if (trimmed.slice(0, eq).trim() !== SECRET_KEY) return null;
  let value = trimmed.slice(eq + 1).trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    value = value.slice(1, -1);
  }
  return value;
}

function readExistingSecret(content) {
  for (const line of content.split(/\r?\n/)) {
    const value = parseSecretFromLine(line);
    if (value !== null) return value;
  }
  return undefined;
}

function upsertSecret(content, secret) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  let replaced = false;
  const next = [];

  for (const line of lines) {
    if (parseSecretFromLine(line) !== null) {
      if (replaced) continue;
      next.push(`${SECRET_KEY}=${secret}`);
      replaced = true;
      continue;
    }
    next.push(line);
  }

  if (!replaced) {
    if (next.length > 0 && next[next.length - 1] !== "") next.push("");
    next.push(`${SECRET_KEY}=${secret}`);
  }

  let result = next.join(newline);
  if (content.length > 0 && /[\r\n]$/.test(content) && !/[\r\n]$/.test(result)) {
    result += newline;
  }
  return result;
}

const content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
const existing = content ? readExistingSecret(content) : undefined;

if (isValidSecret(existing)) {
  console.log("AURO_CRON_SECRET ya estaba configurado.");
  process.exit(0);
}

if (!existsSync(ENV_FILE) && content === "") {
  fail(".env.local no existe; no se crea desde este script.");
}

const secret = randomBytes(32).toString("hex");
writeFileSync(ENV_FILE, upsertSecret(content, secret), "utf8");
console.log("AURO_CRON_SECRET generado en .env.local.");
