import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { EventType } from "../event.entity";

export class CreateEventDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsString()
  source: string;

  @IsObject()
  data: any;

  @IsOptional()
  @IsString()
  slot?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsString()
  status?: string;
}
