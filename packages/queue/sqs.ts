import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export type SqsConfig = {
  region: string;
  queueUrl: string;
};

export function createSqsClient(region: string): SQSClient {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new SQSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return new SQSClient({ region });
}

export async function sendAssetMessage(
  sqs: SQSClient,
  cfg: SqsConfig,
  assetId: string
): Promise<void> {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: cfg.queueUrl,
      MessageBody: JSON.stringify({ assetId }),
    })
  );
}
