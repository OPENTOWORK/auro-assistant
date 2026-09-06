import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const { Client } = await import("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('important_emails', 'calendar_events')
   ORDER BY 1`
);
console.log("Postgres:", rows);
await client.end();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
for (const table of ["important_emails", "calendar_events"]) {
  const { error } = await admin.from(table).select("id").limit(1);
  console.log("REST", table, error ? error.message : "OK");
}
