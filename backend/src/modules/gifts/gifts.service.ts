import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gift, GiftTier } from './entities/gift.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import { UsersService } from '../users/users.service';
import { SendGiftDto } from './dto/send-gift.dto';

@Injectable()
export class GiftsService {
  constructor(
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    @InjectRepository(GiftTransaction)
    private readonly transactionRepository: Repository<GiftTransaction>,
    private readonly usersService: UsersService,
  ) {}

  async getAllGifts(): Promise<Gift[]> {
    return this.giftRepository.find({
      where: { isActive: true },
      order: { tier: 'ASC', sortOrder: 'ASC' },
    });
  }

  async getGiftById(id: string): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException('Gift not found');
    }
    return gift;
  }

  async sendGift(
    senderId: string,
    sendGiftDto: SendGiftDto,
  ): Promise<GiftTransaction> {
    const { giftId, receiverId, streamId, quantity, message } = sendGiftDto;

    const sender = await this.usersService.findByIdOrFail(senderId);
    const receiver = await this.usersService.findByIdOrFail(receiverId);
    const gift = await this.getGiftById(giftId);

    const totalCost = gift.pointCost * quantity;

    if (sender.pointBalance < totalCost) {
      throw new BadRequestException('Insufficient points');
    }

    await this.usersService.updatePointBalance(senderId, -totalCost);

    const creatorEarnings = gift.creatorEarnings * quantity;
    await this.usersService.updatePointBalance(receiverId, creatorEarnings);

    const transaction = this.transactionRepository.create({
      senderId,
      receiverId,
      giftId,
      streamId,
      quantity,
      pointsSpent: totalCost,
      creatorEarnings,
      message,
    });

    return this.transactionRepository.save(transaction);
  }

  async getGiftLeaderboard(
    streamId?: string,
    limit: number = 10,
  ): Promise<Array<{ userId: string; username: string; totalSpent: number }>> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.senderId', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('SUM(transaction.pointsSpent)', 'totalSpent')
      .innerJoin('users', 'user', 'user.id = transaction.senderId')
      .groupBy('transaction.senderId')
      .addGroupBy('user.username')
      .orderBy('totalSpent', 'DESC')
      .limit(limit);

    if (streamId) {
      queryBuilder.where('transaction.streamId = :streamId', { streamId });
    }

    return queryBuilder.getRawMany();
  }

  async getCreatorEarnings(
    creatorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ totalEarnings: number; transactionCount: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.creatorEarnings)', 'totalEarnings')
      .addSelect('COUNT(transaction.id)', 'transactionCount')
      .where('transaction.receiverId = :creatorId', { creatorId });

    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    const result = await queryBuilder.getRawOne();
    return {
      totalEarnings: parseInt(result.totalEarnings || '0', 10),
      transactionCount: parseInt(result.transactionCount || '0', 10),
    };
  }

  async getUserGiftHistory(
    userId: string,
    type: 'sent' | 'received',
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: GiftTransaction[]; total: number }> {
    const whereClause = type === 'sent'
      ? { senderId: userId }
      : { receiverId: userId };

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: whereClause,
      relations: ['gift', 'sender', 'receiver', 'stream'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }
}
