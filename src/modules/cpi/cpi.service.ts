import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection, PublicKey, TransactionInstruction, AccountMeta } from '@solana/web3.js';
import { CpiInstruction } from './cpi-instruction.entity';
import { CpiPermission } from './cpi-permission.entity';
import { CpiInvocation } from './cpi-invocation.entity';
import { CreateCpiInstructionDto } from './dto/create-cpi-instruction.dto';
import { CreateCpiPermissionDto, UpdateCpiPermissionDto } from './dto/cpi-permission.dto';
import { CreateCpiInvocationDto } from './dto/cpi-invocation.dto';
import { SvmService } from '../svm/svm.service';

@Injectable()
/**
 * Service for managing Cross-Program Invocations (CPI).
 * @see docs/diagrams/10-cpis.md
 */
export class CpiService {
  private readonly logger = new Logger(CpiService.name);

  constructor(
    @InjectRepository(CpiInstruction)
    private readonly cpiInstructionRepository: Repository<CpiInstruction>,
    @InjectRepository(CpiPermission)
    private readonly cpiPermissionRepository: Repository<CpiPermission>,
    @InjectRepository(CpiInvocation)
    private readonly cpiInvocationRepository: Repository<CpiInvocation>,
    private readonly svmService: SvmService,
  ) {}

  /**
   * Create a new CPI instruction template
   */
  async createInstruction(dto: CreateCpiInstructionDto): Promise<CpiInstruction> {
    this.logger.log(`Creating CPI instruction for program ${dto.programId}`);

    const instruction = this.cpiInstructionRepository.create({
      ...dto,
      isActive: true,
    });

    return await this.cpiInstructionRepository.save(instruction);
  }

  /**
   * Get all CPI instructions for a program
   */
  async getInstructionsByProgram(programId: string): Promise<CpiInstruction[]> {
    return await this.cpiInstructionRepository.find({
      where: { programId, isActive: true },
      relations: ['program', 'callerProgram'],
    });
  }

  /**
   * Create a CPI permission
   */
  async createPermission(dto: CreateCpiPermissionDto): Promise<CpiPermission> {
    this.logger.log(`Creating CPI permission for program ${dto.programId} from ${dto.granterProgramId}`);

    const permission = this.cpiPermissionRepository.create({
      ...dto,
      isActive: true,
    });

    return await this.cpiPermissionRepository.save(permission);
  }

  /**
   * Update a CPI permission
   */
  async updatePermission(id: string, dto: UpdateCpiPermissionDto): Promise<CpiPermission> {
    const permission = await this.cpiPermissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new BadRequestException('Permission not found');
    }

    Object.assign(permission, dto);
    return await this.cpiPermissionRepository.save(permission);
  }

  /**
   * Check if a program has permission to invoke another program
   */
  async checkPermission(
    callerProgramId: string,
    targetProgramId: string,
    permissionType: string = 'invoke',
    accountId?: string,
  ): Promise<boolean> {
    const permission = await this.cpiPermissionRepository.findOne({
      where: {
        programId: targetProgramId,
        granterProgramId: callerProgramId,
        permissionType,
        accountId: accountId || null,
        isActive: true,
      },
    });

    if (!permission) {
      return false;
    }

    // Check expiration
    if (permission.expiresAt && new Date() > permission.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Execute a CPI call
   */
  async executeCpi(dto: CreateCpiInvocationDto): Promise<CpiInvocation> {
    this.logger.log(`Executing CPI from ${dto.callerProgramId} to ${dto.targetProgramId}`);

    // Check permissions if required
    const instruction = await this.cpiInstructionRepository.findOne({
      where: {
        programId: dto.targetProgramId,
        callerProgramId: dto.callerProgramId,
        methodName: dto.instructionName,
        isActive: true,
      },
    });

    if (instruction?.requiresPermission) {
      const hasPermission = await this.checkPermission(
        dto.callerProgramId,
        dto.targetProgramId,
        instruction.permissionLevel || 'invoke',
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions for CPI call');
      }
    }

    // Create invocation record
    const invocation = this.cpiInvocationRepository.create({
      ...dto,
      status: 'pending',
    });

    const savedInvocation = await this.cpiInvocationRepository.save(invocation);

    try {
      // Execute the CPI through SVM
      const result = await this.svmService.executeProgram({
        programId: dto.targetProgramId,
        instructionData: Buffer.from(JSON.stringify(dto.instructionData)).toString('base64'),
        accounts: dto.accounts?.map(a => a.pubkey) || [],
        maxComputeUnits: 200000, // Default compute units
      }, null); // No signer for CPI calls

      // Update invocation with success
      savedInvocation.status = 'success';
      savedInvocation.gasUsed = result.computeUnitsUsed;
      savedInvocation.returnData = result.logs;

    } catch (error) {
      this.logger.error(`CPI execution failed: ${error.message}`);

      // Update invocation with failure
      savedInvocation.status = 'failed';
      savedInvocation.errorMessage = error.message;
    }

    return await this.cpiInvocationRepository.save(savedInvocation);
  }

  /**
   * Get CPI invocation history
   */
  async getInvocationHistory(
    programId?: string,
    callerProgramId?: string,
    limit: number = 50,
  ): Promise<CpiInvocation[]> {
    const where: any = {};
    if (programId) where.targetProgramId = programId;
    if (callerProgramId) where.callerProgramId = callerProgramId;

    return await this.cpiInvocationRepository.find({
      where,
      relations: ['callerProgram', 'targetProgram', 'execution'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Build a TransactionInstruction for CPI
   */
  buildCpiInstruction(
    programId: string,
    instructionData: Buffer,
    accounts: AccountMeta[],
  ): TransactionInstruction {
    return new TransactionInstruction({
      programId: new PublicKey(programId),
      keys: accounts,
      data: instructionData,
    });
  }

  /**
   * Validate CPI instruction data
   */
  validateCpiInstruction(instruction: CpiInstruction): boolean {
    try {
      // Validate program IDs
      new PublicKey(instruction.programId);
      new PublicKey(instruction.callerProgramId);

      // Validate accounts if present
      if (instruction.accounts) {
        for (const account of instruction.accounts) {
          new PublicKey(account.pubkey);
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Invalid CPI instruction: ${error.message}`);
      return false;
    }
  }
}