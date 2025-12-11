import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';
import { EmailService } from '../email-settings/email.service';
import { ModulesManagementService } from '../modules-management/modules-management.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';

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
    private emailService: EmailService,
    private modulesManagementService: ModulesManagementService,
    private gymSettingsService: GymSettingsService,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
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

    // Preparar datos del member, filtrando campos que no son de la entidad
    const memberData: any = {
      id: uuidv4(),
      userId: createMemberDto.userId,
      documentId: createMemberDto.documentId,
      emergencyContact: createMemberDto.emergencyContact,
      emergencyPhone: createMemberDto.emergencyPhone,
      dateOfBirth: createMemberDto.dateOfBirth,
      gender: createMemberDto.gender ? (createMemberDto.gender as any) : undefined,
      address: createMemberDto.address,
      city: createMemberDto.city,
      zipCode: createMemberDto.zipCode,
      joinDate: createMemberDto.joinDate ? new Date(createMemberDto.joinDate) : new Date(),
      isPaid: createMemberDto.isPaid ?? false,
      hasMembership: createMemberDto.hasMembership ?? false,
      hasPendingPayment: createMemberDto.hasPendingPayment ?? false,
    };

    // lastVisit solo si está presente
    if (createMemberDto.lastVisit) {
      memberData.lastVisit = new Date(createMemberDto.lastVisit);
    }

    const member = this.memberRepository.create(memberData);
    const savedMember = (await this.memberRepository.save(member)) as unknown as Member;

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
        ),
        plainTextContent: `Hola ${user.firstName},\n\nTe has registrado exitosamente como miembro en ${gymName}.\n\nPuedes acceder con tu email y contraseña que estableciste durante el registro.\n\nBienvenido al gimnasio!`,
      });

      console.log(`[MembersService] ✅ Welcome email sent successfully to ${user.email}`);
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error(`[MembersService] ❌ Failed to send welcome email to ${user.email}: ${emailError.message}`);
      this.logger.error(`Failed to send welcome email to ${user.email}`, emailError);
      // No fallar la operación si el email no se envía
    }

    return savedMember;
  }

  private generateMemberWelcomeEmailHTML(firstName: string, email: string, gymName: string = 'GYM Manager'): string {
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
      .select([
        'member.id',
        'member.userId',
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
        'member.isPaid',
        'member.createdAt',
        'member.updatedAt',
        'user',
        'memberships',
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
          console.log(`[MembersService] Miembro ${member.id}: SIN MEMBRESÍAS → hasMembership=false`);
          const mapped = {
            ...member,
            currentMembership: null,
            hasMembership: false,
            hasPendingPayment: false,
          };
          return mapped;
        }

        // Ordenar membresías por fecha más reciente
        const sortedMemberships = memberships.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        
        const mostRecent = sortedMemberships[0];
        let isPending = mostRecent.paymentStatus === 'pending';
        
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
          
          if (responsibleMembership && responsibleMembership.paymentStatus === 'paid') {
            isPending = false;
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
            membershipStatusLabel = 'Responsable';
          } else if (mostRecent.membershipId) {
            // Verificar si hay acompañantes en la misma membresía
            const companionCount = await this.memberMembershipRepository
              .createQueryBuilder('mm')
              .where('mm.membershipId = :membershipId', { membershipId: mostRecent.membershipId })
              .andWhere('mm.membershipType = :type', { type: 'companion' })
              .getCount();
            
            if (companionCount > 0) {
              membershipStatusLabel = 'Responsable';
            } else {
              membershipStatusLabel = 'Individual';
            }
          } else {
            membershipStatusLabel = 'Individual';
          }
        }

        const mapped = {
          ...member,
          memberships: sortedMemberships,
          currentMembership: mostRecent,
          hasMembership: true,
          hasPendingPayment: isPending,
          membershipType: mostRecent.membershipType,
          membershipStatusLabel,
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
      .where('member.id = :id', { id })
      .getOne();

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
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

    Object.assign(member, updateMemberDto);

    return this.memberRepository.save(member);
  }

  async delete(id: string): Promise<void> {
    // 1. Eliminar el acompañante del grupo (group_companions table)
    await this.memberRepository.manager.connection
      .createQueryBuilder()
      .delete()
      .from('group_companions')
      .where('memberId = :memberId', { memberId: id })
      .execute();
    
    // 2. Eliminar todas las membresías del miembro (no el miembro mismo)
    // Esto permite que el miembro siga existiendo pero sin membresías activas
    await this.memberMembershipRepository.delete({ memberId: id });
  }

  async search(query: string, page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    // Search in user email, firstName, lastName or member documentId
    const [data, total] = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('user.email ILIKE :query', { query: `%${query}%` })
      .orWhere('user.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('user.lastName ILIKE :query', { query: `%${query}%` })
      .orWhere('member.documentId ILIKE :query', { query: `%${query}%` })
      .skip(skip)
      .take(limit)
      .orderBy('member.createdAt', 'DESC')
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

  async getPaidMembers(page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberRepository.findAndCount({
      where: { isPaid: true },
      relations: ['user'],
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

  async getUnpaidMembers(page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberRepository.findAndCount({
      where: { isPaid: false },
      relations: ['user'],
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
}
