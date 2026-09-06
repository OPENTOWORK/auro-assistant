import { NextResponse } from "next/server";
import { projectFormSchema } from "@/lib/validations";
import {
  deleteProject,
  DuplicateSlugError,
  updateProject,
} from "@/lib/repositories/projects";
import { isSupabaseConfigured } from "@/lib/config";
import { slugify } from "@/lib/project-utils";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
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
    const project = await updateProject(params.id, {
      ...rest,
      slug: slug?.trim() || slugify(rest.name),
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof DuplicateSlugError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/projects PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  try {
    await deleteProject(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/projects DELETE]", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
