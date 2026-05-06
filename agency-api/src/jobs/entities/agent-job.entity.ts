import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('agent_jobs')
export class AgentJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({ default: 0 })
  tokensUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costInUsd: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  baseCostKes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  billedCostKes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditsCharged: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  billingMode: string | null;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'text', nullable: true })
  response: string;

  @ManyToOne(() => User, (user) => user.jobs)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
