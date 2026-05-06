import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AgentJob } from './agent-job.entity';

@Entity('openclaw_spend_events')
export class OpenClawSpendEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid', { nullable: true })
  jobId: string | null;

  @Column('varchar', { nullable: true })
  runId: string | null;

  @Column({ default: 0 })
  tokensUsed: number;

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  openclawCostUsd: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 130 })
  usdToKesRate: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0.3 })
  marginRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  baseCostKes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  billedCostKes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditsCharged: number;

  @Column({ type: 'varchar', length: 30, default: 'CHARGED' })
  chargeMode: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => AgentJob, { onDelete: 'SET NULL', nullable: true })
  job: AgentJob | null;

  @CreateDateColumn()
  createdAt: Date;
}
