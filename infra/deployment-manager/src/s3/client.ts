import {
  S3Client as S3ClientBase,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
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

  destroy() {
    this.s3Client.destroy();
  }
}
