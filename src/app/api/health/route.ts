import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Detección de proceso: AURO está online. Sin auth. Sin Supabase. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
