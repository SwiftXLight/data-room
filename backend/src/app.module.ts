import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { RoomsModule } from "./rooms/rooms.module";
import { FoldersModule } from "./folders/folders.module";
import { FilesModule } from "./files/files.module";
import { StorageModule } from "./storage/storage.module";
import { SharesModule } from "./shares/shares.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    RoomsModule,
    FoldersModule,
    FilesModule,
    StorageModule,
    SharesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
