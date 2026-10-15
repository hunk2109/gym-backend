import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import * as net from 'net';
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

  private successfulMachineQuery: string | null = null;
  private cachedDashboard: { data: any; expiresAt: number } | null = null;

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
    this.cachedDashboard = null;
    this.successfulMachineQuery = null;
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
        { maxBuffer: 1024 * 1024 * 10, cwd: process.cwd(), windowsHide: true }
      );

      if (stderr && stderr.trim()) {
        this.logger.warn(`Stderr del script: ${stderr}`);
      }

      const result = JSON.parse(stdout);
      return result;
    } catch (error) {
      this.logger.error(`Error ejecutando query: ${error.message}`);
      if (error.stdout) {
        this.logger.error(`Stdout: ${error.stdout}`);
      }
      if (error.stderr) {
        this.logger.error(`Stderr: ${error.stderr}`);
      }
      throw error;
    }
  }

  /**
   * Ejecuta un script Python para escribir datos en Access
   */
  private async executeAccessWrite(userData: any): Promise<any> {
    const scriptPath = join(process.cwd(), 'src', 'modules', 'sync', 'scripts', 'access-write.py');
    const dbPath = await this.getAccessDbPath();
    
    this.logger.debug(`Ejecutando script de escritura: ${scriptPath}`);
    
    try {
      const dataStr = encodeURIComponent(JSON.stringify(userData));
      const { stdout, stderr } = await execPromise(
        `python "${scriptPath}" "${dbPath}" "${dataStr}"`,
        { cwd: process.cwd(), windowsHide: true }
      );

      if (stderr && stderr.trim()) {
        this.logger.warn(`Stderr del script (write): ${stderr}`);
      }

      return JSON.parse(stdout);
    } catch (error) {
      this.logger.error(`Error escribiendo en Access: ${error.message}`);
      if (error.stderr) {
        this.logger.error(`Stderr: ${error.stderr}`);
      }
      throw error;
    }
  }

  private async executeAccessTables(): Promise<string[]> {
    const scriptPath = join(process.cwd(), 'src', 'modules', 'sync', 'scripts', 'access-tables.py');
    const dbPath = await this.getAccessDbPath();

    try {
      const { stdout, stderr } = await execPromise(
        `python "${scriptPath}" "${dbPath}"`,
        { maxBuffer: 1024 * 1024 * 2, cwd: process.cwd() },
      );

      if (stderr && stderr.trim()) {
        this.logger.warn(`Stderr del script (tables): ${stderr}`);
      }

      const result = JSON.parse(stdout);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      this.logger.error(`Error listando tablas Access: ${error.message}`);
      if (error.stdout) {
        this.logger.error(`Stdout tables: ${error.stdout}`);
      }
      return [];
    }
  }

  private async executeOptionalAccessQuery(query: string): Promise<any[]> {
    try {
      return await this.executeAccessQuery(query);
    } catch (error) {
      const detail = error.stdout || error.stderr || error.message;
      this.logger.warn(`Consulta opcional Access fallida: ${detail}`);
      return [];
    }
  }

  private async executeFirstSuccessfulAccessQuery(queries: string[]): Promise<any[]> {
    for (const query of queries) {
      const rows = await this.executeOptionalAccessQuery(query);
      if (rows.length > 0) {
        return rows;
      }
    }
    return [];
  }

  private parseAccessNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async getFirstAccessCount(query: string, field: string): Promise<number> {
    const rows = await this.executeOptionalAccessQuery(query);
    return this.parseAccessNumber(rows[0]?.[field]);
  }

  async getAccessDashboard(limit: number = 30): Promise<any> {
    const now = Date.now();
    if (this.cachedDashboard && this.cachedDashboard.expiresAt > now) {
      return this.cachedDashboard.data;
    }

    await this.validateAccessDbPath();
    const dbPath = await this.getAccessDbPath();
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

    const machineCandidates = this.successfulMachineQuery
      ? [this.successfulMachineQuery]
      : [
          'SELECT * FROM [Machines] ORDER BY [ID]',
          'SELECT * FROM [Machines]',
          'SELECT * FROM Machines',
          'SELECT * FROM [machines] ORDER BY [ID]',
          'SELECT * FROM [machines]',
          'SELECT * FROM machines',
        ];

    let machines: any[] = [];
    for (const q of machineCandidates) {
      const rows = await this.executeOptionalAccessQuery(q);
      if (rows.length > 0) {
        this.successfulMachineQuery = q;
        machines = rows;
        break;
      }
    }

    const availableTables = machines.length === 0 ? await this.executeAccessTables() : [];

    const recentLogs = await this.executeOptionalAccessQuery(`
      SELECT TOP ${safeLimit}
        pin,
        time,
        verified
      FROM acc_monitor_log
      ORDER BY time DESC
    `);

    const usersCount = await this.getFirstAccessCount(
      'SELECT COUNT(*) AS total FROM USERINFO',
      'total',
    );
    const attendanceLogsCount = await this.getFirstAccessCount(
      'SELECT COUNT(*) AS total FROM acc_monitor_log',
      'total',
    );
    const activeAccessCount = await this.getFirstAccessCount(
      'SELECT COUNT(*) AS total FROM USERINFO WHERE acc_enddate >= Date()',
      'total',
    );

    const configIp = await this.configService.getConfig('ZK_DEVICE_IP');
    const configPort = await this.configService.getConfig('ZK_DEVICE_PORT');

    let machineList = machines.map((machine) => ({
      id: machine.ID,
      alias: machine.MachineAlias || machine.alias || machine.device_name || 'Equipo ZKTeco',
      ip: configIp || machine.IP || machine.ipaddress || null,
      port: this.parseAccessNumber(configPort || machine.Port || 4370),
      serialNumber: machine.sn || null,
      deviceName: machine.device_name || machine.ProductType || null,
      firmwareVersion: machine.FirmwareVersion || null,
      enabled: machine.Enabled === true || machine.Enabled === -1 || machine.Enabled === 1,
      realtime: machine.realtime === true || machine.realtime === -1 || machine.realtime === 1 || machine.realtime === 'Si' || machine.realtime === 'Sí',
      userCount: this.parseAccessNumber(machine.usercount),
      fingerCount: this.parseAccessNumber(machine.fingercount),
      transactionCount: this.parseAccessNumber(machine.transaction_count),
      lastActivity: machine.last_activity || null,
    }));

    if (machineList.length === 0 && configIp) {
      machineList = [{
        id: 1,
        alias: 'Equipo Biométrico ZKTeco',
        ip: configIp,
        port: Number(configPort) || 4370,
        serialNumber: null,
        deviceName: 'ZKTeco',
        firmwareVersion: null,
        enabled: true,
        realtime: true,
        userCount: 0,
        fingerCount: 0,
        transactionCount: 0,
        lastActivity: null,
      }];
    }

    const result = {
      success: true,
      dbPath,
      machines: machineList,
      summary: {
        users: usersCount,
        activeAccess: activeAccessCount,
        logs: attendanceLogsCount,
        recentLogs: recentLogs.length,
      },
      availableTables,
      machineTableFound: machineList.length > 0,
      recentLogs: recentLogs.map((log) => ({
        pin: log.pin ?? null,
        time: log.time ?? null,
        verified: log.verified ?? null,
      })),
      timestamp: new Date().toISOString(),
    };

    this.cachedDashboard = {
      data: result,
      expiresAt: Date.now() + 15 * 1000, // Cachear 15 segundos
    };

    return result;
  }

  async testAccessMachineConnection(machineId?: number, customIp?: string, customPort?: number): Promise<any> {
    const dashboard = await this.getAccessDashboard(5);
    const machines = dashboard.machines || [];
    const machine = machineId
      ? machines.find((item) => Number(item.id) === Number(machineId))
      : machines[0];

    const ip = customIp || machine?.ip;
    const port = customPort || machine?.port || 4370;

    if (!ip) {
      throw new Error('El equipo no tiene IP configurada. Por favor especifique una IP.');
    }

    const startedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('Tiempo de espera agotado al conectar al equipo (5s)'));
      }, 5000);

      socket.connect(port, ip, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    return {
      success: true,
      message: `Equipo ${machine?.alias || 'ZKTeco'} disponible en ${ip}:${port}`,
      machine: machine || { ip, port, alias: 'Equipo ZKTeco' },
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };
  }

  async updateMachineIp(ip: string, port: number = 4370, machineId?: number): Promise<any> {
    const cleanIp = ip.trim();
    if (!cleanIp) {
      throw new Error('La dirección IP es requerida');
    }

    // 1. Guardar en configuración MySQL
    await this.configService.setConfig('ZK_DEVICE_IP', cleanIp, 'IP del equipo biométrico');
    await this.configService.setConfig('ZK_DEVICE_PORT', String(port), 'Puerto del equipo biométrico');

    // 2. Intentar actualizar en Access
    try {
      const dbPath = await this.getAccessDbPath();
      const scriptPath = join(process.cwd(), 'src', 'modules', 'sync', 'scripts', 'access-update-machine.py');
      const payload = JSON.stringify({ ip: cleanIp, port, machineId });
      const { stdout } = await execPromise(
        `python "${scriptPath}" "${dbPath}" "${encodeURIComponent(payload)}"`,
        { maxBuffer: 1024 * 1024 * 2, cwd: process.cwd(), windowsHide: true },
      );
      this.logger.log(`Actualización de máquina en Access: ${stdout}`);
    } catch (error) {
      this.logger.warn(`No se pudo actualizar IP directamente en archivo Access: ${error.message}`);
    }

    // Limpiar caché
    this.cachedDashboard = null;

    // 3. Probar conexión TCP con la nueva IP
    const test = await this.testTcpConnection(cleanIp, port);

    return {
      success: true,
      ip: cleanIp,
      port,
      reachable: test.success,
      latencyMs: test.latencyMs,
      message: test.success
        ? `IP ${cleanIp}:${port} guardada exitosamente y equipo conectado (${test.latencyMs}ms)`
        : `IP ${cleanIp}:${port} guardada. El equipo no responde actualmente en la red local.`,
    };
  }

  async testTcpConnection(ip: string, port: number = 4370): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const startedAt = Date.now();
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error('Tiempo de espera agotado'));
        }, 3500);

        socket.connect(port, ip, () => {
          clearTimeout(timer);
          socket.destroy();
          resolve();
        });

        socket.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
      return { success: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía un miembro a ZKAccess
   */
  async pushMemberToAccess(userData: { Badgenumber: string, name: string, lastname: string, email: string, acc_startdate?: string | null, acc_enddate?: string | null, USERID?: number | null, legacyBadgenumber?: string | null }): Promise<void> {
    await this.validateAccessDbPath();
    try {
      const member = await this.findMemberByAccessBadge(userData.Badgenumber);
      if (member) {
        const legacyBadgenumber = userData.Badgenumber;
        const zkUid = await this.ensureMemberZkUid(member.id);
        userData.Badgenumber = String(zkUid);
        delete userData.USERID;
        userData.legacyBadgenumber = legacyBadgenumber;
      }

      await this.executeAccessWrite(userData);
      this.logger.log(`Socio ${userData.Badgenumber} empujado a ZKAccess correctamente.`);
    } catch (error) {
      this.logger.error(`Error empujando socio ${userData.Badgenumber} a ZKAccess: ${error.message}`);
      throw error;
    }
  }

  async deleteMemberFromAccess(badgeNumber: string, accessUserId?: number): Promise<void> {
    await this.validateAccessDbPath();
    try {
      const payload: any = { Badgenumber: badgeNumber, action: 'delete' };
      if (accessUserId !== undefined && accessUserId !== null) {
        payload.USERID = accessUserId;
      }
      await this.executeAccessWrite(payload);
      this.logger.log(`Socio ${badgeNumber} eliminado de ZKAccess correctamente.`);
    } catch (error) {
      this.logger.error(`Error eliminando socio ${badgeNumber} de ZKAccess: ${error.message}`);
      throw error;
    }
  }

  async ensureMemberZkUid(memberId: string): Promise<number> {
    const member = await this.memberRepository.findOne({ where: { id: memberId } });

    if (!member) {
      throw new Error(`Miembro ${memberId} no encontrado para asignar zkUid`);
    }

    if (member.zkUid && member.zkUid > 0 && member.zkUid <= 3000) {
      return member.zkUid;
    }

    const [countRows, userRows, localRows] = await Promise.all([
      this.executeOptionalAccessQuery('SELECT COUNT(*) AS total FROM USERINFO'),
      this.executeOptionalAccessQuery('SELECT USERID, Badgenumber FROM USERINFO'),
      this.memberRepository
        .createQueryBuilder('member')
        .select('member.zkUid', 'zkUid')
        .where('member.zkUid IS NOT NULL')
        .getRawMany<{ zkUid: number }>(),
    ]);

    const totalAccessUsers = Number(countRows?.[0]?.total || 0);
    const usedUids = new Set<number>();

    userRows.forEach((row) => {
      [row.USERID, row.Badgenumber].forEach((value) => {
        const uid = Number(value);
        if (Number.isFinite(uid) && uid > 0 && uid <= 3000) {
          usedUids.add(uid);
        }
      });
    });

    localRows.forEach((row) => {
      const uid = Number(row.zkUid);
      if (Number.isFinite(uid) && uid > 0 && uid <= 3000) {
        usedUids.add(uid);
      }
    });

    const nextUid = this.findNextZkUid(totalAccessUsers + 1, usedUids);
    await this.memberRepository.update(member.id, { zkUid: nextUid });

    return nextUid;
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
        CITY,
        acc_startdate,
        acc_enddate
      FROM USERINFO
      ORDER BY USERID
    `;

    try {
      const members = await this.executeAccessQuery(query);
      let inserted = 0;
      let updated = 0;

      // Membresía a asignar para migraciones desde Access
      const baseMembershipName = 'Plan Básico';
      const baseMembershipId = 'ea7f7057-b4a2-4000-b89c-5aaa3b696fbd';
      let baseMembership = await this.membershipRepository.findOne({
        where: [
          { name: baseMembershipName },
          { id: baseMembershipId }
        ],
      });

      if (!baseMembership) {
        this.logger.warn(`No se encontró la membresía con id ${baseMembershipId}. Buscando membresía alternativa...`);
        baseMembership = await this.membershipRepository.findOne({ order: { price: 'ASC' } });
        
        if (!baseMembership) {
           this.logger.warn(`No hay membresías en el sistema. Se creará una membresía genérica para las importaciones.`);
           baseMembership = await this.membershipRepository.save({
               id: baseMembershipId,
               name: 'Membresía Migrada',
               description: 'Membresía creada automáticamente por la migración',
               type: MembershipType.INDIVIDUAL,
               durationMonths: 1,
               price: 0,
               isActive: true,
           });
        }
      }

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
          acc_startdate: accessStartDate,
          acc_enddate: accessEndDate,
        } = member;

        // Usar USERID como identificador único
        const memberCode = `MEM_${String(memberId).padStart(6, '0')}`;
        const userId = `member_${memberId}`;
        const targetEmail = email || `member${memberId}@gym.local`;

        // Crear o actualizar usuario para el miembro
        let user = await this.userRepository.findOne({ where: { id: userId } });

        // Si no se encontró por ID, intentar buscar por email para evitar duplicados
        if (!user) {
          user = await this.userRepository.findOne({ where: { email: targetEmail } });
        }

        if (!user) {
          user = await this.userRepository.save({
            id: userId,
            email: targetEmail,
            firstName: firstName || `Member${memberId}`,
            lastName: lastName || '',
            phone: phone || '',
            role: UserRole.CLIENTE, // Los miembros son clientes
            isActive: true,
            passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7Ec6FQZeugP/Fxz1z8PYK9Ze', // password: 123456
          });
        } else {
          await this.userRepository.update(user.id, {
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            phone: phone || user.phone,
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

        let memberRecord = existingMember;
        if (existingMember) {
          // No incluir id en update
          const { ...updateData } = memberData;
          await this.memberRepository.update(existingMember.id, updateData);
          updated++;
        } else {
          memberRecord = await this.memberRepository.save({
            id: uuidv4(),
            ...memberData,
          });
          inserted++;
        }

        const memberRecordId = memberRecord?.id || existingMember?.id;
        if (memberRecordId && baseMembership) {
          const startDateValue = accessStartDate ? new Date(accessStartDate) : new Date();
          const endDateValue = accessEndDate ? new Date(accessEndDate) : null;
          const today = new Date();
          const hasActiveAccess = endDateValue ? endDateValue >= today : false;

          this.logger.debug(`Usuario ${memberId} acc_startdate=${accessStartDate} acc_enddate=${accessEndDate} -> activo=${hasActiveAccess}`);

          const existingMembership = await this.memberMembershipRepository.findOne({
            where: {
              memberId: memberRecordId,
              membershipId: baseMembership.id,
            },
          });

          const startDate = startDateValue;
          const endDate = endDateValue || new Date(startDate);

          if (!existingMembership) {
            await this.memberMembershipRepository.save({
              id: uuidv4(),
              memberId: memberRecordId,
              membershipId: baseMembership.id,
              startDate,
              endDate,
              isActive: hasActiveAccess,
              classesUsed: 0,
              payAmount: 0,
              isRecurring: true,
            });
            this.logger.log(`Asignada membresía Access Sync a member ${memberRecordId} desde ${startDate.toISOString().split('T')[0]} hasta ${endDate.toISOString().split('T')[0]}`);
          } else {
             // Si ya existe, actualizamos su estado y fechas por si cambiaron en access
             await this.memberMembershipRepository.update(existingMembership.id, {
                startDate,
                endDate,
                isActive: hasActiveAccess
             });
          }
        }

        if (existingMember) {
          // No incluir id en update
          const { ...updateData } = memberData;
          await this.memberRepository.update(existingMember.id, updateData);
          updated++;
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
          let member: Member | null = null;
          let isEmployee = false;
          
          if (pin) {
            const cleanPin = String(pin).trim();
            const numericPin = Number(cleanPin);

            if (Number.isFinite(numericPin)) {
              member = await this.memberRepository.findOne({
                where: { zkUid: numericPin },
                relations: ['user'],
              });
            }

            if (!member) {
              const formattedPin = `MEM_${cleanPin.padStart(6, '0')}`;
              member = await this.memberRepository.findOne({
                where: { memberCode: formattedPin },
                relations: ['user']
              });
            }
            
            if (member && member.user && member.user.role !== 'cliente') {
              isEmployee = true;
            }
          }

          await this.attendanceRepository.save({
            id: uuidv4(),
            memberId: member?.id,
            attendanceType: isEmployee ? 'employee' : 'member',
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
   * @param includeProducts Si es true, también sincroniza los productos (Carga Inicial). False por defecto.
   */
  async syncAll(includeProducts: boolean = false) {
    this.validateAccessDbPath();
    this.logger.log(`========== INICIANDO SINCRONIZACIÓN COMPLETA (Productos: ${includeProducts}) ==========`);

    const results: any = {
      users: await this.syncUsers(),
      members: await this.syncMembers(),
      memberships: await this.syncMemberships(),
      payments: await this.syncPayments(),
      attendances: await this.syncAttendances(),
      timestamp: new Date(),
    };

    if (includeProducts) {
      this.logger.log('Sincronizando productos (Carga Inicial manual)...');
      results.products = await this.syncProducts();
    } else {
      this.logger.log('Omitiendo sincronización de productos para mantener el stock manual.');
    }

    this.logger.log('========== SINCRONIZACIÓN COMPLETADA ==========');
    return results;
  }

  private async findMemberByAccessBadge(badgeNumber?: string | null): Promise<Member | null> {
    if (!badgeNumber) {
      return null;
    }

    const badge = String(badgeNumber).trim();
    const digits = badge.replace(/\D/g, '');
    const candidates = new Set<string>([badge]);

    if (/^\d{8}$/.test(digits)) {
      candidates.add(`${digits.substring(0, 4)}-${digits.substring(4)}`);
    }

    if (/^\d{1,6}$/.test(digits)) {
      candidates.add(`MEM_${digits.padStart(6, '0')}`);
    }

    for (const memberCode of candidates) {
      const member = await this.memberRepository.findOne({ where: { memberCode } });
      if (member) {
        return member;
      }
    }

    return null;
  }

  private findNextZkUid(startAt: number, usedUids: Set<number>): number {
    const start = Math.min(Math.max(Number(startAt) || 1, 1), 3000);

    for (let uid = start; uid <= 3000; uid++) {
      if (!usedUids.has(uid)) {
        return uid;
      }
    }

    for (let uid = 1; uid < start; uid++) {
      if (!usedUids.has(uid)) {
        return uid;
      }
    }

    throw new Error('No hay zkUid libre disponible para ZKAccess (limite 3000)');
  }
}
