import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
} from "class-validator";
import { FilterType, FilterStatus } from "../event-filter.entity";

export class CreateEventFilterDto {
  @IsString()
  ownerId: string;

  @IsEnum(FilterType)
  filterType: FilterType;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  programId?: string;

  @IsObject()
  criteria: any;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateEventFilterDto {
  @IsOptional()
  @IsObject()
  criteria?: any;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(FilterStatus)
  status?: FilterStatus;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
