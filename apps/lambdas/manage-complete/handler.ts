import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getDb } from "../../../packages/db/client";
import { insertAsset } from "../../../packages/db/assetRepo";
import { detectImageType } from "../../../packages/images/magic";
import { originalKey } from "../../../packages/storage/keys";
import {
  createS3Client,
  getObjectRange,
  headObject,
  putObjectTags,
} from "../../../packages/storage/s3";
import { createSqsClient, sendAssetMessage } from "../../../packages/queue/sqs";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const requestId = event.requestContext.requestId;
  console.log("[complete] start", { requestId });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(204, {});
  }

  const apiKey = process.env.COMPLETE_API_KEY;
  if (apiKey && event.headers["x-api-key"] !== apiKey) {
    return json(401, { error: "Unauthorized" });
  }

  const rawBody = event.body ?? "";
  const bodyText = event.isBase64Encoded
    ? Buffer.from(rawBody, "base64").toString("utf-8")
    : rawBody;
  const body = safeJson(bodyText);
  if (!body) {
    return json(400, { error: "Invalid request" });
  }

  const assetId = typeof body.assetId === "string" ? body.assetId : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  const ext = typeof body.ext === "string" ? body.ext.toLowerCase() : "";

  if (!assetId || !userId || !ALLOWED_EXT.has(ext)) {
    return json(400, { error: "Invalid input" });
  }

  const bucket = process.env.ASSETS_BUCKET;
  const queueUrl = process.env.ASSETS_QUEUE_URL;
  const region = process.env.APP_AWS_REGION ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (!bucket || !queueUrl || !region) {
    return json(500, { error: "Server misconfigured" });
  }

  const key = originalKey(userId, assetId, ext);
  const s3 = createS3Client(region);

  try {
    const head = await headObject(s3, { bucket, region }, key);
    if (!head.contentLength || head.contentLength > MAX_UPLOAD_BYTES) {
      return await failAndTag(assetId, userId, ext, s3, { bucket, region }, "Invalid size");
    }

    const bytes = await getObjectRange(s3, { bucket, region }, key, "bytes=0-31");
    const detected = detectImageType(bytes);
    if (detected === "unknown") {
      return await failAndTag(assetId, userId, ext, s3, { bucket, region }, "Invalid image");
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

    console.log("[complete] success", { requestId, userId, assetId });
    return json(200, { ok: true });
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
      requestId,
      name: err?.name,
      message: err?.message,
      code: err?.code,
      fault: err?.$fault,
      metadata: err?.$metadata,
      stack: err?.stack,
    });
    return json(500, { error: "Upload verification failed" });
  }
}

async function failAndTag(
  assetId: string,
  userId: string,
  ext: string,
  s3: ReturnType<typeof createS3Client>,
  cfg: { bucket: string; region: string },
  reason: string
): Promise<APIGatewayProxyStructuredResultV2> {
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

  return json(400, { error: reason });
}

function json(statusCode: number, body: Record<string, unknown>): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,x-api-key",
      "access-control-allow-methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
