import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { AgentJob } from '../jobs/entities/agent-job.entity';
import { OpenClawSpendEvent } from '../jobs/entities/openclaw-spend.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'agency_db',
  entities: [User, AgentJob, OpenClawSpendEvent, ChatMessage, PaymentTransaction],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
