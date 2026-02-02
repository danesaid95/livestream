import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StreamsService } from './streams.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { StreamCategory } from './entities/stream.entity';

@ApiTags('streams')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new stream' })
  @ApiResponse({ status: 201, description: 'Stream created successfully' })
  async create(@CurrentUser() user: User, @Body() createStreamDto: CreateStreamDto) {
    return this.streamsService.create(user.id, createStreamDto);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get all live streams' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false, enum: StreamCategory })
  async getLiveStreams(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: StreamCategory,
  ) {
    return this.streamsService.getLiveStreams(page, limit, category);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get streams by user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserStreams(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.streamsService.getUserStreams(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stream by ID' })
  @ApiResponse({ status: 200, description: 'Stream found' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.streamsService.findByIdOrFail(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update stream' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStreamDto: UpdateStreamDto,
  ) {
    return this.streamsService.update(id, user.id, updateStreamDto);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Start streaming' })
  async startStream(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.streamsService.startStream(id, user.id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'End streaming' })
  async endStream(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.streamsService.endStream(id, user.id);
  }

  @Get(':id/token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get viewer token for stream' })
  async getViewerToken(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const token = await this.streamsService.getViewerToken(id, user.id);
    return { token };
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a stream as a viewer' })
  @ApiResponse({ status: 200, description: 'Joined stream successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  @ApiResponse({ status: 403, description: 'Stream is not live' })
  async joinStream(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.streamsService.joinStream(id);
    return {
      ...result.stream,
      agoraToken: result.agoraToken,
      uid: result.uid,
    };
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a stream' })
  @ApiResponse({ status: 200, description: 'Left stream successfully' })
  async leaveStream(@Param('id', ParseUUIDPipe) id: string) {
    await this.streamsService.leaveStream(id);
    return { success: true };
  }

  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update stream thumbnail from video capture' })
  @ApiResponse({ status: 200, description: 'Thumbnail updated successfully' })
  async updateThumbnail(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { imageData: string },
  ) {
    return this.streamsService.updateThumbnail(id, user.id, body.imageData);
  }
}
