import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDb } from "../../../../../../../packages/db/client";
import { createUser } from "../../../../../../../packages/db/userRepo";
import { createOAuthAuthAccount } from "../../../../../../../packages/db/authAccountRepo";
import { uuidv7 } from "../../../../../../../packages/shared/uuidv7";

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const oauthProvider = token?.oauthProvider as "GOOGLE" | "X" | "TIKTOK" | undefined;
  const providerAccountId = token?.oauthProviderAccountId as string | undefined;

  if (!oauthProvider || !providerAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const handle = typeof body.handle === "string" ? body.handle : "";
  const displayName = typeof body.displayName === "string" ? body.displayName : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase() : null;

  if (!HANDLE_REGEX.test(handle) || !displayName) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const userId = uuidv7();
  const authAccountId = uuidv7();
  const db = getDb();

  try {
    await db.query("BEGIN");
    await createUser(db, { id: userId, handle, displayName });
    await createOAuthAuthAccount(db, {
      id: authAccountId,
      userId,
      provider: oauthProvider,
      providerUserId: providerAccountId,
      email,
    });
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    return NextResponse.json({ error: "Signup failed" }, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    userId,
    nextAction: "RELOGIN",
    redirectTo: "/",
  });

  clearAuthSessionCookies(response, request);
  return response;
}

function clearAuthSessionCookies(response: NextResponse, request: NextRequest): void {
  const isSecure = new URL(request.url).protocol === "https:";

  response.cookies.set("next-auth.session-token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
  });
  response.cookies.set("__Secure-next-auth.session-token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });
}
