import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BulkPromotion } from '../../entities/bulk-promotion.entity';
import { Member } from '../../entities/member.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { Coupon } from '../../entities/coupon.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { EmailService } from './email.service';
import { EmailTemplateBuilder, GymConfig } from './email-template.builder';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { CouponsService } from '../coupons/coupons.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationPriority } from '../outbox/entities/notification-outbox.entity';

@Injectable()
export class BulkPromotionService {
  private readonly logger = new Logger(BulkPromotionService.name);

  constructor(
    @InjectRepository(BulkPromotion)
    private bulkPromotionRepository: Repository<BulkPromotion>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(GymSettings)
    private gymSettingsRepository: Repository<GymSettings>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    private dataSource: DataSource,
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
    private couponsService: CouponsService,
    private outboxService: OutboxService,
  ) {}

  /**
   * Crear una nueva promoción en lote
   */
  async createBulkPromotion(
    title: string,
    description: string,
    htmlContent: string,
    sendToAll: boolean,
    memberIds?: string[],
    scheduledFor?: Date,
  ): Promise<BulkPromotion> {
    try {
      const members = sendToAll
        ? await this.memberRepository.find()
        : await this.memberRepository.findByIds(memberIds || []);

      const promotion = this.bulkPromotionRepository.create({
        title,
        description,
        htmlContent,
        sendToAll,
        members,
        totalRecipients: members.length,
        scheduledFor,
        status: scheduledFor ? 'SCHEDULED' : 'PENDING',
      });

      await this.bulkPromotionRepository.save(promotion);
      this.logger.log(
        `📢 Promoción creada: ${title} para ${members.length} miembros`,
      );
      return promotion;
    } catch (error) {
      this.logger.error('Error al crear promoción:', error);
      throw error;
    }
  }

