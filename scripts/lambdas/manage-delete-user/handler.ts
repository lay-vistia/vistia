import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  if (event.requestContext.http.method === "OPTIONS") {
    return json(204, {});
  }

  const apiKey = process.env.INSPECT_API_KEY;
  if (!apiKey || event.headers["x-api-key"] !== apiKey) {
    return json(401, { error: "Unauthorized" });
  }

  const emailParam = event.queryStringParameters?.email ?? "";
  const email = emailParam.toLowerCase().trim();
  if (!email) {
    return json(400, { error: "Missing email" });
  }

  const db = getDb();
  const accountRes = await db.query(
    "select userId, email from auth_accounts where provider='EMAIL' and lower(trim(email))=$1 limit 1",
    [email]
  );
  const account = accountRes.rows?.[0] ?? null;
  if (!account) {
    return json(404, { error: "Not found" });
  }

  try {
    await db.query("BEGIN");
    await db.query("delete from auth_accounts where userId = $1", [account.userid]);
    await db.query("delete from users where id = $1", [account.userid]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    return json(500, { error: "Delete failed" });
  }

  return json(200, { ok: true, userId: account.userid, email: account.email });
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
