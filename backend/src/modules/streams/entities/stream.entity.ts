import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GiftTransaction } from '../../gifts/entities/gift-transaction.entity';

export enum StreamStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum StreamCategory {
  GAMING = 'gaming',
  MUSIC = 'music',
  TALK_SHOW = 'talk_show',
  EDUCATION = 'education',
  SPORTS = 'sports',
  CREATIVE = 'creative',
  LIFESTYLE = 'lifestyle',
  OTHER = 'other',
}

@Entity('streams')
export class Stream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({
    type: 'enum',
    enum: StreamStatus,
    default: StreamStatus.SCHEDULED,
  })
  @Index()
  status: StreamStatus;

  @Column({
    type: 'enum',
    enum: StreamCategory,
    default: StreamCategory.OTHER,
  })
  @Index()
  category: StreamCategory;

  @Column({ type: 'varchar', length: 100, unique: true })
  channelName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  agoraToken: string;

  @Column({ type: 'int', default: 0 })
  viewerCount: number;

  @Column({ type: 'int', default: 0 })
  peakViewerCount: number;

  @Column({ type: 'int', default: 0 })
  totalViews: number;

  @Column({ type: 'int', default: 0 })
  totalGiftsReceived: number;

  @Column({ type: 'int', default: 0 })
  totalPointsEarned: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'boolean', default: false })
  isMature: boolean;

  @Column({ type: 'boolean', default: true })
  chatEnabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledStartAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationInSeconds: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  recordingUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recordingResourceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recordingSid: string;

  @Column({ type: 'int', nullable: true })
  recordingUid: number;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.streams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => GiftTransaction, (transaction) => transaction.stream)
  giftTransactions: GiftTransaction[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
