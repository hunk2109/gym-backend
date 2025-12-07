import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { Payment, PaymentMethod, PaymentType, PaymentStatus } from '../../entities/payment.entity';
import { CreateMemberMembershipDto } from './dto/create-member-membership.dto';
import { v4 as uuidv4 } from 'uuid';
import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class MemberMembershipsService {
  constructor(
    @InjectRepository(MemberMembership)
    private readonly memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly promotionsService: PromotionsService,
  ) {}

  /**
   * Obtener la membresía activa de un miembro
   */
  async getMemberActiveMembership(memberId: string): Promise<MemberMembership | null> {
    console.log(`[DEBUG getMemberActiveMembership] Buscando membresía para memberId: ${memberId}`);
    
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId,
        isActive: true,
      },
      relations: ['membership', 'member'],
      order: {
        createdAt: 'DESC',
      },
    });

    console.log(`[DEBUG getMemberActiveMembership] Membresía activa encontrada: ${memberMembership ? 'SÍ' : 'NO'}`);
    if (memberMembership) {
      console.log(`[DEBUG getMemberActiveMembership] memberMembership: ${JSON.stringify(memberMembership)}`);
      console.log(`[DEBUG getMemberActiveMembership] Devolviendo activa con membership embebido`);
      return memberMembership;
    }

    // Si NO hay membresía activa, retornar NULL (no buscar la más reciente inactiva)
    console.log(`[DEBUG getMemberActiveMembership] NO hay membresía activa, devolviendo NULL`);
    return null;
  }

  /**
   * Obtener todas las membresías de un miembro
   */
  async getMemberMembershipsHistory(memberId: string): Promise<MemberMembership[]> {
    const memberExists = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!memberExists) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado`);
    }

    return this.memberMembershipRepository.find({
      where: { memberId },
      relations: ['membership'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Asignar una membresía a un miembro
   */
  async assignMembership(
    memberId: string,
    dto: CreateMemberMembershipDto,
  ): Promise<MemberMembership> {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[ASSIGN MEMBERSHIP] 🎯 INICIANDO ASIGNACIÓN DE MEMBRESÍA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[DTO COMPLETO]:', JSON.stringify(dto, null, 2));
    console.log('[DTO KEYS]:', Object.keys(dto));
    console.log('[DTO.discountPercentage]:', dto.discountPercentage);
    console.log('[DTO.discountPercentage TIPO]:', typeof dto.discountPercentage);
    console.log('[DTO.promotionCode]:', dto.promotionCode);
    console.log('[DTO.discountReason]:', dto.discountReason);
    console.log('[DTO.membershipId]:', dto.membershipId);
    console.log('[DTO.startDate]:', dto.startDate);
    console.log('[DTO.endDate]:', dto.endDate);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Verificar que el miembro existe
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado`);
    }

    // Verificar que la membresía existe
    const membership = await this.membershipRepository.findOne({
      where: { id: dto.membershipId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membresía con ID ${dto.membershipId} no encontrada`,
      );
    }

    // Validar fechas
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Procesar cupón de promoción si se proporciona
    let discountAmount = 0;
    let appliedPromotionCode: string | null = null;
    let appliedDiscountPercentage = 0;
    
    // Asegurar que price es un número
    const membershipPrice = parseFloat(membership.price as any) || 0;
    console.log(`[MemberMembershipsService] membershipPrice parseado: ${membershipPrice} (tipo original: ${typeof membership.price})`);
    
    if (dto.promotionCode) {
      try {
        // Validar el cupón usando el servicio de promociones
        const validation = await this.promotionsService.validatePromoCode({
          code: dto.promotionCode,
        });

        if (validation.valid) {
          // Calcular el descuento
          appliedDiscountPercentage = validation.discount;
          discountAmount = (membershipPrice * appliedDiscountPercentage) / 100;
          appliedPromotionCode = dto.promotionCode;
          
          console.log(
            `[MemberMembershipsService] Cupón "${dto.promotionCode}" válido. Descuento: ${appliedDiscountPercentage}% = ${discountAmount}`,
          );
        } else {
          // El cupón no es válido - lanzar error
          throw new BadRequestException(validation.message || 'Cupón inválido o expirado');
        }
      } catch (error) {
        // Si hay error en validación, lanzar excepción
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Error al validar el cupón de promoción');
      }
    }

    // Usar descuento del DTO si se proporciona (descuento final total)
    let finalDiscountPercentage = appliedDiscountPercentage;
    console.log(`[MemberMembershipsService] Before discount check - dto.discountPercentage: ${dto.discountPercentage}, appliedDiscountPercentage: ${appliedDiscountPercentage}`);
    
    if (dto.discountPercentage && dto.discountPercentage > 0) {
      // El frontend envía el descuento total, no solo el adicional
      finalDiscountPercentage = dto.discountPercentage;
      // Recalcular el monto con el descuento total
      discountAmount = (membershipPrice * finalDiscountPercentage) / 100;
      
      console.log(
        `[MemberMembershipsService] Descuento total aplicado: ${finalDiscountPercentage}%. Monto: ${discountAmount}. Razón: ${dto.discountReason || 'No especificada'}`,
      );
    } else {
      console.log(`[MemberMembershipsService] No descuento aplicado - finalDiscountPercentage: ${finalDiscountPercentage}, discountAmount: ${discountAmount}`);
    }

    // Desactivar membresías previas activas
    await this.memberMembershipRepository.update(
      { memberId, isActive: true },
      { isActive: false },
    );

    // Crear nueva membresía (sin usar .create para evitar problemas con TypeORM)
    const memberMembership = new MemberMembership();
    memberMembership.id = uuidv4();
    memberMembership.memberId = memberId;
    memberMembership.membershipId = dto.membershipId;
    memberMembership.startDate = startDate;
    memberMembership.endDate = endDate;
    memberMembership.isActive = true;
    
    // Calcular monto a pagar con descuento
    const finalAmount = membershipPrice - discountAmount;
    console.log(`[MemberMembershipsService] Cálculos finales - membershipPrice: ${membershipPrice}, discountAmount: ${discountAmount}, finalAmount: ${finalAmount}`);
    
    memberMembership.amountPaid = (dto.amountPaid ?? finalAmount) as any;
    memberMembership.paymentDate = (dto.paymentDate ?? null) as any;
    memberMembership.paymentStatus = dto.amountPaid ? 'paid' : 'pending';
    memberMembership.isRecurring = false;
    
    // Almacenar información del descuento aplicado
    memberMembership.appliedPromotionCode = appliedPromotionCode;
    memberMembership.discountAmount = (discountAmount as any);
    memberMembership.discountPercentage = (finalDiscountPercentage as any);
    memberMembership.discountReason = dto.discountReason || null;
    
    console.log(`[MemberMembershipsService] Guardando memberMembership - amountPaid: ${memberMembership.amountPaid}, discountAmount: ${memberMembership.discountAmount}, discountPercentage: ${memberMembership.discountPercentage}`);

    // Actualizar el miembro para indicar que tiene membresía
    await this.memberRepository.update(
      { id: memberId },
      { hasMembership: true } as any,
    );

    const savedMemberMembership = await this.memberMembershipRepository.save(memberMembership);

    // Crear registro en tabla Payment para el historial (con el monto CORRECTO incluyendo descuentos)
    const payment = new Payment();
    payment.id = uuidv4();
    payment.memberId = memberId;
    payment.memberMembershipId = savedMemberMembership.id;
    payment.amount = memberMembership.amountPaid as any; // Usar amountPaid que ya tiene descuento aplicado
    payment.paymentDate = memberMembership.paymentDate || new Date();
    payment.dueDate = endDate;
    payment.status = memberMembership.paymentStatus === 'paid' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;
    payment.paymentMethod = PaymentMethod.CASH;
    payment.paymentType = PaymentType.MEMBERSHIP;

    await this.paymentRepository.save(payment);
    console.log(`[MemberMembershipsService] ✓ Pago registrado: ${payment.id} - Monto: ${payment.amount} - Estado: ${payment.status}`);

    return savedMemberMembership;
  }

  /**
   * Remover la membresía activa de un miembro
   */
  async removeMembership(memberId: string): Promise<void> {
    console.log(`\n[REMOVE MEMBERSHIP] 🗑️ Intentando remover membresía para memberId: "${memberId}"`);
    
    // Buscar la membresía MÁS RECIENTE (por createdAt descendente) del miembro
    // No importa si está activa o no, remover la más reciente
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId,
      },
      order: {
        createdAt: 'DESC', // La más reciente primero
      },
    });

    console.log(`[REMOVE MEMBERSHIP] ¿Membresía encontrada? ${memberMembership ? 'SÍ' : 'NO'}`);
    if (memberMembership) {
      console.log(`[REMOVE MEMBERSHIP] Membresía encontrada: id=${memberMembership.id}, isActive=${memberMembership.isActive}, createdAt=${memberMembership.createdAt}`);
    }

    if (!memberMembership) {
      console.log(`[REMOVE MEMBERSHIP] ❌ ERROR: No se encontró membresía para el miembro "${memberId}"`);
      throw new NotFoundException(
        `No se encontró membresía para el miembro ${memberId}`,
      );
    }

    // ELIMINAR COMPLETAMENTE el registro de la BD (no solo desactivar)
    const deleteResult = await this.memberMembershipRepository.delete({
      id: memberMembership.id,
    });
    
    console.log(`[REMOVE MEMBERSHIP] ✓ Membresía eliminada de la BD: ${memberMembership.id} - Registros eliminados: ${deleteResult.affected}`);

    // Actualizar el miembro para indicar que NO tiene membresía activa
    await this.memberRepository.update(
      { id: memberId },
      { hasMembership: false } as any,
    );
    
    console.log(`[REMOVE MEMBERSHIP] ✓ Miembro actualizado: ${memberId} - hasMembership=false\n`);
  }

  /**
   * Obtener todas las membresías pendientes de pago
   */
  async getPendingPayments(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MemberMembership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberMembershipRepository.findAndCount({
      where: {
        isActive: true,
        paymentStatus: 'pending',
      },
      relations: ['membership', 'member'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
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

  /**
   * Registrar un pago para una membresía
   */
  async recordPayment(
    memberMembershipId: string,
    amountPaid: number,
    paymentDate: Date = new Date(),
  ): Promise<MemberMembership> {
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: { id: memberMembershipId },
    });

    if (!memberMembership) {
      throw new NotFoundException(
        `MemberMembership con ID ${memberMembershipId} no encontrado`,
      );
    }

    memberMembership.amountPaid = amountPaid;
    memberMembership.paymentDate = paymentDate;
    memberMembership.paymentStatus = 'paid';

    const saved = await this.memberMembershipRepository.save(memberMembership);

    // Actualizar el Payment asociado en la tabla payments
    await this.paymentRepository.update(
      { memberMembershipId: memberMembershipId },
      { 
        status: PaymentStatus.COMPLETED,
        paymentDate: paymentDate,
      },
    );
    console.log(`[MemberMembershipsService] ✓ Payment actualizado a COMPLETED para memberMembershipId: ${memberMembershipId}`);

    return saved;
  }

  /**
   * Obtener todas las membresías de los miembros (paginadas)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MemberMembership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberMembershipRepository.findAndCount({
      relations: ['membership', 'member'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
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
}
