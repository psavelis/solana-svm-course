import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SvmService } from "../svm.service";
import { Program, ProgramStatus, ProgramType } from "../program.entity";
import {
  RuntimeExecution,
  ExecutionStatus,
  ExecutionType,
} from "../runtime-execution.entity";
import { GasMeter, GasMeterType, GasMeterStatus } from "../gas-meter.entity";

describe("SvmService", () => {
  let service: SvmService;
  let programRepository: Repository<Program>;
  let executionRepository: Repository<RuntimeExecution>;
  let gasMeterRepository: Repository<GasMeter>;

  const mockProgramRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    })),
  };

  const mockExecutionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
    find: jest.fn(),
  };

  const mockGasMeterRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SvmService,
        {
          provide: getRepositoryToken(Program),
          useValue: mockProgramRepository,
        },
        {
          provide: getRepositoryToken(RuntimeExecution),
          useValue: mockExecutionRepository,
        },
        {
          provide: getRepositoryToken(GasMeter),
          useValue: mockGasMeterRepository,
        },
      ],
    }).compile();

    service = module.get<SvmService>(SvmService);
    programRepository = module.get<Repository<Program>>(
      getRepositoryToken(Program),
    );
    executionRepository = module.get<Repository<RuntimeExecution>>(
      getRepositoryToken(RuntimeExecution),
    );
    gasMeterRepository = module.get<Repository<GasMeter>>(
      getRepositoryToken(GasMeter),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createProgram", () => {
    it("should create a program successfully", async () => {
      const createProgramDto = {
        name: "Test Program",
        description: "A test program",
        programType: ProgramType.CUSTOM,
      };
      const owner = "test-owner";
      const mockProgram = {
        id: "test-id",
        ...createProgramDto,
        owner,
        status: ProgramStatus.DEPLOYING,
        sizeBytes: 0,
      };

      mockProgramRepository.create.mockReturnValue(mockProgram);
      mockProgramRepository.save.mockResolvedValue(mockProgram);

      const result = await service.createProgram(createProgramDto, owner);

      expect(result).toEqual(mockProgram);
      expect(mockProgramRepository.create).toHaveBeenCalledWith({
        ...createProgramDto,
        owner,
        status: ProgramStatus.DEPLOYING,
        sizeBytes: 0,
      });
      expect(mockProgramRepository.save).toHaveBeenCalledWith(mockProgram);
    });
  });

  describe("getProgram", () => {
    it("should return a program if found", async () => {
      const mockProgram = { id: "test-id", name: "Test Program" };
      mockProgramRepository.findOne.mockResolvedValue(mockProgram);

      const result = await service.getProgram("test-id");

      expect(result).toEqual(mockProgram);
      expect(mockProgramRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
    });

    it("should throw NotFoundException if program not found", async () => {
      mockProgramRepository.findOne.mockResolvedValue(null);

      await expect(service.getProgram("non-existent-id")).rejects.toThrow(
        "Program with ID non-existent-id not found",
      );
    });
  });

  describe("createGasMeter", () => {
    it("should create a gas meter successfully", async () => {
      const createGasMeterDto = {
        meterType: GasMeterType.PROGRAM,
        gasAllocated: 1000000,
      };
      const mockGasMeter = {
        id: "test-id",
        ...createGasMeterDto,
        gasRemaining: 1000000,
        gasUsed: 0,
        operationCount: 0,
        averageGasPerOperation: 0,
        peakGasUsage: 0,
        efficiencyRating: 100,
        alertThresholdPercent: 80,
        autoPauseOnThreshold: false,
        status: GasMeterStatus.ACTIVE,
      };

      mockGasMeterRepository.create.mockReturnValue(mockGasMeter);
      mockGasMeterRepository.save.mockResolvedValue(mockGasMeter);

      const result = await service.createGasMeter(createGasMeterDto);

      expect(result).toEqual(mockGasMeter);
      expect(mockGasMeterRepository.create).toHaveBeenCalledWith({
        ...createGasMeterDto,
        gasRemaining: 1000000,
        gasUsed: 0,
        operationCount: 0,
        averageGasPerOperation: 0,
        peakGasUsage: 0,
        efficiencyRating: 100,
        alertThresholdPercent: 80,
        autoPauseOnThreshold: false,
      });
      expect(mockGasMeterRepository.save).toHaveBeenCalledWith(mockGasMeter);
    });
  });

  describe("consumeGas", () => {
    it("should throw error if gas meter is not active", async () => {
      const mockGasMeter = {
        id: "test-id",
        gasRemaining: 1000000,
        status: GasMeterStatus.PAUSED,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.consumeGas("test-id", 50000)).rejects.toThrow(
        "Gas meter is paused",
      );
    });

    it("should throw error if insufficient gas remaining", async () => {
      const mockGasMeter = {
        id: "test-id",
        gasRemaining: 10000,
        status: GasMeterStatus.ACTIVE,
        autoPauseOnThreshold: false,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.consumeGas("test-id", 50000)).rejects.toThrow(
        "Insufficient gas remaining",
      );
    });
  });

  describe("executeProgram", () => {
    it("should throw error if program not found", async () => {
      const executeProgramDto = {
        programId: "non-existent-program",
        instructionData: "base64-data",
        accounts: ["account1"],
      };

      mockProgramRepository.findOne.mockResolvedValue(null);

      await expect(
        service.executeProgram(executeProgramDto, {}),
      ).rejects.toThrow(
        "Program with programId non-existent-program not found",
      );
    });
  });

  describe("getRuntimeInfo", () => {
    it("should return runtime information", async () => {
      const result = await service.getRuntimeInfo();

      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("currentSlot");
      expect(result).toHaveProperty("blockHeight");
      expect(result).toHaveProperty("rpcUrl");
      expect(result).toHaveProperty("commitment");
    });
  });
});
