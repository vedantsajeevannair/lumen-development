import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { IStorageResponse } from './storage.interface';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION')!;
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME')!;

    // Region and bucket are always required. Credentials are NOT: on EC2, ECS or
    // EKS the SDK resolves them from the instance profile / task role / IRSA via
    // its default provider chain. Demanding static keys here would make the
    // recommended IAM-role setup fail at startup.
    if (!region || !this.bucketName) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'CRITICAL: AWS_REGION or AWS_BUCKET_NAME is missing in production',
        );
        throw new InternalServerErrorException(
          'AWS_REGION and AWS_BUCKET_NAME are required',
        );
      }
      this.logger.warn(
        'AWS region or bucket name is not configured. S3 file operations will fail.',
      );
    }

    const usingStaticKeys = Boolean(accessKeyId && secretAccessKey);
    this.logger.log(
      usingStaticKeys
        ? 'S3 client using static credentials from the environment'
        : 'S3 client using the AWS default credential provider chain (IAM role)',
    );

    // Point at any S3-compatible service instead of AWS: Supabase Storage
    // (https://<ref>.supabase.co/storage/v1/s3), Cloudflare R2, MinIO. Unset
    // means real S3, so the AWS deployment is unaffected.
    //
    // Path-style addressing is not optional for these. The SDK defaults to
    // virtual-hosted style (bucket as a subdomain), which for a non-AWS
    // endpoint resolves to a hostname that does not exist — so the default
    // flips to true whenever a custom endpoint is set. S3_FORCE_PATH_STYLE
    // exists only to override that for a provider that wants subdomains.
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const forcePathStyleRaw =
      this.configService.get<string>('S3_FORCE_PATH_STYLE');
    const forcePathStyle = forcePathStyleRaw
      ? forcePathStyleRaw.toLowerCase() === 'true'
      : Boolean(endpoint);

    if (endpoint) {
      this.logger.log(
        `S3 client targeting custom endpoint ${endpoint} (forcePathStyle=${forcePathStyle})`,
      );
    }

    this.s3Client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
      // Omitting `credentials` entirely is what lets the provider chain run.
      ...(usingStaticKeys
        ? {
            credentials: {
              accessKeyId: accessKeyId!,
              secretAccessKey: secretAccessKey!,
            },
          }
        : {}),
      maxAttempts: 3,
    });
  }

  private generateKey(file: Express.Multer.File): string {
    const extension = extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    const uuid = uuidv4();

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let folder = 'documents';

    if (mimeType.startsWith('image/')) {
      folder = 'complaints/images';
    } else if (mimeType.startsWith('video/')) {
      folder = 'complaints/videos';
    } else if (mimeType === 'application/pdf') {
      folder = 'documents';
    }

    return `${folder}/${year}/${month}/${day}/${uuid}${extension}`;
  }

  async uploadFile(file: Express.Multer.File): Promise<IStorageResponse> {
    const key = this.generateKey(file);

    this.logger.log(`Upload started for key: ${key}`);

    try {
      this.logger.log('Uploading to S3');
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);
      this.logger.log('Upload successful');

      // Programmatically verify object exists in S3 (Step 3)
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        await this.s3Client.send(headCommand);
        this.logger.log('Object verified');
      } catch (verifyError) {
        this.logger.error(
          `S3 verification failed for key: ${key}: ${verifyError.message}`,
        );
        // Attempt to clean up
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          });
          await this.s3Client.send(deleteCommand);
        } catch (cleanupError) {
          this.logger.error(
            `Cleanup failed for key: ${key}: ${cleanupError.message}`,
          );
        }
        throw new InternalServerErrorException(
          'Failed to verify uploaded object in S3',
        );
      }

      const url = `https://${this.bucketName}.s3.${await this.s3Client.config.region()}.amazonaws.com/${key}`;

      this.logger.log(`Upload completed for key: ${key}`);

      return {
        url,
        imageUrl: url,
        key,
        bucket: this.bucketName,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`S3 upload failure: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Delete started for key: ${key}`);
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Delete completed for key: ${key}`);
    } catch (error) {
      this.logger.error(`S3 delete failure: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Failed to delete file from storage',
      );
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      // 15 minutes expiry
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });
      return signedUrl;
    } catch (error) {
      this.logger.error(`S3 signed URL failure: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  getPublicObjectUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${encodeURI(key)}`;
  }
}
