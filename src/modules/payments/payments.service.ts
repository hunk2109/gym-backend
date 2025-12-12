import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Payment, PaymentStatus, PaymentType } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto';
import { PermissionsService } from '../auth/services/permissions.service';
import { EmailService } from '../email-settings/email.service';

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
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Verify member exists
    const member = await this.memberRepository.findOne({
      where: { id: createPaymentDto.memberId },
    });

    if (!member) {
      throw new BadRequestException('Member not found');
    }

    const payment = this.paymentRepository.create(createPaymentDto);
    const savedPayment = await this.paymentRepository.save(payment);
    
    this.logger.log(`[Payment] Payment created. ID: ${savedPayment.id}, Amount: ${createPaymentDto.amount}, Member: ${createPaymentDto.memberId}`);
    return savedPayment;
  }

  async getAllPayments(page: number = 1, limit: number = 10): Promise<{ data: Payment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    // FILTRO: Excluir acompañantes (companion)
    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
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

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['member'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.getPaymentById(id);

    Object.assign(payment, updatePaymentDto);

    return this.paymentRepository.save(payment);
  }

  async deletePayment(id: string): Promise<void> {
    const payment = await this.getPaymentById(id);
    await this.paymentRepository.remove(payment);
    this.logger.warn(`[SENSITIVE] Payment deleted. ID: ${id}, Amount: ${payment.amount}`);
  }

  async getPaymentsByMember(memberId: string, page: number = 1, limit: number = 10): Promise<{ data: Payment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    // FILTRO: Excluir acompañantes (companion)
    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('payment.memberId = :memberId', { memberId })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
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

    // FILTRO: Excluir acompañantes (companion)
    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('payment.status = :status', { status })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
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

    // FILTRO: Excluir acompañantes (companion)
    const [data, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('payment.paymentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
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
    // FILTRO: Excluir acompañantes (companion)
    const [totalPayments, completedPayments, pendingPayments, failedPayments] = await Promise.all([
      this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
        .where('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
          allowedTypes: ['individual', 'responsible'],
        })
        .getCount(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
          allowedTypes: ['individual', 'responsible'],
        })
        .getCount(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
        .where('payment.status = :status', { status: PaymentStatus.PENDING })
        .andWhere('payment.memberMembershipId IS NULL')
        .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
          allowedTypes: ['individual', 'responsible'],
        })
        .getCount(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
        .where('payment.status = :status', { status: PaymentStatus.FAILED })
        .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
          allowedTypes: ['individual', 'responsible'],
        })
        .getCount(),
    ]);

    const totalAmount = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
      .getRawOne();

    const averageAmount = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .select('AVG(payment.amount)', 'average')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
      .getRawOne();

    const byPaymentMethod = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .select('payment.paymentMethod', 'method')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    const byPaymentType = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .select('payment.paymentType', 'type')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
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
    // FILTRO: Excluir acompañantes (companion)
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('payment.memberId = :memberId', { memberId })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
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

    // FILTRO: Excluir acompañantes (companion)
    return this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.memberMembershipId IS NULL')
      .andWhere('payment.dueDate <= :cutoffDate', { cutoffDate })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', {
        allowedTypes: ['individual', 'responsible'],
      })
      .orderBy('payment.dueDate', 'ASC')
      .getMany();
  }

  /**
   * Obtener todos los pagos pendientes (tanto de tabla Payment como de membresías asignadas)
   */
  async getAllPendingPayments(daysOverdue: number = 0): Promise<any[]> {
    this.logger.log(`[Payments] getAllPendingPayments - Obteniendo pagos pendientes...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

    // Obtener pagos pendientes de la tabla Payment (SIN los de membresías)
    // Los pagos PENDING con memberMembershipId se cuentan desde MemberMembership para evitar duplicados
    // FILTRO: Solo mostrar si membershipType != 'companion'
    const paymentRecords = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoin(MemberMembership, 'mm', 'mm.id = payment.memberMembershipId')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.memberMembershipId IS NULL')
      .andWhere('payment.dueDate <= :cutoffDate', { cutoffDate })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', { 
        allowedTypes: ['individual', 'responsible'] 
      })
      .orderBy('payment.dueDate', 'ASC')
      .getMany();

    // Obtener membresías con pago pendiente
    // FILTRO: Solo mostrar si membershipType != 'companion'
    const membershipRecords = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('mm.membership', 'membership')
      .where('mm.paymentStatus = :status', { status: 'pending' })
      .andWhere('mm.endDate <= :cutoffDate', { cutoffDate })
      .andWhere('mm.membershipType IS NULL OR mm.membershipType IN (:...allowedTypes)', { 
        allowedTypes: ['individual', 'responsible'] 
      })
      .orderBy('mm.endDate', 'ASC')
      .getMany();

    // Transformar membresías a formato similar a Payment
    const membershipPayments = membershipRecords.map(mm => ({
      id: mm.id,
      memberId: mm.memberId,
      member: mm.member,
      amount: mm.membership?.price || 0,
      paymentMethod: 'MEMBERSHIP',
      status: 'pending',
      paymentType: 'RECURRING',
      paymentDate: mm.paymentDate,
      dueDate: mm.endDate,
      description: `Membership: ${mm.membership?.name}`,
      transactionId: null,
      reference: null,
      notes: null,
      discount: 0,
      tax: 0,
      createdAt: mm.createdAt,
      updatedAt: mm.updatedAt,
      type: 'MEMBERSHIP', // Marker para saber que es de MemberMembership
      membershipRecordId: mm.id, // ID del registro de membresía
      membership: mm.membership,
      membershipType: mm.membershipType,
      membershipStatusLabel: mm.membershipType === 'responsible' ? 'Responsable' : 'Individual',
    }));

    // Combinar y ordenar por fecha
    const allPending = [...paymentRecords, ...membershipPayments].sort((a, b) => {
      const dateA = new Date((a.dueDate || a.paymentDate) as Date).getTime();
      const dateB = new Date((b.dueDate || b.paymentDate) as Date).getTime();
      return dateA - dateB;
    });

    this.logger.log(
      `[Payments] Encontrados ${paymentRecords.length} pagos + ${membershipRecords.length} membresías con pago pendiente = ${allPending.length} total`
    );

    return allPending;
  }

  /**
   * Obtener TODOS los pagos sin paginación (para historial)
   */
  async getAllPaymentsWithoutPagination(): Promise<Payment[]> {
    try {
      this.logger.log(`[Payments] getAllPaymentsWithoutPagination - Obteniendo todos los pagos`);

      const payments = await this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .orderBy('COALESCE(payment.paymentDate, payment.createdAt)', 'DESC')
        .getMany();

      this.logger.log(`[Payments] Total de pagos encontrados: ${payments.length}`);
      return payments;
    } catch (error) {
      this.logger.error(`[Payments] Error en getAllPaymentsWithoutPagination: ${error.message}`);
      return [];
    }
  }

  /**
   * Completar pago de inscripción de un miembro
   */
  async completeRegistrationPayment(memberId: string, paymentMethod: string = 'cash'): Promise<any> {
    // Buscar pago de inscripción pendiente
    const registrationPayment = await this.paymentRepository.findOne({
      where: {
        memberId,
        paymentType: PaymentType.REGISTRATION,
        status: PaymentStatus.PENDING,
      },
      relations: ['member', 'member.user'],
    });

    if (!registrationPayment) {
      throw new NotFoundException(
        `No hay pago de inscripción pendiente para el miembro ${memberId}`,
      );
    }

    // Actualizar estado a COMPLETED
    registrationPayment.status = PaymentStatus.COMPLETED;
    registrationPayment.paymentMethod = paymentMethod as any;
    registrationPayment.paymentDate = new Date();

    const updatedPayment = await this.paymentRepository.save(registrationPayment);

    this.logger.log(
      `[Registration Payment] ✅ Payment completed for member ${memberId}. Amount: $${registrationPayment.amount}`,
    );

    // Enviar correo de confirmación
    try {
      const user = registrationPayment.member.user;
      const emailContent = `Hola ${user.firstName} ${user.lastName},\n\nTu pago de inscripción de $${registrationPayment.amount} ha sido procesado exitosamente.\n\nAhora puedes asignar una membresía y comenzar a disfrutar del gimnasio.\n\nGracias por tu confianza.`;
      
      await this.emailService.sendEmailDirect({
        to: user.email,
        subject: 'Pago de Inscripción Completado',
        text: emailContent,
        html: `<p>${emailContent.replace(/\n/g, '<br>')}</p>`,
      });
      this.logger.log(`[Registration Payment] 📧 Confirmation email sent to ${user.email}`);
    } catch (emailError) {
      this.logger.error(`[Registration Payment] ⚠️ Failed to send confirmation email: ${emailError.message}`);
      // No fallar si no se puede enviar el correo
    }

    return {
      statusCode: 200,
      success: true,
      message: `✅ Pago de inscripción completado exitosamente para ${registrationPayment.member.user.firstName} ${registrationPayment.member.user.lastName}`,
      data: updatedPayment,
    };
  }
}
