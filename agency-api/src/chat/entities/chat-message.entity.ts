import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AgentJob } from '../../jobs/entities/agent-job.entity';

@Entity('chat_messages')
@Index(['user', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => AgentJob, { eager: false, nullable: true, onDelete: 'SET NULL' })
  job: AgentJob | null;

  @Column('uuid', { nullable: true })
  jobId: string | null;

  @Column('varchar', { length: 20 })
  role: 'user' | 'assistant' | 'error';

  @Column('text')
  content: string;

  @Column('varchar', { length: 255, nullable: true })
  attachment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
