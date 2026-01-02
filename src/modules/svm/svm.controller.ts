import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SvmService } from './svm.service';
import { Program } from './program.entity';
import { RuntimeExecution } from './runtime-execution.entity';
import { GasMeter } from './gas-meter.entity';
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

/**
 * # SVM Controller (Solana Virtual Machine)
 *
 * REST API for program management, execution, and gas metering.
 *
 * ## Solana Virtual Machine Architecture
 *
 * The SVM executes programs (smart contracts) using:
 *
 * - **BPF Bytecode**: Programs compiled to Berkeley Packet Filter
 * - **Accounts Model**: All data stored in accounts
 * - **Parallel Execution**: Transactions on different accounts run in parallel
 * - **Sealevel Runtime**: Parallel smart contract runtime
 *
 * ## Program Lifecycle
 *
 * ```
 * [Rust/C Source] → Compile → [BPF ELF]
 *                                 ↓
 *                        [Deploy to Solana]
 *                                 ↓
 *                        [Program Account Created]
 *                                 ↓
 *                        [Executable = true]
 * ```
 *
 * ## Compute Units (Gas)
 *
 * Solana uses Compute Units (CUs) instead of gas:
 *
 * | Operation | CU Cost |
 * |-----------|---------|
 * | Base tx fee | 5,000 |
 * | SHA256 (32B) | 85 |
 * | Ed25519 verify | 2,000 |
 * | CPI | ~1,000+ |
 * | Account access | ~100 |
 *
 * Default limit: 200,000 CUs per instruction, 1.4M per transaction.
 *
 * ## Parallel Execution
 *
 * Transactions are executed in parallel when they don't overlap:
 *
 * ```
 * Transaction A: [Account 1, Account 2] ─┐
 *                                         ├── Parallel
 * Transaction B: [Account 3, Account 4] ─┘
 *
 * Transaction C: [Account 1, Account 5] ─── Sequential with A
 * ```
 *
 * @example
 * ```typescript
 * // Deploy a program
 * POST /svm/programs/:id/deploy
 * {
 *   "network": "devnet",
 *   "upgradeAuthority": "authority-address"
 * }
 *
 * // Execute program instruction
 * POST /svm/execute
 * {
 *   "programId": "program-uuid",
 *   "instruction": "base64-instruction",
 *   "accounts": [...]
 * }
 *
 * // Execute in parallel
 * POST /svm/execute/parallel
 * {
 *   "executions": [
 *     { "programId": "...", "instruction": "..." },
 *     { "programId": "...", "instruction": "..." }
 *   ]
 * }
 * ```
 *
 * @see https://docs.solana.com/developing/programming-model/runtime - Runtime
 * @see https://docs.solana.com/developing/programming-model/accounts - Account Model
 * @see [docs/diagrams/09-svm.md](docs/diagrams/09-svm.md) - Architecture
 */
@ApiTags('SVM')
@ApiBearerAuth()
@Controller('svm')
export class SvmController {
  constructor(private readonly svmService: SvmService) {}

  // Program Management Endpoints

