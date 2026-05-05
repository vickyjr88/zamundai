import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';

@Injectable()
export class BotLauncherService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(BotLauncherService.name);
  private isLaunched = false;

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const shouldStartPolling =
      this.configService.get<string>(
        'TELEGRAM_BOT_POLLING_ENABLED',
        'false',
      ) === 'true';

    if (!shouldStartPolling) {
      this.logger.log('Telegram bot polling is disabled');
      return;
    }

    try {
      await this.bot.launch();
      this.isLaunched = true;
      this.logger.log('Telegram bot polling started');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Telegram bot launch failed: ${message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.isLaunched) {
      return;
    }

    await this.bot.stop();
  }
}
