import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredOwnerEmail } from "@/lib/auth/owner-email";
import { isSupabaseConfigured } from "@/lib/config";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Servicio de acceso no disponible" },
      { status: 503 }
    );
  }

  const ownerEmail = getConfiguredOwnerEmail();
  if (!ownerEmail) {
    return NextResponse.json(
      { error: "Configuración de acceso incompleta" },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña obligatorios" },
      { status: 400 }
    );
  }

  if (email !== ownerEmail) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
