/**
 * Reimporta workflows Auro (actualiza nodos) y los activa.
 * Uso: npm run redeploy:n8n-workflows
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

const TARGET_NAMES = ["Auro — Calendar → Supabase"];

const WORKFLOW_FILES = {
  "Auro — Calendar → Supabase": "auro-calendar-to-supabase.json",
};

const CREDENTIAL_MATCHERS = {
  gmailOAuth2: (c) => c.type === "gmailOAuth2",
  googleCalendarOAuth2Api: (c) => c.type === "googleCalendarOAuth2Api",
  postgres: (c) => c.type === "postgres" && c.name === "Auro Supabase Postgres",
};

function runN8n(args, { allowFail = false } = {}) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["--yes", "n8n", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0 && !allowFail) {
    const err = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(err || `n8n ${args.join(" ")} exit ${result.status}`);
  }

  return result.stdout?.trim() ?? "";
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

function listWorkflows() {
  const tmp = path.join(os.tmpdir(), `auro-n8n-wfs-${Date.now()}.json`);
  runN8n(["export:workflow", "--all", `--output=${tmp}`]);
  try {
    const parsed = JSON.parse(fs.readFileSync(tmp, "utf8"));
    return Array.isArray(parsed) ? parsed : [parsed];
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
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
    const parsed = JSON.parse(fs.readFileSync(tmp, "utf8"));
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
    if (!match) throw new Error(`Falta credencial: ${key}`);
    resolved[key] = { id: match.id, name: match.name };
  }
  return resolved;
}

function patchWorkflow(workflow, creds, existingId) {
  const copy = structuredClone(workflow);
  copy.id = existingId ?? randomUUID();
  copy.versionId = randomUUID();
  copy.active = false;
  copy.meta = { ...(copy.meta ?? {}), templateCredsSetupCompleted: true };

  for (const node of copy.nodes ?? []) {
    if (!node.credentials) continue;
    for (const [credKey] of Object.entries(node.credentials)) {
      const resolved = creds[credKey];
      if (resolved) node.credentials[credKey] = { ...resolved };
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
    throw new Error("n8n no responde en http://localhost:5678");
  }

  const creds = resolveCredentials(loadCredentialsMeta());
  const existing = listWorkflows().filter((w) => TARGET_NAMES.includes(w.name));
  const existingByName = Object.fromEntries(existing.map((w) => [w.name, w.id]));

  for (const id of existing.map((w) => w.id)) {
    runN8n(["unpublish:workflow", `--id=${id}`], { allowFail: true });
  }

  for (const name of TARGET_NAMES) {
    const file = WORKFLOW_FILES[name];
    const workflow = JSON.parse(
      fs.readFileSync(path.join(workflowsDir, file), "utf8")
    );
    const patched = patchWorkflow(workflow, creds, existingByName[name]);
    importWorkflow(patched);
    runN8n(["publish:workflow", `--id=${patched.id}`]);
    console.log(`OK — ${name} (${patched.id})`);
  }

  console.log("\nWorkflows actualizados y activos.");
  console.log("Espera 1-2 min y recarga Auro (http://localhost:3002 si dev usa ese puerto).");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
