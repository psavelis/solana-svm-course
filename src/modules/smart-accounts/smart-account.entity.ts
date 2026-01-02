import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SmartAccountStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  DISABLED = 'disabled',
}

@Entity('smart_accounts')
export class SmartAccount {
  /**
   * unique identifier for the smart account record
   * usage: internal database reference
   * example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @ApiProperty({
    description: 'Unique identifier for the smart account record',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * address of the owner (EOA or another smart account)
   * usage: controls the smart account
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @ApiProperty({
    description: 'Address of the owner (EOA or another smart account)',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  })
  @Column()
  ownerAddress: string;

  /**
   * address of the smart account on-chain
   * usage: the address used for transactions and holding assets
   * example: "3x4y5z6a-7b8c-9d0e-1f2g-3h4i5j6k7l8m"
   * reference: https://solana.com/docs/core/accounts
   */
  @ApiProperty({
    description: 'Address of the smart account on-chain',
    example: '3x4y5z6a-7b8c-9d0e-1f2g-3h4i5j6k7l8m',
  })
  @Column({ unique: true })
  smartAccountAddress: string;

  /**
   * current status of the smart account
   * usage: lifecycle management
   * example: "active"
   * reference: none
   */
  @ApiProperty({
    description: 'Current status of the smart account',
    enum: SmartAccountStatus,
    example: SmartAccountStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: SmartAccountStatus,
    default: SmartAccountStatus.ACTIVE,
  })
  status: SmartAccountStatus;

  /**
   * governance rules for the smart account
   * usage: defines spending limits and allowed interactions
   * example: { "maxDailySpend": 100, "requiredSigners": 2 }
   * reference: none
   */
  @ApiProperty({
    description: 'Governance rules for the smart account',
    example: { maxDailySpend: 100, requiredSigners: 2 },
  })
  @Column('jsonb', { default: {} })
  rules: {
    maxDailySpend?: number;
    allowedPrograms?: string[];
    requiredSigners?: number;
  };

  /**
   * timestamp when the smart account was created
   * usage: audit trail
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @ApiProperty({
    description: 'Timestamp when the smart account was created',
    example: '2024-01-01T00:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the smart account was last updated
   * usage: audit trail
   * example: "2024-01-02T12:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @ApiProperty({
    description: 'Timestamp when the smart account was last updated',
    example: '2024-01-02T12:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
