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
      return this.hasAncestorShare(userId, "DATA_ROOM", context.resourceId);
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
      return this.hasAncestorShare(userId, "FOLDER", context.resourceId);
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
      return this.hasAncestorShare(userId, "FILE", context.resourceId);
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

  private async hasAncestorShare(
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

    return this.hasAncestorShare(
      userId,
      ancestorResourceType,
      ancestorResourceId,
    );
  }
}