  /**
   * Enviar promoción a todos los destinatarios
   */
  async sendBulkPromotion(promotionId: string): Promise<BulkPromotion> {
    try {
      const promotion = await this.bulkPromotionRepository.findOne({
        where: { id: promotionId },
        relations: ['members'],
      });

      if (!promotion) {
        throw new Error('Promoción no encontrada');
      }

      const gymSettings = await this.gymSettingsService.getSettings();
      const gymConfig: GymConfig = {
        gymName: gymSettings?.gymName || 'Gym Manager',
        email: gymSettings?.email || '',
        phone: gymSettings?.phone,
        address: gymSettings?.address,
        website: gymSettings?.website,
      };

      this.logger.log(`📤 Enviando promoción: ${promotion.title}`);

      for (const member of promotion.members) {
        try {
          const memberWithUser = await this.memberRepository.findOne({
            where: { id: member.id },
            relations: ['user'],
          });

          if (!memberWithUser?.user?.email) {
            this.logger.warn(`⚠️ Email no disponible para: ${member.id}`);
            promotion.failedCount++;
            continue;
          }

          await this.outboxService.enqueueEmail({
            recipient: memberWithUser.user.email,
            recipientName: memberWithUser.user.firstName,
            subject: promotion.title,
            htmlContent: promotion.htmlContent,
            content: promotion.description,
            priority: NotificationPriority.LOW,
            metadata: { source: 'bulk-promotion', promotionId: promotion.id, memberId: member.id },
          });

          promotion.sentCount++;
          this.logger.log(
            `✅ Promoción encolada en Outbox para: ${memberWithUser.user.email}`,
          );
        } catch (error) {
          this.logger.error(`❌ Error encolando a ${member.id}:`, error);
          promotion.failedCount++;
        }
      }

      promotion.status = 'SENT';
      promotion.sentAt = new Date();
      await this.bulkPromotionRepository.save(promotion);

      this.logger.log(
        `📊 Promoción completada: ${promotion.sentCount} enviados, ${promotion.failedCount} fallidos`,
      );
      return promotion;
    } catch (error) {
      this.logger.error('Error enviando promoción en lote:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las promociones
   */
  async getAllPromotions(): Promise<BulkPromotion[]> {
    return this.bulkPromotionRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Obtener promoción por ID
   */
  async getPromotionById(id: string): Promise<BulkPromotion | null> {
    return this.bulkPromotionRepository.findOne({
      where: { id },
      relations: ['members'],
    });
  }

  /**
   * Actualizar promoción
   */
  async updatePromotion(
    id: string,
    data: Partial<BulkPromotion>,
  ): Promise<BulkPromotion | null> {
    await this.bulkPromotionRepository.update(id, data);
    return this.getPromotionById(id);
  }

  /**
   * Eliminar promoción
   */
  async deletePromotion(id: string): Promise<void> {
    await this.bulkPromotionRepository.delete(id);
    this.logger.log(`🗑️ Promoción eliminada: ${id}`);
  }

  /**
   * Obtener cupones/promociones activos (de la tabla promotions)
   */
  async getActivePromotions(): Promise<any[]> {
    try {
      // Usar consulta raw SQL para asegurar que obtenemos los datos
      const promotions = await this.dataSource.query(
        'SELECT * FROM promotions ORDER BY createdAt DESC'
      );
      
      this.logger.log(`📊 Promociones obtenidas: ${promotions.length}`);
      
      return promotions;
    } catch (error) {
      this.logger.error('Error al obtener promociones:', error);
      return [];
    }
  }

  /**
   * Obtener cupones activos para cumpleaños (legacy - de tabla coupons)
   */
  async getActiveBirthdayCoupons(): Promise<Coupon[]> {
    return await this.couponRepository.find({
      where: {
        type: 'BIRTHDAY',
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener configuración de descuento de cumpleaños
   */
  async getBirthdayDiscountSettings(): Promise<any> {
    const settings = await this.gymSettingsRepository.findOne({
      where: {},
    });

    let couponData = null;
    if (settings?.birthdayDiscountCouponId) {
      // Buscar en tabla promotions
      const promos = await this.dataSource.query(
        'SELECT * FROM promotions WHERE id = ?',
        [settings.birthdayDiscountCouponId]
      );
      couponData = promos.length > 0 ? promos[0] : null;
    }

    return {
      birthdayDiscountEnabled: settings?.birthdayDiscountEnabled || false,
      birthdayDiscountCoupon: couponData,
    };
  }

  /**
   * Actualizar configuración de descuento de cumpleaños
   */
  async updateBirthdayDiscountSettings(dto: {
    birthdayDiscountEnabled: boolean;
    birthdayDiscountCouponId?: string;
  }): Promise<any> {
    try {
      this.logger.log(`📝 Iniciando actualización de descuento: ${JSON.stringify(dto)}`);
      
      const settings = await this.gymSettingsRepository.findOne({ where: {} });
      if (!settings) {
        this.logger.error('❌ Configuración del gym no encontrada');
        throw new Error('Configuración del gym no encontrada');
      }

      this.logger.log(`Current settings ID: ${settings.id}`);

      // Validar que el cupón existe si se proporciona
      let promotion: any = null;
      if (dto.birthdayDiscountCouponId) {
        this.logger.log(`🔍 Buscando promoción con ID: ${dto.birthdayDiscountCouponId}`);
        const promotions = await this.dataSource.query(
          'SELECT * FROM promotions WHERE id = ?',
          [dto.birthdayDiscountCouponId]
        );

        if (promotions.length === 0) {
          this.logger.error(`❌ Promoción no encontrada: ${dto.birthdayDiscountCouponId}`);
          throw new Error('Cupón/Promoción no encontrado');
        }

        promotion = promotions[0];
        if (promotion) {
          this.logger.log(`✅ Promoción encontrada: ${promotion.code}`);
        }
      }

      // Actualizar directamente en la base de datos
      const updateData: any = {
        birthdayDiscountEnabled: dto.birthdayDiscountEnabled,
      };

      if (dto.birthdayDiscountCouponId) {
        updateData.birthdayDiscountCouponId = dto.birthdayDiscountCouponId;
      } else {
        updateData.birthdayDiscountCouponId = null;
      }

      await this.gymSettingsRepository.update({ id: settings.id }, updateData);
      this.logger.log('✅ Configuración guardada en base de datos');

      // Retornar la configuración actualizada
      return {
        statusCode: 200,
        data: {
          birthdayDiscountEnabled: dto.birthdayDiscountEnabled,
          birthdayDiscountCoupon: promotion,
        },
        message: 'Configuración de descuento actualizada correctamente',
      };
    } catch (error) {
      this.logger.error(`❌ Error al actualizar descuento: ${error.message}`, error.stack);
      throw error;
    }
  }
}
