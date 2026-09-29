import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { NEWS_CACHE_CONTROL, NEWS_PATH, validateNewsSnapshot } from '../shared/news-snapshot.mjs';
import { NewsJobError } from './network.mjs';

const clientOptions = { maxAttempts: 3, requestHandler: { connectionTimeout: 3000, requestTimeout: 10000 } };
const s3 = new S3Client(clientOptions);
const secrets = new SecretsManagerClient(clientOptions);

export async function readOpenAIKey(secretArn, client = secrets) {
  if (!secretArn) throw new NewsJobError('missing_secret_configuration');
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!result.SecretString?.trim()) throw new NewsJobError('empty_secret');
  return result.SecretString.trim();
}

export async function publishSnapshot(bucket, snapshot, client = s3) {
  const validated = validateNewsSnapshot(snapshot);
  if (!bucket || !validated) throw new NewsJobError('invalid_publication');
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: NEWS_PATH.slice(1),
    Body: JSON.stringify(validated), ContentType: 'application/json; charset=utf-8',
    CacheControl: NEWS_CACHE_CONTROL, ServerSideEncryption: 'AES256' }));
}
