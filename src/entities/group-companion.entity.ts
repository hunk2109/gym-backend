import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Member } from './member.entity';

@Entity('group_companions')
export class GroupCompanion {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @ManyToOne(() => Group, (group) => group.companions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column('varchar')
  groupId: string;

  @ManyToOne(() => Member, { eager: true })
  @JoinColumn({ name: 'memberId' })
  member: Member; // Camila Rodriguez (acompañante)

  @Column('varchar')
  memberId: string;

  @Column('varchar', { length: 100, nullable: true })
  relationship: string; // "esposa", "hijo", "hermana", etc. (texto libre)

  @Column('varchar', { length: 20, default: 'active' })
  status: 'active' | 'inactive';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
