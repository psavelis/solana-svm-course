import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class GetFeeEstimateDto {
  @IsOptional()
  @IsString()
  transactionData?: string; // Base64 encoded transaction (optional)
}

export class UserFeePreferencesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFeeLamports?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  targetSuccessRate?: number;

  @IsOptional()
  @IsEnum(['slow', 'normal', 'fast', 'urgent'])
  speed?: 'slow' | 'normal' | 'fast' | 'urgent';

  @IsOptional()
  @IsEnum(['conservative', 'moderate', 'aggressive'])
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}

export class GetFeeRecommendationsDto {
  @IsOptional()
  @IsString()
  transactionData?: string; // Base64 encoded transaction (optional)

  @IsOptional()
  @IsEnum(['min', 'low', 'medium', 'high', 'veryHigh', 'unsafeMax'])
  priorityLevel?: 'min' | 'low' | 'medium' | 'high' | 'veryHigh' | 'unsafeMax';

  @IsOptional()
  includeVotes?: boolean;
}

export class ValidateFeeDto {
  @IsOptional()
  baseFee?: number;

  @IsOptional()
  priorityFee?: number;

  @IsOptional()
  totalFee?: number;

  @IsOptional()
  computeUnits?: number;

  @IsOptional()
  @IsString()
  feePayer?: string;
}

export class OptimizeFeeDto {
  @IsString()
  transactionData: string; // Base64 encoded transaction (required)

  @IsOptional()
  userPreferences?: UserFeePreferencesDto;
}

export class GetHistoricalAnalysisDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168) // Max 1 week
  hours?: number;
}
