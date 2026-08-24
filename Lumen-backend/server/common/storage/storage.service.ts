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
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    )!;
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME')!;

    if (!region || !accessKeyId || !secretAccessKey || !this.bucketName) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'CRITICAL: AWS credentials or bucket name are missing in production environment',
        );
        throw new InternalServerErrorException(
          'AWS S3 credentials are strictly required in production',
        );
      } else {
        this.logger.warn(
          'AWS credentials or bucket name are not fully configured. S3 file operations will fail.',
        );
      }
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
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
