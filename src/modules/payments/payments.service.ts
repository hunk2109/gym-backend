import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Payment, PaymentStatus, PaymentType } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto';
import { PermissionsService } from '../auth/services/permissions.service';
import { EmailService } from '../email-settings/email.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';

import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    private readonly permissionsService: PermissionsService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto, userId?: string): Promise<Payment> {
    console.log(`[PAYMENTS_SERVICE] createPayment called with userId:`, userId);
    const payment = this.paymentRepository.create(createPaymentDto);
    console.log(`[PAYMENTS_SERVICE] Payment created (before userId assignment):`, { id: payment.id, createdBy: payment.createdBy, updatedBy: payment.updatedBy });
    
    // Asignar userId a createdBy y updatedBy - pero permitir pasar undefined
    if (userId) {
      payment.createdBy = userId;
      payment.updatedBy = userId;
      console.log(`[PAYMENTS_SERVICE] Assigned userId to payment:`, { createdBy: payment.createdBy, updatedBy: payment.updatedBy });
    } else {
      console.log(`[PAYMENTS_SERVICE] ⚠️ userId es undefined/null!`);
    }
    
    // Si el monto es $0, marcar automáticamente como completado
    if (payment.amount === 0) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentDate = new Date();
      console.log(`[PAYMENTS_SERVICE] 💰 Auto-completing $0 payment with paymentDate: ${payment.paymentDate}`);
      this.logger.log(`[Payment] Auto-completing $0 payment with paymentDate`);
    }
    
    // Asignar paymentDate si no está ya asignada y está en COMPLETED
    if (!payment.paymentDate && payment.status === PaymentStatus.COMPLETED) {
      payment.paymentDate = new Date();
      console.log(`[PAYMENTS_SERVICE] Setting paymentDate for COMPLETED status: ${payment.paymentDate}`);
    }
    
    console.log(`[PAYMENTS_SERVICE] Before save - payment:`, { id: payment.id, createdBy: payment.createdBy, updatedBy: payment.updatedBy, amount: payment.amount, status: payment.status, paymentDate: payment.paymentDate });
    const savedPayment = await this.paymentRepository.save(payment);
    console.log(`[PAYMENTS_SERVICE] After save - savedPayment:`, { id: savedPayment.id, createdBy: savedPayment.createdBy, updatedBy: savedPayment.updatedBy, status: savedPayment.status, paymentDate: savedPayment.paymentDate });
    
    this.logger.log(`[Payment] Payment created. ID: ${savedPayment.id}, Amount: ${createPaymentDto.amount}, Status: ${savedPayment.status}, PaymentDate: ${savedPayment.paymentDate}, createdBy: ${savedPayment.createdBy}`);
    return savedPayment;
  }

  /**
   * Asignar userId automáticamente si no está presente
   */
  private assignUserIdIfMissing(entity: any, userId?: string): void {
    if (userId) {
      if (!entity.createdBy) entity.createdBy = userId;
      if (!entity.updatedBy) entity.updatedBy = userId;
    }
  }

  async getAllPayments(page: number = 1, limit: number = 10): Promise<{ data: Payment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .skip(skip)
      .take(limit)
      .orderBy('payment.paymentDate', 'DESC')
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentsForCashRegister(startDate: Date, endDate: Date): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: PaymentStatus.COMPLETED
      },
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.getPaymentById(id);

    Object.assign(payment, updatePaymentDto);

    // Si el monto es $0, marcar automáticamente como completado
    if (payment.amount === 0) {
      payment.status = PaymentStatus.COMPLETED;
      this.logger.log(`[Payment] Auto-completing $0 payment ${id}`);
    }

    const savedPayment = await this.paymentRepository.save(payment);
    // paymentStatus se calcula dinámicamente desde la tabla Payment
    // Ya no se actualiza member_membership.paymentStatus

    return savedPayment;
  }

  async updatePaymentStatus(id: string, status: PaymentStatus, paymentDate?: Date, userId?: string): Promise<Payment> {
    console.log(`[PAYMENTS_SERVICE] updatePaymentStatus called with userId:`, userId);
    const payment = await this.getPaymentById(id);
    const previousStatus = payment.status;

    payment.status = status;
    
    // Asignar userId a updatedBy
    if (userId) {
      payment.updatedBy = userId;
      console.log(`[PAYMENTS_SERVICE] Assigned userId to updatedBy:`, userId);
    }
    
    // Si se está marcando como completado, asignar paymentDate
    if (status === PaymentStatus.COMPLETED) {
      const dateToSet = paymentDate || new Date();
      payment.paymentDate = dateToSet;
      console.log(`[PAYMENTS_SERVICE] Payment marked as COMPLETED with paymentDate:`, dateToSet);
      this.logger.log(`[Payment] Payment completed. ID: ${id}, Amount: ${payment.amount}, Payment Date: ${dateToSet}`);
    } else {
      this.logger.log(`[Payment] Payment status updated. ID: ${id}, Status: ${status}`);
    }

    console.log(`[PAYMENTS_SERVICE] Before save - payment:`, { id: payment.id, status: payment.status, paymentDate: payment.paymentDate, updatedBy: payment.updatedBy });
    const savedPayment = await this.paymentRepository.save(payment);
    console.log(`[PAYMENTS_SERVICE] After save - savedPayment:`, { id: savedPayment.id, status: savedPayment.status, paymentDate: savedPayment.paymentDate, updatedBy: savedPayment.updatedBy });

    if (previousStatus !== PaymentStatus.COMPLETED && savedPayment.status === PaymentStatus.COMPLETED) {
      await this.sendPaymentConfirmationSafe(savedPayment);
    }

    return savedPayment;
  }

  async deletePayment(id: string): Promise<void> {
    const payment = await this.getPaymentById(id);
    await this.paymentRepository.remove(payment);
    this.logger.warn(`[SENSITIVE] Payment deleted. ID: ${id}, Amount: ${payment.amount}`);
  }

  async getPaymentsByMember(memberId: string, page: number = 1, limit: number = 10): Promise<{ data: Payment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId })
      .skip(skip)
      .take(limit)
      .orderBy('payment.paymentDate', 'DESC')
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentsByStatus(status: PaymentStatus, page: number = 1, limit: number = 10): Promise<{ data: Payment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status })
      .skip(skip)
      .take(limit)
      .orderBy('payment.paymentDate', 'DESC')
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentsByDateRange(startDate: Date, endDate: Date, page: number = 1, limit: number = 10): Promise<{ data: Payment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.paymentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .skip(skip)
      .take(limit)
      .orderBy('payment.paymentDate', 'DESC')
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentStatistics(): Promise<any> {
    const [totalPayments, completedPayments, pendingPayments, failedPayments] = await Promise.all([
      this.paymentRepository.count(),
      this.paymentRepository.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.paymentRepository.count({ where: { status: PaymentStatus.PENDING } }),
      this.paymentRepository.count({ where: { status: PaymentStatus.FAILED } }),
    ]);

    const totalAmount = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const averageAmount = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('AVG(payment.amount)', 'average')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const byPaymentMethod = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'method')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    const byPaymentType = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentType', 'type')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.paymentType')
      .getRawMany();

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalAmount: totalAmount.total ? parseFloat(totalAmount.total) : 0,
      averageAmount: averageAmount.average ? parseFloat(averageAmount.average) : 0,
      byPaymentMethod,
      byPaymentType,
      currency: 'DOP',
    };
  }

  async getMemberPaymentHistory(memberId: string): Promise<any> {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId })
      .orderBy('payment.paymentDate', 'DESC')
      .getMany();

    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const totalPending = payments
      .filter((p) => p.status === PaymentStatus.PENDING)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    return {
      memberId,
      totalPaid,
      totalPending,
      completedPayments: payments.filter((p) => p.status === PaymentStatus.COMPLETED).length,
      pendingPayments: payments.filter((p) => p.status === PaymentStatus.PENDING).length,
      failedPayments: payments.filter((p) => p.status === PaymentStatus.FAILED).length,
      payments,
    };
  }

  async recordRefund(paymentId: string, refundAmount?: number): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Payment has already been refunded');
    }

    const oldStatus = payment.status;
    payment.status = PaymentStatus.REFUNDED;
    const refundedPayment = await this.paymentRepository.save(payment);
    
    this.logger.warn(`[SENSITIVE] Payment refunded. ID: ${paymentId}, Amount: ${payment.amount}, Old Status: ${oldStatus}`);
    return refundedPayment;
  }

  async getPendingPayments(daysOverdue: number = 0): Promise<Payment[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

    const pendingPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.dueDate <= :cutoffDate', { cutoffDate })
      .orderBy('payment.dueDate', 'ASC')
      .getMany();

    return Promise.all(
      pendingPayments.map(async (payment) => {
        let member: any = null;
        if (payment.paymentType === PaymentType.MEMBERSHIP) {
          const mm = await this.memberMembershipRepository.findOne({
            where: { paymentId: payment.id },
            relations: ['member', 'member.user'],
          });
          if (mm) member = mm.member;
        } else if (payment.paymentType === PaymentType.REGISTRATION) {
          const m = await this.memberRepository.findOne({
            where: { registrationPaymentId: payment.id },
            relations: ['user'],
          });
          if (m) member = m;
        }
        return Object.assign(payment, { member });
      })
    );
  }

  /**
   * Obtener TODOS los pagos pendientes de la tabla Payment (SIN agrupar por membresía)
   * Los pagos ya están consolidados por la lógica en addCompanionToGroup/removeCompanionFromGroup
   */
  async getAllPendingPayments(daysOverdue: number = 0): Promise<any[]> {
    this.logger.log(`[Payments] getAllPendingPayments - Obteniendo TODOS los pagos pendientes individuales...`);

    // QUERY SIMPLE - SIN JOINS QUE CAUSEN MULTIPLICIDAD
    // Solo retornar pagos con status PENDING (sin filtro de fecha)
    const pendingPayments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.PENDING,
      },
      order: {
        dueDate: 'ASC',
      },
    });

    const enrichedPayments = await Promise.all(
      pendingPayments.map(async (payment) => {
        let member: any = null;
        if (payment.paymentType === PaymentType.MEMBERSHIP) {
          const mm = await this.memberMembershipRepository.findOne({
            where: { paymentId: payment.id },
            relations: ['member', 'member.user'],
          });
          if (mm) member = mm.member;
        } else if (payment.paymentType === PaymentType.REGISTRATION) {
          const m = await this.memberRepository.findOne({
            where: { registrationPaymentId: payment.id },
            relations: ['user'],
          });
          if (m) member = m;
        }

        return {
          ...payment,
          member,
        };
      })
    );

    this.logger.log(`[Payments] Encontrados ${enrichedPayments.length} pagos pendientes`);
    enrichedPayments.forEach((p, idx) => {
      this.logger.log(`[Payments]   ${idx + 1}. ID: ${p.id}, Monto: $${p.amount}`);
    });

    return enrichedPayments;
  }

  /**
   * Diagnóstico - Obtener pagos de inscripción completados recientemente
   */
  async diagnosisGetCompletedRegistrationPayments(): Promise<any[]> {
    try {
      const payments = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.paymentType = :paymentType', { paymentType: PaymentType.REGISTRATION })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .orderBy('payment.createdAt', 'DESC')
        .limit(10)
        .getMany();

      console.log(`[DIAGNOSIS] Found ${payments.length} completed registration payments`);
      payments.forEach((p) => {
        console.log(`[DIAGNOSIS] Payment ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}, PaymentDate: ${p.paymentDate}, CreatedAt: ${p.createdAt}`);
      });

      return payments;
    } catch (e) {
      console.error(`[DIAGNOSIS] Error: ${e.message}`);
      throw e;
    }
  }

  async getAllPaymentsWithoutPagination(): Promise<any[]> {
    try {
      this.logger.log(`[Payments] getAllPaymentsWithoutPagination - Obteniendo todos los pagos`);

      const payments = await this.paymentRepository
        .createQueryBuilder('payment')
        .orderBy('COALESCE(payment.paymentDate, payment.createdAt)', 'DESC')
        .getMany();

      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          let member: any = null;
          if (payment.paymentType === PaymentType.MEMBERSHIP) {
            const mm = await this.memberMembershipRepository.findOne({
              where: { paymentId: payment.id },
              relations: ['member', 'member.user'],
            });
            if (mm) member = mm.member;
          } else if (payment.paymentType === PaymentType.REGISTRATION) {
            const m = await this.memberRepository.findOne({
              where: { registrationPaymentId: payment.id },
              relations: ['user'],
            });
            if (m) member = m;
          }

          return {
            ...payment,
            member,
            memberName: member?.user ? `${member.user.firstName} ${member.user.lastName}` : 'Sin nombre',
          };
        })
      );

      this.logger.log(`[Payments] Total de pagos encontrados: ${enrichedPayments.length}`);
      return enrichedPayments;
    } catch (error) {
      this.logger.error(`[Payments] Error en getAllPaymentsWithoutPagination: ${error.message}`);
      return [];
    }
  }

  /**
   * Completar pago de inscripción de un miembro
   */
  /**
   * Pagar un pago por su ID
   * Verifica que esté PENDING y procesa según el tipo de pago
   */
  async payPayment(paymentId: string, paymentMethod: string = 'cash', userId?: string, discountCode?: string, paymentDate?: Date): Promise<any> {
    console.log(`[PAYMENTS_SERVICE] payPayment called - paymentId: ${paymentId}, paymentMethod: ${paymentMethod}, discountCode: ${discountCode}`);

    // 1. Obtener el pago
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // 2. Verificar que esté PENDING
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment ${paymentId} is not pending. Current status: ${payment.status}`);
    }

    console.log(`[PAYMENTS_SERVICE] Payment found: Type=${payment.paymentType}, Amount=${payment.amount}`);

    // 3. Procesar según el tipo de pago
    let result: any;
    switch (payment.paymentType) {
      case PaymentType.REGISTRATION:
        result = await this.payRegistrationPayment(payment, paymentMethod, userId, discountCode, paymentDate);
        break;
      case PaymentType.MEMBERSHIP:
        result = await this.payMembershipPayment(payment, paymentMethod, userId, discountCode, paymentDate);
        break;
      default:
        // Otros tipos de pago también se completan igual (sin descuentos soportados por ahora)
        result = await this.payOtherTypePayment(payment, paymentMethod, userId, paymentDate);
    }

    return result;
  }

  /**
   * Procesar pago de inscripción
   */
  private async payRegistrationPayment(payment: Payment, paymentMethod: string, userId?: string, discountCode?: string, paymentDate?: Date): Promise<any> {
    console.log(`[PAYMENTS_SERVICE] Processing REGISTRATION payment: ID=${payment.id}, Amount=${payment.amount}`);

    let finalAmount = payment.amount;

    if (discountCode) {
      const validation = await this.promotionsService.validatePromoCode({
        code: discountCode,
      });

      if (!validation.valid) {
        throw new BadRequestException(`Código de descuento inválido: ${validation.message}`);
      }

      const discountAmount = payment.amount * (validation.discount / 100);
      finalAmount = payment.amount - discountAmount;
      
      // Actualizar el uso del cupón
      await this.promotionsService.applyPromotion(discountCode);
    }

    // Actualizar estado a COMPLETED y nuevo monto
    payment.status = PaymentStatus.COMPLETED;
    payment.amount = finalAmount;
    payment.paymentMethod = paymentMethod as any;
    payment.paymentDate = paymentDate || new Date();
    if (userId) {
      payment.updatedBy = userId;
    }

    const updatedPayment = await this.paymentRepository.save(payment);
    console.log(`[PAYMENTS_SERVICE] ✅ Registration payment saved: ID=${updatedPayment.id}, Status=${updatedPayment.status}, FinalAmount=${finalAmount}`);

    this.logger.log(`[Registration Payment] ✅ Payment completed. Amount: $${finalAmount}`);
    await this.sendPaymentConfirmationSafe(updatedPayment);

    return {
      statusCode: 200,
      success: true,
      message: `✅ Pago de inscripción completado exitosamente`,
      data: updatedPayment,
    };
  }

  /**
   * Procesar pago de membresía
   */
  private async payMembershipPayment(payment: Payment, paymentMethod: string, userId?: string, discountCode?: string, paymentDate?: Date): Promise<any> {
    console.log(`[PAYMENTS_SERVICE] Processing MEMBERSHIP payment: ID=${payment.id}, Amount=${payment.amount}`);

    let finalAmount = payment.amount;
    let appliedDiscountPercentage = 0;

    if (discountCode) {
      const validation = await this.promotionsService.validatePromoCode({
        code: discountCode,
      });

      if (!validation.valid) {
        throw new BadRequestException(`Código de descuento inválido: ${validation.message}`);
      }

      appliedDiscountPercentage = validation.discount;
      const discountAmount = payment.amount * (validation.discount / 100);
      finalAmount = payment.amount - discountAmount;
      
      // Actualizar el uso del cupón
      await this.promotionsService.applyPromotion(discountCode);
    }

    // Actualizar estado a COMPLETED y el nuevo monto
    payment.status = PaymentStatus.COMPLETED;
    payment.amount = finalAmount;
    payment.paymentMethod = paymentMethod as any;
    payment.paymentDate = paymentDate || new Date();
    if (userId) {
      payment.updatedBy = userId;
    }

    const updatedPayment = await this.paymentRepository.save(payment);

    console.log(`[PAYMENTS_SERVICE] ✅ Membership payment saved: ID=${updatedPayment.id}, Status=${updatedPayment.status}, FinalAmount=${finalAmount}`);
    this.logger.log(`[Membership Payment] ✅ Payment completed. Amount: $${finalAmount}`);
    await this.sendPaymentConfirmationSafe(updatedPayment, appliedDiscountPercentage);

    return {
      statusCode: 200,
      success: true,
      message: `✅ Pago de membresía completado exitosamente`,
      data: updatedPayment,
    };
  }

  /**
   * Procesar otros tipos de pago (CLASS, PRODUCT, SERVICE, OTHER)
   */
  private async payOtherTypePayment(payment: Payment, paymentMethod: string, userId?: string, paymentDate?: Date): Promise<any> {
    console.log(`[PAYMENTS_SERVICE] Processing OTHER payment: ID=${payment.id}, Amount=${payment.amount}`);

    // Actualizar estado a COMPLETED
    payment.status = PaymentStatus.COMPLETED;
    payment.paymentMethod = paymentMethod as any;
    payment.paymentDate = paymentDate || new Date();
    if (userId) {
      payment.updatedBy = userId;
    }

    const updatedPayment = await this.paymentRepository.save(payment);
    console.log(`[PAYMENTS_SERVICE] ✅ Payment saved: ID=${updatedPayment.id}, Status=${updatedPayment.status}`);

    this.logger.log(`[Payment] ✅ Payment completed. Type: ${payment.paymentType}, Amount: $${payment.amount}`);

    return {
      statusCode: 200,
      success: true,
      message: `✅ Pago completado exitosamente`,
      data: updatedPayment,
    };
  }

  private async sendPaymentConfirmationSafe(payment: Payment, discountPercentage: number = 0): Promise<void> {
    try {
      if (![PaymentType.MEMBERSHIP, PaymentType.REGISTRATION].includes(payment.paymentType)) {
        return;
      }

      const context = await this.resolvePaymentMemberContext(payment);
      if (!context?.member?.user) {
        this.logger.warn(`[Payments] No se pudo enviar confirmacion: pago ${payment.id} sin miembro asociado`);
        return;
      }

      const { member, membershipName, startDate, endDate } = context;
      const user = member.user;
      const memberName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'cliente';
      const paymentLabel = payment.paymentType === PaymentType.REGISTRATION ? 'inscripcion' : 'membresia';
      const amount = this.formatMoney(payment.amount);
      const paidAt = this.formatDate(payment.paymentDate || new Date());
      const details = [
        payment.paymentType === PaymentType.MEMBERSHIP && membershipName ? `Plan: ${membershipName}` : null,
        startDate ? `Inicio: ${this.formatDate(startDate)}` : null,
        endDate ? `Vencimiento: ${this.formatDate(endDate)}` : null,
        discountPercentage > 0 ? `Descuento aplicado: ${discountPercentage}%` : null,
      ].filter(Boolean);

      const plainText = [
        `Hola ${memberName},`,
        '',
        `Hemos recibido tu pago de ${paymentLabel}.`,
        `Monto pagado: RD$ ${amount}`,
        `Fecha de pago: ${paidAt}`,
        ...details.map((detail) => String(detail)),
        '',
        'Gracias por tu pago.',
      ].join('\n');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Pago recibido</h2>
          <p>Hola <strong>${memberName}</strong>, hemos recibido tu pago de ${paymentLabel}.</p>
          <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Monto pagado</strong></td><td style="padding: 8px; border: 1px solid #ddd;">RD$ ${amount}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Fecha de pago</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paidAt}</td></tr>
            ${details.map((detail) => `<tr><td colspan="2" style="padding: 8px; border: 1px solid #ddd;">${detail}</td></tr>`).join('')}
          </table>
          <p>Gracias por tu pago.</p>
        </div>
      `;

      if (user.phone) {
        try {
          await this.whatsappService.sendMessage(user.phone, plainText);
          this.logger.log(`[Payments] Confirmacion WhatsApp enviada a ${user.phone}`);
        } catch (error) {
          this.logger.warn(`[Payments] No se pudo enviar WhatsApp de pago ${payment.id}: ${error.message}`);
        }
      }

      if (user.email) {
        try {
          await this.emailService.sendEmail({
            recipientEmail: user.email,
            recipientName: memberName,
            subject: `Pago de ${paymentLabel} recibido`,
            htmlContent,
            plainTextContent: plainText,
          });
          this.logger.log(`[Payments] Confirmacion email enviada a ${user.email}`);
        } catch (error) {
          this.logger.warn(`[Payments] No se pudo enviar email de pago ${payment.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.warn(`[Payments] Error preparando confirmacion de pago ${payment.id}: ${error.message}`);
    }
  }

  private async resolvePaymentMemberContext(payment: Payment): Promise<{
    member: Member;
    membershipName?: string;
    startDate?: Date;
    endDate?: Date;
  } | null> {
    if (payment.paymentType === PaymentType.MEMBERSHIP) {
      const memberMembership = await this.memberMembershipRepository.findOne({
        where: { paymentId: payment.id },
        relations: ['member', 'member.user', 'membership'],
      });

      if (!memberMembership?.member) {
        return null;
      }

      return {
        member: memberMembership.member,
        membershipName: memberMembership.membership?.name,
        startDate: memberMembership.startDate,
        endDate: memberMembership.endDate,
      };
    }

    if (payment.paymentType === PaymentType.REGISTRATION) {
      const member = await this.memberRepository.findOne({
        where: { registrationPaymentId: payment.id },
        relations: ['user'],
      });

      return member ? { member } : null;
    }

    return null;
  }

  private formatMoney(value: any): string {
    return Number(value || 0).toFixed(2);
  }

  private formatDate(value: Date | string): string {
    return new Date(value).toLocaleDateString('es-DO');
  }
}
