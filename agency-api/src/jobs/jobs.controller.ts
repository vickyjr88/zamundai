import {
  Get,
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JobsService } from './jobs.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobStatus } from './entities/agent-job.entity';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async execute(@Request() req: any, @Body('prompt') prompt: string) {
    const userId = req.user.id;

    // 1. Credit Check
    const hasCredits = await this.usersService.hasSufficientCredits(userId);
    if (!hasCredits) {
      throw new ForbiddenException('Insufficient credits');
    }

    if (!prompt?.trim()) {
      throw new BadRequestException('Prompt is required');
    }

    const job = await this.jobsService.enqueueJob(userId, prompt.trim());

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getJob(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const job = await this.jobsService.findJobForUser(id, userId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      status: job.status,
      output: job.status === JobStatus.COMPLETED ? job.response : null,
      error: job.status === JobStatus.FAILED ? job.response : null,
      tokensUsed: job.tokensUsed,
      costInUsd: Number(job.costInUsd),
      baseCostKes: Number(job.baseCostKes),
      billedCostKes: Number(job.billedCostKes),
      creditsCharged: Number(job.creditsCharged),
      billingMode: job.billingMode,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
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
