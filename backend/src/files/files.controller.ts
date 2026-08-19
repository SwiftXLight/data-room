import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { FilesService } from "./files.service";
import { UploadUrlDto } from "./dto/upload-url.dto";
import { RenameFileDto } from "./dto/rename-file.dto";
import { MoveFileDto } from "./dto/move-file.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("files")
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-url")
  async requestUploadUrl(@Request() req: any, @Body() dto: UploadUrlDto) {
    return this.filesService.requestUploadUrl(req.user.id, dto);
  }

  @Post(":fileId/complete")
  async completeUpload(@Request() req: any, @Param("fileId") fileId: string) {
    return this.filesService.completeUpload(req.user.id, fileId);
  }

  @Get(":fileId/view")
  async getViewUrl(@Request() req: any, @Param("fileId") fileId: string) {
    return this.filesService.getViewUrl(req.user.id, fileId);
  }

  @Patch(":fileId")
  async rename(
    @Request() req: any,
    @Param("fileId") fileId: string,
    @Body() dto: RenameFileDto,
  ) {
    return this.filesService.renameFile(req.user.id, fileId, dto);
  }

  @Post(":fileId/move")
  async move(
    @Request() req: any,
    @Param("fileId") fileId: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.filesService.moveFile(req.user.id, fileId, dto);
  }

  @Delete(":fileId")
  async delete(@Request() req: any, @Param("fileId") fileId: string) {
    await this.filesService.deleteFile(req.user.id, fileId);
    return {};
  }
}
