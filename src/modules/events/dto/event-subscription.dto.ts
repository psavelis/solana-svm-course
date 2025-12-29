import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
} from "class-validator";
import { SubscriptionType } from "../event-subscription.entity";

export class CreateEventSubscriptionDto {
  @IsString()
  clientId: string;

  @IsString()
  eventType: string;

  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType;

  @IsOptional()
  @IsObject()
  filters?: any;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateEventSubscriptionDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsObject()
  filters?: any;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
