import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PointTransaction, TransactionType, TransactionStatus } from './entities/point-transaction.entity';
import { PointPackage } from './entities/point-package.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class PointsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(PointTransaction)
    private readonly transactionRepository: Repository<PointTransaction>,
    @InjectRepository(PointPackage)
    private readonly packageRepository: Repository<PointPackage>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('stripe.secretKey');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async getPackages(): Promise<PointPackage[]> {
    return this.packageRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getPackageById(id: string): Promise<PointPackage> {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    return pkg;
  }

  async createPaymentIntent(
    userId: string,
    packageId: string,
  ): Promise<{ clientSecret: string; packageDetails: { name: string; points: number; bonusPoints: number; price: number } }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment processing not configured');
    }

    const user = await this.usersService.findByIdOrFail(userId);
    const pkg = await this.getPackageById(packageId);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(pkg.priceUsd) * 100),
      currency: this.configService.get<string>('stripe.currency', 'usd'),
      metadata: {
        userId,
        packageId,
        points: String(pkg.points + pkg.bonusPoints),
        packageName: pkg.name,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      packageDetails: {
        name: pkg.name,
        points: pkg.points,
        bonusPoints: pkg.bonusPoints,
        price: Number(pkg.priceUsd),
      },
    };
  }

  async confirmPayment(
    userId: string,
    paymentIntentId: string,
  ): Promise<{ success: boolean; points: number }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment processing not configured');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }

    // Verify this payment belongs to this user
    if (paymentIntent.metadata.userId !== userId) {
      throw new BadRequestException('Payment does not belong to this user');
    }

    // Check if already processed
    const existingTx = await this.transactionRepository.findOne({
      where: { stripePaymentId: paymentIntentId },
    });

    if (existingTx) {
      return { success: true, points: existingTx.amount };
    }

    const pointAmount = parseInt(paymentIntent.metadata.points, 10);
    const user = await this.usersService.findByIdOrFail(userId);

    const transaction = this.transactionRepository.create({
      userId,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.COMPLETED,
      amount: pointAmount,
      balanceBefore: user.pointBalance,
      balanceAfter: user.pointBalance + pointAmount,
      stripePaymentId: paymentIntentId,
      usdAmount: paymentIntent.amount / 100,
      description: `Purchased ${paymentIntent.metadata.packageName}`,
    });

    await this.transactionRepository.save(transaction);
    await this.usersService.updatePointBalance(userId, pointAmount);

    return { success: true, points: pointAmount };
  }

  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Payment processing not configured');
    }

    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.completePointPurchase(session);
    }
  }

  private async completePointPurchase(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, packageId, points } = session.metadata!;
    const pointAmount = parseInt(points, 10);

    const user = await this.usersService.findByIdOrFail(userId);
    const pkg = await this.getPackageById(packageId);

    const transaction = this.transactionRepository.create({
      userId,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.COMPLETED,
      amount: pointAmount,
      balanceBefore: user.pointBalance,
      balanceAfter: user.pointBalance + pointAmount,
      stripePaymentId: session.payment_intent as string,
      usdAmount: Number(pkg.priceUsd),
      description: `Purchased ${pkg.name}`,
    });

    await this.transactionRepository.save(transaction);
    await this.usersService.updatePointBalance(userId, pointAmount);
  }

  async getUserTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }

  async getUserBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.usersService.findByIdOrFail(userId);
    return { balance: user.pointBalance };
  }

  async addBonusPoints(
    userId: string,
    amount: number,
    description: string,
  ): Promise<PointTransaction> {
    const user = await this.usersService.findByIdOrFail(userId);

    const transaction = this.transactionRepository.create({
      userId,
      type: TransactionType.BONUS,
      status: TransactionStatus.COMPLETED,
      amount,
      balanceBefore: user.pointBalance,
      balanceAfter: user.pointBalance + amount,
      description,
    });

    await this.transactionRepository.save(transaction);
    await this.usersService.updatePointBalance(userId, amount);

    return transaction;
  }
}
