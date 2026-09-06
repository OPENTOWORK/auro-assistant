import { Client } from "pg";
import { requireDatabaseUrl } from "./lib/env.mjs";

/** Inspección de solo lectura del esquema real y del volumen de datos. */

const client = new Client({ connectionString: requireDatabaseUrl() });
await client.connect();

try {
  const { rows: tables } = await client.query(
    `SELECT c.relname AS name, c.relrowsecurity AS rls
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`
  );

  if (tables.length === 0) {
    console.log("El esquema public no tiene ninguna tabla.");
  }

  console.log("--- TABLAS EN public ---");
  for (const t of tables) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${JSON.stringify(t.name).replace(/"/g, '"')}`
    );
    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      [t.name]
    );
    console.log(
      `${t.name.padEnd(24)} ${String(rows[0].n).padStart(6)} filas  RLS=${t.rls ? "on" : "off"}`
    );
    console.log(`    ${cols.map((c) => c.column_name).join(", ")}`);
  }

  const { rows: policies } = await client.query(
    `SELECT tablename, policyname, roles::text FROM pg_policies
      WHERE schemaname = 'public' ORDER BY tablename`
  );
  console.log("\n--- POLÍTICAS RLS ---");
  if (policies.length === 0) console.log("(ninguna)");
  for (const p of policies) {
    console.log(`  ${p.tablename.padEnd(24)} ${p.policyname}  roles=${p.roles}`);
  }
} finally {
  await client.end();
}
