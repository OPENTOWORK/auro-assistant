import { loadEnv } from "./lib/env.mjs";
import {
  checkAuroHealth,
  fetchWithTimeout,
  parseJsonBody,
  resolveLocalUrl,
} from "./lib/local-auro.mjs";

const BRIEFING_TIMEOUT_MS = 60_000;

function fail(message) {
  console.error(message);
  process.exit(1);
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
  loadEnv();
  const secret = requireCronSecret();

  let baseUrl;
  try {
    baseUrl = resolveLocalUrl(process.env.AURO_LOCAL_URL);
  } catch (error) {
    fail(error instanceof Error ? error.message : "AURO_LOCAL_URL inválida.");
  }

  const health = await checkAuroHealth(baseUrl);
  if (health.status === "offline") {
    fail(`AURO local no está disponible en ${baseUrl}`);
  }
  if (health.status === "invalid") {
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
