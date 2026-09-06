import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local",
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: false,
      error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local",
    });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("projects").select("id").limit(1);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        hint: "¿Ejecutaste supabase/schema.sql en el SQL Editor?",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Conexión con Supabase correcta",
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Error de conexión",
    });
  }
}
