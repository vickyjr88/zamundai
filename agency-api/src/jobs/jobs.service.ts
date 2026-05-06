import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AgentsService } from '../agents/agents.service';
import { UsersService } from '../users/users.service';
import { AgentJob, JobStatus } from './entities/agent-job.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(AgentJob)
    private readonly agentJobRepository: Repository<AgentJob>,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
  ) {}

  async enqueueJob(userId: string, prompt: string): Promise<AgentJob> {
    const activeJob = await this.agentJobRepository.findOne({
      where: {
        user: { id: userId },
        status: In([JobStatus.PENDING, JobStatus.RUNNING]),
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    if (activeJob) {
      throw new ConflictException(
        `A job is already in progress for this user (jobId: ${activeJob.id})`,
      );
    }

    const job = this.agentJobRepository.create({
      sessionId: `user_${userId}`,
      prompt,
      status: JobStatus.PENDING,
      user: { id: userId } as AgentJob['user'],
    });

    const savedJob = await this.agentJobRepository.save(job);
    void this.processJob(savedJob.id);
    return savedJob;
  }

  async findJobForUser(jobId: string, userId: string): Promise<AgentJob | null> {
    return this.agentJobRepository.findOne({
      where: {
        id: jobId,
        user: { id: userId },
      },
      relations: ['user'],
    });
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.agentJobRepository.findOne({
      where: { id: jobId },
      relations: ['user'],
    });

    if (!job || job.status !== JobStatus.PENDING || !job.user?.id) {
      return;
    }

    job.status = JobStatus.RUNNING;
    await this.agentJobRepository.save(job);

    try {
      const response = await this.agentsService.executeJob(job.user.id, job.prompt);
      const tokensUsed = response.metadata?.tokens_used ?? 0;
      const creditCost = Math.max(1, Math.ceil(tokensUsed / 100));
      const costInUsd =
        typeof response.metadata?.cost === 'number' ? response.metadata.cost : 0;

      await this.usersService.deductCredits(job.user.id, creditCost);

      job.status = JobStatus.COMPLETED;
      job.tokensUsed = tokensUsed;
      job.costInUsd = costInUsd;
      job.response = response.output;
      await this.agentJobRepository.save(job);
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.response = error instanceof Error ? error.message : 'Job failed';
      await this.agentJobRepository.save(job);

      this.logger.error(
        `Job ${job.id} failed for user ${job.user.id}: ${job.response}`,
      );
    }
  }
}
