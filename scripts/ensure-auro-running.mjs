import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, PROJECT_ROOT } from "./lib/env.mjs";
import {
  CANONICAL_AUTO_START_URL,
  STARTUP_TIMEOUT_MS,
  checkAuroHealth,
  requireCanonicalAutoStartUrl,
  sleep,
} from "./lib/local-auro.mjs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function startLocalAuro() {
  const logsDir = join(PROJECT_ROOT, ".auro-local", "logs");
  mkdirSync(logsDir, { recursive: true });

  const stdoutFd = openSync(join(logsDir, "auro-server.stdout.log"), "a");
  const stderrFd = openSync(join(logsDir, "auro-server.stderr.log"), "a");

  const child = spawn("npm.cmd", ["run", "dev:local"], {
    cwd: PROJECT_ROOT,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", stdoutFd, stderrFd],
  });

  child.unref();
  closeSync(stdoutFd);
  closeSync(stderrFd);

  child.once("error", () => {
    fail("No se pudo arrancar AURO local.");
  });
}

async function waitUntilOnline(baseUrl) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const health = await checkAuroHealth(baseUrl);
    if (health.status === "online") return;
    if (health.status === "invalid") {
      fail("El puerto local responde, pero no parece ser AURO.");
    }
    await sleep(1000);
  }
  fail("AURO no arrancó correctamente en 60 segundos.");
}

async function main() {
  loadEnv();

  let baseUrl;
  try {
    baseUrl = requireCanonicalAutoStartUrl(process.env.AURO_LOCAL_URL);
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "El auto-start de Windows requiere AURO_LOCAL_URL=http://127.0.0.1:3000"
    );
  }

  if (baseUrl !== CANONICAL_AUTO_START_URL) {
    fail("El auto-start de Windows requiere AURO_LOCAL_URL=http://127.0.0.1:3000");
  }

  const health = await checkAuroHealth(baseUrl);
  if (health.status === "online") {
    console.log("AURO local ya está activo.");
    process.exit(0);
  }

  if (health.status === "invalid") {
    fail("El puerto local responde, pero no parece ser AURO.");
  }

  startLocalAuro();
  await waitUntilOnline(baseUrl);
  console.log("AURO local arrancado.");
  process.exit(0);
}

await main();
