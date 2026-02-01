import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GiftTransaction } from './gift-transaction.entity';

export enum GiftTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  LEGENDARY = 'legendary',
}

@Entity('gifts')
export class Gift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500 })
  iconUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  animationUrl: string;

  @Column({ type: 'int' })
  pointCost: number;

  @Column({ type: 'int' })
  creatorEarnings: number;

  @Column({
    type: 'enum',
    enum: GiftTier,
    default: GiftTier.BASIC,
  })
  tier: GiftTier;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => GiftTransaction, (transaction) => transaction.gift)
  transactions: GiftTransaction[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
