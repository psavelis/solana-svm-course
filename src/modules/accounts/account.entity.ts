import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("accounts")
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  address: string;

  @Column({ nullable: true })
  owner: string;

  @Column({ type: "bigint", default: 0 })
  balance: number;

  @Column({ default: false })
  isPda: boolean;

  @Column({ nullable: true })
  programId: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
