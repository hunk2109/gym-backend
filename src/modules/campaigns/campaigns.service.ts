import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Campaign, CampaignAudience, CampaignChannel, CampaignStatus } from '../../entities/campaign.entity';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { EmailService } from '../email-settings/email.service';
import { Member } from '../../entities/member.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationPriority } from '../outbox/entities/notification-outbox.entity';

export interface CampaignTemplateDto {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultChannel: CampaignChannel;
  message: string;
  variables: string[];
}

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
    private outboxService: OutboxService,
  ) {}

  async getCampaigns(): Promise<Campaign[]> {
    return this.campaignRepo.find({ order: { createdAt: 'DESC' } });
  }

  async deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaña con ID ${id} no encontrada`);
    }
    await this.campaignRepo.remove(campaign);
    return { success: true, message: 'Campaña eliminada exitosamente' };
  }

  async getCampaignRecipients(): Promise<any[]> {
    const today = new Date();
    const members = await this.memberRepo.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .leftJoinAndSelect('memberships.membership', 'plan')
      .orderBy('member.createdAt', 'DESC')
      .getMany();

    return members.map(m => {
      const user = m.user;
      const firstName = user?.firstName || 'Socio';
      const lastName = user?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const phone = user?.phone || '';
      const email = user?.email || '';

      const memberships = m.memberships || [];
      const activeM = memberships.find(mm => mm.isActive && new Date(mm.endDate) >= today);
      const latestM = memberships.length > 0
        ? memberships.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;

      const hasMembership = memberships.length > 0;
      const isExpired = !activeM;
      const planName = activeM?.membership?.name || latestM?.membership?.name || (hasMembership ? 'Plan Vencido' : 'Sin Plan');
      const endDate = activeM?.endDate || latestM?.endDate || null;

      return {
        id: m.id,
        fullName: fullName.length > 0 ? fullName : 'Socio sin nombre',
        firstName,
        lastName,
        phone,
        email,
        hasMembership,
        isExpired,
        activePlanName: planName,
        membershipEndDate: endDate,
        activeMembership: {
          name: planName,
          endDate: endDate,
          isActive: !isExpired,
        },
        hasPendingPayment: false,
      };
    });
  }

  getTemplates(): CampaignTemplateDto[] {
    return [
      {
        id: 'recordatorio_pago',
        name: 'Recordatorio de Pago / Cuota Vencida',
        category: 'Cobranza',
        description: 'Notifica a los socios sobre cuotas pendientes o vencimiento de plan.',
        defaultChannel: CampaignChannel.BOTH,
        message:
          'Hola {nombre}, le saludamos de *{gimnasio}* 🏋️\n\nLe recordamos amablemente que su membresía *{plan}* presenta cuotas pendientes o vence el *{fecha_vencimiento}*.\n\nPor favor acérquese a recepción o contáctenos por esta vía para renovar su plan y continuar entrenando sin interrupciones.\n\n¡Muchas gracias!',
        variables: ['{nombre}', '{apellido}', '{nombre_completo}', '{gimnasio}', '{plan}', '{fecha_vencimiento}', '{telefono}'],
      },
      {
        id: 'promocion_temporada',
        name: 'Promoción Especial de Temporada',
        category: 'Promoción & Ventas',
        description: 'Ofertas exclusivas para renovaciones o descuentos especiales.',
        defaultChannel: CampaignChannel.BOTH,
        message:
          '¡Hola {nombre}! 🎉 En *{gimnasio}* queremos premiar tu esfuerzo y constancia.\n\nTenemos una promoción exclusiva para ti: aprovecha descuentos especiales en la renovación o extensión de tu membresía este mes.\n\n¡Pasa por recepción o respóndenos a este mensaje para activar tu descuento! 💪🔥',
        variables: ['{nombre}', '{apellido}', '{gimnasio}', '{plan}'],
      },
      {
        id: 'reactivacion_inactivos',
        name: 'Te Extrañamos / Reactivación de Socios',
        category: 'Fidelización',
        description: 'Reconquista a clientes que llevan tiempo sin asistir o sin renovar.',
        defaultChannel: CampaignChannel.BOTH,
        message:
          '¡Hola {nombre}! En *{gimnasio}* te extrañamos mucho 🏋️‍♂️\n\nSabemos lo importante que es tu bienestar físico y salud. Queremos invitarte a retomar tus entrenamientos con nosotros.\n\n¡Reingresa esta semana y recibe beneficios especiales en tu inscripción! Cuéntanos cuándo vuelves.',
        variables: ['{nombre}', '{apellido}', '{gimnasio}'],
      },
      {
        id: 'aviso_horario',
        name: 'Aviso de Mantenimiento / Horario Especial',
        category: 'Informativo',
        description: 'Comunica cambios en días festivos, remodelaciones o mantenimiento.',
        defaultChannel: CampaignChannel.BOTH,
        message:
          'Estimado/a socio/a *{nombre}*,\n\nLe informamos que en *{gimnasio}* estaremos laborando en horario especial durante los próximos días.\n\nPor favor tome en cuenta este aviso para planificar sus entrenamientos. ¡Agradecemos su preferencia!',
        variables: ['{nombre}', '{apellido}', '{gimnasio}'],
      },
      {
        id: 'felicitacion_cumpleanos',
        name: 'Felicitación de Cumpleaños',
        category: 'Celebración',
        description: 'Envía un saludo cálido a los socios en su mes o día de cumpleaños.',
        defaultChannel: CampaignChannel.BOTH,
        message:
          '¡Feliz Cumpleaños, {nombre}! 🎂🎈🎉\n\nDe parte de todo el equipo de *{gimnasio}*, te deseamos un día extraordinario lleno de energía, salud y metas cumplidas.\n\n¡Pasa por recepción durante tu mes de cumpleaños por una sorpresa especial de nuestra parte!',
        variables: ['{nombre}', '{apellido}', '{gimnasio}'],
      },
      {
        id: 'mensaje_libre',
        name: 'Mensaje Personalizado Libre',
        category: 'General',
        description: 'Redacta un comunicado libre con variables dinámicas.',
        defaultChannel: CampaignChannel.BOTH,
        message:
          'Hola {nombre},\n\nTe escribimos desde *{gimnasio}* para informarte que...',
        variables: ['{nombre}', '{apellido}', '{nombre_completo}', '{gimnasio}', '{plan}', '{fecha_vencimiento}', '{telefono}', '{email}'],
      },
    ];
  }

  private async getMembersForAudience(audience: CampaignAudience, customMemberIds?: string[]): Promise<Member[]> {
    let members: Member[] = [];
    const query = this.memberRepo.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .leftJoinAndSelect('memberships.membership', 'membershipPlan');

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
      customMemberIdsJson: dto.customMemberIds ? JSON.stringify(dto.customMemberIds) : undefined,
    });
    const savedCampaign = await this.campaignRepo.save(campaign);

    if (isScheduled) {
      this.logger.log(`Campaña ${savedCampaign.id} programada para ${dto.scheduledAt}`);
      return savedCampaign;
    }

    const members = await this.getMembersForAudience(dto.audience, dto.customMemberIds);
    savedCampaign.recipientsCount = members.length;
    await this.campaignRepo.save(savedCampaign);

    // Ejecución asíncrona para no bloquear la respuesta HTTP
    this.processCampaignAsync(savedCampaign, members, dto.messageTemplate, dto.couponCode, dto.channel);

    return savedCampaign;
  }

  private isProcessingScheduled = false;

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    if (this.isProcessingScheduled) {
      return;
    }

    this.isProcessingScheduled = true;
    try {
      const settingsList = await this.gymSettingsRepo.find({ order: { updatedAt: 'DESC' }, take: 1 });
      const settings = settingsList[0];
      if (settings?.enableCampaignScheduler === false) {
        return;
      }

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
    } finally {
      this.isProcessingScheduled = false;
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

    // Obtener configuración del gimnasio
    const gymSettings = await this.gymSettingsRepo.find({ take: 1 });
    const gymName = gymSettings.length > 0 && gymSettings[0].gymName ? gymSettings[0].gymName : 'Gimnasio';
    let logoHtml = '';
    if (gymSettings.length > 0 && gymSettings[0].logoImage) {
      const base64Logo = gymSettings[0].logoImage.toString('base64');
      logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="data:image/png;base64,${base64Logo}" alt="Logo" style="max-height: 90px; border-radius: 8px;"></div>`;
    }

    this.logger.log(`Iniciando envío de campaña "${campaign.name}" (${campaign.id}) para ${members.length} destinatarios vía ${channel}`);

    for (const member of members) {
      if (!member.user) continue;

      const user = member.user;
      const firstName = user.firstName || 'Cliente';
      const lastName = user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const phone = user.phone || '';
      const email = user.email || '';

      // Determinar membresía activa o última membresía
      let planName = 'Membresía General';
      let endDateStr = 'Sin fecha';
      if (member.memberships && member.memberships.length > 0) {
        const activeM = member.memberships.find(m => m.isActive) || member.memberships[0];
        if (activeM.membership?.name) planName = activeM.membership.name;
        if (activeM.endDate) {
          try {
            endDateStr = new Date(activeM.endDate).toISOString().split('T')[0];
          } catch (_) {
            endDateStr = String(activeM.endDate);
          }
        }
      }

      // Reemplazo de variables
      let textMessage = template
        .replace(/{nombre}/g, firstName)
        .replace(/{apellido}/g, lastName)
        .replace(/{nombre_completo}/g, fullName)
        .replace(/{gimnasio}/g, gymName)
        .replace(/{plan}/g, planName)
        .replace(/{fecha_vencimiento}/g, endDateStr)
        .replace(/{telefono}/g, phone)
        .replace(/{email}/g, email);

      if (coupon) {
        textMessage += `\n\n🏷️ *Cupón exclusivo:* ${coupon.code} (${coupon.discountPercentage}% OFF)`;
      }

      // Preparar versión HTML para correo
      const formattedHtmlBody = textMessage.replace(/\n/g, '<br/>');
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #12151b; color: #f1f1f1; padding: 30px; margin: 0; }
            .container { max-width: 580px; margin: 0 auto; background-color: #1b2028; border-radius: 12px; padding: 28px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #facc15; text-align: center; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; font-size: 24px; }
            .content { font-size: 16px; line-height: 1.6; margin: 24px 0; color: #e2e8f0; }
            .coupon-box { background: linear-gradient(135deg, #facc15 0%, #eab308 100%); color: #111827; border-radius: 8px; padding: 18px; text-align: center; margin-top: 20px; }
            .coupon-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; }
            .coupon-code { font-size: 26px; font-weight: 900; background-color: #ffffff; padding: 6px 16px; border-radius: 6px; display: inline-block; margin: 8px 0; letter-spacing: 2px; }
            .footer { text-align: center; margin-top: 28px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoHtml}
            <h1>${gymName}</h1>
            <div class="content">${formattedHtmlBody}</div>
            ${coupon ? `
              <div class="coupon-box">
                <div class="coupon-title">CUPÓN DE DESCUENTO</div>
                <div class="coupon-code">${coupon.code}</div>
                <div><strong>${coupon.discountPercentage}% DE DESCUENTO</strong></div>
                ${coupon.expiresAt ? `<div style="font-size:12px; margin-top:4px;">Válido hasta: ${coupon.expiresAt.toISOString().split('T')[0]}</div>` : ''}
              </div>
            ` : ''}
            <div class="footer">Este es un mensaje automático de ${gymName}. Por favor no responda directamente a este correo.</div>
          </div>
        </body>
        </html>
      `;

      try {
        let sent = false;

        // 1. Envío vía WhatsApp
        if ((channel === CampaignChannel.WHATSAPP || channel === CampaignChannel.BOTH) && phone) {
          try {
            await this.outboxService.enqueueWhatsapp({
              recipient: phone,
              recipientName: fullName,
              content: textMessage,
              priority: NotificationPriority.LOW,
              metadata: { source: 'campaign', campaignId: campaign.id, memberId: member.id },
            });
            sent = true;
            this.logger.debug(`[Campaign] WhatsApp encolado en Outbox para ${phone}`);
          } catch (waErr) {
            this.logger.warn(`[Campaign] Error encolando WhatsApp a ${phone}: ${waErr.message}`);
          }
        }

        // 2. Envío vía Correo Electrónico
        if ((channel === CampaignChannel.EMAIL || channel === CampaignChannel.BOTH) && email) {
          try {
            await this.outboxService.enqueueEmail({
              recipient: email,
              recipientName: fullName,
              subject: campaign.name,
              htmlContent: htmlContent,
              content: textMessage,
              priority: NotificationPriority.LOW,
              metadata: { source: 'campaign', campaignId: campaign.id, memberId: member.id },
            });
            sent = true;
            this.logger.debug(`[Campaign] Correo encolado en Outbox para ${email}`);
          } catch (mailErr) {
            this.logger.warn(`[Campaign] Error encolando Correo a ${email}: ${mailErr.message}`);
          }
        }

        if (sent) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
        this.logger.error(`[Campaign] Fallo general en destinatario ${fullName}: ${err.message}`);
      }
    }

    campaign.successfulSends = successCount;
    campaign.failedSends = failCount;
    campaign.status = CampaignStatus.COMPLETED;
    await this.campaignRepo.save(campaign);
    this.logger.log(`Campaña "${campaign.name}" (${campaign.id}) completada: ${successCount} exitosos, ${failCount} fallidos.`);
  }
}
