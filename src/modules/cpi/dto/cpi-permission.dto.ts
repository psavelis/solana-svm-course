import { IsString, IsOptional, IsBoolean, IsObject, IsDateString } from 'class-validator';

export class CreateCpiPermissionDto {
  @IsString()
  programId: string;

  @IsString()
  granterProgramId: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsString()
  permissionType: string;

  @IsOptional()
  @IsObject()
  constraints?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateCpiPermissionDto {
  @IsOptional()
  @IsString()
  permissionType?: string;

  @IsOptional()
  @IsObject()
  constraints?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
