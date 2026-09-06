/**
 * Elimina el workflow Gmail de n8n (importaba correos sin estrella).
 * Gmail solo se sincroniza con: npm run sync:google
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const GMAIL_WORKFLOW_ID = "ae3eb0f2-d72c-43c6-870a-8a3a8d2d2857";
const GMAIL_WORKFLOW_NAME = "Auro — Gmail → Supabase";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function listWorkflows() {
  const tmp = path.join(os.tmpdir(), `auro-n8n-wfs-${Date.now()}.json`);
  runN8n(["export:workflow", "--all", `--output=${tmp}`], { allowFail: true });
  try {
    if (!fs.existsSync(tmp)) return [];
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

const targets = listWorkflows().filter(
  (w) => w.name === GMAIL_WORKFLOW_NAME || w.id === GMAIL_WORKFLOW_ID
);

for (const wf of targets) {
  runN8n(["unpublish:workflow", `--id=${wf.id}`], { allowFail: true });
  runN8n(["delete:workflow", `--id=${wf.id}`], { allowFail: true });
  console.log(`OK — eliminado workflow Gmail (${wf.id})`);
}

if (targets.length === 0) {
  console.log("OK — no había workflow Gmail en n8n.");
}

console.log("Gmail solo vía: npm run sync:google (is:starred + etiqueta STARRED)");
