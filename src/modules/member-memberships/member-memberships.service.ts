import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Membership, MembershipType } from '../../entities/membership.entity';
import { Payment, PaymentMethod, PaymentType, PaymentStatus } from '../../entities/payment.entity';
import { CreateMemberMembershipDto } from './dto/create-member-membership.dto';
import { v4 as uuidv4 } from 'uuid';
import { PromotionsService } from '../promotions/promotions.service';
import { EmailService } from '../email-settings/email.service';
import { GroupsService } from '../groups/groups.service';

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
    private readonly emailService: EmailService,
    private readonly groupsService: GroupsService,
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
    
    // Determinar el monto pagado y el estado
    const amountPaidValue = dto.amountPaid ? Number(dto.amountPaid) : 0;
    memberMembership.amountPaid = amountPaidValue > 0 ? amountPaidValue : finalAmount;
    memberMembership.paymentDate = (dto.paymentDate ?? null) as any;
    // Si se pagó algo (amountPaid > 0), marcar como 'paid', si no, marcar como 'pending'
    memberMembership.paymentStatus = amountPaidValue > 0 ? 'paid' : 'pending';
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

    // Enviar email de confirmación de membresía al miembro
    try {
      console.log(`[MemberMembershipsService] 📧 Iniciando envío de email de membresía...`);
      
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
                <td style="padding: 10px; border: 1px solid #ddd;">RD$ ${parseFloat(memberMembership.amountPaid as any).toFixed(2)}</td>
              </tr>
              ${discountText ? `<tr style="background-color: #f5f5f5;">
                <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">
                  <strong>Descuento:</strong> ${finalDiscountPercentage}% ${appliedPromotionCode ? `(Cupón: <strong>${appliedPromotionCode}</strong>)` : ''}
                </td>
              </tr>` : ''}
            </table>
            
            <p style="margin-top: 20px;">Si tienes alguna pregunta sobre tu membresía, por favor contacta a nuestro equipo.</p>
            
            <p>¡Gracias por confiar en nosotros!</p>
          </div>
        `;

        console.log(`[MemberMembershipsService] 📧 Enviando email a: ${memberEmail}`);
        
        const emailResult = await this.emailService.sendEmail({
          recipientEmail: memberEmail,
          recipientName: memberName,
          subject: `✓ Membresía Asignada - ${membershipName}`,
          htmlContent,
        });
        
        console.log(`[MemberMembershipsService] ✅ Email enviado exitosamente. Log ID: ${emailResult?.id}`);
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
      relations: ['member', 'membership'],
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
