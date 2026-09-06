/**
 * Clasificación de errores de Postgres/PostgREST.
 *
 * Antes esta lógica estaba duplicada en cuatro sitios (`dashboard-data.ts`,
 * `fallback-store.ts`, `api/tasks/route.ts`, `api/recurring-tasks/route.ts`),
 * cada uno con su propia copia. Este módulo es la única fuente de verdad.
 */

export interface PostgresErrorLike {
  code?: string;
  message?: string;
}

/** La tabla no existe o PostgREST no la tiene en su caché de esquema. */
export function isMissingTableError(
  error: PostgresErrorLike | null | undefined
): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("Could not find the table") === true
  );
}

/** Violación de clave foránea: se referencia una fila que no existe. */
export function isForeignKeyViolation(
  error: PostgresErrorLike | null | undefined
): boolean {
  return error?.code === "23503";
}

/** Violación de restricción única. */
export function isUniqueViolation(
  error: PostgresErrorLike | null | undefined
): boolean {
  return error?.code === "23505";
}

/** Violación de una restricción CHECK. */
export function isCheckViolation(
  error: PostgresErrorLike | null | undefined
): boolean {
  return error?.code === "23514";
}
