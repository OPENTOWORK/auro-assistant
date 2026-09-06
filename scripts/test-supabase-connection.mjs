import { loadEnv } from "./lib/env.mjs";

loadEnv();

const url = process.argv[2] ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.argv[3] ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
  process.exit(1);
}

const healthUrl = `${url.replace(/\/$/, "")}/auth/v1/health`;

try {
  const res = await fetch(healthUrl, {
    headers: { apikey: anonKey },
  });

  if (res.ok) {
    console.log("OK — claves válidas para:", url);
    process.exit(0);
  }

  console.error(`Fallo HTTP ${res.status} — URL o clave incorrectas para este proyecto`);
  process.exit(1);
} catch (err) {
  console.error("Error de red:", err instanceof Error ? err.message : err);
  process.exit(1);
}
