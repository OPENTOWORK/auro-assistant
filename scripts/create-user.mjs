import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] ?? "carlosgarciacano87@gmail.com";
const password = process.argv[3] ?? "Auro2026!";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  perPage: 100,
});

if (listError) {
  console.error("Error listando usuarios:", listError.message);
  process.exit(1);
}

const existing = list.users.find((u) => u.email === email);

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Error actualizando contraseña:", error.message);
    process.exit(1);
  }
  console.log("Contraseña actualizada para:", email);
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Error creando usuario:", error.message);
    process.exit(1);
  }
  console.log("Usuario creado:", email);
}

const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { error: loginError } = await client.auth.signInWithPassword({
  email,
  password,
});

if (loginError) {
  console.error("Login de prueba falló:", loginError.message);
  process.exit(1);
}

console.log("Login de prueba OK. Usa estas credenciales en /login");
