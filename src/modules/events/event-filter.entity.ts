import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum FilterType {
  ACCOUNT = "account",
  PROGRAM = "program",
  TRANSACTION = "transaction",
  SLOT = "slot",
  BLOCK = "block",
}

export enum FilterStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("event_filters")
@Index(["filterType"])
@Index(["ownerId"])
@Index(["status"])
export class EventFilter {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  @Index()
  ownerId: string; // User or client that owns this filter

  @Column({
    type: "enum",
    enum: FilterType,
  })
  filterType: FilterType;

  @Column({ type: "varchar", length: 88, nullable: true })
  accountId?: string; // For account-specific filters

  @Column({ type: "varchar", length: 88, nullable: true })
  programId?: string; // For program-specific filters

  @Column({ type: "jsonb" })
  criteria: any; // Filter criteria (e.g., { minAmount: 1000, tokenMint: '...' })

  @Column({ type: "varchar", length: 255, nullable: true })
  name?: string; // Human-readable name

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "enum",
    enum: FilterStatus,
    default: FilterStatus.ACTIVE,
  })
  status: FilterStatus;

  @Column({ type: "boolean", default: false })
  isPublic: boolean; // Whether other users can use this filter

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
