import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { PROJECT_ROOT, requireDatabaseUrl, requireSupabaseConfig } from "./lib/env.mjs";

/**
 * Aplica todas las migraciones de `supabase/migrations/` en orden alfabético.
 *
 * Las migraciones son idempotentes, así que reejecutar el script es seguro.
 * El subdirectorio `_archive/` se ignora a propósito: contiene el esquema
 * antiguo, conservado solo como referencia histórica.
 */

const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "supabase/migrations");

const EXPECTED_TABLES = [
  "projects",
  "tasks",
  "alerts",
  "recurring_tasks",
  "recurring_completions",
  "calendar_events",
  "important_emails",
  "leads",
  "approvals",
  "chat_conversations",
  "chat_messages",
  "user_memory",
  "pending_actions",
];

async function applyMigrations(databaseUrl) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No hay migraciones en supabase/migrations/");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`Aplicando ${file}... `);
      await client.query(sql);
      console.log("OK");
    }
  } finally {
    await client.end();
  }
}

async function verify(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT c.relname AS table_name,
              c.relrowsecurity AS rls_enabled,
              (SELECT count(*) FROM pg_policies p
                WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname`
    );

    const found = new Set(rows.map((r) => r.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !found.has(t));

    console.log("\n--- VERIFICACIÓN ---");
    for (const row of rows) {
      console.log(
        `  ${row.table_name.padEnd(24)} RLS=${row.rls_enabled ? "on " : "off"} políticas=${row.policies}`
      );
    }

    const { rows: projectRows } = await client.query(
      "SELECT count(*)::int AS n FROM projects"
    );
    console.log(`\nProyectos sembrados: ${projectRows[0].n}`);

    if (missing.length > 0) {
      console.error("\nFALTAN TABLAS:", missing.join(", "));
      process.exit(1);
    }
    console.log("Todas las tablas esperadas existen.");
  } finally {
    await client.end();
  }
}

async function reloadPostgrestSchema(url, serviceKey) {
  // PostgREST cachea el esquema; sin recargar, la API seguiría devolviendo
  // PGRST205 durante un tiempo tras crear las tablas.
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("NOTIFY pgrst, 'reload schema'");
  } finally {
    await client.end();
  }

  for (let attempt = 1; attempt <= 10; attempt++) {
    const res = await fetch(`${url}/rest/v1/projects?select=id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (res.ok) {
      console.log("PostgREST ve el esquema nuevo.");
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.warn(
    "Aviso: PostgREST todavía no refleja el esquema. Suele resolverse en menos de un minuto."
  );
}

const { url, serviceKey } = requireSupabaseConfig();
const databaseUrl = requireDatabaseUrl();

await applyMigrations(databaseUrl);
await verify(databaseUrl);
await reloadPostgrestSchema(url, serviceKey);
