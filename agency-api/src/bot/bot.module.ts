import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';
import { BotLauncherService } from './bot-launcher.service';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';

const isTelegramBotEnabled = process.env.TELEGRAM_BOT_ENABLED === 'true';

@Module({
  imports: [
    ...(isTelegramBotEnabled
      ? [
          TelegrafModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
              launchOptions: false,
            }),
            inject: [ConfigService],
          }),
        ]
      : []),
    UsersModule,
    JobsModule,
  ],
  providers: isTelegramBotEnabled ? [BotService, BotLauncherService] : [],
})
export class BotModule {}
