import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

@Injectable()
export class PaymentsService {
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly paystackSecretKey: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepository: Repository<PaymentTransaction>,
    private readonly usersService: UsersService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  async initiatePayment(userId: string, amountKobo: number) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('Paystack is not configured');
    }

    if (!Number.isFinite(amountKobo) || amountKobo < 100) {
      throw new BadRequestException('Amount must be at least 100 kobo');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const callbackUrl =
      this.configService.get<string>('PAYSTACK_CALLBACK_URL') ||
      `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:6001')}/dashboard/profile?payment=callback`;

    const payload = {
      email: user.email,
      amount: Math.round(amountKobo),
      currency: 'KES',
      callback_url: callbackUrl,
      metadata: {
        userId,
      },
    };

    const response = await axios.post<PaystackInitializeResponse>(
      `${this.paystackBaseUrl}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    if (!response.data?.status || !response.data?.data) {
      throw new InternalServerErrorException('Unable to initialize Paystack transaction');
    }

    const transaction = this.paymentRepository.create({
      userId,
      reference: response.data.data.reference,
      amountKobo: Math.round(amountKobo),
      currency: 'KES',
      status: 'PENDING',
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      metadata: { callbackUrl },
    });

    await this.paymentRepository.save(transaction);

    return {
      authorization_url: response.data.data.authorization_url,
      access_code: response.data.data.access_code,
      reference: response.data.data.reference,
    };
  }

  async verifyAndApply(reference: string) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('Paystack is not configured');
    }

    const tx = await this.paymentRepository.findOne({ where: { reference } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    if (tx.status === 'SUCCESS') {
      return { success: true, alreadyProcessed: true };
    }

    const response = await axios.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
      },
      timeout: 15000,
    });

    const data = response.data?.data;
    const isSuccess = response.data?.status && data?.status === 'success';

    if (!isSuccess) {
      tx.status = 'FAILED';
      tx.metadata = {
        ...(tx.metadata || {}),
        verifyResponse: response.data,
      };
      await this.paymentRepository.save(tx);
      return { success: false };
    }

    await this.applySuccessfulTransaction(tx, data);
    return { success: true };
  }

  async processWebhook(signature: string | undefined, rawBody: Buffer | undefined, event: any) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('Paystack is not configured');
    }

    if (!signature || !rawBody) {
      throw new BadRequestException('Invalid webhook signature payload');
    }

    const expected = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event?.event !== 'charge.success') {
      return { received: true, ignored: true };
    }

    const reference = event?.data?.reference;
    if (!reference) {
      throw new BadRequestException('Missing transaction reference');
    }

    let tx = await this.paymentRepository.findOne({ where: { reference } });

    if (!tx) {
      tx = this.paymentRepository.create({
        userId: String(event?.data?.metadata?.userId || ''),
        reference,
        amountKobo: Number(event?.data?.amount || 0),
        currency: String(event?.data?.currency || 'KES'),
        status: 'PENDING',
        authorizationUrl: null,
        accessCode: null,
        metadata: event?.data?.metadata || null,
      });
    }

    if (tx.status === 'SUCCESS') {
      return { received: true, alreadyProcessed: true };
    }

    await this.applySuccessfulTransaction(tx, event.data);
    return { received: true };
  }

  private async applySuccessfulTransaction(tx: PaymentTransaction, paystackData: any) {
    if (!tx.userId) {
      throw new BadRequestException('Unable to resolve user for transaction');
    }

    tx.status = 'SUCCESS';
    tx.currency = String(paystackData?.currency || tx.currency || 'KES');
    tx.gatewayReference = String(paystackData?.reference || tx.reference);
    tx.amountKobo = Number(paystackData?.amount || tx.amountKobo);
    tx.paidAt = paystackData?.paid_at ? new Date(paystackData.paid_at) : new Date();
    tx.metadata = {
      ...(tx.metadata || {}),
      channel: paystackData?.channel,
      customer: paystackData?.customer,
    };

    await this.paymentRepository.save(tx);

    const creditsToAdd = tx.amountKobo / 100;
    if (creditsToAdd > 0) {
      await this.usersService.addCredits(tx.userId, creditsToAdd);
    }
  }
}