  @Post('programs')
  @ApiOperation({ summary: 'Create a new program' })
  @ApiResponse({
    status: 201,
    description: 'Program created successfully',
    type: Program,
  })
  async createProgram(@Body() dto: CreateProgramDto): Promise<Program> {
    // In a real implementation, you'd get the owner from the authenticated user
    const owner = 'placeholder-owner';
    return this.svmService.createProgram(dto, owner);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Get program by ID' })
  @ApiResponse({
    status: 200,
    description: 'Program retrieved successfully',
    type: Program,
  })
  async getProgram(@Param('id') id: string): Promise<Program> {
    return this.svmService.getProgram(id);
  }

  @Get('programs')
  @ApiOperation({ summary: 'Query programs with filters' })
  @ApiResponse({ status: 200, description: 'Programs retrieved successfully' })
  async queryPrograms(
    @Query() query: ProgramQueryDto,
  ): Promise<{ programs: Program[]; total: number }> {
    return this.svmService.queryPrograms(query);
  }

  @Put('programs/:id')
  @ApiOperation({ summary: 'Update program' })
  @ApiResponse({
    status: 200,
    description: 'Program updated successfully',
    type: Program,
  })
  async updateProgram(@Param('id') id: string, @Body() dto: UpdateProgramDto): Promise<Program> {
    return this.svmService.updateProgram(id, dto);
  }

  @Delete('programs/:id')
  @ApiOperation({ summary: 'Delete program' })
  @ApiResponse({ status: 200, description: 'Program deleted successfully' })
  async deleteProgram(@Param('id') id: string): Promise<void> {
    return this.svmService.deleteProgram(id);
  }

  @Post('programs/:id/deploy')
  @ApiOperation({ summary: 'Deploy program to Solana' })
  @ApiResponse({
    status: 200,
    description: 'Program deployed successfully',
    type: Program,
  })
  async deployProgram(@Param('id') id: string, @Body() dto: DeployProgramDto): Promise<Program> {
    // In a real implementation, you'd get the signer from the authenticated user
    const signer = null; // placeholder
    return this.svmService.deployProgram(id, dto, signer);
  }

  // Runtime Execution Endpoints

  @Post('execute')
  @ApiOperation({ summary: 'Execute a program instruction' })
  @ApiResponse({
    status: 201,
    description: 'Program executed successfully',
    type: RuntimeExecution,
  })
  async executeProgram(@Body() dto: ExecuteProgramDto): Promise<RuntimeExecution> {
    // In a real implementation, you'd get the signer from the authenticated user
    const signer = null; // placeholder
    return this.svmService.executeProgram(dto, signer);
  }

  @Post('execute/parallel')
  @ApiOperation({ summary: 'Execute multiple programs in parallel' })
  @ApiResponse({
    status: 201,
    description: 'Programs executed successfully',
    type: [RuntimeExecution],
  })
  async executeParallel(@Body() dto: ParallelExecutionDto): Promise<RuntimeExecution[]> {
    // In a real implementation, you'd get the signer from the authenticated user
    const signer = null; // placeholder
    return this.svmService.executeParallel(dto, signer);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution by ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution retrieved successfully',
    type: RuntimeExecution,
  })
  async getExecution(@Param('id') id: string): Promise<RuntimeExecution> {
    return this.svmService.getExecution(id);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Query executions with filters' })
  @ApiResponse({
    status: 200,
    description: 'Executions retrieved successfully',
  })
  async queryExecutions(
    @Query() query: RuntimeExecutionQueryDto,
  ): Promise<{ executions: RuntimeExecution[]; total: number }> {
    return this.svmService.queryExecutions(query);
  }

  @Get('metrics/executions')
  @ApiOperation({ summary: 'Get execution metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getExecutionMetrics(@Query() dto: ExecutionMetricsDto): Promise<any> {
    return this.svmService.getExecutionMetrics(dto);
  }

  // Gas Metering Endpoints

  @Post('gas-meters')
  @ApiOperation({ summary: 'Create a gas meter' })
  @ApiResponse({
    status: 201,
    description: 'Gas meter created successfully',
    type: GasMeter,
  })
  async createGasMeter(@Body() dto: CreateGasMeterDto): Promise<GasMeter> {
    return this.svmService.createGasMeter(dto);
  }

  @Get('gas-meters/:id')
  @ApiOperation({ summary: 'Get gas meter by ID' })
  @ApiResponse({
    status: 200,
    description: 'Gas meter retrieved successfully',
    type: GasMeter,
  })
  async getGasMeter(@Param('id') id: string): Promise<GasMeter> {
    return this.svmService.getGasMeter(id);
  }

  @Get('gas-meters')
  @ApiOperation({ summary: 'Query gas meters with filters' })
  @ApiResponse({
    status: 200,
    description: 'Gas meters retrieved successfully',
  })
  async queryGasMeters(
    @Query() query: GasMeterQueryDto,
  ): Promise<{ meters: GasMeter[]; total: number }> {
    return this.svmService.queryGasMeters(query);
  }

  @Put('gas-meters/:id')
  @ApiOperation({ summary: 'Update gas meter' })
  @ApiResponse({
    status: 200,
    description: 'Gas meter updated successfully',
    type: GasMeter,
  })
  async updateGasMeter(@Param('id') id: string, @Body() dto: UpdateGasMeterDto): Promise<GasMeter> {
    return this.svmService.updateGasMeter(id, dto);
  }

  @Delete('gas-meters/:id')
  @ApiOperation({ summary: 'Delete gas meter' })
  @ApiResponse({ status: 200, description: 'Gas meter deleted successfully' })
  async deleteGasMeter(@Param('id') id: string): Promise<void> {
    return this.svmService.deleteGasMeter(id);
  }

  @Post('gas-meters/:id/consume')
  @ApiOperation({ summary: 'Consume gas from meter' })
  @ApiResponse({ status: 200, description: 'Gas consumed successfully' })
  async consumeGas(@Param('id') id: string, @Body() dto: GasUsageDto): Promise<void> {
    return this.svmService.consumeGas(dto.meterId, dto.gasAmount, dto.operation);
  }

  @Post('gas-meters/:id/reset')
  @ApiOperation({ summary: 'Reset gas meter' })
  @ApiResponse({
    status: 200,
    description: 'Gas meter reset successfully',
    type: GasMeter,
  })
  async resetGasMeter(@Param('id') id: string, @Body() dto: ResetGasMeterDto): Promise<GasMeter> {
    return this.svmService.resetGasMeter(id, dto);
  }

  // Utility Endpoints

  @Get('runtime/info')
  @ApiOperation({ summary: 'Get SVM runtime information' })
  @ApiResponse({
    status: 200,
    description: 'Runtime info retrieved successfully',
  })
  async getRuntimeInfo(): Promise<any> {
    return this.svmService.getRuntimeInfo();
  }

  @Get('programs/:programId/stats')
  @ApiOperation({ summary: 'Get program execution statistics' })
  @ApiResponse({
    status: 200,
    description: 'Program stats retrieved successfully',
  })
  async getProgramStats(@Param('programId') programId: string): Promise<any> {
    return this.svmService.getProgramStats(programId);
  }
}
