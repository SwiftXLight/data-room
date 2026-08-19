import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SharesService, PublicShareResolveResponse } from "./shares.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

@Controller("public")
export class PublicSharesController {
  constructor(
    private readonly sharesService: SharesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(":token")
  async resolve(@Param("token") token: string): Promise<PublicShareResolveResponse> {
    const share = await this.sharesService.resolvePublicToken(token);

    if (share.resourceType === "DATA_ROOM") {
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: share.resourceId },
        select: { id: true, name: true },
      });

      const rootFolder = await this.prisma.folder.findFirst({
        where: { dataRoomId: share.resourceId, parentId: null },
        select: { id: true },
      });

      return {
        share: {
          resourceType: share.resourceType,
          role: share.role,
        },
        room: {
          id: room!.id,
          name: room!.name,
          rootFolderId: rootFolder?.id ?? null,
        },
      };
    }

    if (share.resourceType === "FOLDER") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: share.resourceId },
        select: { id: true, name: true },
      });

      return {
        share: {
          resourceType: share.resourceType,
          role: share.role,
        },
        folder: {
          id: folder!.id,
          name: folder!.name,
        },
      };
    }

    if (share.resourceType === "FILE") {
      const file = await this.prisma.file.findUnique({
        where: { id: share.resourceId },
        select: { id: true, name: true, mimeType: true, sizeBytes: true },
      });

      return {
        share: {
          resourceType: share.resourceType,
          role: share.role,
        },
        file: {
          id: file!.id,
          name: file!.name,
          mimeType: file!.mimeType,
          sizeBytes: file!.sizeBytes.toString(),
        },
      };
    }

    throw new NotFoundException({
      code: "SHARE_NOT_FOUND",
      message: "Share not found.",
    });
  }

  @Get(":token/folders/:folderId/contents")
  async getFolderContents(
    @Param("token") token: string,
    @Param("folderId") folderId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    const share = await this.sharesService.resolvePublicToken(token);
    const resolvedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.sharesService.getPublicFolderContents(share.id, folderId, resolvedLimit, cursor);
  }

  @Get(":token/file")
  async getFile(@Param("token") token: string) {
    const share = await this.sharesService.resolvePublicToken(token);
    return this.sharesService.getPublicFile(share.id);
  }

  @Get(":token/files/:fileId/view")
  async getFileView(
    @Param("token") token: string,
    @Param("fileId") fileId: string,
  ) {
    const share = await this.sharesService.resolvePublicToken(token);
    return this.sharesService.getPublicFileView(share.id, fileId);
  }
}
