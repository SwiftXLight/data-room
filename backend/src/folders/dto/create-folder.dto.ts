import { IsString, MinLength, MaxLength, IsUUID } from "class-validator";

export class CreateFolderDto {
  @IsString()
  @MinLength(1, { message: "name must not be empty." })
  @MaxLength(255, { message: "name must not exceed 255 characters." })
  name: string;

  @IsUUID()
  parentId: string;
}

export class RenameFolderDto {
  @IsString()
  @MinLength(1, { message: "name must not be empty." })
  @MaxLength(255, { message: "name must not exceed 255 characters." })
  name: string;
}
