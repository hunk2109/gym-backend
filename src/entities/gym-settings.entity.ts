import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { Promotion } from '../modules/promotions/entities/promotion.entity';

@Entity('gym_settings')
export class GymSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  gymName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  rnc: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar' })
  openingTime: string; // HH:MM format

  @Column({ type: 'varchar' })
  closingTime: string; // HH:MM format

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  membershipPrice: number;

  @Column({ type: 'text', nullable: true })
  policies: string;

  @Column({ type: 'boolean', default: false })
  birthdayDiscountEnabled: boolean;

  @ManyToOne(() => Promotion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'birthdayDiscountCouponId' })
  birthdayDiscountCoupon: Promotion | null;

  @Column({ type: 'uuid', nullable: true })
  birthdayDiscountCouponId: string | null;

  @Column({ type: 'int', default: 15 })
  membershipSuspensionDays: number; // Días para suspender membresía con pago pendiente

  // Envíos automáticos (Cron Jobs)
  @Column({ type: 'boolean', default: true })
  enableMembershipRenewal: boolean;

  @Column({ type: 'boolean', default: true })
  enablePaymentReminders: boolean;

  @Column({ type: 'boolean', default: true })
  enableBirthdayEmails: boolean;

  @Column({ type: 'boolean', default: true })
  enableAnniversaryEmails: boolean;

  @Column({ type: 'boolean', default: true })
  enableExpirationWarnings: boolean;

  @Column({ type: 'boolean', default: true })
  enableCampaignScheduler: boolean;

  @Column({ type: 'boolean', default: true })
  enableDailySummaryReport: boolean;

  @Column({ type: 'longblob', nullable: true })
  logoImage: Buffer; // Logo/imagen para facturas (BLOB)

  // MB360 Biometric Device Configuration
  @Column({ type: 'boolean', default: false })
  mb360Enabled: boolean; // ¿Habilitado control biométrico?

  @Column({ type: 'varchar', nullable: true })
  mb360Ip: string; // IP del dispositivo MB360

  @Column({ type: 'int', nullable: true })
  mb360Port: number; // Puerto del dispositivo MB360 (default: 80)

  @Column({ type: 'varchar', nullable: true })
  mb360Username: string; // Usuario para conectar al MB360

  @Column({ type: 'varchar', nullable: true })
  mb360Password: string; // Contraseña para conectar al MB360

  @Column({ type: 'int', nullable: true })
  mb360RelayId: number; // ID del relé para abrir puerta (1-4 típicamente)

  @Column({ type: 'varchar', nullable: true })
  mb360Timezone: string; // Zona horaria del dispositivo

  @Column({ type: 'varchar', default: 'unknown', nullable: true })
  mb360ConnectionStatus: 'online' | 'offline' | 'error' | 'unknown'; // Estado de conexión

  @Column({ type: 'datetime', nullable: true })
  mb360LastHeartbeat: Date; // Última conexión exitosa

  @Column({ type: 'json', nullable: true })
  closingReportRecipients: any; // { name: string, phone: string, email: string, sendWhatsapp: boolean, sendEmail: boolean }[]

  @Column({ type: 'varchar', default: '12:00' })
  closingReportTime1: string;

  @Column({ type: 'varchar', default: '21:00' })
  closingReportTime2: string;

  @Column({ type: 'varchar', default: 'both' })
  notificationChannel: string; // 'email', 'whatsapp', or 'both'

  @Column({ type: 'varchar', default: '80mm' })
  ticketPaperSize: string; // '80mm', '70mm', '58mm', 'a4'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
