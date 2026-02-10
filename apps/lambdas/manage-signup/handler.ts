import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";
import { createUser } from "../../../packages/db/userRepo";
import { createEmailAuthAccount } from "../../../packages/db/authAccountRepo";
import { uuidv7 } from "../../../packages/shared/uuidv7";
import { hashPassword } from "../../../packages/auth/password";

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const requestId = event.requestContext.requestId;
  console.log("[signup] start", { requestId });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(204, {});
  }

  const apiKey = process.env.SIGNUP_API_KEY;
  if (apiKey && event.headers["x-api-key"] !== apiKey) {
    return json(401, { error: "Unauthorized" });
  }

  const rawBody = event.body ?? "";
  const bodyText = event.isBase64Encoded
    ? Buffer.from(rawBody, "base64").toString("utf-8")
    : rawBody;

  const body = safeJson(bodyText);
  if (!body) {
    return json(400, { error: "Invalid request" });
  }

  const handle = typeof body.handle === "string" ? body.handle : "";
  const displayName = typeof body.displayName === "string" ? body.displayName : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase().normalize("NFKC")
      : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!HANDLE_REGEX.test(handle) || !displayName || !email || !password) {
    return json(400, { error: "Invalid input" });
  }

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
    console.log("[signup] success", { requestId, userId });
  } catch (error) {
    await db.query("ROLLBACK");
    const message = error instanceof Error ? error.message : String(error);
    const code = typeof (error as any)?.code === "string" ? (error as any).code : "unknown";
    console.error("[signup] failed", { requestId, code, message });
    if (process.env.SIGNUP_DEBUG === "true") {
      return json(400, { error: "Signup failed", code, message });
    }
    return json(400, { error: "Signup failed" });
  }

  return json(200, { ok: true, userId });
}

function json(statusCode: number, body: Record<string, unknown>): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,x-api-key",
      "access-control-allow-methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
