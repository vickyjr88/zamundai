import { Controller, Post, Get, Patch, Body, Request, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() userData: any) {
    if (!userData.name || !String(userData.name).trim()) {
      throw new BadRequestException('Name is required');
    }

    if (!userData.mobileNumber) {
      throw new BadRequestException('Mobile number is required');
    }
    return this.authService.register(userData);
  }

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.identifier, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body('token') token: string, @Body('password') pass: string) {
    return this.authService.resetPassword(token, pass);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Request() req: any,
    @Body()
    body: {
      name?: string;
      mobileNumber?: string;
    },
  ) {
    if (body.name !== undefined && !String(body.name).trim()) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (body.mobileNumber !== undefined && !String(body.mobileNumber).trim()) {
      throw new BadRequestException('Mobile number cannot be empty');
    }

    return this.authService.updateMe(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Request() req: any,
    @Body()
    body: {
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    if (!body.currentPassword) {
      throw new BadRequestException('Current password is required');
    }

    if (!body.newPassword) {
      throw new BadRequestException('New password is required');
    }

    if (body.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}
