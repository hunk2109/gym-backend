import { Controller, Get, Post, Body } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignAudience, CampaignChannel } from '../../entities/campaign.entity';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  getCampaigns() {
    return this.campaignsService.getCampaigns();
  }

  @Post()
  sendCampaign(@Body() dto: {
    name: string;
    audience: CampaignAudience;
    channel: CampaignChannel;
    messageTemplate: string;
    couponCode?: string;
    customMemberIds?: string[];
  }) {
    return this.campaignsService.sendCampaign(dto);
  }
}
