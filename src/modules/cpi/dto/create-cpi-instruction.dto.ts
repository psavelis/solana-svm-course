import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCpiInstructionDto {
  @IsString()
  programId: string;

  @IsString()
  callerProgramId: string;

  @IsObject()
  instructionData: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountMetaDto)
  accounts?: AccountMetaDto[];

  @IsOptional()
  @IsString()
  methodName?: string;

  @IsOptional()
  @IsBoolean()
  requiresPermission?: boolean;

  @IsOptional()
  @IsString()
  permissionProgramId?: string;

  @IsOptional()
  @IsString()
  permissionLevel?: string;
}

export class AccountMetaDto {
  @IsString()
  pubkey: string;

  @IsBoolean()
  isSigner: boolean;

  @IsBoolean()
  isWritable: boolean;
}
