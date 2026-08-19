import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuthorizationService,
  ResourceContext,
} from "../common/authorization.service";
import { StorageService } from "../storage/storage.service";
import { CreateShareDto } from "./dto/create-share.dto";
import { randomBytes, createHash } from "crypto";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface ShareResponse {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  accessType: string;
  role: string;
  recipient?: {
    id: string;
    email: string;
  };
  publicUrl?: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateShareResponse {
  id: string;
  resourceType: string;
  resourceId: string;
  accessType: string;
  role: string;
  recipient?: {
    id: string;
    email: string;
  };
  url?: string;
  createdAt: string;
}

export interface PublicShareResolveResponse {
  share: {
    resourceType: string;
    role: string;
  };
  room?: {
    id: string;
    name: string;
    rootFolderId: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  file?: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: string;
  };
}

export interface PublicFolderContentsResponse {
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
    sizeBytes: string;
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

export interface PublicFileViewResponse {
  file: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: string;
  };
  url: string;
  expiresAt: string;
}

export interface SharedWithMeRoom {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  rootFolderId: string;
  shares: SharedWithMeShare[];
}

export interface SharedWithMeShare {
  shareId: string;
  accessType: string;
  role: string;
  createdAt: string;
  roomId: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  resourcePath: { id: string; name: string }[];
}

export interface SharedWithMeResponse {
  rooms: SharedWithMeRoom[];
}

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly storageService: StorageService,
  ) {}

  async createShare(userId: string, dto: CreateShareDto): Promise<CreateShareResponse> {
    const resourceContext: ResourceContext = {
      resourceType: dto.resourceType as ResourceContext["resourceType"],
      resourceId: dto.resourceId,
    };
    await this.authorizationService.assertShare(userId, resourceContext);

    if (dto.accessType === "PRIVATE") {
      if (!dto.recipientEmail) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "recipientEmail is required for private shares.",
        });
      }

      const recipient = await this.prisma.user.findUnique({
        where: { email: dto.recipientEmail },
        select: { id: true, email: true },
      });

      if (!recipient) {
        throw new NotFoundException({
          code: "SHARE_RECIPIENT_NOT_FOUND",
          message: "Recipient user not found.",
        });
      }

      if (recipient.id === userId) {
        throw new BadRequestException({
          code: "SHARE_ALREADY_EXISTS",
          message: "You cannot share with yourself.",
        });
      }

      const existing = await this.prisma.share.findFirst({
        where: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          recipientUserId: recipient.id,
          accessType: "PRIVATE",
          revokedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException({
          code: "SHARE_ALREADY_EXISTS",
          message: "This resource is already shared with this user.",
        });
      }

      const share = await this.prisma.share.create({
        data: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          recipientUserId: recipient.id,
          accessType: "PRIVATE",
          role: dto.role,
        },
        select: {
          id: true,
          resourceType: true,
          resourceId: true,
          accessType: true,
          role: true,
          recipientUser: {
            select: { id: true, email: true },
          },
          createdAt: true,
          revokedAt: true,
        },
      });

      return {
        id: share.id,
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        accessType: share.accessType,
        role: share.role,
        recipient: share.recipientUser
          ? { id: share.recipientUser.id, email: share.recipientUser.email }
          : undefined,
        createdAt: share.createdAt.toISOString(),
      };
    }

    if (dto.accessType === "PUBLIC") {
      if (dto.recipientEmail) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "recipientEmail must not be supplied for public shares.",
        });
      }

      const existing = await this.prisma.share.findFirst({
        where: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          accessType: "PUBLIC",
          revokedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException({
          code: "SHARE_ALREADY_EXISTS",
          message: "This resource already has an active public share.",
        });
      }

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const publicUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/share/${rawToken}`;

      const share = await this.prisma.share.create({
        data: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          accessType: "PUBLIC",
          role: dto.role,
          tokenHash,
          publicUrl,
        },
        select: {
          id: true,
          resourceType: true,
          resourceId: true,
          accessType: true,
          role: true,
          createdAt: true,
          revokedAt: true,
        },
      });

      return {
        id: share.id,
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        accessType: share.accessType,
        role: share.role,
        url: publicUrl,
        createdAt: share.createdAt.toISOString(),
      };
    }

    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Invalid accessType.",
    });
  }

  async listShares(
    userId: string,
    resourceType?: string,
    resourceId?: string,
  ): Promise<ShareResponse[]> {
    const ownedRooms = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const ownedRoomIds = ownedRooms.map((r) => r.id);

    const ownedFolderIds = await this.prisma.folder.findMany({
      where: { dataRoomId: { in: ownedRoomIds } },
      select: { id: true },
    });

    const ownedFileIds = await this.prisma.file.findMany({
      where: { folder: { dataRoomId: { in: ownedRoomIds } } },
      select: { id: true },
    });

    const where: Prisma.ShareWhereInput = {
      revokedAt: null,
      OR: [
        { resourceType: "DATA_ROOM", resourceId: { in: ownedRoomIds } },
        { resourceType: "FOLDER", resourceId: { in: ownedFolderIds.map((f) => f.id) } },
        { resourceType: "FILE", resourceId: { in: ownedFileIds.map((f) => f.id) } },
      ],
    };

    if (resourceType && resourceId) {
      where.AND = [
        { resourceType },
        { resourceId },
      ];
    }

    const shares = await this.prisma.share.findMany({
      where,
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        accessType: true,
        role: true,
        publicUrl: true,
        recipientUser: {
          select: { id: true, email: true },
        },
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const nameMap = await this.buildResourceNameMap(shares);

    return shares.map((share) => ({
      id: share.id,
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      resourceName: nameMap.get(`${share.resourceType}:${share.resourceId}`) || "",
      accessType: share.accessType,
      role: share.role,
      publicUrl: share.publicUrl ?? undefined,
      recipient: share.recipientUser
        ? { id: share.recipientUser.id, email: share.recipientUser.email }
        : undefined,
      createdAt: share.createdAt.toISOString(),
      revokedAt: share.revokedAt?.toISOString() ?? null,
    }));
  }

  async listSharesForRoom(userId: string, roomId: string): Promise<ShareResponse[]> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: roomId },
      select: { ownerId: true },
    });

    if (!room) {
      throw new NotFoundException({
        code: "ROOM_NOT_FOUND",
        message: "Data Room not found.",
      });
    }

    if (room.ownerId !== userId) {
      const hasAccess = await this.authorizationService.hasDescendantShareInRoom(userId, roomId);
      if (!hasAccess) {
        throw new ForbiddenException({
          code: "ACCESS_DENIED",
          message: "You do not have permission to view shares for this room.",
        });
      }
    }

    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId },
      select: { id: true },
    });
    const folderIds = folders.map((f) => f.id);

    const files = await this.prisma.file.findMany({
      where: { folder: { dataRoomId: roomId } },
      select: { id: true },
    });
    const fileIds = files.map((f) => f.id);

    const where: Prisma.ShareWhereInput = {
      revokedAt: null,
      OR: [
        { resourceType: "DATA_ROOM", resourceId: roomId },
        { resourceType: "FOLDER", resourceId: { in: folderIds } },
        { resourceType: "FILE", resourceId: { in: fileIds } },
      ],
    };

    const shares = await this.prisma.share.findMany({
      where,
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        accessType: true,
        role: true,
        publicUrl: true,
        recipientUser: {
          select: { id: true, email: true },
        },
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const nameMap = await this.buildResourceNameMap(shares);

    return shares.map((share) => ({
      id: share.id,
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      resourceName: nameMap.get(`${share.resourceType}:${share.resourceId}`) || "",
      accessType: share.accessType,
      role: share.role,
      publicUrl: share.publicUrl ?? undefined,
      recipient: share.recipientUser
        ? { id: share.recipientUser.id, email: share.recipientUser.email }
        : undefined,
      createdAt: share.createdAt.toISOString(),
      revokedAt: share.revokedAt?.toISOString() ?? null,
    }));
  }

  async listRoomShares(userId: string): Promise<ShareResponse[]> {
    const ownedRooms = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (ownedRooms.length === 0) {
      return [];
    }

    const roomIds = ownedRooms.map((r) => r.id);

    const shares = await this.prisma.share.findMany({
      where: {
        resourceType: "DATA_ROOM",
        resourceId: { in: roomIds },
        revokedAt: null,
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        accessType: true,
        role: true,
        publicUrl: true,
        recipientUser: {
          select: { id: true, email: true },
        },
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const nameMap = await this.buildResourceNameMap(shares);

    return shares.map((share) => ({
      id: share.id,
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      resourceName: nameMap.get(`${share.resourceType}:${share.resourceId}`) || "",
      accessType: share.accessType,
      role: share.role,
      publicUrl: share.publicUrl ?? undefined,
      recipient: share.recipientUser
        ? { id: share.recipientUser.id, email: share.recipientUser.email }
        : undefined,
      createdAt: share.createdAt.toISOString(),
      revokedAt: share.revokedAt?.toISOString() ?? null,
    }));
  }

  async revokeShare(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { id: true, resourceType: true, resourceId: true, revokedAt: true },
    });

    if (!share) {
      throw new NotFoundException({
        code: "SHARE_NOT_FOUND",
        message: "Share not found.",
      });
    }

    if (share.revokedAt) {
      throw new BadRequestException({
        code: "SHARE_REVOKED",
        message: "Share is already revoked.",
      });
    }

    const context: ResourceContext = {
      resourceType: share.resourceType as ResourceContext["resourceType"],
      resourceId: share.resourceId,
    };
    await this.authorizationService.assertShare(userId, context);

    await this.prisma.share.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  async resolvePublicToken(rawToken: string) {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const share = await this.prisma.share.findFirst({
      where: {
        accessType: "PUBLIC",
        tokenHash,
        revokedAt: null,
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        role: true,
        createdAt: true,
      },
    });

    if (!share) {
      throw new NotFoundException({
        code: "SHARE_INVALID_TOKEN",
        message: "Invalid or expired share link.",
      });
    }

    return share;
  }

  async getPublicFolderContents(
    shareId: string,
    folderId: string,
    limit = DEFAULT_LIMIT,
    cursor?: string,
  ): Promise<PublicFolderContentsResponse> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { resourceType: true, resourceId: true },
    });

    if (!share) {
      throw new NotFoundException({
        code: "SHARE_NOT_FOUND",
        message: "Share not found.",
      });
    }

    if (share.resourceType === "FILE") {
      throw new ForbiddenException({
        code: "SHARE_ACCESS_DENIED",
        message: "This share is for a file, not a folder.",
      });
    }

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

    if (share.resourceType === "FOLDER") {
      if (folderId !== share.resourceId && !(await this.isDescendantOf(folderId, share.resourceId))) {
        throw new ForbiddenException({
          code: "SHARE_ACCESS_DENIED",
          message: "This folder is not part of the shared content.",
        });
      }
    } else if (share.resourceType === "DATA_ROOM") {
      if (folder.dataRoomId !== share.resourceId) {
        throw new ForbiddenException({
          code: "SHARE_ACCESS_DENIED",
          message: "This folder is not part of the shared content.",
        });
      }
    }

    const breadcrumbs = await this.buildPublicBreadcrumbs(folder);
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
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        dataRoomId: folder.dataRoomId,
      },
      breadcrumbs,
      folders: folders.slice(0, resolvedLimit).map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      files: files.slice(0, resolvedLimit).map((f) => ({
        ...f,
        sizeBytes: f.sizeBytes.toString(),
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      pagination: { nextCursor, hasMore },
    };
  }

  async getPublicFile(shareId: string): Promise<PublicFileViewResponse> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { resourceType: true, resourceId: true },
    });

    if (!share) {
      throw new NotFoundException({
        code: "SHARE_NOT_FOUND",
        message: "Share not found.",
      });
    }

    if (share.resourceType !== "FILE") {
      throw new ForbiddenException({
        code: "SHARE_ACCESS_DENIED",
        message: "This share is not for a file.",
      });
    }

    const file = await this.prisma.file.findUnique({
      where: { id: share.resourceId },
      select: { id: true, name: true, mimeType: true, sizeBytes: true, status: true, storageKey: true },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    if (file.status !== "READY") {
      throw new BadRequestException({
        code: "FILE_NOT_READY",
        message: "The file is not ready for viewing.",
      });
    }

    const { url, expiresAt } = await this.storageService.getViewUrl(file.storageKey);

    return {
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes.toString(),
      },
      url,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getPublicFileView(shareId: string, fileId: string): Promise<PublicFileViewResponse> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { resourceType: true, resourceId: true },
    });

    if (!share) {
      throw new NotFoundException({
        code: "SHARE_NOT_FOUND",
        message: "Share not found.",
      });
    }

    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, name: true, mimeType: true, sizeBytes: true, status: true, storageKey: true, folderId: true },
    });

    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found.",
      });
    }

    if (file.status !== "READY") {
      throw new BadRequestException({
        code: "FILE_NOT_READY",
        message: "The file is not ready for viewing.",
      });
    }

    if (share.resourceType === "FILE") {
      if (file.id !== share.resourceId) {
        throw new ForbiddenException({
          code: "SHARE_ACCESS_DENIED",
          message: "This file is not part of the shared content.",
        });
      }
    } else if (share.resourceType === "FOLDER") {
      if (file.folderId !== share.resourceId && !(await this.isDescendantOf(file.folderId, share.resourceId))) {
        throw new ForbiddenException({
          code: "SHARE_ACCESS_DENIED",
          message: "This file is not part of the shared content.",
        });
      }
    } else if (share.resourceType === "DATA_ROOM") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: file.folderId },
        select: { dataRoomId: true },
      });
      if (!folder || folder.dataRoomId !== share.resourceId) {
        throw new ForbiddenException({
          code: "SHARE_ACCESS_DENIED",
          message: "This file is not part of the shared content.",
        });
      }
    } else {
      throw new ForbiddenException({
        code: "SHARE_ACCESS_DENIED",
        message: "This share is not for a file.",
      });
    }

    const { url, expiresAt } = await this.storageService.getViewUrl(file.storageKey);

    return {
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes.toString(),
      },
      url,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async isDescendantOf(folderId: string, ancestorFolderId: string): Promise<boolean> {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { parentId: true },
    });

    if (!folder || !folder.parentId) return false;
    if (folder.parentId === ancestorFolderId) return true;

    return this.isDescendantOf(folder.parentId, ancestorFolderId);
  }

  async getSharedWithMe(userId: string): Promise<SharedWithMeResponse> {
    const shares = await this.prisma.share.findMany({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        accessType: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const roomMap = new Map<string, SharedWithMeRoom>();

    for (const share of shares) {
      let resourceName = "";
      let resourcePath: { id: string; name: string }[] = [];
      let roomId = "";
      let rootFolderId = "";

      if (share.resourceType === "DATA_ROOM") {
        const room = await this.prisma.dataRoom.findUnique({
          where: { id: share.resourceId },
          select: { id: true, name: true, ownerId: true, owner: { select: { email: true } } },
        });
        if (!room) continue;
        roomId = room.id;
        resourceName = room.name;
        resourcePath = [{ id: room.id, name: room.name }];

        const rootFolder = await this.prisma.folder.findFirst({
          where: { dataRoomId: room.id, parentId: null },
          select: { id: true },
        });
        rootFolderId = rootFolder?.id ?? "";

        if (!roomMap.has(room.id)) {
          roomMap.set(room.id, {
            id: room.id,
            name: room.name,
            ownerId: room.ownerId,
            ownerEmail: room.owner.email,
            rootFolderId,
            shares: [],
          });
        }
      } else if (share.resourceType === "FOLDER") {
        const folder = await this.prisma.folder.findUnique({
          where: { id: share.resourceId },
          select: { id: true, name: true, dataRoomId: true },
        });
        if (!folder) continue;
        roomId = folder.dataRoomId;
        resourceName = folder.name;
        resourcePath = await this.buildPathForFolder(folder.id);

        const room = await this.prisma.dataRoom.findUnique({
          where: { id: folder.dataRoomId },
          select: { id: true, name: true, ownerId: true, owner: { select: { email: true } } },
        });
        if (!room) continue;

        const rootFolder = await this.prisma.folder.findFirst({
          where: { dataRoomId: room.id, parentId: null },
          select: { id: true },
        });
        rootFolderId = rootFolder?.id ?? "";

        if (!roomMap.has(room.id)) {
          roomMap.set(room.id, {
            id: room.id,
            name: room.name,
            ownerId: room.ownerId,
            ownerEmail: room.owner.email,
            rootFolderId,
            shares: [],
          });
        }
      } else if (share.resourceType === "FILE") {
        const file = await this.prisma.file.findUnique({
          where: { id: share.resourceId },
          select: { id: true, name: true, folder: { select: { dataRoomId: true } } },
        });
        if (!file) continue;
        roomId = file.folder.dataRoomId;
        resourceName = file.name;
        resourcePath = await this.buildPathForFile(file.id);

        const room = await this.prisma.dataRoom.findUnique({
          where: { id: file.folder.dataRoomId },
          select: { id: true, name: true, ownerId: true, owner: { select: { email: true } } },
        });
        if (!room) continue;

        const rootFolder = await this.prisma.folder.findFirst({
          where: { dataRoomId: room.id, parentId: null },
          select: { id: true },
        });
        rootFolderId = rootFolder?.id ?? "";

        if (!roomMap.has(room.id)) {
          roomMap.set(room.id, {
            id: room.id,
            name: room.name,
            ownerId: room.ownerId,
            ownerEmail: room.owner.email,
            rootFolderId,
            shares: [],
          });
        }
      }

      const roomEntry = roomMap.get(roomId);
      if (roomEntry) {
        roomEntry.shares.push({
          shareId: share.id,
          accessType: share.accessType,
          role: share.role,
          createdAt: share.createdAt.toISOString(),
          roomId,
          resourceType: share.resourceType,
          resourceId: share.resourceId,
          resourceName,
          resourcePath,
        });
      }
    }

    return {
      rooms: Array.from(roomMap.values()),
    };
  }

  private async buildPathForFolder(folderId: string): Promise<{ id: string; name: string }[]> {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { name: true, parentId: true, dataRoomId: true },
    });
    if (!folder) return [];

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: folder.dataRoomId },
      select: { id: true, name: true },
    });

    const path: { id: string; name: string }[] = [];
    if (room) path.push({ id: room.id, name: room.name });

    if (!folder.parentId) {
      path.push({ id: folderId, name: folder.name });
      return path;
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

    path.push(...ancestors, { id: folderId, name: folder.name });
    return path;
  }

  private async buildPathForFile(fileId: string): Promise<{ id: string; name: string }[]> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { folderId: true, name: true },
    });
    if (!file) return [];

    const folderPath = await this.buildPathForFolder(file.folderId);
    return [...folderPath, { id: fileId, name: file.name }];
  }

  private async buildResourceNameMap(
    shares: { resourceType: string; resourceId: string }[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    const roomIds = shares
      .filter((s) => s.resourceType === "DATA_ROOM")
      .map((s) => s.resourceId);
    const folderIds = shares
      .filter((s) => s.resourceType === "FOLDER")
      .map((s) => s.resourceId);
    const fileIds = shares
      .filter((s) => s.resourceType === "FILE")
      .map((s) => s.resourceId);

    if (roomIds.length > 0) {
      const rooms = await this.prisma.dataRoom.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, name: true },
      });
      for (const room of rooms) {
        map.set(`DATA_ROOM:${room.id}`, room.name);
      }
    }

    if (folderIds.length > 0) {
      const folders = await this.prisma.folder.findMany({
        where: { id: { in: folderIds } },
        select: { id: true, name: true },
      });
      for (const folder of folders) {
        map.set(`FOLDER:${folder.id}`, folder.name);
      }
    }

    if (fileIds.length > 0) {
      const files = await this.prisma.file.findMany({
        where: { id: { in: fileIds } },
        select: { id: true, name: true },
      });
      for (const file of files) {
        map.set(`FILE:${file.id}`, file.name);
      }
    }

    return map;
  }

  private async buildPublicBreadcrumbs(folder: {
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
}
