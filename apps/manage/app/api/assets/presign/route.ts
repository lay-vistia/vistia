import { NextResponse } from "next/server";
import { uuidv7 } from "../../../../../../packages/shared/uuidv7";
import { originalKey } from "../../../../../../packages/storage/keys";
import { createS3Client, presignPut } from "../../../../../../packages/storage/s3";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export async function POST(request: Request) {
  // TODO: Auth.js session -> userId
  const userId = "TODO_USER_ID";

  const body = await request.json().catch(() => null);
  if (!body || typeof body.ext !== "string" || typeof body.contentType !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ext = body.ext.toLowerCase();
  const contentType = body.contentType;
  const sizeBytes = Number(body.sizeBytes ?? 0);

  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Unsupported extension" }, { status: 400 });
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const assetId = uuidv7();
  const key = originalKey(userId, assetId, ext);

  const bucket = process.env.ASSETS_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const s3 = createS3Client(region);
  const uploadUrl = await presignPut(s3, { bucket, region }, key, contentType, 600);

  return NextResponse.json({
    assetId,
    uploadUrl,
    key,
    expiresInSeconds: 600,
  });
}
