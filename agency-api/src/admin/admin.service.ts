import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AgentJob } from '../jobs/entities/agent-job.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { OpenClawSpendEvent } from '../jobs/entities/openclaw-spend.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { UsersService } from '../users/users.service';
import { JobStatus } from '../jobs/entities/agent-job.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(AgentJob)
    private readonly jobsRepository: Repository<AgentJob>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentsRepository: Repository<PaymentTransaction>,
    @InjectRepository(OpenClawSpendEvent)
    private readonly spendRepository: Repository<OpenClawSpendEvent>,
    @InjectRepository(ChatMessage)
    private readonly chatRepository: Repository<ChatMessage>,
    private readonly usersService: UsersService,
  ) {}

  async getOverview() {
    const [
      totalUsers,
      totalAdmins,
      totalJobs,
      runningJobs,
      totalPayments,
      successfulPayments,
      totalSpendEvents,
      totalMessages,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { isAdmin: true } }),
      this.jobsRepository.count(),
      this.jobsRepository.count({ where: [{ status: JobStatus.PENDING }, { status: JobStatus.RUNNING }] }),
      this.paymentsRepository.count(),
      this.paymentsRepository.count({ where: { status: 'SUCCESS' } }),
      this.spendRepository.count(),
      this.chatRepository.count(),
    ]);

    const paymentsSum = await this.paymentsRepository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p."amountKobo"), 0)', 'sum')
      .where('p.status = :status', { status: 'SUCCESS' })
      .getRawOne<{ sum: string }>();

    const spendSum = await this.spendRepository
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s."baseCostKes"), 0)', 'baseKes')
      .addSelect('COALESCE(SUM(s."billedCostKes"), 0)', 'billedKes')
      .addSelect('COALESCE(SUM(s."creditsCharged"), 0)', 'creditsCharged')
      .addSelect('COALESCE(SUM(s."openclawCostUsd"), 0)', 'openclawUsd')
      .getRawOne<{
        baseKes: string;
        billedKes: string;
        creditsCharged: string;
        openclawUsd: string;
      }>();

    const usersCredits = await this.usersRepository
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u."creditBalance"), 0)', 'creditsLiability')
      .getRawOne<{ creditsLiability: string }>();

    return {
      totals: {
        users: totalUsers,
        admins: totalAdmins,
        jobs: totalJobs,
        jobsInFlight: runningJobs,
        payments: totalPayments,
        successfulPayments,
        spendEvents: totalSpendEvents,
        chatMessages: totalMessages,
      },
      finance: {
        topupKes: Number(paymentsSum?.sum || 0) / 100,
        openclawCostUsd: Number(spendSum?.openclawUsd || 0),
        openclawCostKes: Number(spendSum?.baseKes || 0),
        billedKes: Number(spendSum?.billedKes || 0),
        creditsCharged: Number(spendSum?.creditsCharged || 0),
        creditsLiability: Number(usersCredits?.creditsLiability || 0),
        grossMarginKes: Number(spendSum?.billedKes || 0) - Number(spendSum?.baseKes || 0),
      },
    };
  }

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? [
          { email: Like(`%${search}%`) },
          { mobileNumber: Like(`%${search}%`) },
          { name: Like(`%${search}%`) },
        ]
      : undefined;

    const [items, total] = await this.usersRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async listJobs(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.jobsRepository.findAndCount({
      where: status ? { status: status as AgentJob['status'] } : undefined,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async listPayments(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.paymentsRepository.findAndCount({
      where: status ? { status: status as PaymentTransaction['status'] } : undefined,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async listSpendEvents(page = 1, limit = 20, chargeMode?: string) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.spendRepository.findAndCount({
      where: chargeMode ? { chargeMode } : undefined,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async listChatMessages(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.chatRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async listOpenClawLogs(
    page = 1,
    limit = 20,
    status?: string,
    search?: string,
    attachmentsOnly = false,
  ) {
    const skip = (page - 1) * limit;
    const query = this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .orderBy('job.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    if (attachmentsOnly) {
      query.andWhere(
        '(job.prompt LIKE :docMarker OR job.prompt LIKE :imageMarker)',
        {
          docMarker: '%--- Document:%',
          imageMarker: '%data:image/%',
        },
      );
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      query.andWhere(
        '(job.prompt ILIKE :term OR job.response ILIKE :term OR user.email ILIKE :term)',
        { term },
      );
    }

    const [items, total] = await query.getManyAndCount();

    return {
      items: items.map((job) => {
        const prompt = job.prompt ?? '';
        return {
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          user: job.user
            ? {
                id: job.user.id,
                email: job.user.email,
                name: job.user.name,
              }
            : null,
          tokensUsed: job.tokensUsed,
          costInUsd: Number(job.costInUsd),
          billedCostKes: Number(job.billedCostKes),
          creditsCharged: Number(job.creditsCharged),
          billingMode: job.billingMode,
          hasDocumentAttachment: prompt.includes('--- Document:'),
          hasImageAttachment: prompt.includes('data:image/'),
          prompt,
          response: job.response,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async adjustUserCredits(userId: string, delta: number) {
    const updatedUser = await this.usersService.adjustCredits(userId, delta);
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      creditBalance: Number(updatedUser.creditBalance),
    };
  }

  async setUserAdmin(userId: string, isAdmin: boolean) {
    const updatedUser = await this.usersService.setAdminRole(userId, isAdmin);
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    };
  }
}
