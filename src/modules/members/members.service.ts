import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Payment, PaymentType, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';
import { EmailService } from '../email-settings/email.service';
import { ModulesManagementService } from '../modules-management/modules-management.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { AccessService } from '../sync/access.service';
import { ZktecoDeviceService } from '../sync/zkteco-device.service';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private emailService: EmailService,
    private modulesManagementService: ModulesManagementService,
    private gymSettingsService: GymSettingsService,
    private accessService: AccessService,
    private zktecoDeviceService: ZktecoDeviceService,
  ) {}

  /**
   * Calcula si un miembro tiene membresía activa consultando la tabla member_memberships
   */
  async calculateHasMembership(memberId: string): Promise<boolean> {
    const activeMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId,
        isActive: true,
      },
    });
    return !!activeMembership;
  }

  /**
   * Obtiene el estado del pago de inscripción de un miembro
   * @param memberId - ID del miembro
   * @returns Estado del pago y si está pendiente
   */
  async getRegistrationPaymentStatus(memberId: string): Promise<{ status: string; hasPendingRegistrationPayment: boolean }> {
    const member = await this.memberRepository.findOne({ where: { id: memberId } });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    if (!member.registrationPaymentId) {
      return { status: 'NO_PAYMENT', hasPendingRegistrationPayment: false };
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: member.registrationPaymentId },
    });

    if (!payment) {
      return { status: 'PAYMENT_NOT_FOUND', hasPendingRegistrationPayment: false };
    }
    console.log(`[MembersService] Member ${memberId} registration payment status: ${payment.status}`);
    return {
      status: payment.status, 
      hasPendingRegistrationPayment: payment.status === PaymentStatus.PENDING 
    };
  }

  /**
   * Obtiene si un miembro tiene cuota de membresía pendiente
   * @param memberId - ID del miembro
   * @returns Si hay pago de membresía pendiente
   */
  async hasMembershipPaymentPending(memberId: string): Promise<{ hasPendingMembershipPayment: boolean }> {
    const member = await this.memberRepository.findOne({ where: { id: memberId } });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    const pendingPayment = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('member_memberships', 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId })
      .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .getOne();

    return { hasPendingMembershipPayment: !!pendingPayment };
  }

  /**
   * DEBUG ENDPOINT: Obtiene información detallada sobre pagos de un miembro
   * Útil para diagnosticar problemas con pagos que no se completan
   * @param memberId - ID del miembro
   */
  async debugPaymentStatus(memberId: string) {
    console.log(`\n[MembersService DEBUG] ==================== DIAGNOSTIC FOR MEMBER ${memberId} ====================`);
    
    try {
      const member = await this.memberRepository.findOne({ where: { id: memberId }, relations: ['user'] });
      if (!member) {
        console.log(`[MembersService DEBUG] ❌ Member not found`);
        return { error: 'Member not found' };
      }

      console.log(`[MembersService DEBUG] ✓ Member found: ${member.user?.email || 'N/A'}`);
      console.log(`[MembersService DEBUG] ✓ Registration Payment ID: ${member.registrationPaymentId}`);

      // 1. Check registration payment
      console.log(`[MembersService DEBUG] \n--- REGISTRATION PAYMENT ---`);
      if (member.registrationPaymentId) {
        const regPayment = await this.paymentRepository.findOne({
          where: { id: member.registrationPaymentId },
        });
        if (regPayment) {
          console.log(`[MembersService DEBUG] ✓ Registration Payment:
          - ID: ${regPayment.id}
          - Amount: $${regPayment.amount}
          - Status: ${regPayment.status}
          - PaymentDate: ${regPayment.paymentDate}
          - PaymentType: ${regPayment.paymentType}`);
        } else {
          console.log(`[MembersService DEBUG] ❌ Registration payment not found in database`);
        }
      } else {
        console.log(`[MembersService DEBUG] ⚠️  No registration payment ID linked to member`);
      }

      // 2. Check membership payments
      console.log(`[MembersService DEBUG] \n--- MEMBERSHIP PAYMENTS ---`);
      const membershipPayments = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin('member_memberships', 'mm', 'mm.paymentId = payment.id')
        .where('mm.memberId = :memberId', { memberId })
        .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
        .orderBy('payment.createdAt', 'DESC')
        .getMany();

      if (membershipPayments.length === 0) {
        console.log(`[MembersService DEBUG] ⚠️  No membership payments found`);
      } else {
        console.log(`[MembersService DEBUG] ✓ Found ${membershipPayments.length} membership payment(s):`);
        membershipPayments.forEach((payment, index) => {
          console.log(`
          Payment ${index + 1}:
          - ID: ${payment.id}
          - Amount: $${payment.amount}
          - Status: ${payment.status}
          - PaymentDate: ${payment.paymentDate}
          - DueDate: ${payment.dueDate}
          - CreatedAt: ${payment.createdAt}`);
        });
      }

      // 3. Check active membership
      console.log(`[MembersService DEBUG] \n--- ACTIVE MEMBERSHIP ---`);
      const memberWithMemberships = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['memberships'],
      });

      const activeMemberships = memberWithMemberships?.memberships?.filter(mm => !mm.endDate) || [];
      if (activeMemberships.length > 0) {
        activeMemberships.forEach((mm, index) => {
          console.log(`
          Active Membership ${index + 1}:
          - ID: ${mm.id}
          - PaymentID: ${mm.paymentId}
          - Amount: $${mm.payAmount}
          - StartDate: ${mm.startDate}
          - EndDate: ${mm.endDate}`);
        });
      } else {
        console.log(`[MembersService DEBUG] ⚠️  No active membership found`);
      }

      console.log(`[MembersService DEBUG] ==================== END DIAGNOSTIC ====================\n`);

      return {
        memberId,
        memberEmail: member.user?.email || 'N/A',
        registrationPayment: member.registrationPaymentId ? {
          exists: true,
          id: member.registrationPaymentId,
        } : { exists: false },
        membershipPaymentsCount: membershipPayments.length,
        membershipPayments: membershipPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          paymentDate: p.paymentDate,
        })),
      };
    } catch (error) {
      console.log(`[MembersService DEBUG] ❌ Error during diagnostic: ${error.message}`);
      return { error: error.message };
    }
  }

  async create(createMemberDto: CreateMemberDto, userId?: string): Promise<Member> {
    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: createMemberDto.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if member already exists for this user
    const existingMember = await this.memberRepository.findOne({
      where: { userId: createMemberDto.userId },
    });

    if (existingMember) {
      throw new BadRequestException('Member already exists for this user');
    }

    // Obtener o sincronizar código de socio igual que en ZKAccess (secuencial directo sin duplicados)
    let memberCode: string | null = null;
    let zkUid: number | undefined;

    try {
      const accessRes = await this.accessService.findOrCreateAccessMember({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        documentId: createMemberDto.documentId,
        acc_startdate: '2000-01-01',
        acc_enddate: '2000-01-01',
      });
      if (accessRes?.badgeNumber) {
        memberCode = accessRes.badgeNumber;
        const numBadge = Number(accessRes.badgeNumber);
        zkUid = Number.isFinite(numBadge) ? numBadge : accessRes.USERID;
        this.logger.log(
          `[MembersService] Socio sincronizado con Access. Badge: ${memberCode}, USERID: ${zkUid}, acción: ${accessRes.action}`,
        );
      }
    } catch (accessErr) {
      this.logger.warn(
        `[MembersService] No se pudo obtener badge desde Access (${accessErr.message}), usando secuencia local`,
      );
    }

    if (!memberCode) {
      memberCode = await this.accessService.getNextSequentialMemberCode();
      const numCode = Number(memberCode);
      zkUid = Number.isFinite(numCode) ? numCode : undefined;
    }

    // Preparar datos del member, filtrando campos que no son de la entidad
    const memberData: any = {
      id: uuidv4(),
      userId: createMemberDto.userId,
      memberCode: memberCode,
      zkUid: zkUid,
      documentId: createMemberDto.documentId,
      emergencyContact: createMemberDto.emergencyContact,
      emergencyPhone: createMemberDto.emergencyPhone,
      dateOfBirth: createMemberDto.dateOfBirth,
      gender: createMemberDto.gender ? (createMemberDto.gender as any) : undefined,
      address: createMemberDto.address,
      city: createMemberDto.city,
      zipCode: createMemberDto.zipCode,
      joinDate: createMemberDto.joinDate ? new Date(createMemberDto.joinDate) : new Date(),
    };

    // lastVisit solo si está presente
    if (createMemberDto.lastVisit) {
      memberData.lastVisit = new Date(createMemberDto.lastVisit);
    }

    const member = this.memberRepository.create(memberData);
    const savedMember = (await this.memberRepository.save(member)) as unknown as Member;

    // Crear pago de inscripción SIEMPRE (aunque sea por $0)
    try {
      const gymSettings = await this.gymSettingsService.getSettings();
      const registrationPrice = gymSettings?.membershipPrice || 0;

      console.log(`[MembersService] 🏋️ Creating registration payment with price: $${registrationPrice}`);

      // Si el precio es 0, el pago es COMPLETED inmediatamente
      const isAutoCompleted = registrationPrice === 0;
      const registrationPayment = this.paymentRepository.create({
        id: uuidv4(),
        amount: registrationPrice,
        paymentType: PaymentType.REGISTRATION,
        status: isAutoCompleted ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
        description: 'Pago de inscripción',
        paymentMethod: PaymentMethod.CASH,
        paymentDate: isAutoCompleted ? new Date() : null,
        createdBy: userId || null,
        updatedBy: userId || null,
      });

      const createdPayment = await this.paymentRepository.save(registrationPayment);
      console.log(`[MembersService] 💳 Registration payment created: ID=${createdPayment.id}, Amount=$${registrationPrice}, Status=${createdPayment.status}, PaymentDate=${createdPayment.paymentDate}, IsAutoCompleted=${isAutoCompleted}`);
      
      // Actualizar el miembro con el registrationPaymentId
      await this.memberRepository.update(
        { id: savedMember.id },
        { registrationPaymentId: createdPayment.id }
      );
      
      this.logger.log(`Registration payment created for member ${savedMember.id}: $${registrationPrice}, Status: ${createdPayment.status}, AutoCompleted: ${isAutoCompleted}`);
    } catch (paymentError) {
      console.error(`[MembersService] ❌ Failed to create registration payment: ${paymentError.message}`);
      this.logger.error(`Failed to create registration payment for member ${savedMember.id}`, paymentError);
      // No fallar la creación del miembro si el pago no se crea
    }

    // Enviar email de bienvenida
    try {
      console.log(`[MembersService] 📧 Attempting to send welcome email to ${user.email}`);
      
      // Obtener nombre del gimnasio
      let gymName = 'GYM Manager';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
          console.log(`[MembersService] 📧 Got gym name: ${gymName}`);
        }
      } catch (gymError) {
        console.warn(`[MembersService] 📧 Failed to get gym settings: ${gymError.message}, using default gym name`);
        this.logger.warn(`Failed to get gym settings: ${gymError.message}, using default gym name`);
      }

      console.log(`[MembersService] 📧 Sending email to ${user.email} with gym name: ${gymName}`);
      
      await this.emailService.sendEmail({
        recipientEmail: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        subject: `¡Bienvenido a ${gymName}! - Membresía`,
        htmlContent: this.generateMemberWelcomeEmailHTML(
          user.firstName,
          user.email,
          gymName,
          memberCode,
        ),
        plainTextContent: `Hola ${user.firstName},\n\nTe has registrado exitosamente como miembro en ${gymName}.\n\nTu código de miembro es: ${memberCode}\n\nPuedes acceder con tu email y contraseña que estableciste durante el registro.\n\nBienvenido al gimnasio!`,
      });

      console.log(`[MembersService] ✅ Welcome email sent successfully to ${user.email}`);
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error(`[MembersService] ❌ Failed to send welcome email to ${user.email}: ${emailError.message}`);
      this.logger.error(`Failed to send welcome email to ${user.email}`, emailError);
      // No fallar la operación si el email no se envía
    }

    // SINCRONIZAR A ZKACCESS
    try {
      this.logger.log(`[MembersService] 🔄 Empujando socio a ZKAccess (USERINFO)...`);
      await this.accessService.pushMemberToAccess({
        Badgenumber: savedMember.memberCode.replace(/[^0-9]/g, ''),
        name: user.firstName,
        lastname: user.lastName,
        email: user.email,
        phone: user.phone,
        documentId: savedMember.documentId,
        USERID: savedMember.zkUid,
        acc_startdate: '2000-01-01',
        acc_enddate: '2000-01-01',
      });
    } catch (accessError) {
      this.logger.error(`[MembersService] ❌ Falló la sincronización a Access del socio ${savedMember.id}`, accessError);
    }

    await this.syncMemberToDeviceSafe(savedMember.id, 'create');

    return savedMember;
  }

  private generateMemberWelcomeEmailHTML(firstName: string, email: string, gymName: string = 'GYM Manager', memberCode: string = ''): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .welcome-box { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .code-box { background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
            .member-code { font-size: 24px; font-weight: bold; color: #ff6b00; letter-spacing: 2px; }
            .info-item { margin: 10px 0; }
            .label { font-weight: bold; color: #333; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a ${gymName}!</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${firstName}</strong>,</p>
              <p>Nos alegra tenerte como parte de nuestra comunidad de gimnasio.</p>
              
              <div class="welcome-box">
                <p><strong>✅ Tu cuenta ha sido creada exitosamente</strong></p>
                <div class="info-item">
                  <div class="label">📧 Email:</div>
                  <div>${email}</div>
                </div>
              </div>
              
              <div class="code-box">
                <p style="margin: 0 0 10px 0; color: #666;"><strong>Tu Código de Miembro:</strong></p>
                <div class="member-code">${memberCode}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Guarda este código para futuras referencias</p>
              </div>
              
              <p><strong>🚀 Próximos pasos:</strong></p>
              <ol>
                <li>Descarga la aplicación GYM Manager desde tu tienda de apps</li>
                <li>Inicia sesión con tu email y contraseña</li>
                <li>Completa tu perfil de membresía</li>
                <li>¡Comienza tu viaje de fitness!</li>
              </ol>
              
              <p>Si tienes alguna pregunta o necesitas asistencia, por favor contacta a nuestro equipo.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${gymName}. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no respondas.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: any[]; pagination: any }> {
    const skip = (page - 1) * limit;

    // Query simple con relaciones
    const data = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .leftJoinAndSelect('memberships.membership', 'plan')
      .select([
        'member.id',
        'member.userId',
        'member.memberCode',
        'member.documentId',
        'member.emergencyContact',
        'member.emergencyPhone',
        'member.dateOfBirth',
        'member.gender',
        'member.address',
        'member.city',
        'member.zipCode',
        'member.joinDate',
        'member.lastVisit',
        'member.registrationPaymentId',
        'member.createdAt',
        'member.updatedAt',
        'user',
        'memberships',
        'plan',
      ])
      .orderBy('member.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    console.log(`[MembersService.findAll] Total de miembros obtenidos: ${data.length}`);
    if (data.length > 0) {
      console.log(`[MembersService.findAll] Primer miembro: id=${data[0].id}, userId=${data[0].userId}, type=${typeof data[0].id}`);
    }

    const total = await this.memberRepository.count();

    // Calcular hasPendingPayment para cada miembro (con async)
    const mappedData = await Promise.all(
      data.map(async (member) => {
        console.log(`[MembersService.findAll] Procesando miembro: id="${member.id}" (type: ${typeof member.id}), userId="${member.userId}"`);
        
        // Asegurar que memberships es un array
        const memberships = member.memberships || [];
        
        if (memberships.length === 0) {
          console.log(`[MembersService] Miembro ${member.id}: SIN MEMBRESÍAS`);
          
          // Calcular dinámicamente si tiene membresía activa
          const hasMembership = await this.calculateHasMembership(member.id);
          
          // Verificar si hay pago de inscripción pendiente
          const pendingRegistrationPayment = await this.paymentRepository
            .createQueryBuilder('payment')
            .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
            .where('mm.memberId = :memberId', { memberId: member.id })
            .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.REGISTRATION })
            .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
            .getOne();
          
          const mapped = {
            ...member,
            currentMembership: null,
            hasMembership,
            isMembershipSuspended: false,
          };
          return mapped;
        }

        // Ordenar membresías por fecha más reciente
        const sortedMemberships = memberships.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        
        const mostRecent = sortedMemberships[0];
        
        // Calcular si el pago está pendiente verificando directamente en la tabla Payment
        let isPending = true;
        const membershipPayment = await this.paymentRepository
          .createQueryBuilder('payment')
          .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
          .where('mm.memberId = :memberId', { memberId: member.id })
          .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
          .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
          .getOne();
        
        if (!membershipPayment) {
          isPending = false;
        }
        
        // LÓGICA DE ACOMPAÑANTES: Si es acompañante, verificar si el responsable del grupo pagó
        if (mostRecent.membershipType === 'companion' && isPending) {
          // ESTRATEGIA 1: Buscar por groupId si existe
          let responsibleMembership: MemberMembership | null = null;
          
          if (mostRecent.groupId) {
            responsibleMembership = await this.memberMembershipRepository
              .createQueryBuilder('mm')
              .leftJoinAndSelect('mm.member', 'member')
              .leftJoinAndSelect('member.user', 'user')
              .where('mm.groupId = :groupId', { groupId: mostRecent.groupId })
              .andWhere('mm.membershipType != :companion', { companion: 'companion' })
              .andWhere('mm.member.id != :currentMemberId', { currentMemberId: member.id })
              .orderBy('mm.createdAt', 'DESC')
              .take(1)
              .getOne();
          }
          
          // ESTRATEGIA 2: Si no encontró por groupId, buscar por membershipId (misma membresía)
          if (!responsibleMembership && mostRecent.membershipId) {
            responsibleMembership = await this.memberMembershipRepository
              .createQueryBuilder('mm')
              .leftJoinAndSelect('mm.member', 'member')
              .leftJoinAndSelect('member.user', 'user')
              .where('mm.membershipId = :membershipId', { membershipId: mostRecent.membershipId })
              .andWhere('mm.membershipType != :companion', { companion: 'companion' })
              .andWhere('mm.member.id != :currentMemberId', { currentMemberId: member.id })
              .orderBy('mm.createdAt', 'DESC')
              .take(1)
              .getOne();
          }
          
          if (responsibleMembership) {
            const responsiblePayment = await this.paymentRepository
              .createQueryBuilder('payment')
              .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
              .where('mm.memberId = :memberId', { memberId: responsibleMembership.memberId })
              .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
              .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
              .getOne();
            if (!responsiblePayment) {
              isPending = false;
            }
          }
        }
        
        // Determinar el label del estado de membresía
        let membershipStatusLabel = '';
        
        if (mostRecent.membershipType === 'companion') {
          membershipStatusLabel = 'Acompañante';
        } else if (mostRecent.membershipType === 'responsible') {
          membershipStatusLabel = 'Responsable';
        } else if (mostRecent.membershipType === 'individual') {
          // Si es 'individual' pero tiene groupId o hay acompañantes en su grupo, es Responsable de grupo
          if (mostRecent.groupId) {
            membershipStatusLabel = 'Familiar';
          } else if (mostRecent.membershipId) {
            // Verificar si hay acompañantes en la misma membresía
            const companionCount = await this.memberMembershipRepository
              .createQueryBuilder('mm')
              .where('mm.membershipId = :membershipId', { membershipId: mostRecent.membershipId })
              .andWhere('mm.membershipType = :type', { type: 'companion' })
              .getCount();
            
            if (companionCount > 0) {
              membershipStatusLabel = 'Familiar';
            } else {
              membershipStatusLabel = 'Individual';
            }
          } else {
            membershipStatusLabel = 'Individual';
          }
        }

        // Verificar si la membresía está suspendida por falta de pago
        // Usar directamente el Payment para determinar suspensión
        const missedPaymentsCount = await this.paymentRepository
          .createQueryBuilder('payment')
          .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
          .where('mm.memberId = :memberId', { memberId: member.id })
          .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
          .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
          .getCount();
        
        const isMembershipSuspended =
          missedPaymentsCount > 0 && 
          mostRecent.suspensionDate !== null;

        // Verificar si hay pago de inscripción pendiente (además del pago de membresía)
        const pendingRegistrationPayment = await this.paymentRepository
          .createQueryBuilder('payment')
          .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
          .where('mm.memberId = :memberId', { memberId: member.id })
          .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.REGISTRATION })
          .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
          .getOne();

        // Verificar si hay pago de membresía pendiente (basándose en la tabla Payment, no en MemberMembership)
        const pendingMembershipPayment = await this.paymentRepository
          .createQueryBuilder('payment')
          .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
          .where('mm.memberId = :memberId', { memberId: member.id })
          .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
          .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
          .getOne();

        const hasPending = Boolean(isPending || pendingMembershipPayment);

        const mapped = {
          ...member,
          memberships: sortedMemberships,
          currentMembership: mostRecent,
          activeMembership: mostRecent,
          membership: mostRecent?.membership || null,
          hasMembership: Boolean(mostRecent.isActive),
          hasPendingPayment: hasPending,
          isPaid: !hasPending,
          membershipType: mostRecent.membershipType,
          membershipStatusLabel,
          isMembershipSuspended,
        };
        return mapped;
      }),
    );

    return {
      data: mappedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Member> {
    const member = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .leftJoinAndSelect('memberships.membership', 'plan')
      .where('member.id = :id', { id })
      .getOne();

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const sortedMemberships = (member.memberships || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const activeMembership = sortedMemberships.find((m) => m.isActive) || sortedMemberships[0] || null;

    // Verificar si hay pago de membresía pendiente
    const pendingMembershipPayment = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId: id })
      .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.MEMBERSHIP })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .getOne();

    const result = {
      ...member,
      memberships: sortedMemberships,
      activeMembership: activeMembership,
      currentMembership: activeMembership,
      membership: activeMembership?.membership || null,
      hasMembership: Boolean(activeMembership?.isActive),
      hasPendingPayment: Boolean(pendingMembershipPayment),
    };

    return result as unknown as Member;
  }

  async findByUserId(userId: string): Promise<Member> {
    const member = await this.memberRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found for this user');
    }

    return member;
  }

  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const member = await this.findById(id);
    const incomingUser = (updateMemberDto as any).user || {};
    const userUpdate: Partial<User> = {
      firstName: updateMemberDto.firstName ?? incomingUser.firstName,
      lastName: updateMemberDto.lastName ?? incomingUser.lastName,
      email: updateMemberDto.email ?? incomingUser.email,
      phone: updateMemberDto.phone ?? incomingUser.phone,
    };

    const hasUserChanges = Object.values(userUpdate).some((value) => value !== undefined);
    if (hasUserChanges && member.userId) {
      await this.userRepository.update(
        { id: member.userId },
        Object.fromEntries(
          Object.entries(userUpdate).filter(([, value]) => value !== undefined),
        ),
      );
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      user,
      ...memberUpdate
    } = updateMemberDto as any;

    Object.assign(member, memberUpdate);

    const saved = await this.memberRepository.save(member);
    await this.syncMemberToDeviceSafe(id, 'update');
    return this.findById(saved.id);
  }

  async removeMemberships(id: string): Promise<{ message: string }> {
    // 1. Marcar todos los pagos pendientes como CANCELLED
    const pendingPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId: id })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .getMany();
    
    if (pendingPayments.length > 0) {
      const paymentIds = pendingPayments.map(p => p.id);
      await this.paymentRepository.update(
        { id: paymentIds.length === 1 ? paymentIds[0] : undefined },
        {
          status: PaymentStatus.CANCELLED,
        },
      );
    }

    // 2. Obtener los grupos donde este miembro es acompañante para decrementar el contador
    const companions = await this.memberRepository.manager.connection
      .createQueryBuilder()
      .select('group_companions.groupId', 'groupId')
      .from('group_companions', 'group_companions')
      .where('group_companions.memberId = :memberId', { memberId: id })
      .getRawMany();

    // 3. Eliminar el acompañante del grupo (group_companions table)
    const deleteResult = await this.memberRepository.manager.connection
      .createQueryBuilder()
      .delete()
      .from('group_companions')
      .where('memberId = :memberId', { memberId: id })
      .execute();

    // 4. Decrementar el contador de acompañantes en cada grupo
    if (companions && companions.length > 0) {
      for (const companion of companions) {
        await this.memberRepository.manager.connection
          .createQueryBuilder()
          .update('groups')
          .set({ companionCount: () => 'companionCount - 1' })
          .where('id = :groupId', { groupId: companion.groupId })
          .execute();
      }
    }
    
    // 5. Eliminar todas las membresías del miembro (pero mantener el miembro mismo)
    await this.memberMembershipRepository.delete({ memberId: id });

    // 6. Actualizar estado local y sincronizar a ZKAccess para bloquear acceso
    const member = await this.memberRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (member) {
      if (!member.memberCode) {
        console.warn(`[MembersService] ⚠️ No se puede sincronizar a ZKAccess porque memberCode es nulo o vacío para el miembro ${id}`);
      } else if (!member.user) {
        console.warn(`[MembersService] ⚠️ No se puede sincronizar a ZKAccess porque no se encontró user para el miembro ${id}`);
      } else {
        const badgeNumber = member.memberCode.replace(/[^0-9]/g, '');
        const accessUserIdMatch = member.memberCode?.match(/^MEM_(\d+)$/i);
        const accessUserId = accessUserIdMatch ? Number(accessUserIdMatch[1]) : undefined;

        if (!badgeNumber) {
          console.warn(`[MembersService] ⚠️ No se puede sincronizar a ZKAccess porque Badgenumber queda vacío para memberCode=${member.memberCode}`);
        } else {
          try {
            await this.accessService.deleteMemberFromAccess(badgeNumber, accessUserId);
            console.log(`[MembersService] ✅ ZKAccess eliminado tras remover membresías del miembro ${id}`);
          } catch (accessError) {
            console.error(`[MembersService] ❌ Error eliminando socio de ZKAccess tras remover membresías del miembro ${id}:`, accessError?.message ?? accessError);
          }
        }
      }
    }
    
    await this.deleteMemberFromDeviceSafe(id, 'remove-memberships');

    return { message: 'Memberships and companions removed successfully' };
  }

  async delete(id: string): Promise<void> {
    // Verificar que el miembro existe antes de intentar eliminarlo
    const member = await this.memberRepository.findOne({ where: { id } });
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // Primero remover membresías y companions
    await this.removeMemberships(id);

    // Luego eliminar el miembro completamente
    const result = await this.memberRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
  }

  private async syncMemberToDeviceSafe(memberId: string, reason: string): Promise<void> {
    try {
      const result = await this.zktecoDeviceService.syncMemberById(memberId, {
        allowWithoutActiveMembership: reason === 'create' || reason === 'update',
      });

      if (result?.success === false) {
        this.logger.warn(`[MembersService] Miembro ${memberId} no fue sincronizado con equipo ZKTeco (${reason}): ${result.message || 'sin detalle'}`);
        return;
      }

      this.logger.log(`[MembersService] Miembro ${memberId} sincronizado con equipo ZKTeco (${reason})`);
    } catch (error) {
      this.logger.warn(`[MembersService] No se pudo sincronizar miembro ${memberId} con equipo ZKTeco (${reason}): ${error.message}`);
    }
  }

  private async deleteMemberFromDeviceSafe(memberId: string, reason: string): Promise<void> {
    try {
      await this.zktecoDeviceService.deleteMemberById(memberId);
      this.logger.log(`[MembersService] Miembro ${memberId} removido del equipo ZKTeco (${reason})`);
    } catch (error) {
      this.logger.warn(`[MembersService] No se pudo remover miembro ${memberId} del equipo ZKTeco (${reason}): ${error.message}`);
    }
  }

  private getSequenceFromMemberCode(memberCode?: string | null): number {
    if (!memberCode) {
      return 0;
    }

    const sequence = Number(memberCode.split('-')[1]);
    return Number.isFinite(sequence) ? sequence : 0;
  }

  async search(query: string = '', page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const searchQuery = `%${(query || '').trim().toLowerCase()}%`;

    // Search in user email, firstName, lastName, member code or documentId.
    // MySQL does not support ILIKE, so use LOWER(...) LIKE for case-insensitive search.
    const [data, total] = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .leftJoinAndSelect('memberships.membership', 'plan')
      .where('LOWER(user.email) LIKE :query', { query: searchQuery })
      .orWhere('LOWER(user.firstName) LIKE :query', { query: searchQuery })
      .orWhere('LOWER(user.lastName) LIKE :query', { query: searchQuery })
      .orWhere('LOWER(member.memberCode) LIKE :query', { query: searchQuery })
      .orWhere('LOWER(member.documentId) LIKE :query', { query: searchQuery })
      .orWhere('user.phone LIKE :query', { query: searchQuery })
      .orWhere('member.emergencyPhone LIKE :query', { query: searchQuery })
      .skip(skip)
      .take(limitNum)
      .orderBy('member.createdAt', 'DESC')
      .getManyAndCount();

    const mappedData = data.map((member) => {
      const sorted = (member.memberships || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const mostRecent = sorted[0] || null;
      return {
        ...member,
        memberships: sorted,
        currentMembership: mostRecent,
        activeMembership: mostRecent,
        membership: mostRecent?.membership || null,
        hasMembership: mostRecent ? Boolean(mostRecent.isActive) : false,
      };
    });

    return {
      data: mappedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async getRecentMembers(days: number = 30): Promise<Member[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.joinDate >= :date', { date })
      .orderBy('member.joinDate', 'DESC')
      .getMany();
  }

  /**
   * Adds credit to a member and creates a corresponding payment record
   */
  async addCredit(memberId: string, amount: number, paymentMethod: PaymentMethod, notes?: string, userId?: string): Promise<Member> {
    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const member = await this.memberRepository.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    // Convert to number to ensure proper addition
    const currentBalance = Number(member.creditBalance) || 0;
    member.creditBalance = currentBalance + Number(amount);
    
    await this.memberRepository.save(member);

    // Create a payment record for the added credit
    const payment = new Payment();
    payment.id = uuidv4();
    payment.amount = amount;
    payment.paymentMethod = paymentMethod;
    payment.paymentType = PaymentType.ADD_CREDIT;
    payment.status = PaymentStatus.COMPLETED;
    payment.paymentDate = new Date();
    payment.notes = notes || 'Agregado a saldo a favor';
    payment.createdBy = userId || null;
    payment.updatedBy = userId || null;

    await this.paymentRepository.save(payment);

    return member;
  }
}
