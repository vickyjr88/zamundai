import { Controller, Get, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  async saveMessage(
    @Req() req: any,
    @Body()
    body: {
      role: 'user' | 'assistant' | 'error';
      content: string;
      jobId?: string;
      attachment?: string;
    },
  ) {
    const userId = req.user.id;
    const message = await this.chatService.saveMessage(
      userId,
      body.role,
      body.content,
      body.jobId,
      body.attachment,
    );
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      jobId: message.jobId,
      attachment: message.attachment,
      createdAt: message.createdAt,
    };
  }

  @Get('messages')
  async getMessages(@Req() req: any) {
    const userId = req.user.id;
    const messages = await this.chatService.getMessages(userId);
    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      jobId: m.jobId,
      attachment: m.attachment,
      createdAt: m.createdAt,
    }));
  }

  @Delete('messages')
  async clearHistory(@Req() req: any) {
    const userId = req.user.id;
    await this.chatService.clearHistory(userId);
    return { success: true };
  }
}
