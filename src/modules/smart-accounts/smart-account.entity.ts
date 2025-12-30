import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum SmartAccountStatus {
  ACTIVE = "active",
  FROZEN = "frozen",
  DISABLED = "disabled",
}

@Entity("smart_accounts")
export class SmartAccount {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  ownerAddress: string;

  @Column({ unique: true })
  smartAccountAddress: string;

  @Column({
    type: "enum",
    enum: SmartAccountStatus,
    default: SmartAccountStatus.ACTIVE,
  })
  status: SmartAccountStatus;

  @Column("jsonb", { default: {} })
  rules: {
    maxDailySpend?: number;
    allowedPrograms?: string[];
    requiredSigners?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
