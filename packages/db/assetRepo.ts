import type { AssetRecord, AssetStatus } from "./types";

export type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

export async function getAssetById(db: DbClient, assetId: string): Promise<AssetRecord | null> {
  const res = await db.query(
    "SELECT assetId, userId, status, originalExt, thumbVersion, createdAt, deletedAt FROM assets WHERE assetId = $1",
    [assetId]
  );
  return res.rows[0] ?? null;
}

export async function insertAsset(
  db: DbClient,
  input: Pick<AssetRecord, "assetId" | "userId" | "status" | "originalExt" | "thumbVersion">
): Promise<void> {
  await db.query(
    "INSERT INTO assets (assetId, userId, status, originalExt, thumbVersion, createdAt) VALUES ($1, $2, $3, $4, $5, now())",
    [input.assetId, input.userId, input.status, input.originalExt, input.thumbVersion]
  );
}

export async function updateAssetStatus(
  db: DbClient,
  assetId: string,
  status: AssetStatus
): Promise<void> {
  await db.query("UPDATE assets SET status = $1 WHERE assetId = $2", [status, assetId]);
}
