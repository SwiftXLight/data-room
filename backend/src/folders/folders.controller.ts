import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { FoldersService } from "./folders.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { RenameFolderDto } from "./dto/rename-folder.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("folders")
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get(":folderId/contents")
  async getContents(
    @Request() req: any,
    @Param("folderId") folderId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    const resolvedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.foldersService.getContents(
      req.user.id,
      folderId,
      resolvedLimit,
      cursor,
    );
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateFolderDto) {
    return this.foldersService.createFolder(req.user.id, dto);
  }

  @Patch(":folderId")
  async rename(
    @Request() req: any,
    @Param("folderId") folderId: string,
    @Body() dto: RenameFolderDto,
  ) {
    return this.foldersService.renameFolder(req.user.id, folderId, dto);
  }

  @Delete(":folderId")
  async delete(@Request() req: any, @Param("folderId") folderId: string) {
    await this.foldersService.deleteFolder(req.user.id, folderId);
    return {};
  }
}
