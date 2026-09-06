/**
 * Sincroniza Gmail + Calendar usando tokens OAuth guardados en n8n → Supabase.
 * No imprime secretos. Uso: npm run sync:google
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import CryptoJS from "crypto-js";
import { createClient } from "@supabase/supabase-js";
import { default as Database } from "better-sqlite3";
import { loadEnv } from "./lib/env.mjs";

function decryptN8nCredential(encrypted, key) {
  const raw = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
  if (!raw) throw new Error("No se pudo descifrar credencial n8n");
  return JSON.parse(raw);
}

function loadN8nCredential(type) {
  const config = JSON.parse(
    fs.readFileSync(path.join(os.homedir(), ".n8n", "config"), "utf8")
  );
  const key = config.encryptionKey;
  if (!key) throw new Error("Falta encryptionKey en ~/.n8n/config");

  const db = new Database(path.join(os.homedir(), ".n8n", "database.sqlite"), {
    readonly: true,
  });
  const row = db
    .prepare("SELECT data FROM credentials_entity WHERE type = ? LIMIT 1")
    .get(type);
  db.close();
  if (!row?.data) throw new Error(`Credencial n8n no encontrada: ${type}`);
  return decryptN8nCredential(row.data, key);
}

async function refreshAccessToken(oauth) {
  const body = new URLSearchParams({
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    refresh_token: oauth.oauthTokenData.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description ?? json.error ?? "OAuth refresh failed");
  }
  return json.access_token;
}

async function syncGmail(accessToken, admin) {
  await admin.from("important_emails").delete().eq("is_processed", false);

  const query = "is:starred";
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const list = await listRes.json();
  if (!listRes.ok) throw new Error(list.error?.message ?? "Gmail list failed");

  let count = 0;
  for (const msg of list.messages ?? []) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const detail = await detailRes.json();
    if (!detailRes.ok) continue;
    if (!detail.labelIds?.includes("STARRED")) continue;

    const headers = detail.payload?.headers ?? [];
    const get = (name) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
      "";

    const subject = get("Subject");
    const sender = get("From");
    if (!subject || !sender) continue;

    const { error } = await admin.from("important_emails").upsert(
      {
        subject,
        sender,
        snippet: detail.snippet ?? null,
        gmail_id: detail.id,
        is_processed: false,
        received_at: detail.internalDate
          ? new Date(Number(detail.internalDate)).toISOString()
          : new Date().toISOString(),
      },
      { onConflict: "gmail_id" }
    );
    if (!error) count++;
  }

  return count;
}

async function syncCalendar(accessToken, admin) {
  const min = new Date();
  min.setDate(min.getDate() - 1);
  const max = new Date();
  max.setDate(max.getDate() + 30);

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", min.toISOString());
  url.searchParams.set("timeMax", max.toISOString());
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Calendar list failed");

  let count = 0;
  for (const ev of json.items ?? []) {
    const startRaw = ev.start?.dateTime || ev.start?.date;
    const endRaw = ev.end?.dateTime || ev.end?.date;
    if (!startRaw || !endRaw) continue;
    const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
    const toIso = (v, dateOnly) =>
      dateOnly ? `${v}T00:00:00.000Z` : new Date(v).toISOString();

    const { error } = await admin.from("calendar_events").upsert(
      {
        title: ev.summary || "(Sin título)",
        description: ev.description ?? null,
        start_at: toIso(startRaw, allDay),
        end_at: toIso(endRaw, allDay),
        all_day: allDay,
        calendar_name: ev.organizer?.displayName || "Principal",
        location: ev.location ?? null,
        html_link: ev.htmlLink ?? null,
        google_event_id: ev.id,
      },
      { onConflict: "google_event_id" }
    );
    if (!error) count++;
  }
  return count;
}

async function main() {
  loadEnv();
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const gmailCred = loadN8nCredential("gmailOAuth2");
  const calCred = loadN8nCredential("googleCalendarOAuth2Api");

  let emails = 0;
  if (gmailCred.oauthTokenData?.refresh_token) {
    const gmailToken = await refreshAccessToken(gmailCred);
    emails = await syncGmail(gmailToken, admin);
  } else {
    console.log(
      "Gmail: falta Sign in with Google en n8n (Credentials → Gmail account)"
    );
  }

  if (!calCred.oauthTokenData?.refresh_token) {
    throw new Error(
      "Calendar sin refresh_token. n8n → Credentials → Google Calendar → Sign in with Google"
    );
  }

  const calToken = await refreshAccessToken(calCred);
  const events = await syncCalendar(calToken, admin);

  console.log(`OK — sincronizado: ${emails} emails, ${events} eventos en Supabase`);
  console.log("Recarga Auro: http://localhost:3002");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
