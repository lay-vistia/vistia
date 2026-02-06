import type { DbClient } from "./assetRepo";

export type EmailAuthAccount = {
  userId: string;
  email: string;
  passwordHash: string | null;
};

export async function getEmailAuthAccountByEmail(
  db: DbClient,
  email: string
): Promise<EmailAuthAccount | null> {
  const res = await db.query(
    "SELECT userId, email, passwordHash FROM auth_accounts WHERE provider = 'EMAIL' AND email = $1",
    [email]
  );
  return res.rows[0] ?? null;
}

export async function createEmailAuthAccount(
  db: DbClient,
  input: { id: string; userId: string; email: string; passwordHash: string }
): Promise<void> {
  await db.query(
    "INSERT INTO auth_accounts (id, userId, provider, email, passwordHash, createdAt, updatedAt) VALUES ($1, $2, 'EMAIL', $3, $4, now(), now())",
    [input.id, input.userId, input.email, input.passwordHash]
  );
}

export async function getAuthAccountByProviderUserId(
  db: DbClient,
  provider: "GOOGLE" | "X" | "TIKTOK",
  providerUserId: string
): Promise<{ userId: string } | null> {
  const res = await db.query(
    "SELECT userId FROM auth_accounts WHERE provider = $1 AND providerUserId = $2",
    [provider, providerUserId]
  );
  return res.rows[0] ?? null;
}
