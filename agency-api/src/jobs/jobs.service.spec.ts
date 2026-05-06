import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { AgentJob } from './entities/agent-job.entity';
import { AgentsService } from '../agents/agents.service';
import { UsersService } from '../users/users.service';
import { OpenClawSpendEvent } from './entities/openclaw-spend.entity';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(AgentJob),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OpenClawSpendEvent),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: AgentsService,
          useValue: {
            executeJob: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            deductCredits: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback: number) => fallback),
          },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
