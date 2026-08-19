import { IsString, MinLength, MaxLength } from "class-validator";

export class RenameFileDto {
  @IsString()
  @MinLength(1, { message: "name must not be empty." })
  @MaxLength(255, { message: "name must not exceed 255 characters." })
  name: string;
}
