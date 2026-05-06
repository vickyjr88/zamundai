import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AgentJob } from '../../jobs/entities/agent-job.entity';
import { OpenClawSpendEvent } from '../../jobs/entities/openclaw-spend.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  telegramId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  mobileNumber: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  resetPasswordToken: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditBalance: number;

  @Column({ nullable: true })
  paystackCustomerId: string;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  @OneToMany(() => AgentJob, (job) => job.user)
  jobs: AgentJob[];

  @OneToMany(() => OpenClawSpendEvent, (spend) => spend.user)
  spendEvents: OpenClawSpendEvent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
