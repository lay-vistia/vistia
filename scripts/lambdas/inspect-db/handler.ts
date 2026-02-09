import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";

const MAX_LIMIT = 50;

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

  const action = (event.queryStringParameters?.action ?? "tables").toLowerCase();
  const table = (event.queryStringParameters?.table ?? "").toLowerCase();
  const limitParam = Number(event.queryStringParameters?.limit ?? 20);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : 20;

  const allowedTables = parseAllowedTables(process.env.INSPECT_TABLES);

  const db = getDb();

  if (action === "tables") {
    const result = await db.query(
      "select table_name from information_schema.tables where table_schema='public' order by table_name"
    );
    const tables = result.rows.map((row) => row.table_name);
    return json(200, { ok: true, tables });
  }

  if (!table) {
    return json(400, { error: "Missing table" });
  }

  if (allowedTables.length === 0) {
    return json(400, { error: "INSPECT_TABLES is required for this action" });
  }

  if (!allowedTables.includes("*") && !allowedTables.includes(table)) {
    return json(403, { error: "Table not allowed" });
  }

  if (action === "count") {
    const result = await db.query(`select count(*)::int as count from ${table}`);
    return json(200, { ok: true, table, count: result.rows[0]?.count ?? 0 });
  }

  if (action === "recent") {
    const result = await db.query(
      `select * from ${table} order by 1 desc limit ${limit}`
    );
    return json(200, { ok: true, table, rows: result.rows });
  }

  if (action === "schema") {
    const result = await db.query(
      "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
      [table]
    );
    return json(200, { ok: true, table, columns: result.rows });
  }

  return json(400, { error: "Unknown action" });
}

function parseAllowedTables(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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
