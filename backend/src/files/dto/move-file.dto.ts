import { IsString } from "class-validator";

export class MoveFileDto {
  @IsString()
  destinationFolderId: string;
}
