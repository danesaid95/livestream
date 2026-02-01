import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { SendGiftDto } from './dto/send-gift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('gifts')
@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available gifts' })
  async getAllGifts() {
    return this.giftsService.getAllGifts();
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get gift leaderboard' })
  @ApiQuery({ name: 'streamId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLeaderboard(
    @Query('streamId') streamId?: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.giftsService.getGiftLeaderboard(streamId, limit);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send a gift to a creator' })
  @ApiResponse({ status: 201, description: 'Gift sent successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient points' })
  async sendGift(@CurrentUser() user: User, @Body() sendGiftDto: SendGiftDto) {
    return this.giftsService.sendGift(user.id, sendGiftDto);
  }

  @Get('history/sent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get sent gift history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSentHistory(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.giftsService.getUserGiftHistory(user.id, 'sent', page, limit);
  }

  @Get('history/received')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get received gift history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getReceivedHistory(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.giftsService.getUserGiftHistory(user.id, 'received', page, limit);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get creator earnings summary' })
  async getEarnings(@CurrentUser() user: User) {
    return this.giftsService.getCreatorEarnings(user.id);
  }
}
