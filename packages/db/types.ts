export type AssetStatus = "UPLOADED" | "PROCESSED" | "FAILED" | "DELETED";

export type AssetRecord = {
  assetId: string;
  userId: string;
  status: AssetStatus;
  originalExt: string;
  thumbVersion: number;
  createdAt: string;
  deletedAt: string | null;
};
