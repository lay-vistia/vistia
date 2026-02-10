import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";
import { getEmailAuthAccountByEmail } from "../../../packages/db/authAccountRepo";
import { verifyPassword } from "../../../packages/auth/password";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const requestId = event.requestContext.requestId;
  console.log("[signin] start", { requestId });
  const dbInfo = (() => {
    try {
      const url = new URL(process.env.DATABASE_URL ?? "");
      return {
        host: url.host,
        database: url.pathname.replace("/", "") || "(empty)",
        user: url.username || "(empty)",
      };
    } catch {
      return { host: "invalid", database: "invalid", user: "invalid" };
    }
  })();
  console.log("[signin] db info", { requestId, ...dbInfo });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(204, {});
  }

  const apiKey = process.env.SIGNIN_API_KEY;
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

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return json(400, { error: "Invalid input" });
  }

  const db = getDb();
  try {
    const account = await getEmailAuthAccountByEmail(db, email);
    if (!account || !account.passwordHash) {
      console.warn("[signin] missing account", { requestId, email });
      return json(401, { error: "Unauthorized" });
    }

    const ok = await verifyPassword(password, account.passwordHash);
    if (!ok) {
      console.warn("[signin] password mismatch", { requestId, email });
      return json(401, { error: "Unauthorized" });
    }

    console.log("[signin] success", { requestId, userId: account.userId });
    return json(200, { ok: true, userId: account.userId, email: account.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = typeof (error as any)?.code === "string" ? (error as any).code : "unknown";
    console.error("[signin] failed", { requestId, code, message });
    if (process.env.SIGNIN_DEBUG === "true") {
      return json(500, { error: "Signin failed", code, message });
    }
    return json(500, { error: "Signin failed" });
  }
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
