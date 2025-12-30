import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export enum ProgramStatus {
  DEPLOYING = "deploying",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEPRECATED = "deprecated",
}

export enum ProgramType {
  SYSTEM = "system",
  TOKEN = "token",
  CUSTOM = "custom",
  LIBRARY = "library",
}

@Entity("programs")
@Index(["programId"], { unique: true })
@Index(["owner"])
export class Program {
  @ApiProperty({
    description: "Unique identifier for the program record",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: "Solana program ID (public key)",
    example: "11111111111111111111111111111112",
  })
  @Column({ name: "program_id", unique: true })
  @Index()
  programId: string;

  @ApiProperty({
    description: "Program owner/upgrade authority",
    example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  })
  @Column({ name: "owner" })
  owner: string;

  @ApiProperty({
    description: "Program name",
    example: "My Custom Program",
  })
  @Column({ name: "name" })
  name: string;

  @ApiProperty({
    description: "Program description",
    example: "A custom program for token management",
  })
  @Column({ name: "description", nullable: true })
  description?: string;

  @ApiProperty({
    description: "Program type",
    enum: ProgramType,
    example: ProgramType.CUSTOM,
  })
  @Column({
    name: "program_type",
    type: "enum",
    enum: ProgramType,
    default: ProgramType.CUSTOM,
  })
  programType: ProgramType;

  @ApiProperty({
    description: "Current program status",
    enum: ProgramStatus,
    example: ProgramStatus.ACTIVE,
  })
  @Column({
    name: "status",
    type: "enum",
    enum: ProgramStatus,
    default: ProgramStatus.DEPLOYING,
  })
  status: ProgramStatus;

  @ApiProperty({
    description: "Program bytecode (base64 encoded)",
    example: "AGFzbQEAAAAB...",
  })
  @Column({ name: "bytecode", type: "text", nullable: true })
  bytecode?: string;

  @ApiProperty({
    description: "Program size in bytes",
    example: 12345,
  })
  @Column({ name: "size_bytes", type: "bigint", default: 0 })
  sizeBytes: number;

  @ApiProperty({
    description: "Deployment slot number",
    example: 123456789,
  })
  @Column({ name: "deployment_slot", type: "bigint", nullable: true })
  deploymentSlot?: number;

  @ApiProperty({
    description: "Program version",
    example: "1.0.0",
  })
  @Column({ name: "version", default: "1.0.0" })
  version: string;

  @ApiProperty({
    description: "Maximum compute units per instruction",
    example: 200000,
  })
  @Column({ name: "max_compute_units", type: "int", default: 200000 })
  maxComputeUnits: number;

  @ApiProperty({
    description: "Metadata JSON",
    example:
      '{"author": "John Doe", "repository": "https://github.com/example"}',
  })
  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: "Creation timestamp",
  })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
  })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
