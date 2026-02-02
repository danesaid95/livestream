import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username: username.toLowerCase() } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findByIdOrFail(id);

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.findByUsername(updateUserDto.username);
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, 12)
      : null;

    await this.userRepository.update(id, { refreshToken: hashedToken });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async updatePointBalance(id: string, amount: number): Promise<User> {
    const user = await this.findByIdOrFail(id);
    user.pointBalance += amount;
    return this.userRepository.save(user);
  }

  async followUser(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new ConflictException('You cannot follow yourself');
    }

    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    const follow = this.followRepository.create({ followerId, followingId });
    await this.followRepository.save(follow);

    await this.userRepository.increment({ id: followerId }, 'followingCount', 1);
    await this.userRepository.increment({ id: followingId }, 'followerCount', 1);

    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.followRepository.remove(follow);
    await this.userRepository.decrement({ id: followerId }, 'followingCount', 1);
    await this.userRepository.decrement({ id: followingId }, 'followerCount', 1);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{ users: User[]; total: number }> {
    const [follows, total] = await this.followRepository.findAndCount({
      where: { followingId: userId },
      relations: ['follower'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users: follows.map((f) => f.follower),
      total,
    };
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{ users: User[]; total: number }> {
    const [follows, total] = await this.followRepository.findAndCount({
      where: { followerId: userId },
      relations: ['following'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users: follows.map((f) => f.following),
      total,
    };
  }

  async searchUsers(query: string, page: number = 1, limit: number = 20): Promise<{ users: User[]; total: number }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE });

    if (query && query.trim()) {
      queryBuilder.andWhere(
        '(user.username ILIKE :query OR user.displayName ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    const [users, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.followerCount', 'DESC')
      .getManyAndCount();

    return { users, total };
  }

  async getSuggestedUsers(limit: number = 5): Promise<{ users: User[] }> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .orderBy('user.followerCount', 'DESC')
      .addOrderBy('user.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return { users };
  }
}
