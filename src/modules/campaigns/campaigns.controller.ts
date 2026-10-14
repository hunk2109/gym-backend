import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignAudience, CampaignChannel } from '../../entities/campaign.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  getCampaigns() {
    return this.campaignsService.getCampaigns();
  }

  @Get('templates')
  getTemplates() {
    return this.campaignsService.getTemplates();
  }

  @Get('recipients')
  getRecipients() {
    return this.campaignsService.getCampaignRecipients();
  }

  @Post()
  sendCampaign(@Body() dto: {
    name: string;
    audience: CampaignAudience;
    channel: CampaignChannel;
    messageTemplate: string;
    couponCode?: string;
    customMemberIds?: string[];
    scheduledAt?: Date;
  }) {
    return this.campaignsService.sendCampaign(dto);
  }

  @Delete(':id')
  deleteCampaign(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }
}
