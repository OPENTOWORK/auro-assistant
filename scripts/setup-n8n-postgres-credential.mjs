/**
 * Crea la credencial Postgres de Supabase en n8n local vía CLI.
 * Lee DATABASE_URL de .env.local — no imprime contraseñas.
 *
 * Uso: npm run setup:n8n-postgres
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("No existe .env.local con DATABASE_URL");
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, "") || "postgres",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

async function n8nRunning() {
  try {
    const res = await fetch("http://localhost:5678/healthz", {
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function importCredential(payload) {
  const tmpFile = path.join(
    os.tmpdir(),
    `auro-n8n-postgres-${Date.now()}.json`
  );
  fs.writeFileSync(tmpFile, JSON.stringify([payload], null, 2), "utf8");

  try {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const result = spawnSync(
      npx,
      ["--yes", "n8n", "import:credentials", `--input=${tmpFile}`],
      {
        cwd: root,
        encoding: "utf8",
        shell: true,
        env: process.env,
      }
    );

    if (result.status !== 0) {
      const err = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
      throw new Error(err || `import:credentials exit ${result.status}`);
    }

    return result.stdout?.trim();
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  }
}

function loadExistingPostgresId() {
  const tmp = path.join(os.tmpdir(), `auro-n8n-creds-${Date.now()}.json`);
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  spawnSync(
    npx,
    ["--yes", "n8n", "export:credentials", "--all", `--output=${tmp}`, "--include=id,name,type"],
    { cwd: root, encoding: "utf8", shell: true, env: process.env }
  );
  try {
    const creds = JSON.parse(fs.readFileSync(tmp, "utf8"));
    const list = Array.isArray(creds) ? creds : [creds];
    return list.find((c) => c.type === "postgres" && c.name === "Auro Supabase Postgres")?.id;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

async function main() {
  loadEnvLocal();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL no está en .env.local");
  }

  if (!(await n8nRunning())) {
    throw new Error(
      "n8n no responde en http://localhost:5678 — arranca con: npx n8n start"
    );
  }

  const db = parseDatabaseUrl(dbUrl);

  const payload = {
    id: loadExistingPostgresId() ?? randomUUID(),
    name: "Auro Supabase Postgres",
    type: "postgres",
    data: {
      host: db.host,
      port: db.port,
      database: db.database,
      user: db.user,
      password: db.password,
      ssl: "require",
      allowUnauthorizedCerts: true,
      sshTunnel: false,
    },
  };

  const output = importCredential(payload);
  console.log("OK — credencial Postgres importada en n8n: Auro Supabase Postgres");
  if (output) console.log(output);
  console.log("\nVerifica en http://localhost:5678/home/credentials");
  console.log("Luego asigna esta credencial al nodo «Upsert Supabase» en los workflows.");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
