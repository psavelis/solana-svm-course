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
  /**
   * unique identifier for the program record
   * usage: internal database reference
   * example: "123e4567-e89b-12d3-a456-426614174000"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @ApiProperty({
    description: "Unique identifier for the program record",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * solana program id (public key)
   * usage: uniquely identifies the executable program on-chain
   * example: "11111111111111111111111111111112"
   * reference: https://solana.com/docs/core/programs
   */
  @ApiProperty({
    description: "Solana program ID (public key)",
    example: "11111111111111111111111111111112",
  })
  @Column({ name: "program_id", unique: true })
  @Index()
  programId: string;

  /**
   * program owner/upgrade authority
   * usage: address authorized to upgrade the program
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/programs#upgrading
   */
  @ApiProperty({
    description: "Program owner/upgrade authority",
    example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  })
  @Column({ name: "owner" })
  owner: string;

  /**
   * program name
   * usage: human-readable name for display
   * example: "my custom program"
   * reference: none
   */
  @ApiProperty({
    description: "Program name",
    example: "My Custom Program",
  })
  @Column({ name: "name" })
  name: string;

  /**
   * program description
   * usage: detailed explanation of program functionality
   * example: "a custom program for token management"
   * reference: none
   */
  @ApiProperty({
    description: "Program description",
    example: "A custom program for token management",
  })
  @Column({ name: "description", nullable: true })
  description?: string;

  /**
   * program type
   * usage: categorizes the program (system, token, etc.)
   * example: "custom"
   * reference: none
   */
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

  /**
   * current program status
   * usage: tracks deployment lifecycle
   * example: "active"
   * reference: none
   */
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

  /**
   * program bytecode (base64 encoded)
   * usage: actual executable code deployed to the network
   * example: "AGFzbQEAAAAB..."
   * reference: https://solana.com/docs/core/programs#deployment
   */
  @ApiProperty({
    description: "Program bytecode (base64 encoded)",
    example: "AGFzbQEAAAAB...",
  })
  @Column({ name: "bytecode", type: "text", nullable: true })
  bytecode?: string;

  /**
   * program size in bytes
   * usage: calculates rent and storage requirements
   * example: 12345
   * reference: https://solana.com/docs/core/accounts#rent
   */
  @ApiProperty({
    description: "Program size in bytes",
    example: 12345,
  })
  @Column({ name: "size_bytes", type: "bigint", default: 0 })
  sizeBytes: number;

  /**
   * deployment slot number
   * usage: tracks when the program was deployed
   * example: 123456789
   * reference: https://solana.com/docs/core/slots
   */
  @ApiProperty({
    description: "Deployment slot number",
    example: 123456789,
  })
  @Column({ name: "deployment_slot", type: "bigint", nullable: true })
  deploymentSlot?: number;

  /**
   * program version
   * usage: semantic versioning for the program
   * example: "1.0.0"
   * reference: https://semver.org/
   */
  @ApiProperty({
    description: "Program version",
    example: "1.0.0",
  })
  @Column({ name: "version", default: "1.0.0" })
  version: string;

  /**
   * maximum compute units per instruction
   * usage: limits resource consumption
   * example: 200000
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @ApiProperty({
    description: "Maximum compute units per instruction",
    example: 200000,
  })
  @Column({ name: "max_compute_units", type: "int", default: 200000 })
  maxComputeUnits: number;

  /**
   * metadata json
   * usage: stores additional info like author or repo url
   * example: {"author": "john doe"}
   * reference: none
   */
  @ApiProperty({
    description: "Metadata JSON",
    example:
      '{"author": "John Doe", "repository": "https://github.com/example"}',
  })
  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  /**
   * creation timestamp
   * usage: audit trail
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @ApiProperty({
    description: "Creation timestamp",
  })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /**
   * last update timestamp
   * usage: audit trail
   * example: "2024-02-01T00:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @ApiProperty({
    description: "Last update timestamp",
  })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
