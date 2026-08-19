import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuthorizationService,
  ResourceContext,
} from "../common/authorization.service";
import { CreateRoomDto } from "./dto/create-room.dto";

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async listForUser(userId: string) {
    const owned = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const shared = await this.prisma.share.findMany({
      where: {
        recipientUserId: userId,
        accessType: "PRIVATE",
        revokedAt: null,
        resourceType: "DATA_ROOM",
      },
      select: { resourceId: true },
    });

    const sharedRoomIds = shared.map((s) => s.resourceId);
    const accessible = await this.prisma.dataRoom.findMany({
      where: { id: { in: sharedRoomIds } },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return [...owned, ...accessible];
  }

  async getById(userId: string, roomId: string) {
    const context: ResourceContext = {
      resourceType: "DATA_ROOM",
      resourceId: roomId,
    };
    await this.authorizationService.assertRead(userId, context);

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!room) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: "Data Room not found.",
      });
    }

    const rootFolder = await this.prisma.folder.findFirst({
      where: { dataRoomId: room.id, parentId: null },
      select: { id: true },
    });

    return {
      ...room,
      rootFolderId: rootFolder?.id ?? null,
    };
  }

  async create(userId: string, dto: CreateRoomDto) {
    const room = await this.prisma.dataRoom.create({
      data: {
        name: dto.name,
        ownerId: userId,
        folders: {
          create: {
            name: dto.name,
            parentId: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const rootFolder = await this.prisma.folder.findFirst({
      where: { dataRoomId: room.id, parentId: null },
      select: { id: true },
    });

    return {
      ...room,
      rootFolderId: rootFolder?.id ?? null,
    };
  }
}
