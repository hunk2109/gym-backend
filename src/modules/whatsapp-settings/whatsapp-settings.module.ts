import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappSettingsController } from './whatsapp-settings.controller';

@Module({
  controllers: [WhatsappSettingsController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappSettingsModule {}
