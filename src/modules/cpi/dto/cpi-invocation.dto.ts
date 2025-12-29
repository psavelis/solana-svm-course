import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateCpiInvocationDto {
  @IsString()
  transactionId: string;

  @IsString()
  callerProgramId: string;

  @IsString()
  targetProgramId: string;

  @IsOptional()
  @IsString()
  instructionName?: string;

  @IsObject()
  instructionData: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountMetaDto)
  accounts?: AccountMetaDto[];

  @IsOptional()
  @IsString()
  status?: string;
}

export class AccountMetaDto {
  @IsString()
  pubkey: string;

  @IsBoolean()
  isSigner: boolean;

  @IsBoolean()
  isWritable: boolean;
}
