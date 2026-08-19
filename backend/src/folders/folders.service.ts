import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuthorizationService,
  ResourceContext,
} from "../common/authorization.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { RenameFolderDto } from "./dto/rename-folder.dto";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface FolderContentsResponse {
  folder: {
    id: string;
    name: string;
    parentId: string | null;
    dataRoomId: string;
  };
  breadcrumbs: { id: string; name: string }[];
  folders: {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  files: {
    id: string;
    name: string;
    sizeBytes: bigint;
    mimeType: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getContents(
    userId: string,
    folderId: string,
    limit = DEFAULT_LIMIT,
    cursor?: string,
  ): Promise<FolderContentsResponse> {
    const context: ResourceContext = {
      resourceType: "FOLDER",
      resourceId: folderId,
    };
    await this.authorizationService.assertRead(userId, context);

    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, name: true, parentId: true, dataRoomId: true },
    });

    if (!folder) {
      throw new NotFoundException({
        code: "FOLDER_NOT_FOUND",
        message: "Folder not found.",
      });
    }

    const breadcrumbs = await this.buildBreadcrumbs(folder);
    const resolvedLimit = Math.min(limit, MAX_LIMIT);

    const folders = await this.prisma.folder.findMany({
      where: { parentId: folderId },
      orderBy: { name: "asc" },
      take: resolvedLimit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const files = await this.prisma.file.findMany({
      where: { folderId, status: "READY" },
      orderBy: { name: "asc" },
      take: resolvedLimit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

    const folderHasMore = folders.length > resolvedLimit;
    const fileHasMore = files.length > resolvedLimit;
    const hasMore = folderHasMore || fileHasMore;

    let nextCursor: string | null = null;
    if (hasMore) {
      const combined = [
        ...folders.slice(0, resolvedLimit),
        ...files.slice(0, resolvedLimit),
      ];
      const lastItem = combined[combined.length - 1];
      nextCursor = lastItem.id;
    }

    return {
      folder,
      breadcrumbs,
      folders: folders.slice(0, resolvedLimit).map((f) => ({
        ...f,
        parentId: f.parentId,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      files: files.slice(0, resolvedLimit).map((f) => ({
        ...f,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      pagination: { nextCursor, hasMore },
    };
  }

  async createFolder(userId: string, dto: CreateFolderDto) {
    const parentContext: ResourceContext = {
      resourceType: "FOLDER",
      resourceId: dto.parentId,
    };
    await this.authorizationService.assertWrite(userId, parentContext);

    const parent = await this.prisma.folder.findUnique({
      where: { id: dto.parentId },
      select: { dataRoomId: true },
    });

    if (!parent) {
      throw new NotFoundException({
        code: "FOLDER_NOT_FOUND",
        message: "Parent folder not found.",
      });
    }

    try {
      const folder = await this.prisma.folder.create({
        data: {
          name: dto.name,
          parentId: dto.parentId,
          dataRoomId: parent.dataRoomId,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
          dataRoomId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return folder;
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ForbiddenException({
          code: "FOLDER_NAME_CONFLICT",
          message: "A folder with this name already exists.",
        });
      }
      throw e;
    }
  }

  async renameFolder(userId: string, folderId: string, dto: RenameFolderDto) {
    const context: ResourceContext = {
      resourceType: "FOLDER",
      resourceId: folderId,
    };
    await this.authorizationService.assertWrite(userId, context);

    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, name: true, parentId: true, dataRoomId: true },
    });

    if (!folder) {
      throw new NotFoundException({
        code: "FOLDER_NOT_FOUND",
        message: "Folder not found.",
      });
    }

    try {
      return await this.prisma.folder.update({
        where: { id: folderId },
        data: { name: dto.name },
        select: {
          id: true,
          name: true,
          parentId: true,
          dataRoomId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ForbiddenException({
          code: "FOLDER_NAME_CONFLICT",
          message: "A folder with this name already exists.",
        });
      }
      throw e;
    }
  }

  async deleteFolder(userId: string, folderId: string) {
    const context: ResourceContext = {
      resourceType: "FOLDER",
      resourceId: folderId,
    };
    await this.authorizationService.assertWrite(userId, context);

    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, dataRoomId: true },
    });

    if (!folder) {
      throw new NotFoundException({
        code: "FOLDER_NOT_FOUND",
        message: "Folder not found.",
      });
    }

    const descendantFolderIds = await this.getDescendantFolderIds(folderId);
    const allFolderIds = [folderId, ...descendantFolderIds];

    const files = await this.prisma.file.findMany({
      where: { folderId: { in: allFolderIds } },
      select: { id: true, storageKey: true },
    });

    const shares = await this.prisma.share.findMany({
      where: {
        OR: [
          { resourceType: "FOLDER", resourceId: { in: allFolderIds } },
          { resourceType: "FILE", resourceId: { in: files.map((f) => f.id) } },
          { resourceType: "DATA_ROOM", resourceId: folder.dataRoomId },
        ],
      },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (shares.length > 0) {
        await tx.share.deleteMany({
          where: { id: { in: shares.map((s) => s.id) } },
        });
      }

      if (files.length > 0) {
        await tx.file.deleteMany({
          where: { id: { in: files.map((f) => f.id) } },
        });
      }

      await tx.folder.deleteMany({
        where: { id: { in: allFolderIds } },
      });
    });

    for (const file of files) {
      try {
        // R2 deletion placeholder
        console.log(`Would delete R2 object: ${file.storageKey}`);
      } catch (error) {
        console.error(`Failed to delete R2 object ${file.storageKey}:`, error);
      }
    }
  }

  private async buildBreadcrumbs(folder: {
    id: string;
    name: string;
    parentId: string | null;
    dataRoomId: string;
  }): Promise<{ id: string; name: string }[]> {
    const breadcrumbs: { id: string; name: string }[] = [];

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: folder.dataRoomId },
      select: { id: true, name: true },
    });

    if (!room) return breadcrumbs;

    breadcrumbs.push({ id: room.id, name: room.name });

    if (!folder.parentId) {
      return breadcrumbs;
    }

    const ancestors: { id: string; name: string }[] = [];
    let current: { id: string; parentId: string | null; name: string } | null =
      await this.prisma.folder.findUnique({
        where: { id: folder.parentId },
        select: { id: true, parentId: true, name: true },
      });

    while (current) {
      if (current.parentId !== null) {
        ancestors.unshift({ id: current.id, name: current.name });
      }
      if (!current.parentId) break;
      current = await this.prisma.folder.findUnique({
        where: { id: current.parentId },
        select: { id: true, parentId: true, name: true },
      });
    }

    return [...breadcrumbs, ...ancestors, { id: folder.id, name: folder.name }];
  }

  private async getDescendantFolderIds(folderId: string): Promise<string[]> {
    const directChildren = await this.prisma.folder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    });

    let ids: string[] = [];
    for (const child of directChildren) {
      ids.push(child.id);
      const descendants = await this.getDescendantFolderIds(child.id);
      ids = ids.concat(descendants);
    }

    return ids;
  }
}
