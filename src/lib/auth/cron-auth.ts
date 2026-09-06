import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuthReason = "missing_config" | "unauthorized";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; reason: CronAuthReason };

function digestSecret(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function secretsEqual(provided: string, expected: string): boolean {
  const providedDigest = digestSecret(provided);
  const expectedDigest = digestSecret(expected);
  return timingSafeEqual(providedDigest, expectedDigest);
}

function parseBearerToken(header: string): string | null {
  const match = /^Bearer (\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function authorizeCronRequest(request: Request): CronAuthResult {
  const expected = process.env.AURO_CRON_SECRET ?? "";
  if (expected.trim() === "") {
    return { ok: false, reason: "missing_config" };
  }

  const header = request.headers.get("authorization");
  if (!header) {
    return { ok: false, reason: "unauthorized" };
  }

  const token = parseBearerToken(header);
  if (!token || !secretsEqual(token, expected)) {
    return { ok: false, reason: "unauthorized" };
  }

  return { ok: true };
}
