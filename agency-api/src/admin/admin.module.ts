import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { AgentJob } from '../jobs/entities/agent-job.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { OpenClawSpendEvent } from '../jobs/entities/openclaw-spend.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AgentJob,
      PaymentTransaction,
      OpenClawSpendEvent,
      ChatMessage,
    ]),
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
