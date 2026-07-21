import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Employee } from '../../entities/employee.entity';
import { Member } from '../../entities/member.entity';
import { AccessService } from './access.service';

const Zkteco = require('zkteco-js');

interface ZkDeviceConfig {
  ip: string;
  port: number;
  timeoutMs: number;
  inport: number;
}

interface ZkUserPayload {
  uid: number;
  userId: string;
  name: string;
  password: string;
  role: number;
  cardNo: number;
}

interface ZkPushResult {
  userId: string;
  name: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class ZktecoDeviceService {
  private readonly logger = new Logger(ZktecoDeviceService.name);
  private readonly defaultDevicePassword = '123456';

  constructor(
    private readonly accessService: AccessService,
    @InjectRepository(MemberMembership)
    private readonly memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async testConnection(): Promise<any> {
    const config = await this.getDeviceConfig();

    return this.withDevice(config, async (device) => {
      const info = await this.safeCall(() => device.getInfo(), {});
      return {
        success: true,
        message: `Conexion real con equipo ZKTeco exitosa (${config.ip}:${config.port})`,
        data: {
          config,
          info,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  async getUsers(): Promise<any> {
    const config = await this.getDeviceConfig();

    return this.withDevice(config, async (device) => {
      const users = await device.getUsers();
      return {
        success: true,
        message: `${Array.isArray(users) ? users.length : 0} usuarios leidos del equipo`,
        data: {
          config,
          users,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  async pushActiveUsers(): Promise<any> {
    const config = await this.getDeviceConfig();

    return this.withDevice(config, async (device) => {
      const usedDeviceUids = await this.getUsedDeviceUids(device);
      const users = await this.buildActiveUserPayloads(usedDeviceUids);
      const results: ZkPushResult[] = [];

      for (const user of users) {
        try {
          await this.sendUserToDevice(device, user);

          results.push({
            userId: user.userId,
            name: user.name,
            success: true,
          });
        } catch (error) {
          const errorMessage = this.toErrorMessage(error);
          this.logger.error(`Error enviando usuario ${user.userId} al equipo: ${errorMessage}`);
          results.push({
            userId: user.userId,
            name: user.name,
            success: false,
            error: errorMessage,
          });
        }
      }

      const pushed = results.filter((item) => item.success).length;
      const failed = results.length - pushed;

      return {
        success: failed === 0,
        message: `Usuarios enviados al equipo. Correctos: ${pushed}, fallidos: ${failed}`,
        data: {
          config,
          pushed,
          failed,
          total: results.length,
          results,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  async syncMemberById(memberId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId,
        isActive: true,
        endDate: MoreThanOrEqual(today),
      },
      relations: ['member', 'member.user'],
      order: { endDate: 'DESC' },
    });

    if (!activeMembership) {
      return this.deleteMemberById(memberId);
    }

    const config = await this.getDeviceConfig();

    return this.withDevice(config, async (device) => {
      const usedDeviceUids = await this.getUsedDeviceUids(device);
      const payload = await this.memberToZkUser(activeMembership, usedDeviceUids);

      if (!payload) {
        return { success: false, message: 'Miembro sin codigo valido para ZKTeco' };
      }

      await this.sendUserToDevice(device, payload);

      return {
        success: true,
        message: `Usuario ${payload.name} enviado al equipo`,
        data: {
          user: payload,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  async deleteMemberById(memberId: string): Promise<any> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    const uid = member?.zkUid || null;
    if (!uid) {
      return { success: false, message: 'Miembro sin codigo valido para eliminar del equipo' };
    }

    return this.deleteUserByUid(uid);
  }

  async syncEmployeeById(employeeId: string): Promise<any> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, message: 'Empleado no encontrado' };
    }

    if (!employee.isActive) {
      return this.deleteEmployeeById(employeeId);
    }

    const payload = this.employeeToZkUser(employee);
    if (!payload) {
      return { success: false, message: 'Empleado sin codigo valido para ZKTeco' };
    }

    return this.pushSingleUser(payload);
  }

  async deleteEmployeeById(employeeId: string): Promise<any> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    const accessCode = this.toAccessUserId(employee?.accessCode);
    const deviceUid = this.toEmployeeDeviceUid(accessCode);
    if (!deviceUid) {
      return { success: false, message: 'Empleado sin codigo valido para eliminar del equipo' };
    }

    return this.deleteUserByUid(deviceUid);
  }

  private async getDeviceConfig(): Promise<ZkDeviceConfig> {
    const dashboard = await this.accessService.getAccessDashboard(1);
    const machine = dashboard.machines?.[0];

    if (!machine?.ip || !machine?.port) {
      throw new Error('No se encontro IP/puerto del equipo en la tabla machines de Access');
    }

    return {
      ip: String(machine.ip),
      port: Number(machine.port) || 4370,
      timeoutMs: 10000,
      inport: 5000,
    };
  }

  private async withDevice<T>(
    config: ZkDeviceConfig,
    action: (device: any) => Promise<T>,
  ): Promise<T> {
    const device = new Zkteco(config.ip, config.port, config.timeoutMs, config.inport);

    try {
      await device.createSocket();
      return await action(device);
    } finally {
      await this.safeCall(() => device.disconnect(), null);
    }
  }

  private async pushSingleUser(user: ZkUserPayload): Promise<any> {
    const config = await this.getDeviceConfig();

    return this.withDevice(config, async (device) => {
      await this.sendUserToDevice(device, user);

      return {
        success: true,
        message: `Usuario ${user.name} enviado al equipo`,
        data: {
          user,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  private async deleteUserByUid(uid: number): Promise<any> {
    const config = await this.getDeviceConfig();

    return this.withDevice(config, async (device) => {
      await device.deleteUser(uid);

      return {
        success: true,
        message: `Usuario ${uid} eliminado del equipo`,
        data: {
          uid,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  private async sendUserToDevice(device: any, user: ZkUserPayload): Promise<void> {
    await device.setUser(
      String(user.uid),
      user.userId.substring(0, 9),
      user.name,
      user.password || this.defaultDevicePassword,
      user.role,
      user.cardNo,
    );
  }

  private async safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  private async buildActiveUserPayloads(usedDeviceUids: Set<number>): Promise<ZkUserPayload[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeMemberships = await this.memberMembershipRepository.find({
      where: {
        isActive: true,
        endDate: MoreThanOrEqual(today),
      },
      relations: ['member', 'member.user'],
    });

    const memberUsers: ZkUserPayload[] = [];
    for (const membership of activeMemberships) {
      const payload = await this.memberToZkUser(membership, usedDeviceUids);
      if (payload) {
        memberUsers.push(payload);
      }
    }

    const employees = await this.employeeRepository.find({
      where: { isActive: true },
    });

    const employeeUsers = employees
      .map((employee) => this.employeeToZkUser(employee))
      .filter((user): user is ZkUserPayload => user !== null);

    const byUserId = new Map<string, ZkUserPayload>();
    [...memberUsers, ...employeeUsers].forEach((user) => byUserId.set(user.userId, user));

    return Array.from(byUserId.values()).sort((a, b) => a.uid - b.uid);
  }

  private async memberToZkUser(
    membership: MemberMembership,
    usedDeviceUids: Set<number>,
  ): Promise<ZkUserPayload | null> {
    const member = membership.member;
    const user = member?.user;
    const badgeNumber = member?.memberCode;
    const accessUserId = this.toAccessUserId(badgeNumber);

    if (!accessUserId || !badgeNumber || !user || !member) {
      return null;
    }

    const uid = await this.ensureMemberZkUid(member, usedDeviceUids);

    return {
      uid,
      userId: String(accessUserId),
      name: this.cleanDeviceName(`${user.firstName || ''} ${user.lastName || ''}`),
      password: this.defaultDevicePassword,
      role: 0,
      cardNo: 0,
    };
  }

  private employeeToZkUser(employee: Employee): ZkUserPayload | null {
    const accessCode = this.toAccessUserId(employee.accessCode);
    const uid = this.toEmployeeDeviceUid(accessCode);

    if (!uid || !accessCode || !employee.accessCode) {
      return null;
    }

    return {
      uid,
      userId: String(accessCode),
      name: this.cleanDeviceName(`${employee.firstName || ''} ${employee.lastName || ''}`),
      password: this.defaultDevicePassword,
      role: 0,
      cardNo: 0,
    };
  }

  private toAccessUserId(value?: string | null): number | null {
    if (!value) {
      return null;
    }

    const digits = String(value).replace(/\D/g, '');
    if (!digits) {
      return null;
    }

    const parsed = Number(digits);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private toEmployeeDeviceUid(accessCode: number | null): number | null {
    if (!accessCode) {
      return null;
    }

    if (accessCode <= 3000) {
      return accessCode;
    }

    return 2500 + ((accessCode - 1) % 500) + 1;
  }

  private async ensureMemberZkUid(member: Member, usedDeviceUids: Set<number>): Promise<number> {
    if (member.zkUid && member.zkUid > 0 && member.zkUid <= 3000) {
      usedDeviceUids.add(member.zkUid);
      return member.zkUid;
    }

    const localUids = await this.memberRepository
      .createQueryBuilder('member')
      .select('member.zkUid', 'zkUid')
      .where('member.zkUid IS NOT NULL')
      .getRawMany<{ zkUid: number }>();

    localUids.forEach((item) => {
      const uid = Number(item.zkUid);
      if (Number.isFinite(uid) && uid > 0) {
        usedDeviceUids.add(uid);
      }
    });

    const nextUid = this.findNextAvailableZkUid(usedDeviceUids);
    member.zkUid = nextUid;
    await this.memberRepository.update(member.id, { zkUid: nextUid });
    usedDeviceUids.add(nextUid);

    return nextUid;
  }

  private findNextAvailableZkUid(usedDeviceUids: Set<number>): number {
    const nextAfterLast = Math.max(0, ...Array.from(usedDeviceUids)) + 1;

    for (let uid = nextAfterLast; uid <= 3000; uid++) {
      if (!usedDeviceUids.has(uid)) {
        return uid;
      }
    }

    for (let uid = 1; uid < nextAfterLast && uid <= 3000; uid++) {
      if (!usedDeviceUids.has(uid)) {
        return uid;
      }
    }

    throw new Error('No hay UID libre disponible en el equipo ZKTeco (limite 3000)');
  }

  private async getUsedDeviceUids(device: any): Promise<Set<number>> {
    const users: any = await this.safeCall(() => device.getUsers(), null);
    const rows = Array.isArray(users) ? users : Array.isArray(users?.data) ? users.data : [];
    const used = new Set<number>();

    rows.forEach((user: any) => {
      const uid = Number(user?.uid);
      if (Number.isFinite(uid) && uid > 0) {
        used.add(uid);
      }
    });

    return used;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private cleanDeviceName(value: string): string {
    const cleaned = value
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.substring(0, 24) || 'Usuario';
  }
}
