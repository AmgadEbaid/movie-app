
import { Injectable, Inject } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService, ConfigType } from '@nestjs/config';
import { put, PutBlobResult } from '@vercel/blob';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;

  constructor(
    private configService: ConfigService
  ) {
    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>('endpoint') || 'https://s3.us-west-004.backblazeb2.com',
      region: this.configService.get<string>('region') || 'us-west-004',
      credentials: {
        accessKeyId: this.configService.get<string>('accessKeyId')!,
        secretAccessKey: this.configService.get<string>('secretAccess')!,
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const { originalname, buffer, mimetype } = file;
    const pathname = `${new Date().getTime()}-${originalname}`;


    try {
      const blob: PutBlobResult = await put(pathname, file.buffer, {
        access: 'public',
      });
      return blob.url;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }
}
