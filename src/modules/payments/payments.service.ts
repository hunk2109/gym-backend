import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentStatus, PaymentType } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
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
    return this.paymentRepository.save(payment);
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

    payment.status = PaymentStatus.REFUNDED;
    return this.paymentRepository.save(payment);
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
}
