import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";
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

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(emailRaw);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return json(400, { error: "Invalid input" });
  }

  const db = getDb();
  try {
    const countRes = await db.query("select count(*)::int as count from auth_accounts");
    const totalCount = countRes.rows?.[0]?.count ?? 0;
    console.log("[signin] auth_accounts count", { requestId, totalCount });

    const listRes = await db.query(
      "select userid as \"userId\", email, passwordhash as \"passwordHash\", provider from auth_accounts where provider = 'EMAIL' order by createdat desc limit 5"
    );
    console.log("[signin] recent accounts", { requestId, rows: listRes.rows });

    const normalizedRows = listRes.rows.map((row: any) => ({
      email: row.email ?? null,
      normalized: normalizeEmail(row.email ?? ""),
    }));
    console.log("[signin] normalized emails", { requestId, normalizedRows, input: email });

    const account =
      listRes.rows.find((row: any) => normalizeEmail(row.email ?? "") === email) ?? null;
    console.log("[signin] email debug", {
      requestId,
      input: email,
      inputLen: email.length,
      inputChars: Array.from(email).map((c) => c.charCodeAt(0)),
    });
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

function normalizeEmail(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "");
}
