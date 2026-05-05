import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { AgentsService } from '../agents/agents.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('execute')
  async execute(@Request() req: any, @Body('prompt') prompt: string) {
    const userId = req.user.id;

    // 1. Credit Check
    const hasCredits = await this.usersService.hasSufficientCredits(userId);
    if (!hasCredits) {
      throw new ForbiddenException('Insufficient credits');
    }

    // 2. Trigger Agent Task
    const response = await this.agentsService.executeJob(userId, prompt);

    // 3. Deduct Credits
    const tokensUsed = response.metadata?.tokens_used || 0;
    const creditCost = Math.max(1, Math.ceil(tokensUsed / 100));
    await this.usersService.deductCredits(userId, creditCost);

    return {
      output: response.output,
      cost: creditCost,
      tokensUsed,
    };
  }
}
