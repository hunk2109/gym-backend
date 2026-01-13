import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Membership, MembershipType } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Payment, PaymentStatus, PaymentMethod, PaymentType } from '../../entities/payment.entity';
import { CronExecutionLog } from '../../entities/cron-execution-log.entity';
import { MembershipAccessSchedule, DayOfWeek } from '../../entities/membership-access-schedule.entity';
import { CreateMembershipDto, UpdateMembershipDto, AssignMembershipDto, RenewMembershipDto } from './dto/create-membership.dto';
import { PromotionsService } from '../promotions/promotions.service';
import { EmailService } from '../email-settings/email.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(CronExecutionLog)
    private cronExecutionLogRepository: Repository<CronExecutionLog>,
    @InjectRepository(MembershipAccessSchedule)
    private accessScheduleRepository: Repository<MembershipAccessSchedule>,
    private promotionsService: PromotionsService,
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
  ) {}

  // Membership CRUD
  async createMembership(createMembershipDto: CreateMembershipDto): Promise<Membership> {
    console.log('[MembershipsService] createMembership received:', createMembershipDto);
    
    // Determinar el tipo: si viene un string, convertirlo a enum; si no, usar INDIVIDUAL
    let membershipType = MembershipType.INDIVIDUAL;
    if (createMembershipDto.type) {
      const typeValue = String(createMembershipDto.type).toLowerCase();
      if (typeValue === 'group' || typeValue === MembershipType.GROUP) {
        membershipType = MembershipType.GROUP;
      } else if (typeValue === 'individual' || typeValue === MembershipType.INDIVIDUAL) {
        membershipType = MembershipType.INDIVIDUAL;
      }
    }
    
    console.log('[MembershipsService] Determined type:', membershipType);
    
    // Crear membership sin incluir id ni timestamps (TypeORM los generará)
    const membership = this.membershipRepository.create({
      name: createMembershipDto.name,
      description: createMembershipDto.description,
      price: createMembershipDto.price,
      durationMonths: createMembershipDto.durationMonths,
      durationDays: createMembershipDto.durationDays,
      benefits: createMembershipDto.benefits,
      type: membershipType,
      isActive: createMembershipDto.isActive !== undefined ? createMembershipDto.isActive : true,
      isRecurring: createMembershipDto.isRecurring !== undefined ? createMembershipDto.isRecurring : true,
      maxGroupCompanions: createMembershipDto.maxGroupCompanions,
    });
    
    console.log('[MembershipsService] Creating membership with type:', membership.type, 'maxGroupCompanions:', membership.maxGroupCompanions);
    const savedMembership = await this.membershipRepository.save(membership);

    // Guardar horarios de acceso si se proporcionan
    if (createMembershipDto.accessSchedules && createMembershipDto.accessSchedules.length > 0) {
      console.log('[MembershipsService] Saving access schedules:', createMembershipDto.accessSchedules);
      
      const schedules = createMembershipDto.accessSchedules.map(schedule => 
        this.accessScheduleRepository.create({
          id: uuidv4(),
          membershipId: savedMembership.id,
          dayOfWeek: schedule.dayOfWeek as DayOfWeek,
          timeStart: schedule.timeStart,
          timeEnd: schedule.timeEnd,
          isEnabled: schedule.isEnabled !== false, // Por defecto true
        })
      );

      await this.accessScheduleRepository.save(schedules);
      console.log('[MembershipsService] Access schedules saved successfully');
      
      // Cargar la membresía con los horarios recién guardados
      const membershipWithSchedules = await this.membershipRepository.findOne({
        where: { id: savedMembership.id },
        relations: ['accessSchedules'],
      });
      
      return membershipWithSchedules || savedMembership;
    }

    return savedMembership;
  }

  async getAllMemberships(page: number = 1, limit: number = 10): Promise<{ data: Membership[]; pagination: any }> {
    // Corregir membresías no recurrentes
    await this.fixNonRecurringMemberships();

    const skip = (page - 1) * limit;

    const [data, total] = await this.membershipRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['accessSchedules'],
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

  async getMembershipById(id: string): Promise<Membership> {
    const membership = await this.membershipRepository.findOne({ 
      where: { id },
      relations: ['accessSchedules'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async updateMembership(id: string, updateMembershipDto: UpdateMembershipDto): Promise<Membership> {
    const membership = await this.getMembershipById(id);

    console.log('[MembershipsService] Updating membership:', id, 'with:', updateMembershipDto);
    console.log('[MembershipsService] accessSchedules received:', updateMembershipDto.accessSchedules);
    
    // Extraer accessSchedules antes de hacer assign
    const { accessSchedules, ...updateData } = updateMembershipDto as any;
    
    console.log('[MembershipsService] updateData (without schedules):', updateData);
    console.log('[MembershipsService] accessSchedules extracted:', accessSchedules);
    
    Object.assign(membership, updateData);
    console.log('[MembershipsService] Membership after assign:', membership);

    const updatedMembership = await this.membershipRepository.save(membership);
    console.log('[MembershipsService] Membership saved');

    // Si hay nuevos horarios, eliminar los antiguos y guardar los nuevos
    if (accessSchedules && accessSchedules.length > 0) {
      console.log('[MembershipsService] Updating access schedules:', accessSchedules);
      
      // Eliminar horarios antiguos
      await this.accessScheduleRepository.delete({ membershipId: id });
      console.log('[MembershipsService] Old schedules deleted');
      
      // Crear nuevos horarios
      const schedules = accessSchedules.map(schedule => 
        this.accessScheduleRepository.create({
          id: uuidv4(),
          membershipId: id,
          dayOfWeek: schedule.dayOfWeek as DayOfWeek,
          timeStart: schedule.timeStart,
          timeEnd: schedule.timeEnd,
          isEnabled: schedule.isEnabled !== false, // Por defecto true
        })
      );

      const saved = await this.accessScheduleRepository.save(schedules);
      console.log('[MembershipsService] Access schedules saved:', saved);
      
      // Retornar membresía con horarios actualizados
      const membershipWithSchedules = await this.membershipRepository.findOne({
        where: { id },
        relations: ['accessSchedules'],
      });
      return membershipWithSchedules || updatedMembership;
    } else {
      console.log('[MembershipsService] No access schedules to update');
    }

    return updatedMembership;
  }

  async deleteMembership(id: string): Promise<void> {
    const membership = await this.getMembershipById(id);
    await this.membershipRepository.remove(membership);
  }

  async getActiveMemberships(): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
      relations: ['accessSchedules'],
    });
  }

  // Member Membership Operations
  async assignMembership(assignMembershipDto: AssignMembershipDto): Promise<MemberMembership> {
    let { memberId, membershipId, startDate, endDate, amountPaid, paymentDate } = assignMembershipDto;

    // Sanitizar memberId por si acaso viene como objeto
    if (typeof memberId === 'object' && memberId !== null) {
      console.log(`[MembershipsService] memberId es objeto, extrayendo id...`);
      memberId = (memberId as any).id || memberId;
    }

    console.log(`[MembershipsService] assignMembership - Buscando miembro con ID: "${memberId}"`);

    // Verify member exists - try by id first, then by userId
    let member = await this.memberRepository.findOne({ where: { id: memberId as any } });
    
    if (!member) {
      console.log(`[MembershipsService] Miembro NO ENCONTRADO por ID, intentando por userId...`);
      member = await this.memberRepository.findOne({ where: { userId: memberId as any } });
    }

    if (!member) {
      console.log(`[MembershipsService] Miembro NO ENCONTRADO: "${memberId}"`);
      const allMembers = await this.memberRepository.find();
      console.log(`[MembershipsService] Miembros en BD:`, allMembers.map(m => ({ id: m.id, userId: m.userId })));
      throw new BadRequestException('Member not found');
    }

    console.log(`[MembershipsService] Miembro encontrado: ${member.id} (userId: ${member.userId})`);

    // Verify membership exists
    const membership = await this.membershipRepository.findOne({ where: { id: membershipId as any } });
    if (!membership) {
      console.log(`[MembershipsService] Membresía NO ENCONTRADA: "${membershipId}"`);
      throw new BadRequestException('Membership not found');
    }

    console.log(`[MembershipsService] Membresía encontrada: ${membership.id}`);

    // Corregir membresías no recurrentes antes de asignar
    await this.fixNonRecurringMemberships();
    
    // Recargar la membresía para obtener los valores corregidos
    const updatedMembership = await this.membershipRepository.findOne({ where: { id: membershipId as any } });
    if (!updatedMembership) {
      throw new BadRequestException('Membership not found after fix');
    }

    // Check if member already has active membership
    const activeMembership = await this.memberMembershipRepository.findOne({
      where: { memberId: member.id, isActive: true },
    });

    if (activeMembership) {
      console.log(`[MembershipsService] Miembro YA tiene membresía activa: ${activeMembership.id}`);
      throw new BadRequestException('Member already has an active membership');
    }

    // Parse dates from strings
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start);
    if (!endDate) {
      // Determinar si es recurrente: 0/false = no recurrente, 1/true = recurrente
      const isRecurring = Boolean(updatedMembership.isRecurring);
      
      console.log(`[MembershipsService] Calculando end date - isRecurring: ${isRecurring}, durationDays: ${updatedMembership.durationDays}, durationMonths: ${updatedMembership.durationMonths}`);
      
      // No recurrente: usar durationDays
      if (!isRecurring && updatedMembership.durationDays) {
        console.log(`[MembershipsService] Membresía NO recurrente - Sumando ${updatedMembership.durationDays} días`);
        end.setDate(end.getDate() + updatedMembership.durationDays);
      }
      // Recurrente: usar durationMonths
      else if (isRecurring && updatedMembership.durationMonths) {
        console.log(`[MembershipsService] Membresía recurrente - Sumando ${updatedMembership.durationMonths} meses`);
        end.setMonth(end.getMonth() + updatedMembership.durationMonths);
      }
      // Fallback: 30 días por defecto
      else {
        console.log(`[MembershipsService] Fallback - Sumando 30 días por defecto`);
        end.setDate(end.getDate() + 30);
      }
    }

    const parsedPaymentDate = paymentDate ? new Date(paymentDate) : undefined;

    console.log(`[MembershipsService] Creando membresía: memberId=${member.id}, membershipId=${membershipId}, amountPaid=${amountPaid}`);

    // Crear y guardar directamente (sin paymentStatus - se calcula dinámicamente desde Payment)
    const newMemberMembership = this.memberMembershipRepository.create({
      id: uuidv4(),
      memberId: member.id,
      membershipId: membershipId as any,
      startDate: start,
      endDate: end,
      amountPaid: (amountPaid as any) || null,
      paymentDate: (parsedPaymentDate as any) || null,
      isRecurring: updatedMembership.isRecurring !== false ? true : false,
      isActive: true,
    });

    const result = await this.memberMembershipRepository.save(newMemberMembership);
    console.log(`[MembershipsService] Membresía insertada con ID: ${result.id}`);

    // Crear registro en tabla payments (completado o pendiente) - para historial
    const payment = new Payment();
    payment.id = uuidv4();
    payment.memberId = member.id;
    payment.memberMembershipId = result.id;
    payment.amount = (amountPaid || updatedMembership.price) as any;
    payment.paymentDate = parsedPaymentDate || new Date();
    payment.dueDate = end;
    payment.status = amountPaid && parsedPaymentDate ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;
    payment.paymentMethod = PaymentMethod.CASH;
    payment.paymentType = PaymentType.MEMBERSHIP;
    
    await this.paymentRepository.save(payment);
    console.log(`[MembershipsService] Pago registrado: ${payment.id} - Estado: ${payment.status}`);
    

    // Recuperar el registro con relaciones para retornar
    const saved = await this.memberMembershipRepository.findOne({
      where: { id: result.id },
      relations: ['member', 'membership'],
    });

    return saved as MemberMembership;
  }

  async getMemberActiveMembership(memberId: string): Promise<MemberMembership> {
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: { memberId, isActive: true },
      relations: ['membership', 'member'],
    });

    if (!memberMembership) {
      throw new NotFoundException('No active membership found for this member');
    }

    return memberMembership;
  }

  async renewMembership(membershipId: string, renewMembershipDto: RenewMembershipDto): Promise<MemberMembership> {
    const currentMembership = await this.memberMembershipRepository.findOne({
      where: { id: membershipId, isActive: true },
      relations: ['membership'],
    });

    if (!currentMembership) {
      throw new NotFoundException('Active membership not found');
    }

    // Validar que sea membresía recurrente para renovar
    if (!currentMembership.membership.isRecurring) {
      throw new BadRequestException(
        `No se puede renovar membresía no recurrente "${currentMembership.membership.name}". Las membresías no recurrentes solo son válidas por su duración específica.`,
      );
    }

    // Deactivate current membership
    currentMembership.isActive = false;
    await this.memberMembershipRepository.save(currentMembership);

    // Create new membership
    const newStartDate = currentMembership.endDate;
    const newEndDate = new Date(newStartDate);
    
    // Usar durationDays si es no recurrente, durationMonths si es recurrente
    const isRecurring = Boolean(currentMembership.membership.isRecurring);
    if (isRecurring && currentMembership.membership.durationMonths) {
      newEndDate.setMonth(newEndDate.getMonth() + currentMembership.membership.durationMonths);
    } else if (!isRecurring && currentMembership.membership.durationDays) {
      newEndDate.setDate(newEndDate.getDate() + currentMembership.membership.durationDays);
    } else {
      // Fallback: 30 días
      newEndDate.setDate(newEndDate.getDate() + 30);
    }

    let discountAmount = 0;
    let appliedPromotionCode: string | null = null;
    let appliedDiscountPercentage = 0;
    
    const membershipPrice = parseFloat(currentMembership.membership.price as any) || 0;

    // Validar cupón si se proporciona
    if (renewMembershipDto.promotionCode) {
      try {
        const validation = await this.promotionsService.validatePromoCode({
          code: renewMembershipDto.promotionCode,
        });

        if (validation.valid) {
          appliedDiscountPercentage = validation.discount;
          discountAmount = (membershipPrice * appliedDiscountPercentage) / 100;
          appliedPromotionCode = renewMembershipDto.promotionCode;
          console.log(
            `[MembershipsService] Cupón "${renewMembershipDto.promotionCode}" válido. Descuento: ${appliedDiscountPercentage}% = ${discountAmount}`,
          );
        } else {
          throw new BadRequestException(validation.message || 'Cupón inválido o expirado');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Error al validar el cupón de promoción');
      }
    }

    const finalAmount = membershipPrice - discountAmount;
    const finalAmountPaid = renewMembershipDto.amountPaid ?? finalAmount;

    const newMembership = this.memberMembershipRepository.create({
      id: uuidv4(),
      memberId: currentMembership.memberId,
      membershipId: currentMembership.membershipId,
      startDate: newStartDate,
      endDate: newEndDate,
      amountPaid: finalAmountPaid as any,
      paymentDate: renewMembershipDto.paymentDate as any,
      isActive: true,
      appliedPromotionCode: appliedPromotionCode,
      discountAmount: discountAmount as any,
      discountPercentage: appliedDiscountPercentage as any,
      discountReason: renewMembershipDto.discountReason || null,
    }) as MemberMembership;

    const savedNewMembership = await this.memberMembershipRepository.save(newMembership);

    // Aplicar la promoción (incrementar contador de usos) si fue usada
    if (appliedPromotionCode) {
      await this.promotionsService.applyPromotion(appliedPromotionCode);
      console.log(`[MembershipsService] ✓ Promoción "${appliedPromotionCode}" aplicada - Contador incrementado`);
    }

    return savedNewMembership;
  }

  async getMemberMembershipHistory(memberId: string, page: number = 1, limit: number = 10): Promise<{ data: MemberMembership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberMembershipRepository.findAndCount({
      where: { memberId },
      relations: ['membership'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
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

  async checkMembershipExpiry(): Promise<MemberMembership[]> {
    const today = new Date();

    return this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.endDate <= :today', { today })
      .andWhere('mm.isActive = true')
      .getMany();
  }

  /**
   * Renovar automáticamente membresías que expiraron
   * - Membresías recurrentes: Genera nueva membresía con pago pendiente o renueva si pagó
   * - Membresías no recurrentes: Solo suspende cuando expira, NO renueva
   */
  async autoRenewExpiredMemberships(): Promise<{ renewed: number; suspended: number }> {
    const startTime = Date.now();
    console.log(`[MembershipsService] 🔄 Iniciando auto-renovación y suspensión de membresías expiradas...`);

    const today = new Date();

    // Obtener la configuración del gimnasio para los días de suspensión
    let suspensionDays = 15; // default
    try {
      const gymSettings = await this.gymSettingsService.getSettings();
      if (gymSettings && gymSettings.membershipSuspensionDays) {
        suspensionDays = gymSettings.membershipSuspensionDays;
        console.log(`[MembershipsService] Auto-renewal usando ${suspensionDays} días para suspensión de membresías recurrentes`);
      }
    } catch (error) {
      console.warn(`[MembershipsService] No se pudo obtener settings de gym, usando default: ${suspensionDays}`, error);
    }

    // ===== MEMBRESÍAS RECURRENTES: Renovar o suspender según pago =====
    // Encontrar membresías RECURRENTES expiradas que deben renovarse
    const expiredRecurring = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.membership', 'membership')
      .where('mm.endDate <= :today', { today })
      .andWhere('mm.isActive = true')
      .andWhere('mm.isRecurring = true')
      .getMany();

    console.log(`[MembershipsService] Encontradas ${expiredRecurring.length} membresías RECURRENTES expiradas`);

    // ===== MEMBRESÍAS NO RECURRENTES: Solo suspender, NO renovar =====
    // Encontrar membresías NO RECURRENTES expiradas para suspender
    const expiredNonRecurring = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.membership', 'membership')
      .where('mm.endDate <= :today', { today })
      .andWhere('mm.isActive = true')
      .andWhere('mm.isRecurring = false')
      .getMany();

    console.log(`[MembershipsService] Encontradas ${expiredNonRecurring.length} membresías NO RECURRENTES expiradas para suspender`);

    let renewed = 0;
    let suspended = 0;

    for (const currentMembership of expiredRecurring) {
      // Verificar si el pago anterior está pendiente (consultando la tabla Payment)
      const membershipPayment = await this.paymentRepository.findOne({
        where: {
          memberMembershipId: currentMembership.id,
          paymentType: PaymentType.MEMBERSHIP,
        },
      });
      
      const isPending = !membershipPayment || membershipPayment.status === PaymentStatus.PENDING;

      if (isPending) {
        // Calcular días sin pagar
        const daysSinceDue = Math.floor(
          (today.getTime() - new Date(currentMembership.endDate).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysSinceDue > suspensionDays) {
          // Suspender membresía
          currentMembership.isActive = false;
          currentMembership.suspensionDate = today;
          await this.memberMembershipRepository.save(currentMembership);
          console.log(`[MembershipsService] ⛔ Membresía suspendida - Miembro: ${currentMembership.memberId}, Días vencido: ${daysSinceDue}`);
          suspended++;
        } else {
          // Renovar con pago pendiente - Actualizar la membresía existente
          const newStartDate = currentMembership.endDate;
          const newEndDate = new Date(newStartDate);
          newEndDate.setMonth(newEndDate.getMonth() + currentMembership.membership.durationMonths);

          currentMembership.startDate = newStartDate;
          currentMembership.endDate = newEndDate;
          currentMembership.isActive = true;
          
          await this.memberMembershipRepository.save(currentMembership);
          console.log(`[MembershipsService] ✅ Membresía renovada con pago pendiente - Miembro: ${currentMembership.memberId}`);
          renewed++;
        }
      } else if (membershipPayment && membershipPayment.status === PaymentStatus.COMPLETED) {
        // Si ya pagó, renovar automáticamente - Actualizar la membresía existente
        const newStartDate = currentMembership.endDate;
        const newEndDate = new Date(newStartDate);
        newEndDate.setMonth(newEndDate.getMonth() + currentMembership.membership.durationMonths);

        currentMembership.startDate = newStartDate;
        currentMembership.endDate = newEndDate;
        currentMembership.isActive = true;
        
        await this.memberMembershipRepository.save(currentMembership);
        console.log(`[MembershipsService] ✅ Membresía renovada automáticamente - Miembro: ${currentMembership.memberId}`);
        renewed++;
      }
    }

    // ===== PROCESAR MEMBRESÍAS NO RECURRENTES: Solo suspender, NO renovar =====
    for (const currentMembership of expiredNonRecurring) {
      // Para membresías no recurrentes, simplemente desactivarlas cuando expiran
      currentMembership.isActive = false;
      currentMembership.suspensionDate = today;
      await this.memberMembershipRepository.save(currentMembership);
      console.log(`[MembershipsService] ⛔ Membresía NO RECURRENTE suspendida - Miembro: ${currentMembership.memberId}, Membresía: ${currentMembership.membership.name}`);
      suspended++;
    }

    // Registrar en logs de ejecución del cronjob
    const executionTimeMs = Date.now() - startTime;
    const totalProcessed = renewed + suspended;
    
    try {
      const log = this.cronExecutionLogRepository.create({
        cronName: 'auto-renew-expired-memberships',
        description: `Renovadas: ${renewed}, Suspendidas: ${suspended}`,
        status: 'success',
        executionTimeMs,
        itemsProcessed: totalProcessed,
      });
      await this.cronExecutionLogRepository.save(log);
      console.log(`[MembershipsService] ✅ Log registrado en BD`);
    } catch (error) {
      console.error(`[MembershipsService] Error al registrar log:`, error);
    }

    console.log(`[MembershipsService] ✅ Auto-renovación completada en ${executionTimeMs}ms - Renovadas: ${renewed}, Suspendidas: ${suspended}`);
    
    return { renewed, suspended };
  }

  /**
   * Registrar pago de membresía pendiente
   */
  async recordPayment(
    memberMembershipId: string,
    amountPaid: number,
    paymentDate: Date,
  ): Promise<MemberMembership> {
    const membership = await this.memberMembershipRepository.findOne({
      where: { id: memberMembershipId },
      relations: ['member', 'membership'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Parsear paymentDate si es string
    let parsedPaymentDate = paymentDate;
    if (typeof paymentDate === 'string') {
      parsedPaymentDate = new Date(paymentDate);
    }

    membership.amountPaid = amountPaid;
    membership.paymentDate = parsedPaymentDate;

    // Actualizar el registro existente en la tabla payments (cambiar de PENDING a COMPLETED)
    const existingPayment = await this.paymentRepository.findOne({
      where: { memberMembershipId: memberMembershipId },
    });

    if (existingPayment) {
      console.log(`[MembershipsService] Actualizando pago existente: ${existingPayment.id}`);
      existingPayment.amount = amountPaid as any;
      existingPayment.paymentDate = parsedPaymentDate;
      existingPayment.status = PaymentStatus.COMPLETED;
      await this.paymentRepository.save(existingPayment);
      console.log(`[MembershipsService] Pago actualizado a COMPLETED`);
    } else {
      console.log(`[MembershipsService] No se encontró pago previo, creando uno nuevo`);
      const payment = new Payment();
      payment.id = uuidv4();
      payment.memberId = membership.memberId;
      payment.memberMembershipId = memberMembershipId;
      payment.amount = amountPaid as any;
      payment.paymentDate = parsedPaymentDate;
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentMethod = PaymentMethod.CASH;
      payment.paymentType = PaymentType.MEMBERSHIP;
      await this.paymentRepository.save(payment);
    }

    const savedMembership = await this.memberMembershipRepository.save(membership);

    // Enviar email de confirmación de pago
    try {
      console.log(`[MembershipsService] 📧 Iniciando envío de email de pago...`);
      
      const memberWithUser = await this.memberRepository.findOne({
        where: { id: membership.memberId },
        relations: ['user'],
      });

      if (memberWithUser && memberWithUser.user && memberWithUser.user.email) {
        const memberEmail = memberWithUser.user.email;
        const memberName = memberWithUser.user.firstName || memberWithUser.user.email;
        const membershipName = membership.membership?.name || 'Tu Membresía';
        const paymentDateFormatted = parsedPaymentDate.toLocaleDateString('es-ES');

        const htmlContent = `
          <h2>¡Pago Confirmado!</h2>
          <p>Hola <strong>${memberName}</strong>,</p>
          
          <p>Tu pago ha sido recibido y procesado exitosamente. Aquí está el comprobante:</p>
          
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Plan de Membresía</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${membershipName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Monto Pagado</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">RD$ ${(amountPaid as any).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Fecha de Pago</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${paymentDateFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Estado</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><span style="color: green; font-weight: bold;">✓ PAGADO</span></td>
            </tr>
          </table>
          
          <p style="margin-top: 20px;">Tu membresía está activa y disponible para usar. Si tienes alguna pregunta, por favor contacta a nuestro equipo.</p>
          
          <p>¡Gracias por tu pago!</p>
        `;

        console.log(`[MembershipsService] 📧 Enviando email a: ${memberEmail}`);
        
        const emailResult = await this.emailService.sendEmail({
          recipientEmail: memberEmail,
          recipientName: memberName,
          subject: `✓ Pago Confirmado - ${membershipName}`,
          htmlContent,
        });
        
        console.log(`[MembershipsService] ✅ Email de pago enviado exitosamente. Log ID: ${emailResult?.id}`);
      } else {
        console.log(`[MembershipsService] ⚠️  No se pudo enviar email - Usuario sin email o no encontrado`);
      }
    } catch (emailError) {
      console.error(`[MembershipsService] ❌ Error al enviar email de pago:`, (emailError as any)?.message);
      // No bloquear el flujo si hay error en el email
    }

    return savedMembership;
  }

  /**
   * Obtener membresías con pago pendiente
   */
  async getPendingPayments(daysOverdue?: number): Promise<any[]> {
    console.log(`[MembershipsService] getPendingPayments - Buscando pagos pendientes (excluyendo companions)...`);
    
    const query = this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('mm.membership', 'membership')
      .leftJoin('payments', 'p', 'p.memberMembershipId = mm.id AND p.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
      .where('(p.id IS NULL OR p.status = :pendingStatus)', { pendingStatus: PaymentStatus.PENDING })
      .andWhere('mm.membershipType IN (:...allowedTypes)', { allowedTypes: ['individual', 'responsible'] });

    if (daysOverdue) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);
      query.andWhere('mm.endDate <= :cutoffDate', { cutoffDate });
    }

    const result = await query.orderBy('mm.endDate', 'ASC').getMany();
    
    // Mapear datos para incluir estado legible
    const resultWithStatus = result.map((mm: any) => ({
      ...mm,
      membershipStatusLabel: mm.membershipType === 'responsible' ? 'Responsable' : 'Individual',
    }));
    
    console.log(`[MembershipsService] Encontrados ${resultWithStatus.length} pagos pendientes`);
    if (resultWithStatus.length > 0) {
      console.log(`[MembershipsService] Pagos:`, resultWithStatus.map(r => ({
        id: r.id,
        memberId: r.memberId,
        endDate: r.endDate,
        membershipStatusLabel: r.membershipStatusLabel,
      })));
    }
    
    return resultWithStatus;
  }

  /**
   * Remover membresía de un miembro (busca la más reciente, activa o no)
   */
  async removeMembership(memberMembershipId: string): Promise<void> {
    const membership = await this.memberMembershipRepository.findOne({
      where: { id: memberMembershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.memberMembershipRepository.remove(membership);
  }

  /**
   * Remover membresía por memberId (busca la más reciente)
   */
  async removeMembershipByMemberId(memberId: string): Promise<void> {
    // Buscar la membresía más reciente del miembro (no importa estado)
    const membership = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.memberId = :memberId', { memberId })
      .orderBy('mm.createdAt', 'DESC')
      .getOne();

    if (!membership) {
      throw new NotFoundException('No membership found for this member');
    }

    console.log(`[MembershipsService] ANTES de remover - Miembro ${memberId} tiene membresía: ${membership.id}`);

    await this.memberMembershipRepository.remove(membership);

    // Después de remover, verificar si hay más membresías pendientes
    const remainingMemberships = await this.memberMembershipRepository.find({
      where: { memberId },
    });

    console.log(`[MembershipsService] DESPUÉS de remover - Miembro ${memberId} tiene ${remainingMemberships.length} membresías restantes`);
  }

  /**
   * Sincronizar membresías pendientes con el sistema de pagos
   * Convierte membresías con pago pendiente en registros visibles para la tabla de pagos
   */
  async syncPendingMembershipsToPayments(): Promise<{ synced: number; message: string }> {
    console.log(`[MembershipsService] Iniciando sincronización de membresías pendientes...`);

    // Obtener membresías con pago pendiente
    const pendingMemberships = await this.getPendingPayments();

    console.log(`[MembershipsService] Encontradas ${pendingMemberships.length} membresías con pago pendiente`);
    console.log(`[MembershipsService] Datos:`, pendingMemberships.map(m => ({
      id: m.id,
      memberId: m.memberId,
      membershipId: m.membershipId,
      endDate: m.endDate,
      membershipName: m.membership?.name,
      membershipPrice: m.membership?.price,
    })));

    return {
      synced: pendingMemberships.length,
      message: `Sincronización completada. ${pendingMemberships.length} membresías con pago pendiente están disponibles en el sistema de pagos.`,
    };
  }

  /**
   * Corregir membresías no recurrentes para asegurar que tengan durationDays configurado
   */
  private async fixNonRecurringMemberships(): Promise<void> {
    try {
      // Corregir Matutino - 3 días, no recurrente
      await this.membershipRepository.update(
        { name: 'Matutino' },
        { isRecurring: false, durationDays: 3 }
      );

      // Corregir membresías de plan anual si existen
      const planAnual = await this.membershipRepository.findOne({
        where: { name: 'Plan Anual' },
      });
      if (planAnual && planAnual.isRecurring !== false) {
        planAnual.isRecurring = false;
        planAnual.durationDays = 365;
        await this.membershipRepository.save(planAnual);
      }
    } catch (error) {
      console.log('[MembershipsService] Error en fixNonRecurringMemberships:', error);
      // No fallar el endpoint si hay error
    }
  }

}
