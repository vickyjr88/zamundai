import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Start, Update, Message, On, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { JobStatus } from '../jobs/entities/agent-job.entity';

@Update()
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly resultPollIntervalMs = 3000;
  private readonly resultWaitTimeoutMs = 10 * 60 * 1000;

  constructor(
    private readonly usersService: UsersService,
    private readonly jobsService: JobsService,
  ) {}

  @Start()
  async onStart(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findOrCreateByTelegramId(telegramId);

    await ctx.reply(
      `Welcome to Zamunda AI! 🤖\n\nYour current balance: ${user.creditBalance} credits.\n\nSend me a prompt to start an agent task or use /signup to link your account.`,
    );
  }

  @Command('signup')
  async onSignup(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id.toString();
    // Automatic signup logic
    const user = await this.usersService.findOrCreateByTelegramId(telegramId);
    await ctx.reply(
      `Automatic Signup Successful! ✅\n\nYou can now log in to the dashboard using your Telegram identifier: tg_${telegramId}\n\nYour current balance: ${user.creditBalance} credits.`,
    );
  }

  @On('text')
  async onMessage(@Message('text') text: string, ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findOrCreateByTelegramId(telegramId);

    // 1. Credit Check
    const hasCredits = await this.usersService.hasSufficientCredits(user.id);
    if (!hasCredits) {
      await ctx.reply(
        'Insufficient credits! ❌ Please top up your balance on the dashboard to continue.',
      );
      return;
    }

    await ctx.reply('Agent is thinking... 🧠');

    try {
      const job = await this.jobsService.enqueueJob(user.id, text);
      await ctx.reply(`Task queued. Job ID: ${job.id}`);

      if (ctx.chat?.id) {
        void this.notifyWhenCompleted(ctx, ctx.chat.id, user.id, job.id);
      }
    } catch (error) {
      const message =
        error instanceof HttpException
          ? error.message
          : 'Sorry, I encountered an error while processing your request. Please try again later.';

      this.logger.error(`Error processing agent job: ${message}`);
      await ctx.reply(message);
    }
  }

  private async notifyWhenCompleted(
    ctx: Context,
    chatId: number,
    userId: string,
    jobId: string,
  ): Promise<void> {
    const timeoutAt = Date.now() + this.resultWaitTimeoutMs;

    while (Date.now() < timeoutAt) {
      const job = await this.jobsService.findJobForUser(jobId, userId);

      if (!job) {
        return;
      }

      if (job.status === JobStatus.COMPLETED) {
        const creditCost = Math.max(1, Math.ceil(job.tokensUsed / 100));
        await ctx.telegram.sendMessage(chatId, job.response ?? 'Task completed.');
        await ctx.telegram.sendMessage(
          chatId,
          `Task completed. Cost: ${creditCost} credits.`,
        );
        return;
      }

      if (job.status === JobStatus.FAILED) {
        await ctx.telegram.sendMessage(
          chatId,
          `Task failed: ${job.response ?? 'Unknown error'}`,
        );
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, this.resultPollIntervalMs),
      );
    }

    await ctx.telegram.sendMessage(
      chatId,
      `Task is still running. Check status later with Job ID: ${jobId}`,
    );
  }
}
