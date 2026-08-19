import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type ResourceType = "DATA_ROOM" | "FOLDER" | "FILE";

export interface ResourceContext {
  resourceType: ResourceType;
  resourceId: string;
}

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async canRead(userId: string, context: ResourceContext): Promise<boolean> {
    if (context.resourceType === "DATA_ROOM") {
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: context.resourceId },
        select: { ownerId: true },
      });
      if (!room) return false;
      if (room.ownerId === userId) return true;
      if (await this.hasAncestorPrivateShare(userId, "DATA_ROOM", context.resourceId)) return true;
      if (await this.hasAncestorPublicShare("DATA_ROOM", context.resourceId)) return true;
      if (await this.hasDescendantShareInRoom(userId, context.resourceId)) return true;
      return false;
    }

    if (context.resourceType === "FOLDER") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: context.resourceId },
        select: { dataRoomId: true },
      });
      if (!folder) return false;
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: folder.dataRoomId },
        select: { ownerId: true },
      });
      if (!room) return false;
      if (room.ownerId === userId) return true;
      if (await this.hasAncestorPrivateShare(userId, "FOLDER", context.resourceId)) return true;
      if (await this.hasAncestorPublicShare("FOLDER", context.resourceId)) return true;
      if (await this.hasDescendantShareInFolder(userId, context.resourceId)) return true;
      return false;
    }

    if (context.resourceType === "FILE") {
      const file = await this.prisma.file.findUnique({
        where: { id: context.resourceId },
        select: { folderId: true },
      });
      if (!file) return false;
      const folder = await this.prisma.folder.findUnique({
        where: { id: file.folderId },
        select: { dataRoomId: true },
      });
      if (!folder) return false;
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: folder.dataRoomId },
        select: { ownerId: true },
      });
      if (!room) return false;
      if (room.ownerId === userId) return true;
      if (await this.hasAncestorPrivateShare(userId, "FILE", context.resourceId)) return true;
      if (await this.hasAncestorPublicShare("FILE", context.resourceId)) return true;
      return false;
    }

    return false;
  }

  async canWrite(userId: string, context: ResourceContext): Promise<boolean> {
    if (context.resourceType === "DATA_ROOM") {
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: context.resourceId },
        select: { ownerId: true },
      });
      return room ? room.ownerId === userId : false;
    }

    if (context.resourceType === "FOLDER") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: context.resourceId },
        select: { dataRoomId: true },
      });
      if (!folder) return false;
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: folder.dataRoomId },
        select: { ownerId: true },
      });
      return room ? room.ownerId === userId : false;
    }

    if (context.resourceType === "FILE") {
      const file = await this.prisma.file.findUnique({
        where: { id: context.resourceId },
        select: { folder: { select: { dataRoomId: true } } },
      });
      if (!file) return false;
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: file.folder.dataRoomId },
        select: { ownerId: true },
      });
      return room ? room.ownerId === userId : false;
    }

    return false;
  }

  async canShare(userId: string, context: ResourceContext): Promise<boolean> {
    return this.canWrite(userId, context);
  }

  async assertRead(userId: string, context: ResourceContext): Promise<void> {
    const allowed = await this.canRead(userId, context);
    if (!allowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "You do not have permission to access this resource.",
      });
    }
  }

  async assertWrite(userId: string, context: ResourceContext): Promise<void> {
    const allowed = await this.canWrite(userId, context);
    if (!allowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "You do not have permission to modify this resource.",
      });
    }
  }

  async assertShare(userId: string, context: ResourceContext): Promise<void> {
    const allowed = await this.canShare(userId, context);
    if (!allowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "You do not have permission to share this resource.",
      });
    }
  }

  private async hasAncestorPrivateShare(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const share = await this.prisma.share.findFirst({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
        resourceType,
        resourceId,
      },
    });
    if (share) return true;

    let ancestorResourceType: ResourceType;
    let ancestorResourceId: string;

    if (resourceType === "FILE") {
      const file = await this.prisma.file.findUnique({
        where: { id: resourceId },
        select: { folderId: true },
      });
      if (!file) return false;
      ancestorResourceType = "FOLDER";
      ancestorResourceId = file.folderId;
    } else if (resourceType === "FOLDER") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId },
        select: { dataRoomId: true, parentId: true },
      });
      if (!folder) return false;
      ancestorResourceType = "DATA_ROOM";
      ancestorResourceId = folder.dataRoomId;
    } else {
      return false;
    }

    return this.hasAncestorPrivateShare(
      userId,
      ancestorResourceType,
      ancestorResourceId,
    );
  }

  private async hasAncestorPublicShare(
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const share = await this.prisma.share.findFirst({
      where: {
        accessType: "PUBLIC",
        revokedAt: null,
        resourceType,
        resourceId,
      },
    });
    if (share) return true;

    let ancestorResourceType: ResourceType;
    let ancestorResourceId: string;

    if (resourceType === "FILE") {
      const file = await this.prisma.file.findUnique({
        where: { id: resourceId },
        select: { folderId: true },
      });
      if (!file) return false;
      ancestorResourceType = "FOLDER";
      ancestorResourceId = file.folderId;
    } else if (resourceType === "FOLDER") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId },
        select: { dataRoomId: true, parentId: true },
      });
      if (!folder) return false;
      ancestorResourceType = "DATA_ROOM";
      ancestorResourceId = folder.dataRoomId;
    } else {
      return false;
    }

    return this.hasAncestorPublicShare(ancestorResourceType, ancestorResourceId);
  }

  async hasDescendantShareInRoom(
    userId: string,
    roomId: string,
  ): Promise<boolean> {
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId },
      select: { id: true },
    });
    const folderIds = folders.map((f) => f.id);

    const folderShare = await this.prisma.share.findFirst({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
        resourceType: "FOLDER",
        resourceId: { in: folderIds },
      },
    });
    if (folderShare) return true;

    const files = await this.prisma.file.findMany({
      where: { folder: { dataRoomId: roomId } },
      select: { id: true },
    });
    const fileIds = files.map((f) => f.id);

    const fileShare = await this.prisma.share.findFirst({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
        resourceType: "FILE",
        resourceId: { in: fileIds },
      },
    });
    if (fileShare) return true;

    return false;
  }

  async hasDescendantShareInFolder(
    userId: string,
    folderId: string,
  ): Promise<boolean> {
    const descendantFolderIds = await this.getDescendantFolderIds(folderId);
    const allFolderIds = [folderId, ...descendantFolderIds];

    const folderShare = await this.prisma.share.findFirst({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
        resourceType: "FOLDER",
        resourceId: { in: allFolderIds },
      },
    });
    if (folderShare) return true;

    const files = await this.prisma.file.findMany({
      where: { folderId: { in: allFolderIds } },
      select: { id: true },
    });
    const fileIds = files.map((f) => f.id);

    const fileShare = await this.prisma.share.findFirst({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
        resourceType: "FILE",
        resourceId: { in: fileIds },
      },
    });
    if (fileShare) return true;

    return false;
  }

  async getDescendantFolderIds(folderId: string): Promise<string[]> {
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
