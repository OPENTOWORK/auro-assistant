import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredOwnerEmail } from "@/lib/auth/owner-email";

export type OwnerAuth =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; response: NextResponse };

export { getConfiguredOwnerEmail, isOwnerEmail } from "@/lib/auth/owner-email";

export async function requireOwner(): Promise<OwnerAuth> {
  const ownerEmail = getConfiguredOwnerEmail();
  if (!ownerEmail) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Configuración de acceso incompleta" },
        { status: 503 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  if (email !== ownerEmail) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }),
    };
  }

  return { ok: true, user: { id: user.id, email } };
}
