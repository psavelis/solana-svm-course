import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsArray, IsOptional, IsNumber } from "class-validator";

export class ProgramInvocationDto {
  @ApiProperty({
    description: "Private key of the signer in JSON array format",
    example: "[174,47,154,16,...]",
  })
  @IsString()
  privateKey: string;

  @ApiProperty({
    description: "Program ID to invoke",
    example: "11111111111111111111111111111112",
  })
  @IsString()
  programId: string;

  @ApiProperty({
    description: "Instruction data as base64 encoded string",
    example: "AQAAAA==",
  })
  @IsString()
  data: string;

  @ApiProperty({
    description: "Accounts required by the instruction",
    type: "array",
    items: {
      type: "object",
      properties: {
        pubkey: { type: "string" },
        isSigner: { type: "boolean" },
        isWritable: { type: "boolean" },
      },
    },
  })
  @IsArray()
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;

  @ApiProperty({
    description: "Maximum compute units to allocate",
    example: 200000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  maxComputeUnits?: number;
}