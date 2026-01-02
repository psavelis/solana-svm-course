import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SvmService } from '../svm.service';
import { Program, ProgramStatus, ProgramType } from '../program.entity';
import { RuntimeExecution, ExecutionStatus, ExecutionType } from '../runtime-execution.entity';
import { GasMeter, GasMeterType, GasMeterStatus } from '../gas-meter.entity';
import { Connection } from '@solana/web3.js';

describe('SvmService', () => {
  let service: SvmService;
  let programRepository: Repository<Program>;
  let executionRepository: Repository<RuntimeExecution>;
  let gasMeterRepository: Repository<GasMeter>;
  let mockConnection: jest.Mocked<Connection>;

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
      where: jest.fn().mockReturnThis(),
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
    mockConnection = {
      getVersion: jest.fn().mockResolvedValue({ 'solana-core': '1.14.0' }),
      getSlot: jest.fn().mockResolvedValue(123456789),
      getBlockHeight: jest.fn().mockResolvedValue(987654321),
      rpcEndpoint: 'https://api.devnet.solana.com',
      getMinimumBalanceForRentExemption: jest.fn().mockResolvedValue(1000000),
      sendAndConfirmTransaction: jest.fn().mockResolvedValue('mock-signature'),
    } as any;

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
    // Mock the connection property
    (service as any).connection = mockConnection;

    programRepository = module.get<Repository<Program>>(getRepositoryToken(Program));
    executionRepository = module.get<Repository<RuntimeExecution>>(
      getRepositoryToken(RuntimeExecution),
    );
    gasMeterRepository = module.get<Repository<GasMeter>>(getRepositoryToken(GasMeter));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProgram', () => {
    it('should create a program successfully', async () => {
      const createProgramDto = {
        name: 'Test Program',
        description: 'A test program',
        programType: ProgramType.CUSTOM,
      };
      const owner = 'test-owner';
      const mockProgram = {
        id: 'test-id',
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

  describe('getProgramByProgramId', () => {
    it('should return a program if found by programId', async () => {
      const mockProgram = { id: 'test-id', programId: 'program-123', name: 'Test Program' };
      mockProgramRepository.findOne.mockResolvedValue(mockProgram);

      const result = await service.getProgramByProgramId('program-123');

      expect(result).toEqual(mockProgram);
      expect(mockProgramRepository.findOne).toHaveBeenCalledWith({
        where: { programId: 'program-123' },
      });
    });

    it('should throw NotFoundException if program not found by programId', async () => {
      mockProgramRepository.findOne.mockResolvedValue(null);

      await expect(service.getProgramByProgramId('non-existent-program')).rejects.toThrow(
        'Program with programId non-existent-program not found',
      );
    });
  });

  describe('updateProgram', () => {
    it('should update a program successfully', async () => {
      const existingProgram = {
        id: 'test-id',
        name: 'Old Name',
        description: 'Old Description',
        save: jest.fn(),
      };
      const updateDto = {
        name: 'New Name',
        description: 'New Description',
      };
      const updatedProgram = {
        ...existingProgram,
        ...updateDto,
      };

      jest.spyOn(service, 'getProgram').mockResolvedValue(existingProgram as any);
      mockProgramRepository.save.mockResolvedValue(updatedProgram as any);

      const result = await service.updateProgram('test-id', updateDto);

      expect(result).toEqual(updatedProgram);
      expect(service.getProgram).toHaveBeenCalledWith('test-id');
      expect(mockProgramRepository.save).toHaveBeenCalledWith(existingProgram);
    });
  });

  describe('deleteProgram', () => {
    it('should delete a program successfully', async () => {
      const mockProgram = { id: 'test-id', name: 'Test Program' };

      jest.spyOn(service, 'getProgram').mockResolvedValue(mockProgram as any);
      mockProgramRepository.remove.mockResolvedValue(mockProgram as any);

      await service.deleteProgram('test-id');

      expect(service.getProgram).toHaveBeenCalledWith('test-id');
      expect(mockProgramRepository.remove).toHaveBeenCalledWith(mockProgram);
    });
  });

  describe('queryPrograms', () => {
    it('should return programs with query filters', async () => {
      const queryDto = {
        programType: ProgramType.CUSTOM,
        status: ProgramStatus.ACTIVE,
        owner: 'test-owner',
        search: 'test',
        page: 0,
        limit: 10,
      };
      const mockPrograms = [
        { id: '1', name: 'Test Program 1' },
        { id: '2', name: 'Test Program 2' },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPrograms),
        getCount: jest.fn().mockResolvedValue(2),
      };

      mockProgramRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.queryPrograms(queryDto);

      expect(result).toEqual({ programs: mockPrograms, total: 2 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('program.programType = :programType', {
        programType: ProgramType.CUSTOM,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('program.status = :status', {
        status: ProgramStatus.ACTIVE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('program.owner = :owner', {
        owner: 'test-owner',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(program.name ILIKE :search OR program.description ILIKE :search)',
        { search: '%test%' },
      );
    });
  });

  describe('getGasMeter', () => {
    it('should return a gas meter if found', async () => {
      const mockGasMeter = { id: 'test-id', gasAllocated: 1000000 };
      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      const result = await service.getGasMeter('test-id');

      expect(result).toEqual(mockGasMeter);
      expect(mockGasMeterRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should throw NotFoundException if gas meter not found', async () => {
      mockGasMeterRepository.findOne.mockResolvedValue(null);

      await expect(service.getGasMeter('non-existent-id')).rejects.toThrow(
        'Gas meter with ID non-existent-id not found',
      );
    });
  });

  describe('updateGasMeter', () => {
    it('should update a gas meter successfully', async () => {
      const existingMeter = {
        id: 'test-id',
        gasAllocated: 1000000,
        gasRemaining: 500000,
        gasUsed: 500000,
      };
      const updateDto = {
        addGasAllocation: 200000,
        alertThresholdPercent: 90,
      };
      const updatedMeter = {
        ...existingMeter,
        gasAllocated: 1200000,
        gasRemaining: 700000,
        alertThresholdPercent: 90,
      };

      jest.spyOn(service, 'getGasMeter').mockResolvedValue(existingMeter as any);
      mockGasMeterRepository.save.mockResolvedValue(updatedMeter as any);

      const result = await service.updateGasMeter('test-id', updateDto);

      expect(result).toEqual(updatedMeter);
      expect(service.getGasMeter).toHaveBeenCalledWith('test-id');
      expect(mockGasMeterRepository.save).toHaveBeenCalledWith(existingMeter);
    });
  });

  describe('deleteGasMeter', () => {
    it('should delete a gas meter successfully', async () => {
      const mockGasMeter = { id: 'test-id', gasAllocated: 1000000 };

      jest.spyOn(service, 'getGasMeter').mockResolvedValue(mockGasMeter as any);
      mockGasMeterRepository.remove.mockResolvedValue(mockGasMeter as any);

      await service.deleteGasMeter('test-id');

      expect(service.getGasMeter).toHaveBeenCalledWith('test-id');
      expect(mockGasMeterRepository.remove).toHaveBeenCalledWith(mockGasMeter);
    });
  });

  describe('queryGasMeters', () => {
    it('should return gas meters with query filters', async () => {
      const queryDto = {
        programId: 'program-123',
        accountId: 'account-456',
        meterType: GasMeterType.PROGRAM,
        status: GasMeterStatus.ACTIVE,
        usageThresholdPercent: 50,
        page: 0,
        limit: 10,
      };
      const mockMeters = [
        { id: '1', gasAllocated: 1000000 },
        { id: '2', gasAllocated: 2000000 },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMeters),
        getCount: jest.fn().mockResolvedValue(2),
      };

      mockGasMeterRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.queryGasMeters(queryDto);

      expect(result).toEqual({ meters: mockMeters, total: 2 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('meter.programId = :programId', {
        programId: 'program-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('meter.accountId = :accountId', {
        accountId: 'account-456',
      });
    });
  });

  describe('consumeGas', () => {
    it('should consume gas successfully', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 100000,
        gasUsed: 50000,
        operationCount: 5,
        averageGasPerOperation: 10000,
        peakGasUsage: 20000,
        efficiencyRating: 50,
        status: GasMeterStatus.ACTIVE,
        gasAllocated: 150000,
        alertThresholdPercent: 80,
        autoPauseOnThreshold: false,
        save: jest.fn(),
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);
      mockGasMeterRepository.save.mockResolvedValue(mockGasMeter);

      await service.consumeGas('test-id', 25000);

      expect(mockGasMeter.gasUsed).toBe(75000);
      expect(mockGasMeter.gasRemaining).toBe(75000);
      expect(mockGasMeter.operationCount).toBe(6);
      expect(mockGasMeter.averageGasPerOperation).toBe(12500);
      expect(mockGasMeter.peakGasUsage).toBe(25000);
      expect(mockGasMeterRepository.save).toHaveBeenCalledWith(mockGasMeter);
    });

    it('should throw error if gas meter is not active', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 1000000,
        status: GasMeterStatus.PAUSED,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.consumeGas('test-id', 50000)).rejects.toThrow('Gas meter is paused');
    });

    it('should throw error if insufficient gas remaining', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 10000,
        status: GasMeterStatus.ACTIVE,
        autoPauseOnThreshold: false,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.consumeGas('test-id', 50000)).rejects.toThrow(
        'Insufficient gas remaining',
      );
    });
  });

  describe('checkGasMeter', () => {
    it('should pass if no gas meter found', async () => {
      mockGasMeterRepository.findOne.mockResolvedValue(null);

      await expect(service.checkGasMeter('test-id', 50000)).resolves.not.toThrow();
    });

    it('should pass if gas meter is active and has sufficient gas', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 100000,
        status: GasMeterStatus.ACTIVE,
        gasLimitPerOperation: 100000,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.checkGasMeter('test-id', 50000)).resolves.not.toThrow();
    });

    it('should throw error if gas meter is not active', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 100000,
        status: GasMeterStatus.PAUSED,
        gasLimitPerOperation: 100000,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.checkGasMeter('test-id', 50000)).rejects.toThrow('Gas meter is paused');
    });

    it('should throw error if insufficient gas remaining', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 10000,
        status: GasMeterStatus.ACTIVE,
        gasLimitPerOperation: 100000,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.checkGasMeter('test-id', 50000)).rejects.toThrow(
        'Insufficient gas remaining for operation',
      );
    });

    it('should throw error if gas required exceeds limit per operation', async () => {
      const mockGasMeter = {
        id: 'test-id',
        gasRemaining: 100000,
        status: GasMeterStatus.ACTIVE,
        gasLimitPerOperation: 25000,
      };

      mockGasMeterRepository.findOne.mockResolvedValue(mockGasMeter);

      await expect(service.checkGasMeter('test-id', 50000)).rejects.toThrow(
        'Gas required (50000) exceeds limit per operation (25000)',
      );
    });
  });

  describe('resetGasMeter', () => {
    it('should perform full reset successfully', async () => {
      const existingMeter = {
        id: 'test-id',
        gasAllocated: 1000000,
        gasUsed: 500000,
        gasRemaining: 500000,
        operationCount: 10,
        averageGasPerOperation: 50000,
        peakGasUsage: 100000,
        efficiencyRating: 50,
        status: GasMeterStatus.ACTIVE,
      };
      const resetDto = { fullReset: true };
      const resetMeter = {
        ...existingMeter,
        gasUsed: 0,
        gasRemaining: 1000000,
        operationCount: 0,
        averageGasPerOperation: 0,
        peakGasUsage: 0,
        efficiencyRating: 100,
        status: GasMeterStatus.ACTIVE,
        lastResetAt: expect.any(Date),
      };

      jest.spyOn(service, 'getGasMeter').mockResolvedValue(existingMeter as any);
      mockGasMeterRepository.save.mockResolvedValue(resetMeter as any);

      const result = await service.resetGasMeter('test-id', resetDto);

      expect(result).toEqual(resetMeter);
      expect(service.getGasMeter).toHaveBeenCalledWith('test-id');
      expect(mockGasMeterRepository.save).toHaveBeenCalledWith(existingMeter);
    });

    it('should update allocation without full reset', async () => {
      const existingMeter = {
        id: 'test-id',
        gasAllocated: 1000000,
        gasUsed: 500000,
        gasRemaining: 500000,
        status: GasMeterStatus.ACTIVE,
      };
      const resetDto = { newAllocation: 2000000 };
      const updatedMeter = {
        ...existingMeter,
        gasAllocated: 2000000,
        gasRemaining: 1500000,
        lastResetAt: expect.any(Date),
      };

      jest.spyOn(service, 'getGasMeter').mockResolvedValue(existingMeter as any);
      mockGasMeterRepository.save.mockResolvedValue(updatedMeter as any);

      const result = await service.resetGasMeter('test-id', resetDto);

      expect(result).toEqual(updatedMeter);
      expect(mockGasMeterRepository.save).toHaveBeenCalledWith(existingMeter);
    });
  });

  describe('getExecution', () => {
    it('should return an execution if found', async () => {
      const mockExecution = {
        id: 'test-id',
        programId: 'program-123',
        status: ExecutionStatus.SUCCESS,
        program: { id: 'program-id', name: 'Test Program' },
      };
      mockExecutionRepository.findOne.mockResolvedValue(mockExecution);

      const result = await service.getExecution('test-id');

      expect(result).toEqual(mockExecution);
      expect(mockExecutionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        relations: ['program'],
      });
    });

    it('should throw NotFoundException if execution not found', async () => {
      mockExecutionRepository.findOne.mockResolvedValue(null);

      await expect(service.getExecution('non-existent-id')).rejects.toThrow(
        'Execution with ID non-existent-id not found',
      );
    });
  });

  describe('queryExecutions', () => {
    it('should return executions with query filters', async () => {
      const queryDto = {
        programId: 'program-123',
        transactionId: 'tx-456',
        status: ExecutionStatus.SUCCESS,
        executionType: ExecutionType.INSTRUCTION,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        minComputeUnits: 1000,
        maxComputeUnits: 100000,
        page: 0,
        limit: 10,
      };
      const mockExecutions = [
        { id: '1', programId: 'program-123', status: ExecutionStatus.SUCCESS },
        { id: '2', programId: 'program-123', status: ExecutionStatus.SUCCESS },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExecutions),
        getCount: jest.fn().mockResolvedValue(2),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockExecutionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.queryExecutions(queryDto);

      expect(result).toEqual({ executions: mockExecutions, total: 2 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('execution.programId = :programId', {
        programId: 'program-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'execution.transactionId = :transactionId',
        {
          transactionId: 'tx-456',
        },
      );
    });
  });

  describe('getExecutionMetrics', () => {
    it('should return execution metrics', async () => {
      const metricsDto = {
        timeRangeHours: 24,
        groupByProgram: false,
      };
      const mockMetrics = [
        {
          totalExecutions: 100,
          avgComputeUnits: 50000,
          totalComputeUnits: 5000000,
          totalGasCost: 5.0,
          avgExecutionTime: 150,
          firstExecution: new Date(),
          lastExecution: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn().mockResolvedValue(mockMetrics),
      };

      mockExecutionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getExecutionMetrics(metricsDto);

      expect(result).toEqual(mockMetrics);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('execution.createdAt >= :startDate', {
        startDate: expect.any(Date),
      });
    });
  });

  describe('getRuntimeInfo', () => {
    it('should return runtime information', async () => {
      const result = await service.getRuntimeInfo();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('currentSlot');
      expect(result).toHaveProperty('blockHeight');
      expect(result).toHaveProperty('rpcUrl');
      expect(result).toHaveProperty('commitment');
    });
  });
});
