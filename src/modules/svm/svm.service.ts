import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program, ProgramStatus, ProgramType } from './program.entity';
import { RuntimeExecution, ExecutionStatus, ExecutionType } from './runtime-execution.entity';
import { GasMeter, GasMeterType, GasMeterStatus } from './gas-meter.entity';
import {
  CreateProgramDto,
  UpdateProgramDto,
  DeployProgramDto,
  ProgramQueryDto,
} from './dto/program.dto';
import {
  ExecuteProgramDto,
  ParallelExecutionDto,
  RuntimeExecutionQueryDto,
  ExecutionMetricsDto,
} from './dto/runtime-execution.dto';
import {
  CreateGasMeterDto,
  UpdateGasMeterDto,
  GasMeterQueryDto,
  GasUsageDto,
  ResetGasMeterDto,
} from './dto/gas-meter.dto';

@Injectable()
/**
 * Service for managing Solana Virtual Machine (SVM) execution and state.
 * @see docs/diagrams/09-svm.md
 */
export class SvmService {
  private readonly logger = new Logger(SvmService.name);
  private connection: Connection;

  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(RuntimeExecution)
    private executionRepository: Repository<RuntimeExecution>,
    @InjectRepository(GasMeter)
    private gasMeterRepository: Repository<GasMeter>,
  ) {
    // Initialize Solana connection
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // Program Management Methods

  async createProgram(dto: CreateProgramDto, owner: string): Promise<Program> {
    const program = this.programRepository.create({
      ...dto,
      owner,
      status: ProgramStatus.DEPLOYING,
      sizeBytes: dto.bytecode ? Buffer.from(dto.bytecode, 'base64').length : 0,
    });

    return this.programRepository.save(program);
  }

  async getProgram(id: string): Promise<Program> {
    const program = await this.programRepository.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }
    return program;
  }

  async getProgramByProgramId(programId: string): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { programId },
    });
    if (!program) {
      throw new NotFoundException(`Program with programId ${programId} not found`);
    }
    return program;
  }

  async updateProgram(id: string, dto: UpdateProgramDto): Promise<Program> {
    const program = await this.getProgram(id);
    Object.assign(program, dto);
    return this.programRepository.save(program);
  }

  async deleteProgram(id: string): Promise<void> {
    const program = await this.getProgram(id);
    await this.programRepository.remove(program);
  }

  async queryPrograms(query: ProgramQueryDto): Promise<{ programs: Program[]; total: number }> {
    const qb = this.programRepository.createQueryBuilder('program');

    if (query.programType) {
      qb.andWhere('program.programType = :programType', {
        programType: query.programType,
      });
    }

    if (query.status) {
      qb.andWhere('program.status = :status', { status: query.status });
    }

    if (query.owner) {
      qb.andWhere('program.owner = :owner', { owner: query.owner });
    }

    if (query.search) {
      qb.andWhere('(program.name ILIKE :search OR program.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();

    qb.orderBy('program.createdAt', 'DESC')
      .skip(query.page * query.limit)
      .take(query.limit);

    const programs = await qb.getMany();

    return { programs, total };
  }

  async deployProgram(id: string, dto: DeployProgramDto, signer: any): Promise<Program> {
    const program = await this.getProgram(id);

    try {
      // Decode bytecode
      const bytecode = Buffer.from(dto.bytecode, 'base64');

      // Create program account
      const programKeypair = signer; // Assume signer provides keypair for program account
      const programId = programKeypair.publicKey;

      // Create deployment transaction
      const transaction = new Transaction();

      // Add compute budget if specified
      if (dto.maxComputeUnits) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: dto.maxComputeUnits,
          }),
        );
      }

      // Deploy program (simplified - in reality this would be more complex)
      // This is a placeholder for actual program deployment logic
      const deployInstruction = SystemProgram.createAccount({
        fromPubkey: signer.publicKey,
        newAccountPubkey: programId,
        lamports: await this.connection.getMinimumBalanceForRentExemption(bytecode.length),
        space: bytecode.length,
        programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
      });

      transaction.add(deployInstruction);

      // Send transaction
      const signature = await sendAndConfirmTransaction(this.connection, transaction, [
        signer,
        programKeypair,
      ]);

      // Update program record
      program.programId = programId.toString();
      program.bytecode = dto.bytecode;
      program.sizeBytes = bytecode.length;
      program.status = ProgramStatus.ACTIVE;
      program.deploymentSlot = await this.connection.getSlot();

      return this.programRepository.save(program);
    } catch (error) {
      program.status = ProgramStatus.SUSPENDED;
      await this.programRepository.save(program);
      throw new BadRequestException(`Program deployment failed: ${error.message}`);
    }
  }

  // Runtime Execution Methods

  async executeProgram(dto: ExecuteProgramDto, signer: any): Promise<RuntimeExecution> {
    const program = await this.getProgramByProgramId(dto.programId);

    const execution = this.executionRepository.create({
      programId: dto.programId,
      executionType: ExecutionType.INSTRUCTION,
      status: ExecutionStatus.RUNNING,
      computeUnitsAllocated: dto.maxComputeUnits || program.maxComputeUnits,
      accountsAccessed: dto.accounts,
      metadata: dto.metadata,
    });

    const savedExecution = await this.executionRepository.save(execution);

    try {
      // Check gas meter if applicable
      await this.checkGasMeter(dto.programId, dto.maxComputeUnits || program.maxComputeUnits);

      const startTime = Date.now();

      // Create transaction with instruction
      const transaction = new Transaction();

      // Add compute budget
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: dto.maxComputeUnits || program.maxComputeUnits,
        }),
      );

      // Add priority fee if specified
      if (dto.priority && dto.priority > 1) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: dto.priority * 1000, // Simplified priority calculation
          }),
        );
      }

      // Create instruction (simplified)
      const instruction = {
        programId: new PublicKey(dto.programId),
        keys: dto.accounts.map((acc) => ({
          pubkey: new PublicKey(acc),
          isSigner: acc === signer.publicKey.toString(),
          isWritable: true, // Simplified
        })),
        data: Buffer.from(dto.instructionData, 'base64'),
      };

      transaction.add(instruction);

      // Send transaction
      const signature = await sendAndConfirmTransaction(this.connection, transaction, [signer]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Update execution record
      savedExecution.status = ExecutionStatus.SUCCESS;
      savedExecution.executionTimeMs = executionTime;
      savedExecution.computeUnitsUsed = Math.min(savedExecution.computeUnitsAllocated, 100000); // Simplified
      savedExecution.gasCost = savedExecution.computeUnitsUsed * 0.000001; // Simplified gas cost
      savedExecution.transactionId = signature;
      savedExecution.slotNumber = await this.connection.getSlot();

      // Consume gas
      await this.consumeGas(dto.programId, savedExecution.computeUnitsUsed);
    } catch (error) {
      savedExecution.status = ExecutionStatus.FAILED;
      savedExecution.errorMessage = error.message;
      this.logger.error(`Program execution failed: ${error.message}`, error.stack);
    }

    return this.executionRepository.save(savedExecution);
  }

  async executeParallel(dto: ParallelExecutionDto, signer: any): Promise<RuntimeExecution[]> {
    const executions: RuntimeExecution[] = [];

    // Validate total compute units
    const totalComputeUnits = dto.executions.reduce(
      (sum, exec) => sum + (exec.maxComputeUnits || 200000),
      0,
    );

    if (dto.maxTotalComputeUnits && totalComputeUnits > dto.maxTotalComputeUnits) {
      throw new BadRequestException('Total compute units exceed maximum allowed');
    }

    // Execute in parallel with Promise.allSettled for better error handling
    const results = await Promise.allSettled(
      dto.executions.map((exec) => this.executeProgram(exec, signer)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        executions.push(result.value);
      } else {
        this.logger.error(`Parallel execution failed: ${result.reason}`);
        if (!dto.continueOnFailure) {
          throw result.reason;
        }
        // Create failed execution record
        const failedExecution = this.executionRepository.create({
          programId: 'unknown',
          executionType: ExecutionType.INSTRUCTION,
          status: ExecutionStatus.FAILED,
          errorMessage: result.reason.message,
        });
        executions.push(await this.executionRepository.save(failedExecution));
      }
    }

    return executions;
  }

  async getExecution(id: string): Promise<RuntimeExecution> {
    const execution = await this.executionRepository.findOne({
      where: { id },
      relations: ['program'],
    });
    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }
    return execution;
  }

  async queryExecutions(
    query: RuntimeExecutionQueryDto,
  ): Promise<{ executions: RuntimeExecution[]; total: number }> {
    const qb = this.executionRepository
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.program', 'program');

    if (query.programId) {
      qb.andWhere('execution.programId = :programId', {
        programId: query.programId,
      });
    }

    if (query.transactionId) {
      qb.andWhere('execution.transactionId = :transactionId', {
        transactionId: query.transactionId,
      });
    }

    if (query.status) {
      qb.andWhere('execution.status = :status', { status: query.status });
    }

    if (query.executionType) {
      qb.andWhere('execution.executionType = :executionType', {
        executionType: query.executionType,
      });
    }

    if (query.startDate) {
      qb.andWhere('execution.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      qb.andWhere('execution.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    if (query.minComputeUnits) {
      qb.andWhere('execution.computeUnitsUsed >= :minComputeUnits', {
        minComputeUnits: query.minComputeUnits,
      });
    }

    if (query.maxComputeUnits) {
      qb.andWhere('execution.computeUnitsUsed <= :maxComputeUnits', {
        maxComputeUnits: query.maxComputeUnits,
      });
    }

    const total = await qb.getCount();

    qb.orderBy('execution.createdAt', 'DESC')
      .skip(query.page * query.limit)
      .take(query.limit);

    const executions = await qb.getMany();

    return { executions, total };
  }

  async getExecutionMetrics(dto: ExecutionMetricsDto): Promise<any> {
    const startDate = new Date(Date.now() - dto.timeRangeHours * 60 * 60 * 1000);

    const qb = this.executionRepository
      .createQueryBuilder('execution')
      .where('execution.createdAt >= :startDate', { startDate });

    if (dto.groupByProgram) {
      qb.select([
        'execution.programId',
        'COUNT(*) as totalExecutions',
        'AVG(execution.computeUnitsUsed) as avgComputeUnits',
        'SUM(execution.computeUnitsUsed) as totalComputeUnits',
        'SUM(execution.gasCost) as totalGasCost',
        'AVG(execution.executionTimeMs) as avgExecutionTime',
      ])
        .groupBy('execution.programId')
        .orderBy('totalExecutions', 'DESC');
    } else {
      qb.select([
        'COUNT(*) as totalExecutions',
        'AVG(execution.computeUnitsUsed) as avgComputeUnits',
        'SUM(execution.computeUnitsUsed) as totalComputeUnits',
        'SUM(execution.gasCost) as totalGasCost',
        'AVG(execution.executionTimeMs) as avgExecutionTime',
        'MIN(execution.createdAt) as firstExecution',
        'MAX(execution.createdAt) as lastExecution',
      ]);
    }

    const metrics = await qb.getRawMany();
    return metrics;
  }

  // Gas Metering Methods

  async createGasMeter(dto: CreateGasMeterDto): Promise<GasMeter> {
    const meter = this.gasMeterRepository.create({
      ...dto,
      gasRemaining: dto.gasAllocated,
      gasUsed: 0,
      operationCount: 0,
      averageGasPerOperation: 0,
      peakGasUsage: 0,
      efficiencyRating: 100,
      alertThresholdPercent: dto.alertThresholdPercent || 80,
      autoPauseOnThreshold: dto.autoPauseOnThreshold || false,
    });

    return this.gasMeterRepository.save(meter);
  }

  async getGasMeter(id: string): Promise<GasMeter> {
    const meter = await this.gasMeterRepository.findOne({ where: { id } });
    if (!meter) {
      throw new NotFoundException(`Gas meter with ID ${id} not found`);
    }
    return meter;
  }

  async updateGasMeter(id: string, dto: UpdateGasMeterDto): Promise<GasMeter> {
    const meter = await this.getGasMeter(id);

    if (dto.addGasAllocation) {
      meter.gasAllocated += dto.addGasAllocation;
      meter.gasRemaining += dto.addGasAllocation;
    }

    Object.assign(meter, dto);
    return this.gasMeterRepository.save(meter);
  }

  async deleteGasMeter(id: string): Promise<void> {
    const meter = await this.getGasMeter(id);
    await this.gasMeterRepository.remove(meter);
  }

  async queryGasMeters(query: GasMeterQueryDto): Promise<{ meters: GasMeter[]; total: number }> {
    const qb = this.gasMeterRepository.createQueryBuilder('meter');

    if (query.programId) {
      qb.andWhere('meter.programId = :programId', {
        programId: query.programId,
      });
    }

    if (query.accountId) {
      qb.andWhere('meter.accountId = :accountId', {
        accountId: query.accountId,
      });
    }

    if (query.meterType) {
      qb.andWhere('meter.meterType = :meterType', {
        meterType: query.meterType,
      });
    }

    if (query.status) {
      qb.andWhere('meter.status = :status', { status: query.status });
    }

    if (query.usageThresholdPercent) {
      const usagePercent = query.usageThresholdPercent;
      qb.andWhere('(meter.gasUsed * 100 / meter.gasAllocated) >= :usagePercent', { usagePercent });
    }

    const total = await qb.getCount();

    qb.orderBy('meter.createdAt', 'DESC')
      .skip(query.page * query.limit)
      .take(query.limit);

    const meters = await qb.getMany();

    return { meters, total };
  }

  async consumeGas(identifier: string, gasAmount: number, operation?: string): Promise<void> {
    // Find gas meter by program ID or account ID
    const meter = await this.gasMeterRepository.findOne({
      where: [{ programId: identifier }, { accountId: identifier }],
    });

    if (!meter) {
      return; // No meter found, allow execution
    }

    if (meter.status !== GasMeterStatus.ACTIVE) {
      throw new BadRequestException(`Gas meter is ${meter.status}`);
    }

    if (meter.gasRemaining < gasAmount) {
      if (meter.autoPauseOnThreshold) {
        meter.status = GasMeterStatus.EXCEEDED;
        await this.gasMeterRepository.save(meter);
      }
      throw new BadRequestException('Insufficient gas remaining');
    }

    // Update meter
    meter.gasUsed += gasAmount;
    meter.gasRemaining -= gasAmount;
    meter.operationCount += 1;
    meter.averageGasPerOperation = meter.gasUsed / meter.operationCount;
    meter.peakGasUsage = Math.max(meter.peakGasUsage, gasAmount);
    meter.efficiencyRating = Math.max(0, 100 - (meter.gasUsed * 100) / meter.gasAllocated);

    // Check threshold
    const usagePercent = (meter.gasUsed * 100) / meter.gasAllocated;
    if (usagePercent >= meter.alertThresholdPercent && meter.status === GasMeterStatus.ACTIVE) {
      this.logger.warn(
        `Gas meter ${meter.id} exceeded ${meter.alertThresholdPercent}% usage threshold`,
      );
    }

    await this.gasMeterRepository.save(meter);
  }

  async checkGasMeter(identifier: string, requiredGas: number): Promise<void> {
    const meter = await this.gasMeterRepository.findOne({
      where: [{ programId: identifier }, { accountId: identifier }],
    });

    if (!meter) {
      return; // No meter found, allow execution
    }

    if (meter.status !== GasMeterStatus.ACTIVE) {
      throw new BadRequestException(`Gas meter is ${meter.status}`);
    }

    if (meter.gasRemaining < requiredGas) {
      throw new BadRequestException('Insufficient gas remaining for operation');
    }

    if (requiredGas > meter.gasLimitPerOperation) {
      throw new BadRequestException(
        `Gas required (${requiredGas}) exceeds limit per operation (${meter.gasLimitPerOperation})`,
      );
    }
  }

  async resetGasMeter(id: string, dto: ResetGasMeterDto): Promise<GasMeter> {
    const meter = await this.getGasMeter(id);

    if (dto.fullReset) {
      meter.gasUsed = 0;
      meter.gasRemaining = meter.gasAllocated;
      meter.operationCount = 0;
      meter.averageGasPerOperation = 0;
      meter.peakGasUsage = 0;
      meter.efficiencyRating = 100;
      meter.status = GasMeterStatus.ACTIVE;
    } else if (dto.newAllocation) {
      meter.gasAllocated = dto.newAllocation;
      meter.gasRemaining = dto.newAllocation - meter.gasUsed;
      if (meter.gasRemaining < 0) {
        meter.gasRemaining = 0;
        meter.status = GasMeterStatus.EXCEEDED;
      }
    }

    meter.lastResetAt = new Date();

    return this.gasMeterRepository.save(meter);
  }

  // Utility Methods

  async getRuntimeInfo(): Promise<any> {
    const version = await this.connection.getVersion();
    const slot = await this.connection.getSlot();
    const blockHeight = await this.connection.getBlockHeight();

    return {
      version,
      currentSlot: slot,
      blockHeight,
      rpcUrl: this.connection.rpcEndpoint,
      commitment: 'confirmed',
    };
  }

  async getProgramStats(programId: string): Promise<any> {
    const executions = await this.executionRepository.find({
      where: { programId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.SUCCESS,
    ).length;
    const totalComputeUnits = executions.reduce((sum, e) => sum + (e.computeUnitsUsed || 0), 0);
    const totalGasCost = executions.reduce((sum, e) => sum + (e.gasCost || 0), 0);
    const avgExecutionTime =
      executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) / totalExecutions;

    return {
      programId,
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      totalComputeUnits,
      totalGasCost,
      avgExecutionTime: avgExecutionTime || 0,
      recentExecutions: executions.slice(0, 10),
    };
  }
}
