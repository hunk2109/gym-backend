import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Member, MemberGender } from '../../entities/member.entity';
import { Membership, MembershipType } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Payment, PaymentMethod, PaymentStatus, PaymentType } from '../../entities/payment.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { ConfigService } from './config.service';

const execPromise = promisify(exec);

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);
  private accessDbPath: string | null = null;
  // Ruta del archivo Access
  private readonly DEFAULT_DB_PATH = 'c:\\develop\\gym-backend\\dowtown.mdb';
  private readonly CONFIG_KEY = 'ACCESS_DB_PATH';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Establece la ruta de la base de datos Access (guarda en MySQL)
   */
  async setAccessDbPath(path: string): Promise<void> {
    this.accessDbPath = path;
    try {
      await this.configService.setConfig(
        this.CONFIG_KEY,
        path,
        'Ruta de la base de datos Access'
      );
      this.logger.log(`Ruta de Access guardada en BD: ${path}`);
    } catch (error) {
      this.logger.error(`Error guardando ruta en BD: ${error}`);
    }
  }

  /**
   * Obtiene la ruta de Access desde MySQL (fallback a default)
   */
  private async getAccessDbPath(): Promise<string> {
    let path: string | null = null;

    // Primero intentar obtener de la BD
    try {
      const dbPath = await this.configService.getConfig(this.CONFIG_KEY);
      if (dbPath) {
        path = dbPath;
      }
    } catch (error) {
      this.logger.warn(`Error obteniendo ruta de BD: ${error}`);
    }

    // Fallback a memoria o default
    if (!path) {
      path = this.accessDbPath || this.DEFAULT_DB_PATH;
    }
    
    // Si solo se ingresó el nombre del archivo, agregar la ruta por defecto
    if (path && !path.includes('\\') && !path.includes('/')) {
      path = join('c:\\develop\\gym-backend', path);
    }
    
    return path;
  }

  /**
   * Valida que la ruta de Access sea válida
   */
  private async validateAccessDbPath(): Promise<void> {
    const path = await this.getAccessDbPath();
    if (!path) {
      throw new Error(
        'No se pudo determinar la ruta de la base de datos Access.'
      );
    }
  }

  /**
   * Ejecuta un script Python para leer datos de Access
   */
  private async executeAccessQuery(query: string): Promise<any[]> {
    // Usar la ruta original del script en src/, no en dist/
    const scriptPath = join(process.cwd(), 'src', 'modules', 'sync', 'scripts', 'access-query.py');
    const dbPath = await this.getAccessDbPath();
    
    this.logger.debug(`Ejecutando script: ${scriptPath}`);
    this.logger.debug(`Ruta BD: ${dbPath}`);
    
    try {
      const { stdout, stderr } = await execPromise(
        `python "${scriptPath}" "${dbPath}" "${encodeURIComponent(query)}"`,
        { maxBuffer: 1024 * 1024 * 10, cwd: process.cwd() }
      );

      if (stderr && stderr.trim()) {
        this.logger.warn(`Stderr del script: ${stderr}`);
      }

      const result = JSON.parse(stdout);
      return result;
    } catch (error) {
      this.logger.error(`Error ejecutando query: ${error.message}`);
      if (error.stderr) {
        this.logger.error(`Stderr: ${error.stderr}`);
      }
      throw error;
    }
  }

  /**
   * Sincroniza empleados de Access a MySQL
   */
  async syncUsers(): Promise<{ inserted: number; updated: number }> {
    this.validateAccessDbPath();
    this.logger.log('Inicializando sincronización de usuarios...');
    
    // Por ahora, syncUsers() está deshabilitado porque TODOS los usuarios en USERINFO son miembros/clientes
    // y se sincronizan a través de syncMembers()
    this.logger.log('syncUsers() deshabilitado - Los usuarios se sincronizan como miembros en syncMembers()');
    
    return { inserted: 0, updated: 0 };
  }

  /**
   * Sincroniza productos de Access a MySQL
   */
  async syncProducts(): Promise<{ inserted: number; updated: number }> {
    this.validateAccessDbPath();
    this.logger.log('Iniciando sincronización de productos...');

    const query = `
      SELECT Id, nombreProducto, precio, cantidad
      FROM Productos
      ORDER BY Id
    `;

    try {
      const products = await this.executeAccessQuery(query);
      let inserted = 0;
      let updated = 0;

      for (const prod of products) {
        const { Id: id, nombreProducto: name, precio: price, cantidad: quantity } = prod;

        const existingProduct = await this.productRepository.findOne({ where: { id } });

        const productData = {
          name: name || `Producto ${id}`,
          description: '',
          category: 'service',
          price: price ? parseFloat(price) : 0,
          quantity: quantity ? parseInt(quantity) : 0,
          quantityAvailable: quantity ? parseInt(quantity) : 0,
          supplier: 'Access Sync',
          sku: `SKU_${String(id).padStart(4, '0')}`,
        };

        if (existingProduct) {
          await this.productRepository.update(id, productData);
          updated++;
        } else {
          await this.productRepository.save({
            id,
            ...productData,
          });
          inserted++;
        }
      }

      this.logger.log(`Productos sincronizados. Insertados: ${inserted}, Actualizados: ${updated}`);
      return { inserted, updated };
    } catch (error) {
      this.logger.error(`Error sincronizando productos: ${error}`);
      throw error;
    }
  }

  /**
   * Sincroniza miembros de Access a MySQL
   */
  async syncMembers(): Promise<{ inserted: number; updated: number }> {
    await this.validateAccessDbPath();
    this.logger.log('Iniciando sincronización de miembros desde USERINFO...');

    // Los miembros están en USERINFO, traemos TODOS los usuarios
    const query = `
      SELECT 
        USERID,
        name,
        lastname,
        email,
        PAGER,
        identitycard,
        Gender,
        BIRTHDAY,
        street,
        CITY
      FROM USERINFO
      ORDER BY USERID
    `;

    try {
      const members = await this.executeAccessQuery(query);
      let inserted = 0;
      let updated = 0;

      for (const member of members) {
        const {
          USERID: memberId,
          name: firstName,
          lastname: lastName,
          email,
          PAGER: phone,
          identitycard: documentId,
          Gender: gender,
          BIRTHDAY: dateOfBirth,
          street: address,
          CITY: city,
        } = member;

        // Usar USERID como identificador único
        const memberCode = `MEM_${String(memberId).padStart(6, '0')}`;
        const userId = `member_${memberId}`;

        // Crear o actualizar usuario para el miembro
        let user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
          user = await this.userRepository.save({
            id: userId,
            email: email || `member${memberId}@gym.local`,
            firstName: firstName || `Member${memberId}`,
            lastName: lastName || '',
            phone: phone || '',
            role: UserRole.CLIENTE, // Los miembros son clientes
            isActive: true,
            passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7Ec6FQZeugP/Fxz1z8PYK9Ze', // password: 123456
          });
        } else {
          await this.userRepository.update(userId, {
            email: email || `member${memberId}@gym.local`,
            firstName: firstName || `Member${memberId}`,
            lastName: lastName || '',
            phone: phone || '',
            role: UserRole.CLIENTE, // Actualizar rol a CLIENTE
          });
        }

        // Crear o actualizar miembro
        const existingMember = await this.memberRepository.findOne({
          where: { memberCode },
        });

        // Convertir género correctamente a enum (F/M)
        let genderEnum: MemberGender = MemberGender.OTHER;
        if (gender) {
          const genderLower = gender.toString().toLowerCase();
          if (genderLower === 'f' || genderLower === 'female') {
            genderEnum = MemberGender.FEMALE;
          } else if (genderLower === 'm' || genderLower === 'male') {
            genderEnum = MemberGender.MALE;
          }
        }

        const memberData = {
          userId: user.id,
          memberCode,
          documentId: documentId || null,
          gender: genderEnum,
          dateOfBirth: dateOfBirth || null,
          address: address || null,
          city: city || null,
        };

        if (existingMember) {
          // No incluir id en update
          const { ...updateData } = memberData;
          await this.memberRepository.update(existingMember.id, updateData);
          updated++;
        } else {
          await this.memberRepository.save({
            id: uuidv4(),
            ...memberData,
          });
          inserted++;
        }
      }

      this.logger.log(`Miembros sincronizados desde USERINFO. Insertados: ${inserted}, Actualizados: ${updated}`);
      return { inserted, updated };
    } catch (error) {
      this.logger.error(`Error sincronizando miembros: ${error}`);
      throw error;
    }
  }

  /**
   * Sincroniza pagos de Access a MySQL
   */
  async syncPayments(): Promise<{ inserted: number }> {
    this.validateAccessDbPath();
    this.logger.log('Iniciando sincronización de pagos...');

    const query = `
      SELECT Num_factura, Fecha_factura, Monto, Total_factura
      FROM factura
      ORDER BY Num_factura DESC
    `;

    try {
      const invoices = await this.executeAccessQuery(query);
      let inserted = 0;

      for (const invoice of invoices) {
        const { Num_factura: invoiceNum, Fecha_factura: fecha, Total_factura: total } = invoice;

        const existingPayment = await this.paymentRepository.findOne({
          where: { reference: String(invoiceNum) },
        });

        if (!existingPayment) {
          await this.paymentRepository.save({
            amount: total ? parseFloat(total) : 0,
            paymentMethod: PaymentMethod.CASH,
            status: PaymentStatus.COMPLETED,
            paymentType: PaymentType.MEMBERSHIP,
            paymentDate: fecha || new Date(),
            reference: String(invoiceNum),
          });
          inserted++;
        }
      }

      this.logger.log(`Pagos sincronizados. Insertados: ${inserted}`);
      return { inserted };
    } catch (error) {
      this.logger.error(`Error sincronizando pagos: ${error}`);
      throw error;
    }
  }

  /**
   * Sincroniza asistencias de Access a MySQL
   */
  async syncAttendances(): Promise<{ inserted: number }> {
    this.validateAccessDbPath();
    this.logger.log('Iniciando sincronización de asistencias...');

    const query = `
      SELECT TOP 1000 pin, time, verified
      FROM acc_monitor_log
      WHERE verified = 1
      ORDER BY time DESC
    `;

    try {
      const logs = await this.executeAccessQuery(query);
      let inserted = 0;

      for (const log of logs) {
        const { pin, time, verified } = log;

        const existingAttendance = await this.attendanceRepository.findOne({
          where: {
            visitDate: time,
          },
        });

        if (!existingAttendance) {
          await this.attendanceRepository.save({
            id: uuidv4(),
            attendanceType: 'member',
            visitDate: time || new Date(),
            status: AttendanceStatus.ACCEPTED,
          });
          inserted++;
        }
      }

      this.logger.log(`Asistencias sincronizadas. Insertadas: ${inserted}`);
      return { inserted };
    } catch (error) {
      this.logger.error(`Error sincronizando asistencias: ${error}`);
      throw error;
    }
  }

  /**
   * Sincroniza membresías de Access a MySQL
   */
  async syncMemberships(): Promise<{ inserted: number; updated: number }> {
    await this.validateAccessDbPath();
    this.logger.log('Iniciando sincronización de membresías...');

    const query = `
      SELECT 
        Num_factura,
        Fecha_factura,
        Plan,
        Dias,
        Monto,
        Total_factura,
        Id_empleado,
        Id_cliente
      FROM factura
      ORDER BY Num_factura
    `;

    try {
      const invoices = await this.executeAccessQuery(query);
      let inserted = 0;
      let updated = 0;

      // Primero, crear membresías únicas por tipo (Plan)
      const planesSeen = new Set<string>();
      const membershipMap = new Map<string, string>(); // Plan -> membershipId

      for (const invoice of invoices) {
        const plan = invoice.Plan || 'Sin Plan';
        
        if (!planesSeen.has(plan)) {
          planesSeen.add(plan);
          
          // Buscar o crear membresía
          let membership = await this.membershipRepository.findOne({
            where: { name: plan },
          });

          if (!membership) {
            membership = await this.membershipRepository.save({
              id: uuidv4(),
              name: plan,
              description: `Membresía ${plan} importada desde Access`,
              price: 0, // Se actualiza con cada asignación
              durationMonths: invoice.Dias ? Math.ceil(invoice.Dias / 30) : 1,
              durationDays: invoice.Dias || null,
              benefits: [],
              type: MembershipType.INDIVIDUAL,
            });
            inserted++;
          }
          
          membershipMap.set(plan, membership.id);
        }
      }

      // Luego, crear member_memberships (asignaciones)
      for (const invoice of invoices) {
        const memberId = `member_${invoice.Id_cliente}`;
        const membershipId = membershipMap.get(invoice.Plan || 'Sin Plan');

        // Verificar que el miembro exista
        const member = await this.memberRepository.findOne({
          where: { id: memberId },
        });

        if (!member) {
          this.logger.warn(`Miembro ${memberId} no encontrado, saltando factura ${invoice.Num_factura}`);
          continue;
        }

        // Calcular fechas
        const startDate = new Date(invoice.Fecha_factura);
        const endDate = new Date(startDate);
        if (invoice.Dias && invoice.Dias > 0) {
          endDate.setDate(endDate.getDate() + invoice.Dias);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Crear o actualizar member_membership
        const memberMembership = await this.memberMembershipRepository.findOne({
          where: {
            memberId,
            membershipId,
            startDate,
          },
        });

        if (!memberMembership) {
          await this.memberMembershipRepository.save({
            id: `${memberId}_${membershipId}_${invoice.Num_factura}`,
            memberId,
            membershipId,
            startDate,
            endDate,
            isActive: true,
            classesUsed: 0,
            payAmount: invoice.Monto ? parseFloat(String(invoice.Monto)) : 0,
          });
          inserted++;
        } else {
          await this.memberMembershipRepository.update(
            { id: memberMembership.id },
            {
              endDate,
              payAmount: invoice.Monto ? parseFloat(String(invoice.Monto)) : 0,
            }
          );
          updated++;
        }
      }

      this.logger.log(`Membresías sincronizadas. Insertadas: ${inserted}, Actualizadas: ${updated}`);
      return { inserted, updated };
    } catch (error) {
      this.logger.error(`Error sincronizando membresías: ${error}`);
      throw error;
    }
  }

  /**
   * Ejecuta sincronización completa
   */
  async syncAll() {
    this.validateAccessDbPath();
    this.logger.log('========== INICIANDO SINCRONIZACIÓN COMPLETA ==========');

    const results = {
      users: await this.syncUsers(),
      products: await this.syncProducts(),
      members: await this.syncMembers(),
      memberships: await this.syncMemberships(),
      payments: await this.syncPayments(),
      attendances: await this.syncAttendances(),
      timestamp: new Date(),
    };

    this.logger.log('========== SINCRONIZACIÓN COMPLETADA ==========');
    return results;
  }
}
