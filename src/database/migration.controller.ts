import { Controller, Get, Post, Delete, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  MigrationService,
  MigrationInfo,
  MigrationResult,
} from "./migration.service";

@ApiTags("migrations")
@Controller("migrations")
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get()
  @ApiOperation({ summary: "Get all migrations with their status" })
  @ApiResponse({
    status: 200,
    description: "Migrations retrieved successfully",
    type: [Object],
  })
  async getMigrations(): Promise<MigrationInfo[]> {
    return this.migrationService.getMigrations();
  }

  @Get("stats")
  @ApiOperation({ summary: "Get migration statistics" })
  @ApiResponse({
    status: 200,
    description: "Migration statistics retrieved successfully",
    type: Object,
  })
  async getMigrationStats() {
    return this.migrationService.getMigrationStats();
  }

  @Post("run")
  @ApiOperation({ summary: "Run all pending migrations" })
  @ApiResponse({
    status: 201,
    description: "Migrations executed successfully",
    type: Object,
  })
  async runMigrations(): Promise<MigrationResult> {
    return this.migrationService.runMigrations();
  }

  @Post("rollback")
  @ApiOperation({ summary: "Rollback the last executed migration" })
  @ApiResponse({
    status: 201,
    description: "Migration rolled back successfully",
    type: Object,
  })
  async rollbackMigration(): Promise<MigrationResult> {
    return this.migrationService.rollbackMigration();
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new migration file" })
  @ApiResponse({
    status: 201,
    description: "Migration file created successfully",
    type: String,
  })
  async createMigration(@Body() body: { name: string }): Promise<string> {
    return this.migrationService.createMigration(body.name);
  }
}
