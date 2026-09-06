export const DEFAULT_LOCAL_URL = "http://127.0.0.1:3000";
export const CANONICAL_AUTO_START_URL = "http://127.0.0.1:3000";
export const HEALTH_TIMEOUT_MS = 4000;
export const STARTUP_TIMEOUT_MS = 60_000;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function resolveLocalUrl(raw) {
  const value = (raw ?? "").trim() || DEFAULT_LOCAL_URL;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("AURO_LOCAL_URL no es una URL válida.");
  }

  if (parsed.protocol !== "http:") {
    throw new Error("AURO_LOCAL_URL debe usar http en loopback.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("AURO_LOCAL_URL no debe incluir credenciales.");
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error(
      "AURO_LOCAL_URL debe ser loopback (127.0.0.1, localhost o ::1)."
    );
  }

  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("AURO_LOCAL_URL no debe incluir path.");
  }

  return parsed.origin;
}

export function requireCanonicalAutoStartUrl(raw) {
  const configured = (raw ?? "").trim();
  const resolved = resolveLocalUrl(configured);
  if (configured && resolved !== CANONICAL_AUTO_START_URL) {
    throw new Error(
      "El auto-start de Windows requiere AURO_LOCAL_URL=http://127.0.0.1:3000"
    );
  }
  return CANONICAL_AUTO_START_URL;
}

export async function fetchWithTimeout(url, options, timeoutMs) {
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

export function parseJsonBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function checkAuroHealth(baseUrl) {
  let response;
  try {
    response = await fetchWithTimeout(
      `${baseUrl}/api/health`,
      { method: "GET", headers: { Accept: "application/json" } },
      HEALTH_TIMEOUT_MS
    );
  } catch {
    return { status: "offline" };
  }

  if (!response.ok) {
    return { status: "invalid" };
  }

  let text;
  try {
    text = await response.text();
  } catch {
    return { status: "invalid" };
  }

  const body = parseJsonBody(text);
  if (body === undefined || body?.ok !== true) {
    return { status: "invalid" };
  }

  return { status: "online" };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
