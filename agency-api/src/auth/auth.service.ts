import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmailOrMobile(identifier);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(userData: any) {
    return this.usersService.create(userData);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    const { password, resetPasswordToken, ...profile } = user as any;
    return profile;
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmailOrMobile(email);
    if (!user) return; // Silent return for security

    const token = crypto.randomBytes(32).toString('hex');
    await this.usersService.update(user.id, { resetPasswordToken: token });
    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.usersService.update(user.id, {
      password: newPassword,
      resetPasswordToken: null,
    });
  }
}
