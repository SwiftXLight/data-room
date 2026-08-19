import {
  IsString,
  IsUUID,
  IsIn,
  IsEmail,
  IsNotEmpty,
  IsOptional,
} from "class-validator";

export class CreateShareDto {
  @IsString()
  @IsIn(["DATA_ROOM", "FOLDER", "FILE"])
  @IsNotEmpty()
  resourceType: string;

  @IsUUID()
  @IsNotEmpty()
  resourceId: string;

  @IsString()
  @IsIn(["PRIVATE", "PUBLIC"])
  @IsNotEmpty()
  accessType: string;

  @IsString()
  @IsIn(["VIEWER"])
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;
}
