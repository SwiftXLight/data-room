import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { RoomsService } from "./rooms.service";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("rooms")
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list(@Request() req: any) {
    return this.roomsService.listForUser(req.user.id);
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user.id, dto);
  }

  @Get(":roomId")
  async get(@Request() req: any, @Param("roomId") roomId: string) {
    return this.roomsService.getById(req.user.id, roomId);
  }
}
