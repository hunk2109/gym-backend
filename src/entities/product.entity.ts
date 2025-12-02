import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { SaleItem } from './sale-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  quantityAvailable: number;

  @Column({ type: 'varchar' })
  supplier: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: { to: (v) => v, from: (v) => v ? parseFloat(v) : null } })
  cost: number | null;

  @Column({ type: 'int', nullable: true })
  minStockLevel: number | null;

  @Column({ type: 'varchar', nullable: true })
  sku: string | null;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date | null;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => SaleItem, (item) => item.product)
  saleItems: SaleItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  convertNumberTypes() {
    // Asegurar que los números sean del tipo correcto
    if (typeof this.price === 'string') {
      this.price = parseFloat(this.price as any);
    }
    if (typeof this.cost === 'string') {
      this.cost = parseFloat(this.cost as any);
    }
  }

  get isExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  get isLowStock(): boolean {
    return this.quantityAvailable <= 10;
  }

  get stockStatus(): string {
    if (this.quantityAvailable === 0) return 'out-of-stock';
    if (this.isLowStock) return 'low-stock';
    return 'in-stock';
  }
}
