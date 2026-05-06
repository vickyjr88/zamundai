import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';
import { AgentJob } from './jobs/entities/agent-job.entity';
import { OpenClawSpendEvent } from './jobs/entities/openclaw-spend.entity';
import { ChatMessage } from './chat/entities/chat-message.entity';
import { PaymentTransaction } from './payments/entities/payment-transaction.entity';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { AgentsModule } from './agents/agents.module';
import { BotModule } from './bot/bot.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'agency_db'),
        entities: [User, AgentJob, OpenClawSpendEvent, ChatMessage, PaymentTransaction],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: configService.get<boolean>('DB_MIGRATIONS_RUN', true),
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    JobsModule,
    AgentsModule,
    BotModule,
    MailModule,
    AuthModule,
    ChatModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
