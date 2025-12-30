import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Program } from '../svm/program.entity';

@Entity('cpi_instructions')
export class CpiInstruction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 88 })
  programId: string; // The program being invoked

  @Column({ type: 'varchar', length: 88 })
  callerProgramId: string; // The program making the CPI call

  @Column({ type: 'jsonb' })
  instructionData: any; // The instruction data for the CPI

  @Column({ type: 'jsonb', nullable: true })
  accounts: any[]; // Account metas for the instruction

  @Column({ type: 'varchar', length: 64, nullable: true })
  methodName: string; // The method being called (for logging/debugging)

  @Column({ type: 'boolean', default: false })
  requiresPermission: boolean;

  @Column({ type: 'varchar', length: 88, nullable: true })
  permissionProgramId: string; // Program that manages permissions

  @Column({ type: 'varchar', length: 64, nullable: true })
  permissionLevel: string; // e.g., 'read', 'write', 'admin'

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'programId' })
  program: Program;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'callerProgramId' })
  callerProgram: Program;
}