import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { getDb } from "../../packages/db/client";
import { getAssetById, updateAssetStatus } from "../../packages/db/assetRepo";
import { originalKey, optimizedKey, thumbKey } from "../../packages/storage/keys";
import { putObjectTags } from "../../packages/storage/s3";

const JPEG_QUALITY = 80;
const OPTIMIZED_MAX = 1280;
const THUMB_SIZE = 512;

export async function handler(event: SQSEvent): Promise<void> {
  const bucket = process.env.ASSETS_BUCKET;
  const region = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION;
  if (!bucket || !region) {
    throw new Error("Missing ASSETS_BUCKET or AWS_REGION");
  }

  const s3 = new S3Client({ region });
  const db = getDb();

  for (const record of event.Records) {
    const message = safeJson(record.body);
    const assetId = message?.assetId as string | undefined;
    if (!assetId) continue;

    const asset = await getAssetById(db, assetId);
    if (!asset) continue;

    const original = originalKey(asset.userId, asset.assetId, asset.originalExt);
    const optimized = optimizedKey(asset.userId, asset.assetId);
    const thumb = thumbKey(asset.userId, asset.assetId, asset.thumbVersion);
    const previousThumb = asset.thumbVersion > 1
      ? thumbKey(asset.userId, asset.assetId, asset.thumbVersion - 1)
      : null;

    try {
      const originalBytes = await getObjectBytes(s3, bucket, original);

      const base = sharp(originalBytes, { failOnError: true }).rotate();

      const optimizedBytes = await base
        .resize({ width: OPTIMIZED_MAX, height: OPTIMIZED_MAX, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      const thumbBytes = await base
        .resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: "cover", position: "center" })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: optimized,
          Body: optimizedBytes,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumb,
          Body: thumbBytes,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      if (previousThumb) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: previousThumb }));
      }

      await updateAssetStatus(db, asset.assetId, "PROCESSED");
      const today = new Date().toISOString().slice(0, 10);
      await putObjectTags(s3, { bucket, region }, original, {
        processed: "true",
        processedAt: today,
      });
    } catch (error) {
      await updateAssetStatus(db, asset.assetId, "FAILED");
      const today = new Date().toISOString().slice(0, 10);
      await putObjectTags(s3, { bucket, region }, original, {
        failed: "true",
        failedAt: today,
      });
    }
  }
}

async function getObjectBytes(s3: S3Client, bucket: string, key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) return Buffer.from([]);
  const byteArray = await res.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

function safeJson(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
