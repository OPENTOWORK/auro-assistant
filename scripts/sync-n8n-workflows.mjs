import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WORKFLOW_IDS = {
  calendar: "d17b991e-bce7-4f7e-89dd-3937119da48a",
};

function runN8n(args) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["--yes", "n8n", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      [result.stderr, result.stdout].filter(Boolean).join("\n").trim() ||
        `n8n failed: ${args.join(" ")}`
    );
  }
  return result.stdout?.trim() ?? "";
}

async function n8nHealth() {
  try {
    const res = await fetch("http://localhost:5678/healthz", {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function stopN8nListener() {
  const conn = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "(Get-NetTCPConnection -LocalPort 5678 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess",
    ],
    { encoding: "utf8", shell: true }
  );
  const pid = parseInt(conn.stdout?.trim() ?? "", 10);
  if (pid > 0) {
    spawnSync("powershell", ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force`], {
      shell: true,
    });
    return true;
  }
  return false;
}

async function startN8nBackground() {
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Start-Process -WindowStyle Hidden -FilePath "npx" -ArgumentList "--yes","n8n","start" -WorkingDirectory "${root.replace(/\\/g, "/")}"`,
    ],
    { shell: true }
  );
  for (let i = 0; i < 30; i++) {
    if (await n8nHealth()) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function executeWorkflow(id, label) {
  console.log(`Ejecutando ${label}...`);
  const out = runN8n(["execute", `--id=${id}`]);
  const ok = out.includes('"status": "success"') || out.includes('"finished": true');
  console.log(ok ? `  OK ${label}` : `  Revisar ${label}`);
  if (!ok && out.length < 2000) console.log(out);
  return ok;
}

async function checkSupabase() {
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const emails = await admin.from("important_emails").select("id", { count: "exact", head: true });
  const events = await admin.from("calendar_events").select("id", { count: "exact", head: true });
  console.log(`Supabase: ${emails.count ?? 0} emails, ${events.count ?? 0} eventos`);
  return { emails: emails.count ?? 0, events: events.count ?? 0 };
}

async function main() {
  if (!(await n8nHealth())) {
    console.log("Arrancando n8n...");
    await startN8nBackground();
  }

  const stopped = stopN8nListener();
  if (stopped) await new Promise((r) => setTimeout(r, 3000));

  let calOk = false;
  try {
    calOk = await executeWorkflow(WORKFLOW_IDS.calendar, "Calendar");
  } catch (err) {
    console.error("Error ejecutando:", err instanceof Error ? err.message : err);
  }

  console.log("Reiniciando n8n...");
  await startN8nBackground();

  const counts = await checkSupabase();

  if (counts.emails === 0 && counts.events === 0) {
    console.log("\nSin datos aún. Gmail: npm run sync:google");
    console.log("Calendar OAuth en n8n si hace falta: http://localhost:5678/home/credentials");
  } else {
    console.log("\nDatos listos. Recarga Auro en http://localhost:3002");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
