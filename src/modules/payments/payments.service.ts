import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentStatus, PaymentType } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto';
import { PermissionsService } from '../auth/services/permissions.service';

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

    const [data, total] = await this.paymentRepository.findAndCount({
      relations: ['member'],
      skip,
      take: limit,
      order: { paymentDate: 'DESC' },
    });

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

    const [data, total] = await this.paymentRepository.findAndCount({
      where: { memberId },
      relations: ['member'],
      skip,
      take: limit,
      order: { paymentDate: 'DESC' },
    });

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

    const [data, total] = await this.paymentRepository.findAndCount({
      where: { status },
      relations: ['member'],
      skip,
      take: limit,
      order: { paymentDate: 'DESC' },
    });

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

    const [data, total] = await this.paymentRepository.findAndCount({
      where: { paymentDate: Between(startDate, endDate) },
      relations: ['member'],
      skip,
      take: limit,
      order: { paymentDate: 'DESC' },
    });

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
    const payments = await this.paymentRepository.find({
      where: { memberId },
      relations: ['member'],
      order: { paymentDate: 'DESC' },
    });

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

    return this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.dueDate <= :cutoffDate', { cutoffDate })
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

    // Obtener pagos pendientes de la tabla Payment
    const paymentRecords = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.dueDate <= :cutoffDate', { cutoffDate })
      .orderBy('payment.dueDate', 'ASC')
      .getMany();

    // Obtener membresías con pago pendiente
    const membershipRecords = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('mm.membership', 'membership')
      .where('mm.paymentStatus = :status', { status: 'pending' })
      .andWhere('mm.endDate <= :cutoffDate', { cutoffDate })
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
    }));

    // Combinar y ordenar por fecha
    const allPending = [...paymentRecords, ...membershipPayments].sort((a, b) => {
      const dateA = new Date(a.dueDate || a.paymentDate).getTime();
      const dateB = new Date(b.dueDate || b.paymentDate).getTime();
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

      const payments = await this.paymentRepository.find({
        relations: ['member', 'member.user'],
        order: { paymentDate: 'DESC' },
      });

      this.logger.log(`[Payments] Total de pagos encontrados: ${payments.length}`);
      return payments;
    } catch (error) {
      this.logger.error(`[Payments] Error en getAllPaymentsWithoutPagination: ${error.message}`);
      return [];
    }
  }
}
