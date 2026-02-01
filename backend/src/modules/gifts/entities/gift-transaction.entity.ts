import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Stream } from '../../streams/entities/stream.entity';
import { Gift } from './gift.entity';

@Entity('gift_transactions')
export class GiftTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  senderId: string;

  @Column({ type: 'uuid' })
  @Index()
  receiverId: string;

  @Column({ type: 'uuid' })
  @Index()
  giftId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  streamId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  pointsSpent: number;

  @Column({ type: 'int' })
  creatorEarnings: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  message: string;

  @ManyToOne(() => User, (user) => user.sentGifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User, (user) => user.receivedGifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @ManyToOne(() => Gift, (gift) => gift.transactions)
  @JoinColumn({ name: 'giftId' })
  gift: Gift;

  @ManyToOne(() => Stream, (stream) => stream.giftTransactions, { nullable: true })
  @JoinColumn({ name: 'streamId' })
  stream: Stream;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
