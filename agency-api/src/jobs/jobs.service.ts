import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AgentsService } from '../agents/agents.service';
import { UsersService } from '../users/users.service';
import { AgentJob, JobStatus } from './entities/agent-job.entity';
import { OpenClawSpendEvent } from './entities/openclaw-spend.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly usdToKesRate: number;
  private readonly marginRate: number;

  constructor(
    @InjectRepository(AgentJob)
    private readonly agentJobRepository: Repository<AgentJob>,
    @InjectRepository(OpenClawSpendEvent)
    private readonly spendEventRepository: Repository<OpenClawSpendEvent>,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.usdToKesRate = Number(
      this.configService.get<number>('BILLING_USD_TO_KES_RATE', 130),
    );
    this.marginRate = Number(
      this.configService.get<number>('BILLING_MARGIN_RATE', 0.3),
    );
  }

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
      const costInUsd =
        typeof response.metadata?.cost === 'number' ? response.metadata.cost : 0;
      const runId =
        typeof response.metadata?.runId === 'string'
          ? response.metadata.runId
          : null;

      const billing = this.calculateBilling(tokensUsed, costInUsd);

      await this.usersService.deductCredits(job.user.id, billing.creditsCharged);

      await this.spendEventRepository.save(
        this.spendEventRepository.create({
          userId: job.user.id,
          jobId: job.id,
          runId,
          tokensUsed,
          openclawCostUsd: billing.costInUsd,
          usdToKesRate: billing.usdToKesRate,
          marginRate: billing.marginRate,
          baseCostKes: billing.baseCostKes,
          billedCostKes: billing.billedCostKes,
          creditsCharged: billing.creditsCharged,
          chargeMode: billing.mode,
          metadata: {
            status: response.metadata?.status,
          },
        }),
      );

      job.status = JobStatus.COMPLETED;
      job.tokensUsed = tokensUsed;
      job.costInUsd = billing.costInUsd;
      job.baseCostKes = billing.baseCostKes;
      job.billedCostKes = billing.billedCostKes;
      job.creditsCharged = billing.creditsCharged;
      job.billingMode = billing.mode;
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

  private calculateBilling(tokensUsed: number, rawCostInUsd: number) {
    const sanitizedTokensUsed = Number.isFinite(tokensUsed) ? Math.max(0, tokensUsed) : 0;
    const costInUsd = Number.isFinite(rawCostInUsd) ? Math.max(0, rawCostInUsd) : 0;
    const netRate = 1 - this.marginRate;

    if (costInUsd > 0 && this.usdToKesRate > 0 && netRate > 0) {
      const baseCostKes = this.roundCurrency(costInUsd * this.usdToKesRate);
      const billedCostKes = this.roundCurrency(baseCostKes / netRate);
      return {
        tokensUsed: sanitizedTokensUsed,
        costInUsd,
        usdToKesRate: this.usdToKesRate,
        marginRate: this.marginRate,
        baseCostKes,
        billedCostKes,
        creditsCharged: billedCostKes,
        mode: 'COST_BASED',
      };
    }

    const fallbackCredits = Math.max(1, Math.ceil(sanitizedTokensUsed / 100));
    return {
      tokensUsed: sanitizedTokensUsed,
      costInUsd,
      usdToKesRate: this.usdToKesRate,
      marginRate: this.marginRate,
      baseCostKes: 0,
      billedCostKes: fallbackCredits,
      creditsCharged: fallbackCredits,
      mode: 'TOKEN_FALLBACK',
    };
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
