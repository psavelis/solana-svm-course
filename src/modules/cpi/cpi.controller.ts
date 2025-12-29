import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CpiService } from "./cpi.service";
import { CreateCpiInstructionDto } from "./dto/create-cpi-instruction.dto";
import {
  CreateCpiPermissionDto,
  UpdateCpiPermissionDto,
} from "./dto/cpi-permission.dto";
import { CreateCpiInvocationDto } from "./dto/cpi-invocation.dto";
import { DexService } from "./dex.service";

@ApiTags("CPI (Cross-Program Invocations)")
@Controller("cpi")
/**
 * Controller for Cross-Program Invocations (CPI).
 * @see docs/diagrams/10-cpis.md
 */
export class CpiController {
  constructor(
    private readonly cpiService: CpiService,
    private readonly dexService: DexService,
  ) {}

  @Post("instructions")
  @ApiOperation({ summary: "Create a CPI instruction template" })
  @ApiResponse({
    status: 201,
    description: "CPI instruction created successfully",
  })
  async createInstruction(@Body() dto: CreateCpiInstructionDto) {
    return await this.cpiService.createInstruction(dto);
  }

  @Get("instructions/:programId")
  @ApiOperation({ summary: "Get CPI instructions for a program" })
  @ApiResponse({
    status: 200,
    description: "CPI instructions retrieved successfully",
  })
  async getInstructionsByProgram(@Param("programId") programId: string) {
    return await this.cpiService.getInstructionsByProgram(programId);
  }

  @Post("permissions")
  @ApiOperation({ summary: "Create a CPI permission" })
  @ApiResponse({
    status: 201,
    description: "CPI permission created successfully",
  })
  async createPermission(@Body() dto: CreateCpiPermissionDto) {
    return await this.cpiService.createPermission(dto);
  }

  @Put("permissions/:id")
  @ApiOperation({ summary: "Update a CPI permission" })
  @ApiResponse({
    status: 200,
    description: "CPI permission updated successfully",
  })
  async updatePermission(
    @Param("id") id: string,
    @Body() dto: UpdateCpiPermissionDto,
  ) {
    return await this.cpiService.updatePermission(id, dto);
  }

  @Post("execute")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Execute a CPI call" })
  @ApiResponse({ status: 200, description: "CPI executed successfully" })
  async executeCpi(@Body() dto: CreateCpiInvocationDto) {
    return await this.cpiService.executeCpi(dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Get CPI invocation history" })
  @ApiResponse({
    status: 200,
    description: "CPI history retrieved successfully",
  })
  async getInvocationHistory(
    @Query("programId") programId?: string,
    @Query("callerProgramId") callerProgramId?: string,
    @Query("limit") limit?: number,
  ) {
    return await this.cpiService.getInvocationHistory(
      programId,
      callerProgramId,
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  @Post("check-permission")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check if a program has CPI permission" })
  @ApiResponse({ status: 200, description: "Permission check completed" })
  async checkPermission(
    @Body()
    body: {
      callerProgramId: string;
      targetProgramId: string;
      permissionType?: string;
      accountId?: string;
    },
  ) {
    const hasPermission = await this.cpiService.checkPermission(
      body.callerProgramId,
      body.targetProgramId,
      body.permissionType || "invoke",
      body.accountId,
    );

    return { hasPermission };
  }

  @Post("dex/swap")
  @ApiOperation({ summary: "Perform a DEX swap using CPI" })
  @ApiResponse({ status: 201, description: "DEX swap executed successfully" })
  async performDexSwap(
    @Body()
    body: {
      userId: string;
      fromMint: string;
      toMint: string;
      amount: number;
      dexProgramId: string;
    },
  ) {
    return await this.dexService.performSwap(
      body.userId,
      body.fromMint,
      body.toMint,
      body.amount,
      body.dexProgramId,
    );
  }

  @Get("dex/history")
  @ApiOperation({ summary: "Get DEX swap history" })
  @ApiResponse({
    status: 200,
    description: "DEX history retrieved successfully",
  })
  async getDexHistory(@Query("userId") userId?: string) {
    return await this.dexService.getSwapHistory(userId);
  }
}
