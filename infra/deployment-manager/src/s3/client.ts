import {
  S3Client as S3ClientBase,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type S3ClientConfig as S3ClientConfigBase,
} from '@aws-sdk/client-s3';

interface S3ClientConfig extends S3ClientConfigBase {
  bucket: string;
}

export class S3Client {
  private readonly s3Client: S3ClientBase;
  private readonly bucket: string;

  constructor({ bucket, ...baseConfig }: S3ClientConfig) {
    this.s3Client = new S3ClientBase(baseConfig);
    this.bucket = bucket;
  }

  async getObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error('response.Body is empty');
    }

    return response.Body.transformToString('utf-8');
  }

  async putObject(key: string, input: Omit<PutObjectCommandInput, 'Bucket' | 'Key'>) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...input,
    });

    const response = await this.s3Client.send(command);

    return response;
  }

  async headObject(key: string) {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    return response;
  }

  async *listObjectKeys(prefix: string): AsyncGenerator<string> {
    let continuationToken: string | undefined;
    for (;;) {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );
      for (const object of response.Contents ?? []) {
        if (object.Key !== undefined) {
          yield object.Key;
        }
      }
      if (!response.IsTruncated) {
        return;
      }
      continuationToken = response.NextContinuationToken;
      if (!continuationToken) {
        throw new Error('Truncated S3 listing has no continuation token');
      }
    }
  }

  destroy() {
    this.s3Client.destroy();
  }
}
