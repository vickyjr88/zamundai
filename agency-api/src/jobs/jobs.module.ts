import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { AgentJob } from './entities/agent-job.entity';
import { OpenClawSpendEvent } from './entities/openclaw-spend.entity';
import { JobsController } from './jobs.controller';
import { AgentsModule } from '../agents/agents.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentJob, OpenClawSpendEvent]),
    AgentsModule,
    UsersModule,
  ],
  providers: [JobsService],
  exports: [JobsService],
  controllers: [JobsController],
})
export class JobsModule {}
