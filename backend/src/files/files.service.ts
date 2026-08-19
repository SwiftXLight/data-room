import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import {
  AuthorizationService,
  ResourceContext,
} from "../common/authorization.service";
import { UploadUrlDto } from "./dto/upload-url.dto";
import { RenameFileDto } from "./dto/rename-file.dto";
import { MoveFileDto } from "./dto/move-file.dto";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  private serializeFile(file: {
    id: string;
    name: string;
    folderId: string;
    sizeBytes: bigint;
    mimeType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: file.id,
      name: file.name,
      folderId: file.folderId,
      sizeBytes: file.sizeBytes.toString(),
      mimeType: file.mimeType,
      status: file.status,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };
  }

  async requestUploadUrl(userId: string, dto: UploadUrlDto) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: dto.folderId },
      select: { id: true, dataRoomId: true },
    });

    if (!folder) {
      throw new NotFoundException({
        code: "FOLDER_NOT_FOUND",
        message: "Folder not found.",
      });
    }

    const folderContext: ResourceContext = {
      resourceType: "FOLDER",
      resourceId: dto.folderId,
    };
    await this.authorizationService.assertWrite(userId, folderContext);

    if (!dto.name.toLowerCase().endsWith(".pdf")) {
      throw new BadRequestException({
        code: "FILE_INVALID_TYPE",
        message: "Only PDF files are allowed.",
      });
    }

    if (dto.mimeType !== "application/pdf") {
      throw new BadRequestException({
        code: "FILE_INVALID_TYPE",
        message: "Only PDF files are allowed.",
      });
    }

    const size = parseInt(dto.sizeBytes, 10);
    if (isNaN(size) || size > MAX_FILE_SIZE) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: "The maximum file size is 50 MB.",
      });
    }

    const existing = await this.prisma.file.findFirst({
      where: { folderId: dto.folderId, name: dto.name },
    });

    if (existing) {
      throw new ForbiddenException({
        code: "FILE_NAME_CONFLICT",
        message: "A file with this name already exists in the folder.",
      });
    }

    const file = await this.prisma.file.create({
      data: {
        name: dto.name,
        folderId: dto.folderId,
        uploadedById: userId,
        mimeType: dto.mimeType,
        sizeBytes: BigInt(size),
        status: "PENDING",
        storageKey: "pending",
      },
      select: {
        id: true,
        name: true,
        sizeBytes: true,
        mimeType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const storageKey = this.storageService.generateStorageKey(
      folder.dataRoomId,
      file.id,
      dto.name,
    );

    await this.prisma.file.update({
      where: { id: file.id },
      data: { storageKey },
    });

    const { url, expiresAt } = await this.storageService.getUploadUrl(
      storageKey,
      dto.mimeType,
    );

    return {
      file: {
        ...file,
        sizeBytes: file.sizeBytes.toString(),
        storageKey,
      },
      upload: {
        url,
        method: "PUT",
        expiresAt,
      },
    };
  }

  async completeUpload(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        storageKey: true,
        folder: { select: { dataRoomId: true } },
      },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    const context: ResourceContext = {
      resourceType: "FILE",
      resourceId: fileId,
    };
    await this.authorizationService.assertWrite(userId, context);

    const exists = await this.storageService.verifyObjectExists(
      file.storageKey,
    );

    if (!exists) {
      await this.prisma.file.update({
        where: { id: fileId },
        data: { status: "FAILED" },
      });

      throw new BadRequestException({
        code: "FILE_UPLOAD_FAILED",
        message: "The uploaded file could not be verified.",
      });
    }

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { status: "READY" },
      select: {
        id: true,
        name: true,
        sizeBytes: true,
        mimeType: true,
        status: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.serializeFile(updated);
  }

  async getViewUrl(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, storageKey: true, status: true },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    const context: ResourceContext = {
      resourceType: "FILE",
      resourceId: fileId,
    };
    await this.authorizationService.assertRead(userId, context);

    if (file.status !== "READY") {
      throw new BadRequestException({
        code: "FILE_NOT_READY",
        message: "The file is not ready for viewing.",
      });
    }

    const { url, expiresAt } = await this.storageService.getViewUrl(
      file.storageKey,
    );

    return { url, expiresAt };
  }

  async renameFile(userId: string, fileId: string, dto: RenameFileDto) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, folderId: true, name: true },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    const context: ResourceContext = {
      resourceType: "FILE",
      resourceId: fileId,
    };
    await this.authorizationService.assertWrite(userId, context);

    if (!dto.name.toLowerCase().endsWith(".pdf")) {
      throw new BadRequestException({
        code: "FILE_INVALID_TYPE",
        message: "File must remain a PDF.",
      });
    }

    try {
      const updated = await this.prisma.file.update({
        where: { id: fileId },
        data: { name: dto.name },
        select: {
          id: true,
          name: true,
          folderId: true,
          sizeBytes: true,
          mimeType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return this.serializeFile(updated);
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ForbiddenException({
          code: "FILE_NAME_CONFLICT",
          message: "A file with this name already exists in the folder.",
        });
      }
      throw e;
    }
  }

  async moveFile(userId: string, fileId: string, dto: MoveFileDto) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        folderId: true,
        name: true,
        folder: { select: { dataRoomId: true } },
      },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    const sourceContext: ResourceContext = {
      resourceType: "FILE",
      resourceId: fileId,
    };
    await this.authorizationService.assertWrite(userId, sourceContext);

    const destinationFolder = await this.prisma.folder.findUnique({
      where: { id: dto.destinationFolderId },
      select: { id: true, dataRoomId: true },
    });

    if (!destinationFolder) {
      throw new NotFoundException({
        code: "FOLDER_NOT_FOUND",
        message: "Destination folder not found.",
      });
    }

    if (destinationFolder.dataRoomId !== file.folder.dataRoomId) {
      throw new BadRequestException({
        code: "FOLDER_INVALID_PARENT",
        message: "Destination folder must be in the same Data Room.",
      });
    }

    const destContext: ResourceContext = {
      resourceType: "FOLDER",
      resourceId: dto.destinationFolderId,
    };
    await this.authorizationService.assertWrite(userId, destContext);

    const existing = await this.prisma.file.findFirst({
      where: { folderId: dto.destinationFolderId, name: file.name },
    });

    if (existing) {
      throw new ForbiddenException({
        code: "FILE_NAME_CONFLICT",
        message:
          "A file with this name already exists in the destination folder.",
      });
    }

    return this.serializeFile(
      await this.prisma.file.update({
        where: { id: fileId },
        data: { folderId: dto.destinationFolderId },
        select: {
          id: true,
          name: true,
          folderId: true,
          sizeBytes: true,
          mimeType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );
  }

  async deleteFile(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, storageKey: true },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    const context: ResourceContext = {
      resourceType: "FILE",
      resourceId: fileId,
    };
    await this.authorizationService.assertWrite(userId, context);

    try {
      await this.storageService.deleteObject(file.storageKey);
    } catch (error) {
      console.error(`Failed to delete R2 object ${file.storageKey}:`, error);
    }

    await this.prisma.file.delete({
      where: { id: fileId },
    });
  }
}
