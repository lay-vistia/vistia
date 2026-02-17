import { NextResponse } from "next/server";
import { getDb } from "../../../../../../../packages/db/client";
import { insertAsset } from "../../../../../../../packages/db/assetRepo";
import { detectImageType } from "../../../../../../../packages/images/magic";
import { originalKey } from "../../../../../../../packages/storage/keys";
import {
  createS3Client,
  getObjectRange,
  headObject,
  putObjectTags,
} from "../../../../../../../packages/storage/s3";
import { createSqsClient, sendAssetMessage } from "../../../../../../../packages/queue/sqs";
import { requireUserId } from "../../../../../lib/auth";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.ext !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ext = body.ext.toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Unsupported extension" }, { status: 400 });
  }

  const bucket = process.env.ASSETS_BUCKET;
  const region = process.env.APP_AWS_REGION ?? process.env.AWS_REGION;
  const queueUrl = process.env.ASSETS_QUEUE_URL;
  if (!bucket || !region || !queueUrl) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const key = originalKey(userId, assetId, ext);
  const s3 = createS3Client(region);

  try {
    const head = await headObject(s3, { bucket, region }, key);
    if (!head.contentLength || head.contentLength > MAX_UPLOAD_BYTES) {
      return await failAndTag(
        assetId,
        userId,
        ext,
        s3,
        { bucket, region },
        "Invalid size"
      );
    }

    const bytes = await getObjectRange(s3, { bucket, region }, key, "bytes=0-31");
    const detected = detectImageType(bytes);
    if (detected === "unknown") {
      return await failAndTag(
        assetId,
        userId,
        ext,
        s3,
        { bucket, region },
        "Invalid image"
      );
    }

    if (detected === "jpg" && !(ext === "jpg" || ext === "jpeg")) {
      return await failAndTag(
        assetId,
        userId,
        ext,
        s3,
        { bucket, region },
        "Extension mismatch"
      );
    }

    if (detected !== "jpg" && detected !== ext) {
      return await failAndTag(
        assetId,
        userId,
        ext,
        s3,
        { bucket, region },
        "Extension mismatch"
      );
    }

    const db = getDb();
    await insertAsset(db, {
      assetId,
      userId,
      status: "UPLOADED",
      originalExt: ext,
      thumbVersion: 1,
    });

    const sqs = createSqsClient(region);
    await sendAssetMessage(sqs, { region, queueUrl }, assetId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as {
      name?: string;
      message?: string;
      code?: string;
      stack?: string;
      $fault?: string;
      $metadata?: unknown;
    };
    console.error("[complete] failed detail", {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      fault: err?.$fault,
      metadata: err?.$metadata,
      stack: err?.stack,
    });
    return NextResponse.json({ error: "Upload verification failed" }, { status: 500 });
  }
}

async function failAndTag(
  assetId: string,
  userId: string,
  ext: string,
  s3: ReturnType<typeof createS3Client>,
  cfg: { bucket: string; region: string },
  reason: string
) {
  try {
    const db = getDb();
    await insertAsset(db, {
      assetId,
      userId,
      status: "FAILED",
      originalExt: ext,
      thumbVersion: 1,
    });

    const today = new Date().toISOString().slice(0, 10);
    await putObjectTags(s3, cfg, originalKey(userId, assetId, ext), {
      failed: "true",
      failedAt: today,
    });
  } catch {
    // ignore secondary failures
  }

  return NextResponse.json({ error: reason }, { status: 400 });
}
