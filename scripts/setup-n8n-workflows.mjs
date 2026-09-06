/**
 * Importa workflows Auro en n8n y asigna credenciales Gmail, Calendar y Postgres.
 * Uso: npm run setup:n8n-workflows
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const workflowsDir = path.join(root, "n8n", "workflows");

const CREDENTIAL_MATCHERS = {
  gmailOAuth2: (c) => c.type === "gmailOAuth2",
  googleCalendarOAuth2Api: (c) => c.type === "googleCalendarOAuth2Api",
  postgres: (c) => c.type === "postgres" && c.name === "Auro Supabase Postgres",
};

const WORKFLOW_FILES = ["auro-calendar-to-supabase.json"];

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

function runN8n(args) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["--yes", "n8n", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    const err = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(err || `n8n ${args.join(" ")} exit ${result.status}`);
  }

  return result.stdout?.trim() ?? "";
}

function loadCredentialsMeta() {
  const tmp = path.join(os.tmpdir(), `auro-n8n-creds-${Date.now()}.json`);
  runN8n([
    "export:credentials",
    "--all",
    `--output=${tmp}`,
    "--include=id,name,type",
  ]);

  try {
    const raw = fs.readFileSync(tmp, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

function resolveCredentials(allCreds) {
  const resolved = {};

  for (const [key, matcher] of Object.entries(CREDENTIAL_MATCHERS)) {
    const match = allCreds.find(matcher);
    if (!match) {
      throw new Error(
        `No se encontró credencial para ${key}. Créala en n8n primero.`
      );
    }
    resolved[key] = { id: match.id, name: match.name };
  }

  return resolved;
}

function patchWorkflow(workflow, creds) {
  const copy = structuredClone(workflow);
  copy.id = randomUUID();
  copy.versionId = randomUUID();
  copy.active = false;
  copy.meta = { ...(copy.meta ?? {}), templateCredsSetupCompleted: true };

  for (const node of copy.nodes ?? []) {
    if (!node.credentials) continue;

    for (const [credKey, credRef] of Object.entries(node.credentials)) {
      const resolved = creds[credKey];
      if (resolved) {
        node.credentials[credKey] = { ...resolved };
      }
    }
  }

  return copy;
}

function importWorkflow(workflow) {
  const tmp = path.join(os.tmpdir(), `auro-n8n-wf-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify([workflow], null, 2), "utf8");

  try {
    return runN8n(["import:workflow", `--input=${tmp}`]);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

async function main() {
  if (!(await n8nRunning())) {
    throw new Error(
      "n8n no responde en http://localhost:5678 — arranca con: npx n8n start"
    );
  }

  const allCreds = loadCredentialsMeta();
  const creds = resolveCredentials(allCreds);

  console.log("Credenciales detectadas:");
  console.log(`  Gmail:    ${creds.gmailOAuth2.name}`);
  console.log(`  Calendar: ${creds.googleCalendarOAuth2Api.name}`);
  console.log(`  Postgres: ${creds.postgres.name}`);

  for (const file of WORKFLOW_FILES) {
    const filePath = path.join(workflowsDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Falta ${filePath}`);
    }

    const workflow = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const patched = patchWorkflow(workflow, creds);
    const output = importWorkflow(patched);
    console.log(`\nOK — ${patched.name}`);
    if (output) console.log(output);
  }

  console.log("\nWorkflows importados en http://localhost:5678/home/workflows");
  console.log("Prueba con «Execute workflow» en Gmail y Calendar.");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
