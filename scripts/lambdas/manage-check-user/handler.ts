import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  if (event.requestContext.http.method === "OPTIONS") {
    return json(204, {});
  }

  const apiKey = process.env.SIGNUP_API_KEY;
  if (apiKey && event.headers["x-api-key"] !== apiKey) {
    return json(401, { error: "Unauthorized" });
  }

  const emailParam = event.queryStringParameters?.email ?? "";
  const email = emailParam.toLowerCase().trim();
  if (!email) {
    return json(400, { error: "Missing email" });
  }

  const db = getDb();
  const result = await db.query(
    "select userId, email, passwordHash is not null as has_password from auth_accounts where provider='EMAIL' and email=$1 limit 1",
    [email]
  );

  const row = result.rows?.[0] ?? null;
  return json(200, { ok: true, exists: Boolean(row), account: row });
}

function json(statusCode: number, body: Record<string, unknown>): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,x-api-key",
      "access-control-allow-methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
