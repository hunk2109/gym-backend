import { Test, TestingModule } from '@nestjs/testing';
import { EmailSettingsController } from './email-settings.controller';
import { EmailService } from './email.service';
import { EmailConfigService } from './email-config.service';
import { EmailTemplateService } from './email-template.service';

describe('EmailSettingsController', () => {
  let controller: EmailSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailSettingsController],
      providers: [
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
            getActiveTemplates: jest.fn(),
            getEmailLogs: jest.fn(),
          },
        },
        {
          provide: EmailConfigService,
          useValue: {
            createConfig: jest.fn(),
            getAllConfigs: jest.fn(),
            getConfigById: jest.fn(),
            updateConfig: jest.fn(),
            deleteConfig: jest.fn(),
            verifyConfig: jest.fn(),
            setActiveConfig: jest.fn(),
          },
        },
        {
          provide: EmailTemplateService,
          useValue: {
            createTemplate: jest.fn(),
            getAllTemplates: jest.fn(),
            getTemplateById: jest.fn(),
            updateTemplate: jest.fn(),
            deleteTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EmailSettingsController>(EmailSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createEmailConfig', () => {
    it('should create email config', async () => {
      const dto = {
        provider: 'GOOGLE',
        email: 'test@gmail.com',
        password: 'test-pass',
        senderName: 'Test Sender',
      };

      const result = {
        id: '123',
        ...dto,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(controller['emailConfigService'], 'createConfig').mockResolvedValue(result);

      expect(await controller.createEmailConfig(dto)).toEqual(result);
    });
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      const dto = {
        recipientEmail: 'user@example.com',
        recipientName: 'Test User',
        subject: 'Test Subject',
        htmlContent: '<h1>Test</h1>',
      };

      const result = {
        id: '123',
        ...dto,
        status: 'SENT',
        messageId: 'msg-123',
        sentAt: new Date(),
        createdAt: new Date(),
      };

      jest.spyOn(controller['emailService'], 'sendEmail').mockResolvedValue(result);

      expect(await controller.sendEmail(dto)).toEqual(result);
    });
  });
});
