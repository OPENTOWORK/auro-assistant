import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Cargador de entorno compartido por los scripts de `scripts/`.
 *
 * Antes cada script reimplementaba su propio parser de `.env.local`, con
 * variantes que rompían con CRLF o con valores entrecomillados. Este módulo
 * es la única fuente de verdad.
 */

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

/** Carga `.env.local` en `process.env` sin sobrescribir lo ya definido. */
export function loadEnv(file = ".env.local") {
  const envPath = path.join(PROJECT_ROOT, file);
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

/** Devuelve la configuración de Supabase o termina el proceso con error. */
export function requireSupabaseConfig() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
    );
    process.exit(1);
  }

  return { url, serviceKey };
}

/** Cadena de conexión directa a Postgres, necesaria para aplicar DDL. */
export function requireDatabaseUrl() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "Falta DATABASE_URL en .env.local.\n" +
        "Cópiala en Supabase → Settings → Database → Connection string (URI)."
    );
    process.exit(1);
  }

  return databaseUrl;
}
