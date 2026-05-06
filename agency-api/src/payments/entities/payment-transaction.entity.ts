import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ type: 'varchar', unique: true })
  @Index({ unique: true })
  reference: string;

  @Column({ type: 'bigint' })
  amountKobo: number;

  @Column({ type: 'varchar', length: 10, default: 'KES' })
  currency: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status: 'PENDING' | 'SUCCESS' | 'FAILED';

  @Column({ type: 'varchar', nullable: true })
  authorizationUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  accessCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  gatewayReference: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
