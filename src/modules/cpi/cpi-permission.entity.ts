import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Program } from '../svm/program.entity';

@Entity('cpi_permissions')
export class CpiPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 88 })
  @Index()
  programId: string; // Program being granted permission

  @Column({ type: 'varchar', length: 88 })
  @Index()
  granterProgramId: string; // Program granting the permission

  @Column({ type: 'varchar', length: 88, nullable: true })
  @Index()
  accountId: string; // Specific account if permission is account-specific

  @Column({ type: 'varchar', length: 64 })
  permissionType: string; // e.g., 'invoke', 'read', 'write', 'admin'

  @Column({ type: 'jsonb', nullable: true })
  constraints: any; // Additional constraints on the permission

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Optional expiration

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'programId' })
  program: Program;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'granterProgramId' })
  granterProgram: Program;
}