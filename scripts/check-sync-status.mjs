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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

for (const table of ["important_emails", "calendar_events"]) {
  const { data, error } = await admin.from(table).select("*").limit(10);
  console.log(`${table}: ${error ? error.message : data?.length ?? 0} filas`);
  for (const row of data ?? []) {
    console.log(`  - ${row.title ?? row.subject}`);
  }
}

for (const port of [3000, 3001, 3002]) {
  try {
    const res = await fetch(`http://localhost:${port}/api/dashboard`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) continue;
    const d = await res.json();
    console.log(
      `Auro :${port} → emails=${d.emails?.length} calendar=${d.calendarEvents?.length}`
    );
  } catch {
    // skip
  }
}
