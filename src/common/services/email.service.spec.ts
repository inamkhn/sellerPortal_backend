import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                RESEND_API_KEY: 'test-api-key',
                EMAIL_FROM: 'onboarding@resend.dev',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with Resend when API key is provided', () => {
    expect(service).toBeDefined();
    // The service should be created without throwing errors
  });

  it('should handle missing API key gracefully', async () => {
    // Create a new service instance without API key
    const moduleWithoutKey: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'RESEND_API_KEY') return undefined;
              const config: Record<string, string> = {
                EMAIL_FROM: 'Test <test@example.com>',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    const serviceWithoutKey = moduleWithoutKey.get<EmailService>(EmailService);
    expect(serviceWithoutKey).toBeDefined();
  });
});
