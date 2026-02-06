import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export type SqsConfig = {
  region: string;
  queueUrl: string;
};

export function createSqsClient(region: string): SQSClient {
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
