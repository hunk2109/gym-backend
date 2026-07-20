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
    const users = await this.buildActiveUserPayloads();

    return this.withDevice(config, async (device) => {
      const results: ZkPushResult[] = [];

      for (const user of users) {
        try {
          await device.setUser(
            user.uid,
            user.userId,
            user.name,
            user.password,
            user.role,
            user.cardNo,
          );

          results.push({
            userId: user.userId,
            name: user.name,
            success: true,
          });
        } catch (error) {
          this.logger.error(`Error enviando usuario ${user.userId} al equipo: ${error.message}`);
          results.push({
            userId: user.userId,
            name: user.name,
            success: false,
            error: error.message,
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

    const payload = this.memberToZkUser(activeMembership);
    if (!payload) {
      return { success: false, message: 'Miembro sin codigo valido para ZKTeco' };
    }

    return this.pushSingleUser(payload);
  }

  async deleteMemberById(memberId: string): Promise<any> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    const uid = this.extractNumericId(member?.memberCode);
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

    const uid = this.extractNumericId(employee?.accessCode);
    if (!uid) {
      return { success: false, message: 'Empleado sin codigo valido para eliminar del equipo' };
    }

    return this.deleteUserByUid(uid);
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
      await device.setUser(
        user.uid,
        user.userId,
        user.name,
        user.password,
        user.role,
        user.cardNo,
      );

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

  private async safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  private async buildActiveUserPayloads(): Promise<ZkUserPayload[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeMemberships = await this.memberMembershipRepository.find({
      where: {
        isActive: true,
        endDate: MoreThanOrEqual(today),
      },
      relations: ['member', 'member.user'],
    });

    const memberUsers = activeMemberships
      .map((membership) => this.memberToZkUser(membership))
      .filter((user): user is ZkUserPayload => user !== null);

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

  private memberToZkUser(membership: MemberMembership): ZkUserPayload | null {
    const member = membership.member;
    const user = member?.user;
    const badgeNumber = member?.memberCode;
    const uid = this.extractNumericId(badgeNumber);

    if (!uid || !badgeNumber || !user) {
      return null;
    }

    return {
      uid,
      userId: String(uid),
      name: this.cleanDeviceName(`${user.firstName || ''} ${user.lastName || ''}`),
      password: '',
      role: 0,
      cardNo: 0,
    };
  }

  private employeeToZkUser(employee: Employee): ZkUserPayload | null {
    const uid = this.extractNumericId(employee.accessCode);

    if (!uid || !employee.accessCode) {
      return null;
    }

    return {
      uid,
      userId: String(uid),
      name: this.cleanDeviceName(`${employee.firstName || ''} ${employee.lastName || ''}`),
      password: '',
      role: 0,
      cardNo: 0,
    };
  }

  private extractNumericId(value?: string | null): number | null {
    if (!value) {
      return null;
    }

    const match = String(value).match(/(\d+)/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private cleanDeviceName(value: string): string {
    const cleaned = value
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.substring(0, 24) || 'Usuario';
  }
}
