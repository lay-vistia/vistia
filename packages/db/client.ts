import { Pool } from "pg";
import type { DbClient } from "./assetRepo";

let pool: Pool | null = null;

export function getDb(): DbClient {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
