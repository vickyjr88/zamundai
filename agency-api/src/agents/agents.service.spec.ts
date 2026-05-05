import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentsService } from './agents.service';

describe('AgentsService', () => {
  let service: AgentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'OPENCLAW_GATEWAY_TOKEN') {
                return 'test-token';
              }

              if (key === 'OPENCLAW_AGENT_ID') {
                return 'main';
              }

              if (key === 'OPENCLAW_GATEWAY_REQUEST_SCOPES') {
                return 'operator.write';
              }

              if (key === 'OPENCLAW_GATEWAY_CLIENT_ID') {
                return 'gateway-client';
              }

              if (key === 'OPENCLAW_GATEWAY_TIMEOUT_MS') {
                return 30000;
              }

              return defaultValue;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'OPENCLAW_API_URL') {
                return 'ws://agency-openclaw:18789';
              }

              if (key === 'OPENCLAW_GATEWAY_TOKEN') {
                return 'test-token';
              }

              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
