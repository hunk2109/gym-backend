import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { UserRole } from '../../entities/user.entity';
import { Membership, MembershipType } from '../../entities/membership.entity';
import { Payment, PaymentMethod, PaymentType, PaymentStatus } from '../../entities/payment.entity';
import { CashRegister } from '../../entities/cash-register.entity';
import { CreateMemberMembershipDto } from './dto/create-member-membership.dto';
import { v4 as uuidv4 } from 'uuid';
import { PromotionsService } from '../promotions/promotions.service';
import { EmailService } from '../email-settings/email.service';
import { GroupsService } from '../groups/groups.service';
import { AccessService } from '../sync/access.service';
import { ZktecoDeviceService } from '../sync/zkteco-device.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationPriority } from '../outbox/entities/notification-outbox.entity';

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
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    private readonly promotionsService: PromotionsService,
    private readonly emailService: EmailService,
    private readonly groupsService: GroupsService,
    private readonly accessService: AccessService,
    private readonly zktecoDeviceService: ZktecoDeviceService,
    private readonly whatsappService: WhatsappService,
    private readonly gymSettingsService: GymSettingsService,
    private readonly outboxService: OutboxService,
  ) {}

  private async getActiveCashRegisterId(userId?: string): Promise<string | null> {
    try {
      const reg = await this.cashRegisterRepository.findOne({
        where: [
          ...(userId ? [{ userId, isOpen: true }] : []),
          { isOpen: true },
        ],
        order: { createdAt: 'DESC' },
      });
      return reg ? reg.id : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Calcular dinámicamente el estado de pago desde la tabla Payment
   */
  async getPaymentStatus(memberMembershipId: string): Promise<'pending' | 'paid' | 'suspended'> {
    // En la nueva arquitectura, el status de pago se verifica por memberId, no por memberMembershipId
    // Este método puede quedar solo retornando 'pending' como fallback
    return 'pending';
  }

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
    dto: CreateMemberMembershipDto,
    userId?: string,
  ): Promise<any> {
    try {
      console.log(`[MEMBER_MEMBERSHIPS_SERVICE] assignMembership called with userId:`, userId);
      const memberId = dto.memberId;
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
    let endDate: Date;

    // IMPORTANTE: Recalcular endDate según si es recurrente o no
    // Si es NO recurrente (isRecurring = false), usar durationDays
    // Si es recurrente (isRecurring = true), usar durationMonths
    const isRecurring = Boolean(membership.isRecurring);
    console.log(`[MemberMembershipsService] Evaluando duración - isRecurring: ${isRecurring}, durationDays: ${membership.durationDays}, durationMonths: ${membership.durationMonths}`);
    
    // RECALCULAR endDate basado en los campos correctos de la membresía
    endDate = new Date(startDate);
    if (!isRecurring && membership.durationDays) {
      console.log(`[MemberMembershipsService] Membresía NO recurrente - Sumando ${membership.durationDays} días a partir de ${startDate.toISOString()}`);
      endDate.setDate(endDate.getDate() + membership.durationDays);
    } else if (isRecurring && membership.durationMonths) {
      console.log(`[MemberMembershipsService] Membresía recurrente - Sumando ${membership.durationMonths} meses a partir de ${startDate.toISOString()}`);
      endDate.setMonth(endDate.getMonth() + membership.durationMonths);
    } else if (dto.endDate) {
      endDate = new Date(dto.endDate);
      console.log(`[MemberMembershipsService] No hay duración definida; usando endDate proporcionada: ${dto.endDate}`);
    } else {
      throw new BadRequestException(
        'No se puede calcular la fecha de fin: la membresía no tiene duración definida.',
      );
    }
    console.log(`[MemberMembershipsService] endDate RECALCULADA: ${endDate.toISOString()}`);

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
    
    // Determinar el tipo de membresía (responsable si es de grupo, individual si no)
    memberMembership.membershipType = membership.type === 'group' ? 'responsible' : 'individual';
    console.log(`[MemberMembershipsService] membershipType asignado: ${memberMembership.membershipType} (membership.type: ${membership.type})`);
    
    // Calcular monto a pagar con descuento
    const finalAmount = membershipPrice - discountAmount;
    console.log(`[MemberMembershipsService] Cálculos finales - membershipPrice: ${membershipPrice}, discountAmount: ${discountAmount}, finalAmount: ${finalAmount}`);
    
    // Usar el valor de isRecurring de la membresía (por defecto true para compatibilidad)
    memberMembership.isRecurring = membership.isRecurring !== false;
    
    // Almacenar información del descuento aplicado
    memberMembership.appliedPromotionCode = appliedPromotionCode;
    memberMembership.discountAmount = (discountAmount as any);
    memberMembership.discountPercentage = (finalDiscountPercentage as any);
    memberMembership.discountReason = dto.discountReason || null;
    
    console.log(`[MemberMembershipsService] Guardando memberMembership - discountAmount: ${memberMembership.discountAmount}, discountPercentage: ${memberMembership.discountPercentage}`);

    // 🆕 Crear Payment PRIMERO
    const payment = new Payment();
    payment.id = uuidv4();
    payment.amount = finalAmount; // Monto con descuento aplicado
    payment.dueDate = endDate;
    
    let isAutoCompleted = false;
    let paymentMethod = PaymentMethod.CASH;

    // Verificar saldo a favor (Crédito)
    if (finalAmount > 0 && Number(member.creditBalance) >= finalAmount) {
      // Usar saldo a favor porque cubre el monto total
      member.creditBalance = Number(member.creditBalance) - finalAmount;
      await this.memberRepository.save(member);
      isAutoCompleted = true;
      paymentMethod = PaymentMethod.CREDIT_BALANCE;
      console.log(`[MemberMembershipsService] 💰 Pagado con Saldo a Favor. Nuevo saldo: ${member.creditBalance}`);
    } else if (finalAmount === 0) {
      isAutoCompleted = true;
    } else if (dto.paymentMethod && dto.paymentMethod !== 'pending') {
      isAutoCompleted = true;
      paymentMethod = dto.paymentMethod as any;
      console.log(`[MemberMembershipsService] 💰 Pago recibido inmediatamente vía: ${paymentMethod}`);
    }

    if (isAutoCompleted) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentDate = new Date();
      payment.cashRegisterId = await this.getActiveCashRegisterId(userId);
      console.log(`[MemberMembershipsService] 💰 Payment AUTO-COMPLETED ($${payment.amount}) - cashRegisterId: ${payment.cashRegisterId} - paymentDate: ${payment.paymentDate}`);
    } else {
      // Si el monto es > 0, es pendiente (sin paymentDate hasta que se pague)
      payment.status = PaymentStatus.PENDING;
      payment.paymentDate = null;
      payment.cashRegisterId = null;
      console.log(`[MemberMembershipsService] 💳 Payment PENDING ($${payment.amount})`);
    }
    
    payment.paymentMethod = paymentMethod;
    payment.paymentType = PaymentType.MEMBERSHIP;
    payment.createdBy = userId || null;
    payment.updatedBy = userId || null;

    const savedPayment = await this.paymentRepository.save(payment);
    console.log(`[MemberMembershipsService] ✓ Payment saved: ID=${savedPayment.id}, Amount=${savedPayment.amount}, Status=${savedPayment.status}, PaymentDate=${savedPayment.paymentDate}, IsAutoCompleted=${isAutoCompleted}`);

    // Asignar paymentId a la memberMembership
    memberMembership.paymentId = savedPayment.id;
    // 🔑 IMPORTANTE: Guardar payAmount (costo de membresía, especialmente para membresías variables)
    memberMembership.payAmount = finalAmount;

    const savedMemberMembership = await this.memberMembershipRepository.save(memberMembership);

    // Incrementar el contador de uso de la promoción si se aplicó
    if (appliedPromotionCode) {
      try {
        await this.promotionsService.applyPromotion(appliedPromotionCode);
      } catch (err) {
        console.error(`[MemberMembershipsService] Error incrementing promotion usage:`, err);
      }
    }

    // 🆕 Si es membresía de tipo "group", crear automáticamente un grupo
    console.log(`[MemberMembershipsService] 📋 membership.type: "${membership.type}" (typeof: ${typeof membership.type})`);
    console.log(`[MemberMembershipsService] 📋 ¿Es 'group'? ${membership.type === 'group'}`);
    
    if (membership.type === 'group') {
      try {
        console.log(`[MemberMembershipsService] 📦 Creando grupo automáticamente para membresía tipo 'group'...`);
        
        // Get user info from member - memberId puede ser id o userId
        console.log(`[MemberMembershipsService] 🔍 Buscando miembro: ${memberId}`);
        let memberWithUser = await this.memberRepository.findOne({
          where: { id: memberId },
          relations: ['user'],
        });
        
        // Si no existe por id, buscar por userId
        if (!memberWithUser) {
          memberWithUser = await this.memberRepository.findOne({
            where: { userId: memberId },
            relations: ['user'],
          });
        }
        
        console.log(`[MemberMembershipsService] ✅ Miembro encontrado:`, memberWithUser ? `id=${memberWithUser.id}, userId=${memberWithUser.userId}, user.id=${memberWithUser.user?.id}` : 'NO ENCONTRADO');
        
        if (!memberWithUser) {
          console.error(`[MemberMembershipsService] ❌ No se encontró miembro: ${memberId}`);
          throw new Error(`Miembro no encontrado: ${memberId}`);
        }
        
        const firstName = memberWithUser?.user?.firstName || 'Usuario';
        const lastName = memberWithUser?.user?.lastName || '';
        const groupName = `${firstName} ${lastName} - Grupo`.trim();
        console.log(`[MemberMembershipsService] 📦 Nombre del grupo: "${groupName}"`);
        
        // Usar el userId del miembro - SIMPLIFICADO: solo toma lo que está en memberWithUser.userId
        const responsibleUserId = memberWithUser.userId;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[MemberMembershipsService] 🔑 userId EXTRAÍDO: "${responsibleUserId}"`);
        console.log(`[MemberMembershipsService] 📊 DETALLES DEL MIEMBRO:`);
        console.log(`  - memberWithUser.id: ${memberWithUser.id}`);
        console.log(`  - memberWithUser.userId: ${memberWithUser.userId}`);
        console.log(`  - memberWithUser.user.id: ${memberWithUser.user?.id}`);
        console.log(`${'='.repeat(60)}\n`);
        
        if (!responsibleUserId) {
          throw new BadRequestException('El miembro no tiene userId');
        }
        
        console.log(`[MemberMembershipsService] 📊 Valores para createGroup:`);
        console.log(`  - groupName: ${groupName}`);
        console.log(`  - membership.id: ${membership.id}`);
        console.log(`  - responsibleUserId: ${responsibleUserId} ← ESTE ES EL VALOR QUE SE PASA`);
        console.log(`  - startDate: ${startDate}`);
        console.log(`  - endDate: ${endDate}`);

        const newGroup = await this.groupsService.createGroup(
          groupName,
          membership.id,
          responsibleUserId,
          startDate,
          endDate,
        );
        
        console.log(`[MemberMembershipsService] ✅ Grupo creado exitosamente: ${newGroup.id}`);
        
        // ✨ IMPORTANTE: Asignar el groupId a la membresía del responsable
        console.log(`[MemberMembershipsService] 📝 Asignando groupId al responsable - groupId: ${newGroup.id}, memberMembershipId: ${savedMemberMembership.id}`);
        await this.memberMembershipRepository.update(
          { id: savedMemberMembership.id },
          { groupId: newGroup.id },
        );
        console.log(`[MemberMembershipsService] ✅ groupId asignado exitosamente a la membresía del responsable`);
      } catch (error) {
        console.error(`[MemberMembershipsService] ❌ Error al crear grupo: ${error.message}`);
        // No lanzar error - la membresía ya fue creada, solo el grupo falló
        // El usuario puede crear el grupo manualmente después
      }
    }

    // Aplicar la promoción (incrementar contador de usos) si fue usada
    console.log(`[MemberMembershipsService] ✓ SavedMembership ID: ${savedMemberMembership.id}`);
    console.log(`[MemberMembershipsService] appliedPromotionCode ANTES de incrementar: "${appliedPromotionCode}"`);
    console.log(`[MemberMembershipsService] appliedPromotionCode es null: ${appliedPromotionCode === null}`);
    console.log(`[MemberMembershipsService] appliedPromotionCode está vacío: ${!appliedPromotionCode}`);
    
    if (appliedPromotionCode) {
      console.log(`[MemberMembershipsService] ✓ Incrementando contador para cupón: "${appliedPromotionCode}"`);
      await this.promotionsService.applyPromotion(appliedPromotionCode);
      console.log(`[MemberMembershipsService] ✓ Promoción "${appliedPromotionCode}" aplicada - Contador incrementado`);
    } else {
      console.log(`[MemberMembershipsService] ⚠️  NO se incrementó contador - appliedPromotionCode está vacío`);
    }

    // Enviar WhatsApp y email de confirmación de membresía al miembro
    try {
      console.log(`[MemberMembershipsService] 💬 Iniciando envío de confirmación de membresía...`);
      
      const memberWithUser = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['user'],
      });

      console.log(`[MemberMembershipsService] 📧 Miembro obtenido:`, memberWithUser ? `SÍ (${memberWithUser.id})` : `NO`);
      
      if (memberWithUser && memberWithUser.user && memberWithUser.user.email) {
        const memberEmail = memberWithUser.user.email;
        const memberName = memberWithUser.user.firstName || memberWithUser.user.email;
        const membershipName = membership.name;
        const startDateFormatted = startDate.toLocaleDateString('es-ES');
        const endDateFormatted = endDate.toLocaleDateString('es-ES');
        const discountText = finalDiscountPercentage > 0 
          ? `\n<p><strong>Descuento aplicado:</strong> ${finalDiscountPercentage}% (${appliedPromotionCode ? `Cupón: ${appliedPromotionCode}` : 'Descuento manual'})</p>`
          : '';
        const paidWithCreditText = paymentMethod === PaymentMethod.CREDIT_BALANCE
          ? `\n<p style="color: green; font-weight: bold;">✅ Pagado automáticamente con tu saldo a favor.</p>`
          : '';

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Bienvenido a tu membresía!</h2>
            <p>Hola <strong>${memberName}</strong>,</p>
            
            <p>Tu membresía ha sido asignada exitosamente. Aquí están los detalles:</p>
            
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
              <tr style="background-color: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Plan de Membresía</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${membershipName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Fecha de Inicio</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${startDateFormatted}</td>
              </tr>
              <tr style="background-color: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Fecha de Vencimiento</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${endDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Monto a Pagar</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">RD$ ${parseFloat(finalAmount as any).toFixed(2)}</td>
              </tr>
              ${discountText ? `<tr style="background-color: #f5f5f5;">
                <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">
                  <strong>Descuento:</strong> ${finalDiscountPercentage}% ${appliedPromotionCode ? `(Cupón: <strong>${appliedPromotionCode}</strong>)` : ''}
                </td>
              </tr>` : ''}
            </table>
            ${paidWithCreditText}
            
            <p style="margin-top: 20px;">Si tienes alguna pregunta sobre tu membresía, por favor contacta a nuestro equipo.</p>
            
            <p>¡Gracias por confiar en nosotros!</p>
          </div>
        `;

        if (memberWithUser.user.phone) {
          try {
            const waPaidText = paymentMethod === PaymentMethod.CREDIT_BALANCE ? `\n✅ *Pagado automáticamente con tu saldo a favor*\n` : '';
            const waMessage = `Hola *${memberName}*,\n\n` +
              `Tu membresía ha sido asignada exitosamente. Aquí están los detalles:\n\n` +
              `📌 *Plan:* ${membershipName}\n` +
              `📅 *Inicio:* ${startDateFormatted}\n` +
              `⏳ *Vencimiento:* ${endDateFormatted}\n` +
              `💰 *Monto a Pagar:* RD$ ${parseFloat(finalAmount as any).toFixed(2)}\n` +
              waPaidText +
              `\n¡Gracias por confiar en nosotros!`;

            await this.outboxService.enqueueWhatsapp({
              recipient: memberWithUser.user.phone,
              recipientName: memberName,
              content: waMessage,
              priority: NotificationPriority.URGENT,
              metadata: { source: 'membership_assigned', memberId: memberWithUser.id },
            });
            console.log(`[MemberMembershipsService] ✅ WhatsApp encolado en Outbox.`);
          } catch (waError) {
            console.error(`[MemberMembershipsService] ❌ Error al encolar WhatsApp:`, waError.message);
          }
        }

        console.log(`[MemberMembershipsService] 📧 Encolando email a: ${memberEmail}`);
        
        await this.outboxService.enqueueEmail({
          recipient: memberEmail,
          recipientName: memberName,
          subject: `✓ Membresía Asignada - ${membershipName}`,
          htmlContent,
          content: `Membresía Asignada - ${membershipName}. Inicio: ${startDateFormatted}, Vence: ${endDateFormatted}. ¡Gracias por confiar en nosotros!`,
          priority: NotificationPriority.URGENT,
          metadata: { source: 'membership_assigned', memberId: memberWithUser.id },
        });
        
        console.log(`[MemberMembershipsService] ✅ Email encolado en Outbox exitosamente.`);
      } else {
        console.log(`[MemberMembershipsService] ⚠️  No se pudo enviar email - Usuario sin email o no encontrado`);
        console.log(`[MemberMembershipsService] - memberWithUser existe: ${!!memberWithUser}`);
        if (memberWithUser) {
          console.log(`[MemberMembershipsService] - user existe: ${!!memberWithUser.user}`);
          if (memberWithUser.user) {
            console.log(`[MemberMembershipsService] - email existe: ${!!memberWithUser.user.email}`);
          }
        }
      }
    } catch (emailError) {
      console.error(`[MemberMembershipsService] ❌ Error al enviar email de membresía:`, emailError.message);
      console.error(`[MemberMembershipsService] Stack:`, (emailError as any)?.stack);
      // No bloquear el flujo si hay error en el email
    }

    // La creación del grupo ya se hace arriba en línea ~249
    // No duplicar aquí

    // SINCRONIZAR A ZKACCESS: Actualizar endDate
    let syncWarning: string | null = null;
    try {
      console.log(`[MemberMembershipsService] 🔄 Sincronizando nueva fecha de membresía a ZKAccess...`);
      // Obtener el memberCode
      const memberDetails = await this.memberRepository.findOne({ where: { id: memberId }, relations: ['user'] });
      
      // Calcular grace period
      let graceDays = 0;
      try {
        const settings = await this.gymSettingsService.getSettings();
        if (settings && settings.membershipSuspensionDays) {
          graceDays = settings.membershipSuspensionDays;
        }
      } catch (e) {
        console.warn(`[MemberMembershipsService] No se pudo obtener settings, usando graceDays = 0`, e);
      }
      
      const accEndDate = new Date(endDate);
      accEndDate.setDate(accEndDate.getDate() + graceDays);

      if (memberDetails && memberDetails.user) {
        const accessUserIdMatch = memberDetails.memberCode?.match(/^MEM_(\d+)$/);
        const accessUserId = accessUserIdMatch ? Number(accessUserIdMatch[1]) : undefined;

        const payload: any = {
          Badgenumber: memberDetails.memberCode.replace(/[^0-9]/g, ''),
          name: memberDetails.user.firstName,
          lastname: memberDetails.user.lastName,
          email: memberDetails.user.email,
          acc_startdate: startDate.toISOString().split('T')[0],
          acc_enddate: accEndDate.toISOString().split('T')[0], // Enviar la fecha calculada + gracia
        };

        if (accessUserId !== undefined && !Number.isNaN(accessUserId)) {
          payload.USERID = accessUserId;
        }

        await this.accessService.pushMemberToAccess(payload);
        console.log(`[MemberMembershipsService] ✅ Sincronización a ZKAccess exitosa.`);
      }
    } catch (accessError: any) {
      console.error(`[MemberMembershipsService] ❌ Error sincronizando a ZKAccess:`, accessError.message);
      syncWarning = `ZKAccess: ${accessError.message}`;
    }

    try {
      const zkPromise = this.syncMemberToDeviceSafe(memberId, 'assign-membership');
      const timeoutPromise = new Promise<string>((resolve) =>
        setTimeout(() => resolve('Equipo biométrico no respondió a tiempo (fuera de red)'), 2000),
      );
      const zkWarning = await Promise.race([zkPromise, timeoutPromise]);
      if (zkWarning) {
        syncWarning = syncWarning ? `${syncWarning} | ${zkWarning}` : zkWarning;
      }
    } catch (e: any) {
      console.warn(`[MemberMembershipsService] Advertencia en sync ZKTeco:`, e?.message || e);
    }

    return {
      ...savedMemberMembership,
      warning: syncWarning || null,
    };
    } catch (error) {
      console.error('[ASSIGN MEMBERSHIP] ❌ ERROR COMPLETO:', error);
      console.error('[ASSIGN MEMBERSHIP] Mensaje:', error.message);
      console.error('[ASSIGN MEMBERSHIP] Stack:', (error as any).stack);
      
      // Re-lanzar el error para que NestJS lo maneje
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Si es otro tipo de error, lanzar un BadRequestException con el mensaje
      throw new BadRequestException(`Error al asignar membresía: ${error.message}`);
    }
  }

  /**
   * Remover la membresía activa de un miembro
   */
  async removeMembership(
    memberId: string,
    refundAction?: 'credit_balance' | 'refund' | 'revoke_only',
  ): Promise<{ success: boolean; message: string; refundAction?: string; amount?: number }> {
    console.log(`\n[REMOVE MEMBERSHIP] 🗑️ Intentando remover membresía para memberId: "${memberId}", action: "${refundAction}"`);
    
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

    // PRIMERO: Marcar todos los pagos pendientes como CANCELLED (cancelar deuda)
    console.log(`[REMOVE MEMBERSHIP] 📋 Marcando pagos pendientes como CANCELLED...`);
    const pendingPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .getMany();
    
    const paymentIdsToCancel: string[] = pendingPayments.map(p => p.id);
    if (memberMembership.paymentId) {
      const directPending = await this.paymentRepository.findOne({
        where: { id: memberMembership.paymentId, status: PaymentStatus.PENDING },
      });
      if (directPending && !paymentIdsToCancel.includes(directPending.id)) {
        paymentIdsToCancel.push(directPending.id);
      }
    }

    if (paymentIdsToCancel.length > 0) {
      await this.paymentRepository.update(
        { id: In(paymentIdsToCancel) },
        {
          status: PaymentStatus.CANCELLED,
        },
      );
      console.log(`[REMOVE MEMBERSHIP] ✓ ${paymentIdsToCancel.length} pago(s) pendiente(s) marcado(s) como CANCELLED`);
    }

    // SEGUNDO: Gestionar pagos completados si existieran
    let refundMessage = '';
    let processedAmount = 0;

    let completedPayment: Payment | null = null;
    if (memberMembership.paymentId) {
      completedPayment = await this.paymentRepository.findOne({
        where: { id: memberMembership.paymentId, status: PaymentStatus.COMPLETED },
      });
    }
    if (!completedPayment) {
      completedPayment = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
        .where('mm.id = :mmId', { mmId: memberMembership.id })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getOne();
    }

    if (completedPayment) {
      processedAmount = Number(completedPayment.amount) || 0;
      console.log(`[REMOVE MEMBERSHIP] Pago completado detectado: ${completedPayment.id}, monto: ${processedAmount}`);

      const member = await this.memberRepository.findOne({ where: { id: memberId } });

      if (refundAction === 'credit_balance') {
        if (member) {
          const currentCredit = Number(member.creditBalance) || 0;
          member.creditBalance = currentCredit + processedAmount;
          await this.memberRepository.save(member);
          console.log(`[REMOVE MEMBERSHIP] 💰 Saldo a favor acreditado: ${processedAmount}. Nuevo saldo: ${member.creditBalance}`);
        }
        completedPayment.status = PaymentStatus.REFUNDED;
        completedPayment.notes = (completedPayment.notes ? completedPayment.notes + ' | ' : '') +
          `Acreditado a saldo a favor ($${processedAmount}) por cancelación de membresía`;
        await this.paymentRepository.save(completedPayment);
        refundMessage = `Pago de RD$ ${processedAmount.toFixed(2)} transferido a Saldo a Favor del socio.`;
      } else if (refundAction === 'refund') {
        completedPayment.status = PaymentStatus.REFUNDED;
        completedPayment.notes = (completedPayment.notes ? completedPayment.notes + ' | ' : '') +
          `Reembolsado ($${processedAmount}) por cancelación de membresía`;
        await this.paymentRepository.save(completedPayment);
        refundMessage = `Pago de RD$ ${processedAmount.toFixed(2)} marcado como Reembolsado.`;
      } else {
        refundMessage = `Membresía revocada sin reembolso del pago previo (RD$ ${processedAmount.toFixed(2)}).`;
      }
    }

    // TERCERO: Eliminar al miembro de group_companions si es acompañante
    console.log(`[REMOVE MEMBERSHIP] 🗑️ Eliminando de group_companions si existe...`);
    
    // Si es acompañante, obtener el groupId ANTES de eliminarlo
    let groupIdToUpdate: string | null = null;
    if (memberMembership.membershipType === 'companion' && memberMembership.groupId) {
      groupIdToUpdate = memberMembership.groupId;
      console.log(`[REMOVE MEMBERSHIP] Es acompañante - groupId: ${groupIdToUpdate}`);
    }
    
    const groupCompanionDeleteResult = await this.memberMembershipRepository.manager.connection
      .createQueryBuilder()
      .delete()
      .from('group_companions')
      .where('memberId = :memberId', { memberId })
      .execute();
    
    console.log(`[REMOVE MEMBERSHIP] ✓ Registros eliminados de group_companions: ${groupCompanionDeleteResult.affected}`);
    
    // Si se eliminó un acompañante, decrementar el contador del grupo
    if (groupIdToUpdate && groupCompanionDeleteResult.affected && groupCompanionDeleteResult.affected > 0) {
      console.log(`[REMOVE MEMBERSHIP] 📉 Decrementando contador de acompañantes para groupId: ${groupIdToUpdate}...`);
      const updateResult = await this.memberMembershipRepository.manager.connection
        .createQueryBuilder()
        .update('groups')
        .set({ companionCount: () => 'companionCount - 1' })
        .where('id = :groupId', { groupId: groupIdToUpdate })
        .execute();
      console.log(`[REMOVE MEMBERSHIP] ✓ Contador de acompañantes decrementado - filas actualizadas: ${updateResult.affected}`);
    }

    // CUARTO: ELIMINAR COMPLETAMENTE el registro de MemberMembership de la BD
    const deleteResult = await this.memberMembershipRepository.delete({
      id: memberMembership.id,
    });
    
    console.log(`[REMOVE MEMBERSHIP] ✓ Membresía eliminada de la BD: ${memberMembership.id} - Registros eliminados: ${deleteResult.affected}`);

    // QUINTO: SINCRONIZAR A ZKACCESS: Bloquear fecha de acceso (acc_enddate = 2000-01-01)
    try {
      console.log(`[MemberMembershipsService] 🔄 Removiendo fecha de membresía en ZKAccess...`);
      const memberDetails = await this.memberRepository.findOne({ where: { id: memberId }, relations: ['user'] });
      if (memberDetails && memberDetails.user) {
        const accessPromise = this.accessService.pushMemberToAccess({
          Badgenumber: memberDetails.memberCode.replace(/[^0-9]/g, ''),
          name: memberDetails.user.firstName,
          lastname: memberDetails.user.lastName,
          email: memberDetails.user.email,
          phone: memberDetails.user.phone,
          USERID: memberDetails.zkUid,
          acc_startdate: '2000-01-01',
          acc_enddate: '2000-01-01', // Sin suscripción -> fecha pasada para bloquear
        });

        // Timeout preventivo de 2.5s para evitar que bloquee la respuesta
        await Promise.race([
          accessPromise,
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
        console.log(`[MemberMembershipsService] ✅ Remoción en ZKAccess completada.`);
      }
    } catch (accessError: any) {
      console.error(`[MemberMembershipsService] ❌ Error sincronizando a ZKAccess:`, accessError.message);
    }

    // SEXTO: Sincronización biométrica en segundo plano (no bloquea la API y preserva huellas dactilares)
    this.syncMemberToDeviceSafe(memberId, 'remove-membership').catch((zkError) => {
      console.warn(`[MemberMembershipsService] Advertencia en sync ZKTeco tras cancelación:`, zkError?.message || zkError);
    });

    console.log(`[REMOVE MEMBERSHIP] ✓ Membresía removida para: ${memberId}\n`);

    return {
      success: true,
      message: `Membresía cancelada exitosamente. ${refundMessage}`.trim(),
      refundAction,
      amount: processedAmount,
    };
  }

  private async syncMemberToDeviceSafe(memberId: string, reason: string): Promise<string | null> {
    try {
      const result = await this.zktecoDeviceService.syncMemberById(memberId);
      if (result?.success === false) {
        const msg = result.message || 'Equipo biométrico no sincronizado';
        console.warn(`[MemberMembershipsService] Miembro ${memberId} no fue sincronizado con equipo ZKTeco (${reason}): ${msg}`);
        return msg;
      }
      console.log(`[MemberMembershipsService] Miembro ${memberId} sincronizado con equipo ZKTeco (${reason})`);
      return null;
    } catch (error: any) {
      const errStr = this.formatZkError(error);
      console.warn(`[MemberMembershipsService] No se pudo sincronizar miembro ${memberId} con equipo ZKTeco (${reason}): ${errStr}`);
      return `Biométrico no conectado (${errStr})`;
    }
  }

  private async deleteMemberFromDeviceSafe(memberId: string, reason: string): Promise<void> {
    try {
      await this.zktecoDeviceService.deleteMemberById(memberId);
      console.log(`[MemberMembershipsService] Miembro ${memberId} removido del equipo ZKTeco (${reason})`);
    } catch (error: any) {
      console.warn(`[MemberMembershipsService] No se pudo remover miembro ${memberId} del equipo ZKTeco (${reason}): ${this.formatZkError(error)}`);
    }
  }

  private formatZkError(error: any): string {
    if (!error) return 'Equipo no alcanzable en la red';
    const toast = typeof error.toast === 'function' ? error.toast() : null;
    const detail = error.err?.code || error.err?.message || error.code || error.message || '';
    const mainMsg = (toast && toast !== 'undefined') ? toast : (detail || 'Equipo biométrico no respondió (fuera de red)');
    return `${mainMsg}${error.ip ? ` (IP: ${error.ip})` : ''}`;
  }

  /**
   * Obtener todas las membresías pendientes de pago
   * FILTRO: Excluye acompañantes (companion)
   * Agrega estado legible: "Responsable" o "Individual"
   */
  async getPendingPayments(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: any[]; pagination: any }> {
    const skip = (page - 1) * limit;
    // Obtener membresías pendientes de pago (desde Payment table)
    // Incluir: individual, responsible, y companion (acompañantes)
    const pendingMembershipPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .leftJoinAndSelect('mm.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('(user.role != :adminRole OR user.role IS NULL)', { adminRole: UserRole.ADMIN })
      .orderBy('payment.createdAt', 'DESC')
      .getManyAndCount();

    const membershipData = pendingMembershipPayments[0];
    const membershipTotal = pendingMembershipPayments[1];

    console.log('[getPendingPayments] membershipData:', JSON.stringify(membershipData, null, 2));

    // Obtener pagos de inscripción pendientes
    const registrationPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .leftJoinAndSelect('mm.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('payment.paymentType = :type', { type: PaymentType.REGISTRATION })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('(user.role != :adminRole OR user.role IS NULL)', { adminRole: UserRole.ADMIN })
      .orderBy('payment.createdAt', 'DESC')
      .getMany();

    // Mapear datos de membresías
    const mappedMemberships = membershipData.map((mm: any) => {
      // Obtener el monto del payment si existe, sino usar el precio de la membresía
      let amount = mm.membership?.price || 0;
      
      // Si es un acompañante, usar pricePerCompanion
      if (mm.membershipType === 'companion') {
        amount = mm.membership?.pricePerCompanion || 0;
      }
      
      // Si existe un payment, usar el monto del payment (que ya tiene el cálculo correcto)
      if (mm.payments && mm.payments.length > 0) {
        amount = mm.payments[0].amount;
      }
      
      return {
        ...mm,
        amount,
        membershipStatusLabel: mm.membershipType === 'responsible' ? 'Familiar' : mm.membershipType === 'companion' ? 'Acompañante' : 'Individual',
        paymentType: 'membership',
      };
    });

    // Mapear datos de pagos de inscripción
    const mappedRegistration = registrationPayments.map((mm: any) => ({
      id: mm.id,
      member: mm.member,
      amount: mm.amount,
      paymentType: 'registration',
      membershipStatusLabel: 'Inscripción Pendiente',
      createdAt: mm.createdAt,
    }));

    // Combinar y paginar
    const allData = [...mappedMemberships, ...mappedRegistration];
    const total = allData.length;
    const paginatedData = allData.slice(skip, skip + limit);

    return {
      data: paginatedData,
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
      relations: ['member', 'membership'],
    });

    if (!memberMembership) {
      throw new NotFoundException(
        `MemberMembership con ID ${memberMembershipId} no encontrado`,
      );
    }

    const saved = await this.memberMembershipRepository.save(memberMembership);

    // Actualizar el Payment asociado en la tabla payments (por paymentId)
    if (memberMembership.paymentId) {
      const activeRegisterId = await this.getActiveCashRegisterId();
      await this.paymentRepository.update(
        { id: memberMembership.paymentId },
        { 
          status: PaymentStatus.COMPLETED,
          paymentDate: paymentDate,
          cashRegisterId: activeRegisterId,
        },
      );
      console.log(`[MemberMembershipsService] ✓ Payment actualizado a COMPLETED con cashRegisterId: ${activeRegisterId} para paymentId: ${memberMembership.paymentId}`);
    }

    // Enviar email de confirmación de pago
    try {
      const memberWithUser = await this.memberRepository.findOne({
        where: { id: memberMembership.memberId },
        relations: ['user'],
      });

      if (memberWithUser?.user?.email) {
        const memberName = memberWithUser.user.firstName || 'Miembro';
        const memberEmail = memberWithUser.user.email;
        const membershipName = memberMembership.membership?.name || 'Membresía';
        const paymentDateFormatted = new Date(paymentDate).toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        console.log(`[MemberMembershipsService] 📧 Iniciando envío de email de pago...`);
        console.log(`[MemberMembershipsService] 📧 Enviando email a: ${memberEmail}`);

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">✓ ¡Pago Confirmado!</h2>
            <p>Hola <strong>${memberName}</strong>,</p>
            <p>Nos complace confirmar que tu pago ha sido procesado exitosamente.</p>
            
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #ddd;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Plan de Membresía</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${membershipName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Monto Pagado</td>
                <td style="padding: 12px; border: 1px solid #ddd;">RD$ ${amountPaid.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Fecha de Pago</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${paymentDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Estado</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">✓ PAGADO</td>
              </tr>
            </table>

            <p>Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este es un correo automático. Por favor no responder a este correo.
            </p>
          </div>
        `;

        const emailResult = await this.emailService.sendEmail({
          recipientEmail: memberEmail,
          recipientName: memberName,
          subject: `✓ Pago Confirmado - ${membershipName}`,
          htmlContent,
        });

        if (emailResult?.id) {
          console.log(`[MemberMembershipsService] ✅ Email de pago enviado exitosamente. Log ID: ${emailResult.id}`);
        }
      }
    } catch (error) {
      console.error(`[MemberMembershipsService] ❌ Error al enviar email de pago:`, error);
      // No lanzar error, solo registrar en logs para que el pago no se bloquee
    }

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
