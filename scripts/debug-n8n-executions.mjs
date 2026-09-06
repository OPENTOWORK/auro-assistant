import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const { default: Database } = await import("better-sqlite3");
const db = new Database(path.join(os.homedir(), ".n8n", "database.sqlite"), {
  readonly: true,
});

const executions = db
  .prepare(
    `SELECT e.id, e.status, w.name, e."startedAt"
     FROM execution_entity e
     JOIN workflow_entity w ON w.id = e."workflowId"
     ORDER BY e."startedAt" DESC LIMIT 5`
  )
  .all();

console.log("Executions:", executions);

for (const ex of executions) {
  const row = db
    .prepare(`SELECT data FROM execution_data WHERE "executionId" = ?`)
    .get(ex.id);
  const text = row?.data ?? "";
  const nodes = [
    "Rango fechas",
    "Eventos próximos 14d",
    "Mapear evento",
    "Upsert Supabase",
    "Gmail leer",
    "Mapear email",
  ];
  console.log(`\n=== ${ex.name} (${ex.status}) ===`);
  for (const node of nodes) {
    const idx = text.indexOf(`"${node}"`);
    if (idx === -1) continue;
    const chunk = text.slice(idx, idx + 800);
    const errMatch = chunk.match(/"errorMessage":"([^"]+)"/);
    const statusMatch = chunk.match(/"executionStatus":"([^"]+)"/);
    console.log(
      `  ${node}: status=${statusMatch?.[1] ?? "?"} error=${errMatch?.[1] ?? "none"}`
    );
  }
}

// Test postgres upsert directly
const { Client } = await import("pg");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(
    `INSERT INTO calendar_events (title, start_at, end_at, google_event_id)
     VALUES ('Test Auro sync', now(), now() + interval '1 hour', 'test-sync-001')
     ON CONFLICT (google_event_id) DO UPDATE SET title = EXCLUDED.title`
  );
  console.log("\nPostgres direct upsert: OK");
  await client.query(`DELETE FROM calendar_events WHERE google_event_id = 'test-sync-001'`);
} catch (e) {
  console.log("\nPostgres direct upsert FAILED:", e.message);
}
await client.end();
db.close();
