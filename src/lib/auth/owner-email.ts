export function getConfiguredOwnerEmail(): string | null {
  const email = process.env.AURO_OWNER_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isOwnerEmail(email: string | undefined | null): boolean {
  const owner = getConfiguredOwnerEmail();
  if (!owner || !email) return false;
  return email.trim().toLowerCase() === owner;
}
