import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureAuthUser } from "@/lib/auth/ensure-user";
import { isSupabaseConfigured } from "@/lib/config";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
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

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  let signIn = await supabase.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    try {
      await ensureAuthUser(email, password);
      signIn = await supabase.auth.signInWithPassword({ email, password });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear el usuario";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (signIn.error) {
    return NextResponse.json(
      { error: signIn.error.message },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
