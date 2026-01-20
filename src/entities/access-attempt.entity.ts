import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';

@Entity('access_attempts')
export class AccessAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gymSettingsId: string; // Referencia a la configuración del gimnasio

  @Column({ type: 'uuid', nullable: true })
  memberId: string;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'memberId' })
  member: Member | null;

  @CreateDateColumn()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: ['success', 'denied', 'not_found'],
    default: 'not_found',
  })
  status: 'success' | 'denied' | 'not_found';

  @Column({
    type: 'enum',
    enum: ['fingerprint', 'face', 'card'],
    nullable: true,
  })
  biometricType: 'fingerprint' | 'face' | 'card' | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null; // 'sin_membresía', 'membresía_suspendida', 'no_identificado', etc

  @Column({ type: 'varchar', nullable: true })
  deviceSource: string; // 'manual', 'mb360', 'qr_code', etc

  @Column({ type: 'varchar', nullable: true })
  mb360EventId: string; // ID del evento en el dispositivo

  @Column({ type: 'boolean', default: true })
  doorOpened: boolean; // ¿Se abrió la puerta?

  @Column({ type: 'int', nullable: true })
  relayUsed: number; // Número del relé utilizado

  @Column({ type: 'text', nullable: true })
  additionalData: string; // JSON con datos adicionales del evento
}
