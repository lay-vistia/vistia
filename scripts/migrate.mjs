import fs from "fs/promises";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../packages/db/migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await ensureMigrationsTable(client);

    const files = await listMigrationFiles(migrationsDir);
    if (files.length === 0) {
      console.log("適用対象のマイグレーションはありません。");
      return;
    }

    for (const file of files) {
      const applied = await isApplied(client, file);
      if (applied) {
        console.log(`skip: ${file}`);
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");

      console.log(`apply: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, now())",
          [file]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("マイグレーション適用が完了しました。");
  } finally {
    await client.end();
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL
    )
  `);
}

async function listMigrationFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function isApplied(client, filename) {
  const res = await client.query(
    "SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1",
    [filename]
  );
  return res.rowCount > 0;
}

main().catch((error) => {
  console.error("マイグレーション適用に失敗しました。");
  console.error(error);
  process.exit(1);
});
