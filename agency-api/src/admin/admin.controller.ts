import {
  Body,
  Controller,
  Get,
  ParseBoolPipe,
  ParseFloatPipe,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async overview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  async users(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(page ?? 1, limit ?? 20, search);
  }

  @Get('jobs')
  async jobs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.listJobs(page ?? 1, limit ?? 20, status);
  }

  @Get('payments')
  async payments(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.listPayments(page ?? 1, limit ?? 20, status);
  }

  @Get('spend-events')
  async spendEvents(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('chargeMode') chargeMode?: string,
  ) {
    return this.adminService.listSpendEvents(page ?? 1, limit ?? 20, chargeMode);
  }

  @Get('chat-messages')
  async chatMessages(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.adminService.listChatMessages(page ?? 1, limit ?? 20);
  }

  @Patch('users/credits')
  async adjustCredits(
    @Body('userId') userId: string,
    @Body('delta', ParseFloatPipe) delta: number,
  ) {
    return this.adminService.adjustUserCredits(userId, delta);
  }

  @Patch('users/admin')
  async setAdmin(
    @Body('userId') userId: string,
    @Body('isAdmin', ParseBoolPipe) isAdmin: boolean,
  ) {
    return this.adminService.setUserAdmin(userId, isAdmin);
  }
}
