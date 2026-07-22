import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Campaign, CampaignAudience, CampaignChannel, CampaignStatus } from '../../entities/campaign.entity';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { EmailService } from '../email-settings/email.service';
import { Member } from '../../entities/member.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(Member)
    private memberRepo: Repository<Member>,
    @InjectRepository(Promotion)
    private promotionRepo: Repository<Promotion>,
    @InjectRepository(GymSettings)
    private gymSettingsRepo: Repository<GymSettings>,
    private whatsappService: WhatsappService,
    private emailService: EmailService,
  ) {}

  async getCampaigns() {
    return this.campaignRepo.find({ order: { createdAt: 'DESC' } });
  }

  private async getMembersForAudience(audience: CampaignAudience, customMemberIds?: string[]): Promise<Member[]> {
    let members: Member[] = [];
    const query = this.memberRepo.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user');
    
    const today = new Date();

    if (audience === CampaignAudience.ALL) {
      members = await query.getMany();
    } else if (audience === CampaignAudience.ACTIVE) {
      query.innerJoin('member.memberships', 'm', 'm.isActive = true AND m.endDate >= :today', { today });
      members = await query.getMany();
    } else if (audience === CampaignAudience.INACTIVE) {
      query.leftJoin('member.memberships', 'm', 'm.isActive = true AND m.endDate >= :today', { today })
           .andWhere('m.id IS NULL');
      members = await query.getMany();
    } else if (audience === CampaignAudience.EXPIRING_SOON) {
      const dateIn7Days = new Date();
      dateIn7Days.setDate(today.getDate() + 7);
      query.innerJoin('member.memberships', 'm', 'm.isActive = true AND m.endDate <= :date AND m.endDate >= :today', { date: dateIn7Days, today });
      members = await query.getMany();
    } else if (audience === CampaignAudience.CUSTOM && customMemberIds?.length) {
      query.andWhereInIds(customMemberIds);
      members = await query.getMany();
    }

    return members;
  }

  async sendCampaign(dto: {
    name: string;
    audience: CampaignAudience;
    channel: CampaignChannel;
    messageTemplate: string;
    couponCode?: string;
    customMemberIds?: string[];
    scheduledAt?: Date;
  }) {
    const isScheduled = dto.scheduledAt && new Date(dto.scheduledAt) > new Date();

    const campaign = this.campaignRepo.create({
      name: dto.name,
      audience: dto.audience,
      channel: dto.channel,
      messageTemplate: dto.messageTemplate,
      attachedCouponCode: dto.couponCode,
      status: isScheduled ? CampaignStatus.SCHEDULED : CampaignStatus.IN_PROGRESS,
      scheduledAt: dto.scheduledAt,
      customMemberIdsJson: dto.customMemberIds ? JSON.stringify(dto.customMemberIds) : null,
    });
    const savedCampaign = await this.campaignRepo.save(campaign);

    if (isScheduled) {
      this.logger.log(`Campaign ${savedCampaign.id} scheduled for ${dto.scheduledAt}`);
      return savedCampaign;
    }

    const members = await this.getMembersForAudience(dto.audience, dto.customMemberIds);
    savedCampaign.recipientsCount = members.length;
    await this.campaignRepo.save(savedCampaign);

    this.processCampaignAsync(savedCampaign, members, dto.messageTemplate, dto.couponCode, dto.channel);

    return savedCampaign;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    const now = new Date();
    const scheduledCampaigns = await this.campaignRepo.find({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now)
      }
    });

    for (const campaign of scheduledCampaigns) {
      campaign.status = CampaignStatus.IN_PROGRESS;
      await this.campaignRepo.save(campaign);

      let customMemberIds: string[] | undefined;
      if (campaign.customMemberIdsJson) {
        try { customMemberIds = JSON.parse(campaign.customMemberIdsJson); } catch (e) {}
      }

      const members = await this.getMembersForAudience(campaign.audience, customMemberIds);
      campaign.recipientsCount = members.length;
      await this.campaignRepo.save(campaign);

      this.processCampaignAsync(campaign, members, campaign.messageTemplate, campaign.attachedCouponCode, campaign.channel);
    }
  }

  private async processCampaignAsync(
    campaign: Campaign,
    members: Member[],
    template: string,
    couponCode: string | undefined,
    channel: CampaignChannel,
  ) {
    let successCount = 0;
    let failCount = 0;
    
    let coupon: Promotion | null = null;
    if (couponCode) {
      coupon = await this.promotionRepo.findOne({ where: { code: couponCode } });
    }

    // Obtener configuración del gimnasio (nombre y logo)
    const gymSettings = await this.gymSettingsRepo.find({ take: 1 });
    const gymName = gymSettings.length > 0 && gymSettings[0].gymName ? gymSettings[0].gymName : 'Gym Manager';
    let logoHtml = '';
    if (gymSettings.length > 0 && gymSettings[0].logoImage) {
      const base64Logo = gymSettings[0].logoImage.toString('base64');
      logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="data:image/png;base64,${base64Logo}" alt="Logo" style="max-height: 100px; border-radius: 8px;"></div>`;
    }

    for (const member of members) {
      if (!member.user) continue;
      
      const user = member.user;
      let message = template.replace(/{nombre}/g, user.firstName || 'Cliente');
      if (coupon) {
        message = message.replace(/{cupon}/g, ''); 
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 40px; margin: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #222222; border-radius: 12px; padding: 30px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
            h1 { color: #facc15; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; font-size: 28px; }
            .content { font-size: 18px; line-height: 1.6; margin-bottom: 30px; white-space: pre-wrap; }
            .coupon-box { 
              background-color: #facc15; 
              color: #1a1a1a; 
              border: 3px dashed #1a1a1a; 
              border-radius: 10px; 
              padding: 20px; 
              text-align: center; 
              margin-top: 20px; 
            }
            .coupon-title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
            .coupon-code { font-size: 32px; font-weight: 900; background-color: #ffffff; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 10px 0; border: 2px dashed #1a1a1a;}
            .coupon-desc { font-size: 18px; margin: 5px 0; font-weight: bold;}
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoHtml}
            <h1>${gymName}</h1>
            <div class="content">${message}</div>
            ${coupon ? `
              <div class="coupon-box">
                <p class="coupon-title">CUPÓN DE DESCUENTO</p>
                <div class="coupon-code">${coupon.code}</div>
                <p class="coupon-desc">${coupon.discountPercentage}% OFF</p>
                ${coupon.expiresAt ? `<p style="margin:5px 0;">Válido hasta: ${coupon.expiresAt.toISOString().split('T')[0]}</p>` : ''}
              </div>
            ` : ''}
            <div class="footer">Este es un mensaje automático de ${gymName}, por favor no responder.</div>
          </div>
        </body>
        </html>
      `;

      try {
        let sent = false;
        
        if (channel === CampaignChannel.WHATSAPP || channel === CampaignChannel.BOTH) {
          if (user.phone) {
            try {
              const fallbackText = '¡Hola! Te hemos enviado un mensaje importante de Gym Manager. Adjuntamos el documento detallado.';
              await this.whatsappService.sendHtmlAsPdf(user.phone, htmlContent, fallbackText);
              sent = true;
            } catch (e) {
              this.logger.warn(`Failed WA to ${user.phone}: ${e.message}`);
            }
          }
        }

        if (channel === CampaignChannel.EMAIL || channel === CampaignChannel.BOTH) {
          if (user.email) {
            try {
              await this.emailService.sendEmail({
                recipientEmail: user.email,
                subject: campaign.name,
                htmlContent: htmlContent,
              });
              sent = true;
            } catch (e) {
              this.logger.warn(`Failed Email to ${user.email}: ${e.message}`);
            }
          }
        }

        if (sent) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    campaign.successfulSends = successCount;
    campaign.failedSends = failCount;
    campaign.status = CampaignStatus.COMPLETED;
    await this.campaignRepo.save(campaign);
    this.logger.log(`Campaign ${campaign.id} completed: ${successCount} success, ${failCount} fail.`);
  }
}
