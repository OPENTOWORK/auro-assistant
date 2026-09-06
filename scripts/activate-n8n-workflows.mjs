/**
 * Activa (publica) los workflows Auro en n8n local.
 * Uso: npm run activate:n8n-workflows
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const TARGET_NAMES = ["Auro — Calendar → Supabase"];

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

async function main() {
  if (!(await n8nRunning())) {
    throw new Error("n8n no responde en http://localhost:5678");
  }

  const workflows = listWorkflows();
  const targets = workflows.filter((w) => TARGET_NAMES.includes(w.name));

  if (targets.length === 0) {
    throw new Error(
      "No se encontraron workflows Auro. Ejecuta: npm run setup:n8n-workflows"
    );
  }

  for (const wf of targets) {
    const output = runN8n(["publish:workflow", `--id=${wf.id}`]);
    console.log(`OK — activado: ${wf.name}`);
    if (output) console.log(output);
  }

  console.log("\nWorkflows activos en http://localhost:5678/home/workflows");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
