import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JobsService } from './jobs.service';
import { AgentsService } from '../agents/agents.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('execute')
  async execute(@Request() req: any, @Body('prompt') prompt: string) {
    const userId = req.user.id;

    // 1. Credit Check
    const hasCredits = await this.usersService.hasSufficientCredits(userId);
    if (!hasCredits) {
      throw new ForbiddenException('Insufficient credits');
    }

    // 2. Trigger Agent Task
    const response = await this.agentsService.executeJob(userId, prompt);

    // 3. Deduct Credits
    const tokensUsed = response.metadata?.tokens_used || 0;
    const creditCost = Math.max(1, Math.ceil(tokensUsed / 100));
    await this.usersService.deductCredits(userId, creditCost);

    return {
      output: response.output,
      cost: creditCost,
      tokensUsed,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('extract-document')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async extractDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      return { text: file.buffer.toString('utf-8') };
    }

    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(file.buffer);
      return { text: result.text };
    }

    if (ext === 'docx') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return { text: result.value };
    }

    throw new BadRequestException('Unsupported file type. Supported: PDF, DOCX, TXT, MD, CSV');
  }
}
