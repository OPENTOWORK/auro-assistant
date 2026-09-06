import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureAuthUser(email: string, password: string) {
  const admin = createAdminClient();

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    throw new Error(listError.message);
  }

  const existing = list.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(error.message);
}
