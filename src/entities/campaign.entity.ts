import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum CampaignAudience {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  CUSTOM = 'CUSTOM',
}

export enum CampaignChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: CampaignAudience, default: CampaignAudience.ALL })
  audience: CampaignAudience;

  @Column({ type: 'enum', enum: CampaignChannel, default: CampaignChannel.BOTH })
  channel: CampaignChannel;

  @Column({ type: 'text' })
  messageTemplate: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachedCouponCode: string;

  @Column({ type: 'int', default: 0 })
  recipientsCount: number;

  @Column({ type: 'int', default: 0 })
  successfulSends: number;

  @Column({ type: 'int', default: 0 })
  failedSends: number;

  @CreateDateColumn()
  createdAt: Date;
}
