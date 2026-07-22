import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from '../../entities/campaign.entity';
import { Member } from '../../entities/member.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { WhatsappSettingsModule } from '../whatsapp-settings/whatsapp-settings.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Member, Promotion]),
    WhatsappSettingsModule,
    EmailSettingsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
