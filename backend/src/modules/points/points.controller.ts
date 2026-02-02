import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PurchasePointsDto } from './dto/purchase-points.dto';

@ApiTags('points')
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('packages')
  @ApiOperation({ summary: 'Get available point packages' })
  async getPackages() {
    return this.pointsService.getPackages();
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user point balance' })
  async getBalance(@CurrentUser() user: User) {
    return this.pointsService.getUserBalance(user.id);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create payment intent for point purchase' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async purchase(
    @CurrentUser() user: User,
    @Body() purchasePointsDto: PurchasePointsDto,
  ) {
    return this.pointsService.createPaymentIntent(user.id, purchasePointsDto.packageId);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirm payment and add points' })
  @ApiResponse({ status: 200, description: 'Payment confirmed and points added' })
  async confirmPayment(
    @CurrentUser() user: User,
    @Body() body: { paymentIntentId: string },
  ) {
    return this.pointsService.confirmPayment(user.id, body.paymentIntentId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      throw new Error('No raw body found');
    }
    await this.pointsService.handleWebhook(signature, payload);
    return { received: true };
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.pointsService.getUserTransactions(user.id, page, limit);
  }
}
