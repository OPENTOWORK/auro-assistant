import { loadEnv } from "./lib/env.mjs";

const DEFAULT_LOCAL_URL = "http://127.0.0.1:3000";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const HEALTH_TIMEOUT_MS = 4000;
const BRIEFING_TIMEOUT_MS = 60_000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadConfig() {
  loadEnv();
}

function requireCronSecret() {
  const secret = process.env.AURO_CRON_SECRET;
  if (
    secret === undefined ||
    secret.trim() === "" ||
    /\s/.test(secret)
  ) {
    fail("AURO_CRON_SECRET no configurado correctamente");
  }
  return secret;
}

function resolveLocalUrl(raw) {
  const value = (raw ?? "").trim() || DEFAULT_LOCAL_URL;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("AURO_LOCAL_URL no es una URL válida.");
  }

  if (parsed.protocol !== "http:") {
    fail("AURO_LOCAL_URL debe usar http en loopback.");
  }

  if (parsed.username || parsed.password) {
    fail("AURO_LOCAL_URL no debe incluir credenciales.");
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    fail("AURO_LOCAL_URL debe ser loopback (127.0.0.1, localhost o ::1).");
  }

  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    fail("AURO_LOCAL_URL no debe incluir path.");
  }

  return parsed.origin;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function reasonableError(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 200 &&
    !value.includes("<")
  );
}

function handleHttpError(status, body) {
  const serverError = body && reasonableError(body.error) ? body.error : null;

  if (status === 401) {
    fail("AURO_CRON_SECRET no coincide con el servidor local.");
  }

  if (status === 503) {
    if (serverError === "Cron no configurado") {
      fail("Cron no configurado en el servidor local.");
    }
    if (serverError === "Supabase no configurado") {
      fail("Supabase no configurado en el servidor local.");
    }
    fail(serverError ?? "El servidor local no está listo (503).");
  }

  fail(
    serverError
      ? `Error HTTP ${status}: ${serverError}`
      : `Error HTTP ${status} al generar el briefing diario.`
  );
}

function reportSuccess(payload) {
  const date = payload.briefing_date ?? "desconocida";
  const alertCreated = payload.alert_created === true ? "sí" : "no";

  if (payload.status === "created") {
    console.log("AURO Daily Briefing generado.");
    console.log(`Fecha: ${date}`);
    console.log("Estado: created");
    console.log("Alerta creada: sí");
  } else {
    console.log("AURO Daily Briefing ya estaba generado.");
    console.log(`Fecha: ${date}`);
    console.log(`Alerta creada/reparada: ${alertCreated}`);
  }

  if (typeof payload.run_id === "string" && payload.run_id) {
    console.log(`run_id: ${payload.run_id}`);
  }
  if (typeof payload.alert_id === "string" && payload.alert_id) {
    console.log(`alert_id: ${payload.alert_id}`);
  }
}

async function main() {
  loadConfig();
  const secret = requireCronSecret();
  const baseUrl = resolveLocalUrl(process.env.AURO_LOCAL_URL);

  let healthResponse;
  try {
    healthResponse = await fetchWithTimeout(
      `${baseUrl}/api/health`,
      { method: "GET", headers: { Accept: "application/json" } },
      HEALTH_TIMEOUT_MS
    );
  } catch {
    fail(`AURO local no está disponible en ${baseUrl}`);
  }

  if (!healthResponse.ok) {
    fail(`AURO local respondió con health inválido en ${baseUrl}`);
  }

  const healthBody = parseJsonBody(await healthResponse.text());
  if (healthBody === undefined || healthBody?.ok !== true) {
    fail(`AURO local respondió con health inválido en ${baseUrl}`);
  }

  let response;
  try {
    response = await fetchWithTimeout(
      `${baseUrl}/api/cron/daily-briefing`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/json",
        },
      },
      BRIEFING_TIMEOUT_MS
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      fail("Timeout al generar el briefing diario.");
    }
    fail("Error de red al generar el briefing diario.");
  }

  const text = await response.text();
  const body = parseJsonBody(text);

  if (body === undefined) {
    fail("Respuesta inválida del briefing diario.");
  }

  if (response.status === 200) {
    if (
      body &&
      body.ok === true &&
      (body.status === "created" || body.status === "already_generated")
    ) {
      reportSuccess(body);
      process.exit(0);
    }
    fail("Respuesta inválida del briefing diario.");
  }

  handleHttpError(response.status, body);
}

await main();
