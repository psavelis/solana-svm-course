import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mintAddress: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column({ type: 'int' })
  decimals: number;

  @Column({ nullable: true })
  supply: string;

  @Column({ nullable: true })
  owner: string;

  @Column({ default: false })
  isNft: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}