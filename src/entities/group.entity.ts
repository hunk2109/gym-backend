import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Member } from './member.entity';
import { Membership } from './membership.entity';
import { GroupCompanion } from './group-companion.entity';

@Entity('groups')
export class Group {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 100 })
  name: string; // "Familia Rodriguez"

  @Column('varchar', { length: 255, nullable: true })
  description: string;

  @ManyToOne(() => Membership, { eager: true })
  @JoinColumn({ name: 'membershipId' })
  membership: Membership; // Membresía grupal (Familiar Premium)

  @Column('varchar')
  membershipId: string;

  @ManyToOne(() => Member, { eager: true })
  @JoinColumn({ name: 'responsibleMemberId' })
  responsibleMember: Member; // Juan Rodriguez (responsable)

  @Column('varchar')
  responsibleMemberId: string;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('varchar', { length: 20, default: 'active' })
  status: 'active' | 'suspended' | 'expired';

  @Column('int', { default: 0 })
  companionCount: number; // Contador actual de acompañantes

  @OneToMany(() => GroupCompanion, (companion) => companion.group, {
    cascade: true,
    eager: true,
  })
  companions: GroupCompanion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
