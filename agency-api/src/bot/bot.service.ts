import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Start, Update, Message, On, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import { AgentsService } from '../agents/agents.service';

@Update()
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly agentsService: AgentsService,
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
      // 2. Trigger Agent Task
      const response = await this.agentsService.executeJob(user.id, text);

      // 3. Deduct Credits (Task 3 logic)
      const tokensUsed = response.metadata?.tokens_used || 0;
      const creditCost = Math.max(1, Math.ceil(tokensUsed / 100)); // Simple formula

      await this.usersService.deductCredits(user.id, creditCost);

      // 4. Send Result
      await ctx.reply(response.output);
      await ctx.reply(`Task completed. Cost: ${creditCost} credits.`);
    } catch (error) {
      const message =
        error instanceof HttpException
          ? error.message
          : 'Sorry, I encountered an error while processing your request. Please try again later.';

      this.logger.error(`Error processing agent job: ${message}`);
      await ctx.reply(message);
    }
  }
}
