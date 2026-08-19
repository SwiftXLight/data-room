import { IsString, MinLength, MaxLength, IsUUID } from "class-validator";

export class UploadUrlDto {
  @IsUUID()
  folderId: string;

  @IsString()
  @MinLength(1, { message: "name must not be empty." })
  @MaxLength(255, { message: "name must not exceed 255 characters." })
  name: string;

  @IsString()
  mimeType: string;

  @IsString()
  sizeBytes: string;
}

export class RenameFileDto {
  @IsString()
  @MinLength(1, { message: "name must not be empty." })
  @MaxLength(255, { message: "name must not exceed 255 characters." })
  name: string;
}

export class MoveFileDto {
  @IsString()
  destinationFolderId: string;
}
