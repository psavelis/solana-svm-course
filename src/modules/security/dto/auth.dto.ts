import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
} from "class-validator";
import { UserRole } from "../entities/user.entity";

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["read", "write", "admin"])
  permission?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO date string
}

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["active", "inactive", "revoked"])
  status?: string;

  @IsOptional()
  @IsEnum(["read", "write", "admin"])
  permission?: string;
}
