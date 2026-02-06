import { NextResponse } from "next/server";
import { getDb } from "../../../../../../packages/db/client";
import { createUser } from "../../../../../../packages/db/userRepo";
import { createEmailAuthAccount } from "../../../../../../packages/db/authAccountRepo";
import { uuidv7 } from "../../../../../../packages/shared/uuidv7";
import { hashPassword } from "../../../../../../packages/auth/password";

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const handle = typeof body.handle === "string" ? body.handle : "";
  const displayName = typeof body.displayName === "string" ? body.displayName : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!HANDLE_REGEX.test(handle) || !displayName || !email || !password) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // TODO: パスワードの強度ルールを確定

  const userId = uuidv7();
  const authAccountId = uuidv7();
  const passwordHash = await hashPassword(password);

  const db = getDb();

  try {
    await db.query("BEGIN");
    await createUser(db, { id: userId, handle, displayName });
    await createEmailAuthAccount(db, {
      id: authAccountId,
      userId,
      email,
      passwordHash,
    });
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    return NextResponse.json({ error: "Signup failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId });
}
