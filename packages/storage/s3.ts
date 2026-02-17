import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type S3Config = {
  region: string;
  bucket: string;
};

export function createS3Client(region: string): S3Client {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return new S3Client({ region });
}

export async function presignPut(
  s3: S3Client,
  cfg: S3Config,
  key: string,
  contentType: string,
  expiresInSeconds: number
): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function headObject(
  s3: S3Client,
  cfg: S3Config,
  key: string
): Promise<{ contentLength: number; contentType: string | undefined }> {
  const res = await s3.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
  return {
    contentLength: Number(res.ContentLength ?? 0),
    contentType: res.ContentType,
  };
}

export async function getObjectRange(
  s3: S3Client,
  cfg: S3Config,
  key: string,
  range: string
): Promise<Uint8Array> {
  const res = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key, Range: range }));
  if (!res.Body) return new Uint8Array();
  const arrayBuffer = await res.Body.transformToByteArray();
  return arrayBuffer;
}

export async function putObjectTags(
  s3: S3Client,
  cfg: S3Config,
  key: string,
  tags: Record<string, string>
): Promise<void> {
  await s3.send(
    new PutObjectTaggingCommand({
      Bucket: cfg.bucket,
      Key: key,
      Tagging: {
        TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      },
    })
  );
}
