import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.name || !String(userData.name).trim()) {
      throw new BadRequestException('Name is required');
    }

    const existing = await this.userRepository.findOne({
      where: [{ email: userData.email }, { mobileNumber: userData.mobileNumber }],
    });
    if (existing) {
      throw new ConflictException('User with this email or mobile number already exists');
    }

    if (!userData.password) {
      throw new ConflictException('Password is required');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      creditBalance: 100,
    });
    return this.userRepository.save(user);
  }

  async findByTelegramId(telegramId: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    return user || undefined;
  }

  async findByEmailOrMobile(identifier: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { mobileNumber: identifier }],
    });
    return user || undefined;
  }

  async findByResetToken(token: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { resetPasswordToken: token } });
    return user || undefined;
  }

  async update(id: string, updateData: Partial<User>): Promise<void> {
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    await this.userRepository.update(id, updateData);
  }

  async findOrCreateByTelegramId(telegramId: string, mobileNumber?: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      const randomId = Math.random().toString(36).substring(7);
      user = this.userRepository.create({
        telegramId,
        mobileNumber: mobileNumber || `tg_${telegramId}`,
        email: `tg_${telegramId}@placeholder.com`,
        password: await bcrypt.hash(randomId, 10),
        creditBalance: 100,
      });
      user = await this.userRepository.save(user);
    }
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user || undefined;
  }

  async hasSufficientCredits(userId: string, threshold = 1): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user ? Number(user.creditBalance) >= threshold : false;
  }

  async deductCredits(userId: string, amount: number): Promise<void> {
    await this.userRepository.decrement({ id: userId }, 'creditBalance', amount);
  }
}
