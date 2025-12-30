import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CpiService } from '../cpi.service';
import { CpiInstruction } from '../cpi-instruction.entity';
import { CpiPermission } from '../cpi-permission.entity';
import { CpiInvocation } from '../cpi-invocation.entity';
import { SvmService } from '../../svm/svm.service';

describe('CpiService', () => {
  let service: CpiService;
  let cpiInstructionRepository: Repository<CpiInstruction>;
  let cpiPermissionRepository: Repository<CpiPermission>;
  let cpiInvocationRepository: Repository<CpiInvocation>;
  let svmService: SvmService;

  const mockCpiInstructionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCpiPermissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCpiInvocationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockSvmService = {
    executeProgram: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CpiService,
        {
          provide: getRepositoryToken(CpiInstruction),
          useValue: mockCpiInstructionRepository,
        },
        {
          provide: getRepositoryToken(CpiPermission),
          useValue: mockCpiPermissionRepository,
        },
        {
          provide: getRepositoryToken(CpiInvocation),
          useValue: mockCpiInvocationRepository,
        },
        {
          provide: SvmService,
          useValue: mockSvmService,
        },
      ],
    }).compile();

    service = module.get<CpiService>(CpiService);
    cpiInstructionRepository = module.get<Repository<CpiInstruction>>(
      getRepositoryToken(CpiInstruction),
    );
    cpiPermissionRepository = module.get<Repository<CpiPermission>>(
      getRepositoryToken(CpiPermission),
    );
    cpiInvocationRepository = module.get<Repository<CpiInvocation>>(
      getRepositoryToken(CpiInvocation),
    );
    svmService = module.get<SvmService>(SvmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInstruction', () => {
    it('should create a CPI instruction', async () => {
      const dto = {
        programId: 'program123',
        callerProgramId: 'caller123',
        instructionData: { method: 'transfer' },
      };

      const mockInstruction = { id: '1', ...dto, isActive: true };
      mockCpiInstructionRepository.create.mockReturnValue(mockInstruction);
      mockCpiInstructionRepository.save.mockResolvedValue(mockInstruction);

      const result = await service.createInstruction(dto);

      expect(mockCpiInstructionRepository.create).toHaveBeenCalledWith({
        ...dto,
        isActive: true,
      });
      expect(mockCpiInstructionRepository.save).toHaveBeenCalledWith(mockInstruction);
      expect(result).toEqual(mockInstruction);
    });
  });

  describe('createPermission', () => {
    it('should create a CPI permission', async () => {
      const dto = {
        programId: 'program123',
        granterProgramId: 'granter123',
        permissionType: 'invoke',
      };

      const mockPermission = { id: '1', ...dto, isActive: true };
      mockCpiPermissionRepository.create.mockReturnValue(mockPermission);
      mockCpiPermissionRepository.save.mockResolvedValue(mockPermission);

      const result = await service.createPermission(dto);

      expect(mockCpiPermissionRepository.create).toHaveBeenCalledWith({
        ...dto,
        isActive: true,
      });
      expect(mockCpiPermissionRepository.save).toHaveBeenCalledWith(mockPermission);
      expect(result).toEqual(mockPermission);
    });
  });

  describe('checkPermission', () => {
    it('should return true when permission exists', async () => {
      const mockPermission = {
        id: '1',
        programId: 'program123',
        granterProgramId: 'granter123',
        permissionType: 'invoke',
        isActive: true,
      };

      mockCpiPermissionRepository.findOne.mockResolvedValue(mockPermission);

      const result = await service.checkPermission('granter123', 'program123', 'invoke');

      expect(result).toBe(true);
      expect(mockCpiPermissionRepository.findOne).toHaveBeenCalledWith({
        where: {
          programId: 'program123',
          granterProgramId: 'granter123',
          permissionType: 'invoke',
          accountId: null,
          isActive: true,
        },
      });
    });

    it('should return false when permission does not exist', async () => {
      mockCpiPermissionRepository.findOne.mockResolvedValue(null);

      const result = await service.checkPermission('granter123', 'program123', 'invoke');

      expect(result).toBe(false);
    });
  });

  describe('executeCpi', () => {
    it('should execute CPI successfully', async () => {
      const dto = {
        transactionId: 'tx123',
        callerProgramId: 'caller123',
        targetProgramId: 'target123',
        instructionData: { method: 'transfer' },
      };

      const mockInvocation = { id: '1', ...dto, status: 'pending' };
      const mockSvmResult = { 
        id: 'exec-1',
        programId: 'target123',
        status: 'success',
        computeUnitsUsed: 1000,
        logs: ['CPI executed successfully']
      };

      mockCpiInstructionRepository.findOne.mockResolvedValue(null); // No permission required
      mockCpiInvocationRepository.create.mockReturnValue(mockInvocation);
      mockCpiInvocationRepository.save.mockResolvedValue(mockInvocation);
      mockSvmService.executeProgram.mockResolvedValue(mockSvmResult);

      const result = await service.executeCpi(dto);

      expect(result.status).toBe('success');
      expect(result.gasUsed).toBe(1000);
      expect(mockSvmService.executeProgram).toHaveBeenCalled();
    });

    it('should fail CPI execution when permission is required but not granted', async () => {
      const dto = {
        transactionId: 'tx123',
        callerProgramId: 'caller123',
        targetProgramId: 'target123',
        instructionData: { method: 'transfer' },
      };

      const mockInstruction = {
        requiresPermission: true,
        permissionLevel: 'write',
      };

      mockCpiInstructionRepository.findOne.mockResolvedValue(mockInstruction);
      mockCpiPermissionRepository.findOne.mockResolvedValue(null); // No permission

      await expect(service.executeCpi(dto)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getInstructionsByProgram', () => {
    it('should return instructions for a program', async () => {
      const mockInstructions = [
        { id: '1', programId: 'program123', isActive: true },
      ];

      mockCpiInstructionRepository.find.mockResolvedValue(mockInstructions);

      const result = await service.getInstructionsByProgram('program123');

      expect(result).toEqual(mockInstructions);
      expect(mockCpiInstructionRepository.find).toHaveBeenCalledWith({
        where: { programId: 'program123', isActive: true },
        relations: ['program', 'callerProgram'],
      });
    });
  });

  describe('getInvocationHistory', () => {
    it('should return invocation history', async () => {
      const mockInvocations = [
        { id: '1', callerProgramId: 'caller123' },
      ];

      mockCpiInvocationRepository.find.mockResolvedValue(mockInvocations);

      const result = await service.getInvocationHistory();

      expect(result).toEqual(mockInvocations);
      expect(mockCpiInvocationRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: ['callerProgram', 'targetProgram', 'execution'],
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });
});