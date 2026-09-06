import { Client } from "pg";
import { requireDatabaseUrl } from "./lib/env.mjs";

/** Comprobación de integridad tras migrar: datos, claves foráneas y tipos. */

const client = new Client({ connectionString: requireDatabaseUrl() });
await client.connect();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "FALLO"} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

try {
  console.log("--- PROYECTOS ---");
  const { rows: projects } = await client.query(
    "SELECT slug, name, type, status, priority, icon, color FROM projects ORDER BY priority"
  );
  for (const p of projects) {
    console.log(
      `  ${String(p.priority).padStart(2)}. ${p.slug.padEnd(24)} ${p.name.padEnd(26)} ${p.type}/${p.status} ${p.icon} ${p.color}`
    );
  }

  console.log("\n--- INTEGRIDAD ---");
  check("10 proyectos migrados", projects.length === 10, `${projects.length}`);
  check(
    "todos con slug no vacío",
    projects.every((p) => p.slug && p.slug.length > 0)
  );

  const { rows: dup } = await client.query(
    "SELECT slug, count(*) FROM projects GROUP BY slug HAVING count(*) > 1"
  );
  check("sin slugs duplicados", dup.length === 0);

  // project_id debe ser UUID en todas las tablas de dominio
  const { rows: cols } = await client.query(
    `SELECT table_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'project_id'
        AND table_name IN ('tasks','alerts','recurring_tasks','calendar_events','leads')
      ORDER BY table_name`
  );
  for (const c of cols) {
    check(`${c.table_name}.project_id es uuid`, c.data_type === "uuid", c.data_type);
  }

  // claves foráneas presentes
  const { rows: fks } = await client.query(
    `SELECT tc.table_name
       FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.constraint_name LIKE '%project_id_fkey'
      ORDER BY tc.table_name`
  );
  const fkTables = fks.map((f) => f.table_name);
  for (const t of ["tasks", "alerts", "recurring_tasks", "calendar_events"]) {
    check(`${t} tiene FK a projects`, fkTables.includes(t));
  }

  // las 2 tareas recurrentes deben seguir apuntando a su proyecto
  const { rows: recurring } = await client.query(
    `SELECT r.title, p.name AS project
       FROM recurring_tasks r
       LEFT JOIN projects p ON p.id = r.project_id
      ORDER BY r.created_at`
  );
  console.log("\n--- RECURRENTES ---");
  for (const r of recurring) {
    console.log(`  ${r.title} -> ${r.project ?? "(sin proyecto)"}`);
  }
  check(
    "las recurrentes conservan su proyecto",
    recurring.length === 2 && recurring.every((r) => r.project)
  );

  // Volumen actual. No se comprueba contra números fijos: los datos crecen
  // con cada sincronización. Lo que sí se comprueba son los invariantes.
  console.log("\n--- VOLUMEN ---");
  for (const t of [
    "tasks",
    "recurring_tasks",
    "recurring_completions",
    "calendar_events",
    "important_emails",
    "alerts",
    "leads",
    "chat_messages",
  ]) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
    console.log(`  ${t.padEnd(24)} ${String(rows[0].n).padStart(5)}`);
  }

  console.log("\n--- SIN REFERENCIAS HUÉRFANAS ---");
  for (const t of ["tasks", "alerts", "recurring_tasks", "calendar_events", "leads"]) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${t} x
        WHERE x.project_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = x.project_id)`
    );
    check(`${t} sin project_id huérfano`, rows[0].n === 0, `${rows[0].n}`);
  }

  const { rows: orphanCompletions } = await client.query(
    `SELECT count(*)::int AS n FROM recurring_completions c
      WHERE NOT EXISTS (SELECT 1 FROM recurring_tasks r WHERE r.id = c.recurring_task_id)`
  );
  check(
    "recurring_completions sin tarea huérfana",
    orphanCompletions[0].n === 0,
    `${orphanCompletions[0].n}`
  );

  const { rows: badPeriods } = await client.query(
    `SELECT count(*)::int AS n FROM recurring_completions
      WHERE period_key !~ '^[0-9]{4}-(W[0-9]{2}|[0-9]{2})$'`
  );
  check("period_key con formato válido", badPeriods[0].n === 0, `${badPeriods[0].n}`);

  // seguridad: anon no debe tener permisos
  const { rows: anonGrants } = await client.query(
    `SELECT table_name, privilege_type FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND grantee = 'anon'
        AND table_name IN ('projects','tasks','alerts','recurring_tasks',
                           'calendar_events','important_emails','leads',
                           'chat_messages','user_memory','pending_actions')`
  );
  check(
    "anon sin permisos sobre las tablas de Auro",
    anonGrants.length === 0,
    `${anonGrants.length} permisos`
  );

  console.log(
    failures === 0
      ? "\nTodo correcto."
      : `\n${failures} comprobación(es) fallidas.`
  );
} finally {
  await client.end();
}

process.exit(failures === 0 ? 0 : 1);
