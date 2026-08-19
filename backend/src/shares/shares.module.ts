import { Module } from "@nestjs/common";
import { SharesService } from "./shares.service";
import { SharesController } from "./shares.controller";
import { PublicSharesController } from "./public-shares.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [PrismaModule, CommonModule, StorageModule],
  controllers: [SharesController, PublicSharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule {}
