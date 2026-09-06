import { NextResponse } from "next/server";
import { projectFormSchema } from "@/lib/validations";
import {
  createProject,
  DuplicateSlugError,
  listProjects,
} from "@/lib/repositories/projects";
import { isSupabaseConfigured } from "@/lib/config";
import { slugify } from "@/lib/project-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[api/projects GET]", error);
    return NextResponse.json(
      { error: "Error al cargar proyectos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = projectFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { slug, ...rest } = parsed.data;

  try {
    const project = await createProject({
      ...rest,
      slug: slug?.trim() || slugify(rest.name),
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateSlugError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/projects POST]", error);
    return NextResponse.json({ error: "Error al crear el proyecto" }, { status: 500 });
  }
}
