import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Program } from '../svm/program.entity';
import { RuntimeExecution } from '../svm/runtime-execution.entity';

@Entity('cpi_invocations')
export class CpiInvocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 88 })
  @Index()
  transactionId: string;

  @Column({ type: 'varchar', length: 88 })
  @Index()
  callerProgramId: string;

  @Column({ type: 'varchar', length: 88 })
  @Index()
  targetProgramId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  instructionName: string;

  @Column({ type: 'jsonb' })
  instructionData: any;

  @Column({ type: 'jsonb', nullable: true })
  accounts: any[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  status: string; // 'pending', 'success', 'failed'

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'bigint', nullable: true })
  gasUsed: number;

  @Column({ type: 'jsonb', nullable: true })
  returnData: any; // Data returned from the CPI call

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'callerProgramId' })
  callerProgram: Program;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'targetProgramId' })
  targetProgram: Program;

  @ManyToOne(() => RuntimeExecution)
  @JoinColumn({ name: 'transactionId' })
  execution: RuntimeExecution;
}