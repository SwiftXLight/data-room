import { Injectable } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>("R2_BUCKET_NAME") || "dataroom";

    this.s3 = new S3Client({
      region: this.configService.get<string>("R2_REGION") || "auto",
      endpoint: this.configService.get<string>("R2_ENDPOINT"),
      credentials: {
        accessKeyId: this.configService.get<string>("R2_ACCESS_KEY_ID") || "",
        secretAccessKey:
          this.configService.get<string>("R2_SECRET_ACCESS_KEY") || "",
      },
    });
  }

  generateStorageKey(roomId: string, fileId: string, filename: string): string {
    const ext = filename.includes(".")
      ? filename.slice(filename.lastIndexOf("."))
      : ".pdf";
    return `rooms/${roomId}/files/${fileId}/${fileId}${ext}`;
  }

  async getUploadUrl(
    storageKey: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<{ url: string; expiresAt: Date }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { url, expiresAt };
  }

  async getViewUrl(
    storageKey: string,
    expiresIn = 900,
  ): Promise<{ url: string; expiresAt: Date }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { url, expiresAt };
  }

  async verifyObjectExists(storageKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      await this.s3.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });
    await this.s3.send(command);
  }
}
