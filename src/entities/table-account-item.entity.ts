import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TableAccount } from './table-account.entity';
import { Product } from './product.entity';

@Entity('table_account_items')
export class TableAccountItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => TableAccount, (account) => account.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: TableAccount;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @CreateDateColumn()
  addedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  removedAt: Date;
}
