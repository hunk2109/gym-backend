import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  category: string; // cardio, strength, flexibility, other

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  quantityAvailable: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  purchasePrice: number;

  @Column({ type: 'date' })
  purchaseDate: Date;

  @Column({ type: 'date', nullable: true })
  lastMaintenance: Date | null;

  @Column({ type: 'date', nullable: true })
  nextMaintenance: Date | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', default: 'good' }) // good, maintenance_needed, broken
  status: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  convertNumberTypes() {
    // Asegurar que purchasePrice sea un número
    if (typeof this.purchasePrice === 'string') {
      this.purchasePrice = parseFloat(this.purchasePrice as any);
    }
  }

  get quantityBroken(): number {
    return this.quantity - this.quantityAvailable;
  }

  get needsMaintenance(): boolean {
    return this.status === 'maintenance_needed';
  }

  get maintenanceOverdue(): boolean {
    if (!this.nextMaintenance) return false;
    return new Date() > this.nextMaintenance;
  }
}
