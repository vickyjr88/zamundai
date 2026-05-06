import { Controller, Post, Get, Body, Request, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
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
}
