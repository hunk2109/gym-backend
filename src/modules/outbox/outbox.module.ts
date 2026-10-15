import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationOutbox } from './entities/notification-outbox.entity';
import { OutboxService } from './outbox.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxController } from './outbox.controller';
import { WhatsappSettingsModule } from '../whatsapp-settings/whatsapp-settings.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationOutbox]),
    WhatsappSettingsModule,
    EmailSettingsModule,
  ],
  controllers: [OutboxController],
  providers: [OutboxService, OutboxProcessorService],
  exports: [OutboxService],
})
export class OutboxModule {}
