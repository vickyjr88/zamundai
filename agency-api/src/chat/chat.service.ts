import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepository: Repository<ChatMessage>,
  ) {}

  async saveMessage(
    userId: string,
    role: 'user' | 'assistant' | 'error',
    content: string,
    jobId?: string,
    attachment?: string,
  ): Promise<ChatMessage> {
    const message = this.chatRepository.create({
      userId,
      role,
      content,
      jobId: jobId || null,
      attachment: attachment || null,
    });
    return this.chatRepository.save(message);
  }

  async getMessages(userId: string, limit: number = 100): Promise<ChatMessage[]> {
    return this.chatRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async getMessagesByJob(jobId: string, userId: string): Promise<ChatMessage[]> {
    return this.chatRepository.find({
      where: { jobId, userId },
      order: { createdAt: 'ASC' },
    });
  }

  async clearHistory(userId: string): Promise<void> {
    await this.chatRepository.delete({ userId });
  }
}
