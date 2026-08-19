import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { SharesService } from "./shares.service";
import { CreateShareDto } from "./dto/create-share.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("shares")
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateShareDto) {
    return this.sharesService.createShare(req.user.id, dto);
  }

  @Get()
  async list(
    @Request() req: any,
    @Query("resourceType") resourceType?: string,
    @Query("resourceId") resourceId?: string,
  ) {
    return this.sharesService.listShares(req.user.id, resourceType, resourceId);
  }

  @Get("room/:roomId")
  async listForRoom(@Request() req: any, @Param("roomId") roomId: string) {
    return this.sharesService.listSharesForRoom(req.user.id, roomId);
  }

  @Get("with-me")
  async sharedWithMe(@Request() req: any) {
    return this.sharesService.getSharedWithMe(req.user.id);
  }

  @Delete(":shareId")
  async revoke(@Request() req: any, @Param("shareId") shareId: string) {
    await this.sharesService.revokeShare(req.user.id, shareId);
    return {};
  }
}
