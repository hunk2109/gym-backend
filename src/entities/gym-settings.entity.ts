import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  website: string;

  @Column({ type: 'varchar' })
  openingTime: string; // HH:MM format

  @Column({ type: 'varchar' })
  closingTime: string; // HH:MM format

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  membershipPrice: number;

  @Column({ type: 'text', nullable: true })
  policies: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
